import path from "node:path";
import { type BoardReadyOpsConfig, defaultConfig, isRuleEnabled, loadConfig } from "../core/config.js";
import type { ProjectContext } from "../core/context.js";
import { discoverProjects } from "../core/discovery.js";
import { parseKicadDiagnostics } from "../kicad/parsers/drc-report.js";
import { parsePcb } from "../kicad/pcb.js";
import { parseDelimitedRows } from "../util/delimited.js";
import { pathExists, readTextFile, writeTextFile } from "../util/fs.js";
import { globFiles } from "../util/glob.js";
import { isInside, normalizePathInput, normalizeRelative, resolveExistingPathAlias } from "../util/path.js";
import { runProcess } from "../util/process.js";
import { splitRefs } from "../util/strings.js";

const defaultAllowedFixRules = [
  "bom.missing-mpn",
  "release.changelog-present",
  "release.version-format",
  "release.revision-set",
  "manufacturing.fab-notes",
] as const;

const dnpConsistencyRule = "bom.dnp-consistency";

const defaultFabNotes = `# Fabrication Notes

- Confirm board thickness, copper weight, solder mask color, and surface finish before fabrication.
- Review controlled impedance, castellations, slots, and panelization requirements with the fabricator.
- Keep generated Gerber, drill, position, and BOM outputs tied to the board revision in CHANGELOG.md.
`;

export interface CreateFixPlanOptions {
  root: string;
  config?: string;
  rules?: string[];
  drcReport?: string;
}

export interface FixPlanResult {
  root: string;
  errors: string[];
  plan: FixPlan;
}

export interface FixPlan {
  changes: FixChange[];
  skipped: FixSkipped[];
  drcSuggestions: DrcFixSuggestion[];
}

interface FixChange {
  ruleIds: string[];
  path: string;
  before?: string;
  after: string;
  summary: string;
}

interface FixSkipped {
  ruleId: string;
  path: string;
  message: string;
}

interface DrcFixSuggestion {
  ruleId: string;
  path: string;
  line?: number;
  column?: number;
  message: string;
  suggestion: string;
}

interface MutablePlan extends FixPlan {
  changes: FixChange[];
}

interface DelimitedDocument {
  delimiter: string;
  header: string[];
  rows: string[][];
}

type ConfigProject = NonNullable<BoardReadyOpsConfig["projects"]>[number];

interface BomTarget {
  path: string;
  project?: ConfigProject;
}

export async function createFixPlan(options: CreateFixPlanOptions): Promise<FixPlanResult> {
  const root = path.resolve(options.root);
  const loaded = await loadConfig(root, options.config);
  if (loaded.errors.length > 0) {
    return { root, errors: loaded.errors, plan: emptyPlan() };
  }
  const config: BoardReadyOpsConfig = { ...defaultConfig(), ...loaded.config };
  const selectedRules = options.rules ?? [];
  const allowed = allowedFixRules(config, selectedRules);
  const plan: MutablePlan = emptyPlan();
  const virtualTexts = new Map<string, string>();
  const projects = await discoverProjects(root);

  await planBomMissingMpn(root, config, allowed, plan, virtualTexts);
  await planReleaseRevisions(root, config, projects, allowed, plan, virtualTexts);
  await planChangelog(root, config, projects, allowed, plan, virtualTexts);
  await planFabNotes(root, config, allowed, plan, virtualTexts);
  await planDnpConsistency(root, config, selectedRules, projects, plan);
  await planDrcSuggestions(root, selectedRules, options.drcReport, plan);

  return {
    root,
    errors: [],
    plan: sortPlan(plan),
  };
}

export async function applyFixPlan(root: string, plan: FixPlan): Promise<void> {
  for (const change of plan.changes) {
    const target = await resolveWritablePathInsideRoot(root, change.path);
    await writeTextFile(target, change.after);
  }
}

export async function isGitWorktreeDirty(root: string): Promise<boolean> {
  const inside = await runProcess("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: root,
    timeoutMs: 10_000,
    maxStdoutBytes: 8 * 1024,
    maxStderrBytes: 32 * 1024,
  });
  if (inside.code !== 0) {
    const message = [inside.stderr.trim(), inside.error].filter(Boolean).join("\n");
    if (inside.error?.includes("ENOENT") || /not a git (repository|work tree)/i.test(message)) {
      return false;
    }
    throw new Error(message || "git rev-parse failed");
  }
  if (inside.stdout.trim() !== "true") {
    return false;
  }
  const result = await runProcess("git", ["status", "--porcelain=v1"], {
    cwd: root,
    timeoutMs: 10_000,
    maxStdoutBytes: 128 * 1024,
    maxStderrBytes: 32 * 1024,
  });
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.error || "git status failed");
  }
  return result.stdout.trim().length > 0;
}

export async function commitFixPlan(root: string, plan: FixPlan): Promise<void> {
  if (plan.changes.length === 0) {
    return;
  }
  const paths = plan.changes.map((change) => change.path);
  const add = await runProcess("git", ["add", "--", ...paths], { cwd: root, timeoutMs: 30_000 });
  if (add.code !== 0) {
    throw new Error(add.stderr.trim() || add.error || "git add failed");
  }
  const commit = await runProcess("git", ["commit", "--only", "-m", "fix: apply boardreadyops fixes", "--", ...paths], {
    cwd: root,
    timeoutMs: 30_000,
    maxStdoutBytes: 128 * 1024,
    maxStderrBytes: 128 * 1024,
  });
  if (commit.code !== 0) {
    throw new Error(commit.stderr.trim() || commit.error || "git commit failed");
  }
}

export function formatFixPlan(plan: FixPlan): string {
  const lines: string[] = [];
  if (plan.changes.length > 0) {
    lines.push(`Planned fixes (${appliedRuleCount(plan)}):`);
    for (const change of plan.changes) {
      lines.push(`- ${change.ruleIds.join(", ")}: ${change.summary}`);
    }
  } else {
    lines.push("No automatic fixes are available.");
  }

  if (plan.skipped.length > 0) {
    lines.push("", "Skipped findings:");
    for (const skipped of plan.skipped) {
      lines.push(`- ${skipped.ruleId} ${skipped.path}: ${skipped.message}`);
    }
  }

  if (plan.drcSuggestions.length > 0) {
    lines.push("", "DRC suggested fixes:");
    for (const suggestion of plan.drcSuggestions) {
      const location = formatLocation(suggestion.path, suggestion.line, suggestion.column);
      lines.push(`- ${suggestion.ruleId} ${location}: ${suggestion.suggestion}`);
    }
  }

  if (plan.changes.length > 0) {
    lines.push("", "Diff:");
    for (const change of plan.changes) {
      lines.push(formatUnifiedDiff(change));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function appliedRuleCount(plan: FixPlan): number {
  return new Set(plan.changes.flatMap((change) => change.ruleIds)).size;
}

function emptyPlan(): MutablePlan {
  return { changes: [], skipped: [], drcSuggestions: [] };
}

function sortPlan(plan: MutablePlan): FixPlan {
  return {
    changes: plan.changes.sort((left, right) => left.path.localeCompare(right.path)),
    skipped: plan.skipped.sort((left, right) =>
      `${left.ruleId}:${left.path}`.localeCompare(`${right.ruleId}:${right.path}`),
    ),
    drcSuggestions: plan.drcSuggestions.sort((left, right) =>
      `${left.ruleId}:${left.path}:${left.line ?? 0}`.localeCompare(`${right.ruleId}:${right.path}:${right.line ?? 0}`),
    ),
  };
}

function allowedFixRules(config: BoardReadyOpsConfig, selectedRules: string[]): Set<string> {
  const configured = config.fix?.allow;
  const base = new Set(Array.isArray(configured) ? configured : defaultAllowedFixRules);
  if (selectedRules.length === 0) {
    return base;
  }
  return new Set(selectedRules.filter((ruleId) => base.has(ruleId)));
}

function isRuleEnabledForProject(
  config: BoardReadyOpsConfig,
  project: ConfigProject | undefined,
  ruleId: string,
): boolean {
  if (!project?.rules || !(ruleId in project.rules)) {
    return isRuleEnabled(config, ruleId);
  }
  const override = project.rules[ruleId];
  if (typeof override === "boolean") {
    return override;
  }
  return override?.enabled ?? isRuleEnabled(config, ruleId);
}

function isRuleEnabledForProjectContext(
  root: string,
  config: BoardReadyOpsConfig,
  project: ProjectContext,
  ruleId: string,
): boolean {
  return isRuleEnabledForProject(config, configProjectForContext(root, config, project), ruleId);
}

function isRuleEnabledForAnyConfiguredProject(config: BoardReadyOpsConfig, ruleId: string): boolean {
  const projects = config.projects ?? [];
  if (projects.length === 0) {
    return isRuleEnabled(config, ruleId);
  }
  return projects.some((project) => isRuleEnabledForProject(config, project, ruleId));
}

async function planBomMissingMpn(
  root: string,
  config: BoardReadyOpsConfig,
  allowed: Set<string>,
  plan: MutablePlan,
  virtualTexts: Map<string, string>,
): Promise<void> {
  const ruleId = "bom.missing-mpn";
  if (!allowed.has(ruleId)) {
    return;
  }
  const bomTargets = await resolveBomTargets(root, config, { includeVariants: true });
  if (bomTargets.length === 0) {
    return;
  }
  for (const target of bomTargets) {
    if (!isRuleEnabledForProject(config, target.project, ruleId)) {
      continue;
    }
    const bomPath = target.path;
    const before = await readVirtualText(bomPath, virtualTexts);
    const document = parseDelimitedDocument(before, bomPath);
    if (document.header.length === 0) {
      continue;
    }
    const mpnIndex = ensureColumn(document.header, ["mpn", "manufacturer part number"]);
    for (const row of document.rows) {
      while (row.length <= mpnIndex) {
        row.push("");
      }
    }
    const sourceAliases = [
      "ki_part",
      "kipart",
      "ki part",
      "manufacturer_part_number",
      "mfr part number",
      "part number",
    ];
    let fixed = 0;
    for (const row of document.rows) {
      const references = splitRefs(fieldByAliases(document.header, row, ["reference", "refs", "ref", "designator"]));
      if (
        references.length === 0 ||
        isDnpValue(fieldByAliases(document.header, row, ["dnp", "do not populate", "populate"]))
      ) {
        continue;
      }
      if (cellAt(row, mpnIndex)) {
        continue;
      }
      const inferred = fieldByAliases(document.header, row, sourceAliases);
      if (!inferred) {
        continue;
      }
      row[mpnIndex] = inferred;
      fixed += 1;
    }
    if (fixed === 0) {
      continue;
    }
    const after = writeDelimitedDocument(document);
    addTextChange(
      plan,
      virtualTexts,
      root,
      bomPath,
      before,
      after,
      [ruleId],
      `Fill ${fixed} missing BOM MPN value(s).`,
    );
  }
}

async function planReleaseRevisions(
  root: string,
  config: BoardReadyOpsConfig,
  projects: ProjectContext[],
  allowed: Set<string>,
  plan: MutablePlan,
  virtualTexts: Map<string, string>,
): Promise<void> {
  const versionRule = "release.version-format";
  const revisionRule = "release.revision-set";
  const versionAllowed = allowed.has(versionRule);
  const revisionAllowed = allowed.has(revisionRule);
  if (!versionAllowed && !revisionAllowed) {
    return;
  }
  const versionPattern = String(
    ruleObjectConfig(config.rules?.[versionRule]).pattern ?? "^[vr]?\\d+\\.\\d+(?:\\.\\d+)?$",
  );
  const versionRegex = compilePattern(versionPattern);
  const tagPattern = String(
    ruleObjectConfig(config.rules?.[revisionRule])["tag-pattern"] ?? "^v?\\d+\\.\\d+(?:\\.\\d+)?$",
  );
  const tagRegex = compilePattern(tagPattern);
  if ((versionAllowed && !versionRegex) || (revisionAllowed && !tagRegex)) {
    return;
  }

  for (const project of projects) {
    const projectVersionAllowed = versionAllowed && isRuleEnabledForProjectContext(root, config, project, versionRule);
    const projectRevisionAllowed =
      revisionAllowed && isRuleEnabledForProjectContext(root, config, project, revisionRule);
    if (!projectVersionAllowed && !projectRevisionAllowed) {
      continue;
    }
    for (const board of project.boardFiles) {
      const file = path.resolve(root, board);
      const before = await readVirtualText(file, virtualTexts);
      const revision = revisionFromText(before);
      const candidate = coerceSemver(revision);
      const ruleIds = [];
      if (
        projectVersionAllowed &&
        revision &&
        versionRegex &&
        !versionRegex.test(revision) &&
        versionRegex.test(candidate)
      ) {
        ruleIds.push(versionRule);
      }
      if (
        projectRevisionAllowed &&
        tagRegex &&
        (!revision || (!tagRegex.test(revision) && !tagRegex.test(`v${revision}`))) &&
        (tagRegex.test(candidate) || tagRegex.test(`v${candidate}`))
      ) {
        ruleIds.push(revisionRule);
      }
      if (ruleIds.length > 0) {
        const after = setRevision(before, candidate, "kicad_pcb");
        addTextChange(
          plan,
          virtualTexts,
          root,
          file,
          before,
          after,
          ruleIds,
          `Rewrite PCB revision ${revision ? `"${revision}"` : "metadata"} to ${candidate}.`,
        );
      }
    }

    if (!projectVersionAllowed || !versionRegex) {
      continue;
    }
    for (const schematic of project.schematicFiles) {
      const file = path.resolve(root, schematic);
      const before = await readVirtualText(file, virtualTexts);
      const revision = revisionFromText(before);
      if (!revision || versionRegex.test(revision)) {
        continue;
      }
      const candidate = coerceSemver(revision);
      if (!versionRegex.test(candidate)) {
        continue;
      }
      const after = setRevision(before, candidate, "kicad_sch");
      addTextChange(
        plan,
        virtualTexts,
        root,
        file,
        before,
        after,
        [versionRule],
        `Rewrite schematic revision "${revision}" to ${candidate}.`,
      );
    }
  }
}

async function planChangelog(
  root: string,
  config: BoardReadyOpsConfig,
  projects: ProjectContext[],
  allowed: Set<string>,
  plan: MutablePlan,
  virtualTexts: Map<string, string>,
): Promise<void> {
  const ruleId = "release.changelog-present";
  if (!allowed.has(ruleId)) {
    return;
  }
  const revisions = new Set<string>();
  for (const project of projects) {
    if (!isRuleEnabledForProjectContext(root, config, project, ruleId)) {
      continue;
    }
    for (const board of project.boardFiles) {
      const file = path.resolve(root, board);
      const revision = revisionFromText(await readVirtualText(file, virtualTexts));
      if (revision) {
        revisions.add(revision);
      }
    }
  }
  if (revisions.size === 0) {
    plan.skipped.push({
      ruleId,
      path: ".",
      message: "CHANGELOG.md cannot be matched because no board revision is set.",
    });
    return;
  }

  const changelog = path.resolve(root, "CHANGELOG.md");
  const before = await readOptionalVirtualText(changelog, virtualTexts);
  const missing = [...revisions].filter((revision) => !before || !changelogHasRevision(before, revision));
  if (missing.length === 0) {
    return;
  }
  const after = before ? appendChangelogEntries(before, missing) : createChangelog(missing);
  addTextChange(
    plan,
    virtualTexts,
    root,
    changelog,
    before,
    after,
    [ruleId],
    `Add CHANGELOG.md release entr${missing.length === 1 ? "y" : "ies"} for ${missing.join(", ")}.`,
  );
}

async function planFabNotes(
  root: string,
  config: BoardReadyOpsConfig,
  allowed: Set<string>,
  plan: MutablePlan,
  virtualTexts: Map<string, string>,
): Promise<void> {
  const ruleId = "manufacturing.fab-notes";
  if (!allowed.has(ruleId) || !isRuleEnabledForAnyConfiguredProject(config, ruleId)) {
    return;
  }
  const candidates = ["fab/README.md", "manufacturing/notes.md", "docs/fab-notes.md"];
  for (const candidate of candidates) {
    const target = path.resolve(root, candidate);
    if (virtualTexts.has(target) || (await pathExists(target))) {
      return;
    }
  }
  const target = path.resolve(root, "fab/README.md");
  addTextChange(plan, virtualTexts, root, target, undefined, defaultFabNotes, [ruleId], "Create fab/README.md.");
}

async function planDnpConsistency(
  root: string,
  config: BoardReadyOpsConfig,
  selectedRules: string[],
  projects: ProjectContext[],
  plan: MutablePlan,
): Promise<void> {
  if (
    !shouldSurfaceRule(dnpConsistencyRule, selectedRules) ||
    !isRuleEnabledForAnyConfiguredProject(config, dnpConsistencyRule)
  ) {
    return;
  }
  const bomTargets = await resolveBomTargets(root, config, { includeVariants: false });
  if (bomTargets.length === 0) {
    return;
  }
  for (const target of bomTargets) {
    if (!isRuleEnabledForProject(config, target.project, dnpConsistencyRule)) {
      continue;
    }
    const projectContexts = contextsForBomTarget(root, target, config, projects);
    const footprints = new Map<string, boolean>();
    for (const project of projectContexts) {
      for (const board of project.boardFiles) {
        const parsed = await parsePcb(path.resolve(root, board));
        for (const footprint of parsed.footprints) {
          footprints.set(footprint.reference, footprint.dnp);
        }
      }
    }
    const bomPath = target.path;
    const text = await readTextFile(bomPath);
    const document = parseDelimitedDocument(text, bomPath);
    if (document.header.length === 0) {
      continue;
    }
    for (const [index, row] of document.rows.entries()) {
      const references = splitRefs(fieldByAliases(document.header, row, ["reference", "refs", "ref", "designator"]));
      const bomDnp = isDnpValue(fieldByAliases(document.header, row, ["dnp", "do not populate", "populate"]));
      for (const reference of references) {
        if (!footprints.has(reference) || footprints.get(reference) === bomDnp) {
          continue;
        }
        plan.skipped.push({
          ruleId: dnpConsistencyRule,
          path: `${normalizeRelative(root, bomPath)}:${index + 2}`,
          message: `${reference} has inconsistent DNP state and is not automatically applied.`,
        });
      }
    }
  }
}

async function planDrcSuggestions(
  root: string,
  selectedRules: string[],
  drcReport: string | undefined,
  plan: MutablePlan,
): Promise<void> {
  if (!drcReport || !shouldSurfaceDrc(selectedRules)) {
    return;
  }
  const reportPath = resolveInsideRoot(root, drcReport);
  const diagnostics = parseKicadDiagnostics(await readTextFile(reportPath), "drc");
  for (const diagnostic of diagnostics) {
    const suggestion = suggestionFromDiagnostic(diagnostic.raw, diagnostic.message);
    if (!suggestion) {
      continue;
    }
    const suggestionEntry: DrcFixSuggestion = {
      ruleId: `drc.${diagnostic.ruleId ?? "violation"}`,
      path: diagnostic.file ? normalizeReportPath(root, diagnostic.file) : normalizeRelative(root, reportPath),
      message: diagnostic.message,
      suggestion,
    };
    if (diagnostic.line) {
      suggestionEntry.line = diagnostic.line;
    }
    if (diagnostic.column) {
      suggestionEntry.column = diagnostic.column;
    }
    plan.drcSuggestions.push(suggestionEntry);
  }
}

async function resolveBomTargets(
  root: string,
  config: BoardReadyOpsConfig,
  options: { includeVariants: boolean },
): Promise<BomTarget[]> {
  const configured = configuredBomTargets(config, options);
  if (configured.length > 0) {
    const targets = new Map<string, BomTarget>();
    for (const target of configured) {
      const resolved = resolveInsideRoot(root, target.path);
      targets.set(resolved, { ...target, path: resolved });
    }
    return [...targets.values()];
  }
  const found = await globFiles(root, ["**/bom*.csv", "**/*bom*.csv", "**/bom*.tsv", "**/*bom*.tsv"]);
  return found.map((bomPath) => {
    const target: BomTarget = { path: bomPath };
    const project = configProjectForFile(root, config, bomPath);
    if (project) {
      target.project = project;
    }
    return target;
  });
}

function configuredBomTargets(config: BoardReadyOpsConfig, options: { includeVariants: boolean }): BomTarget[] {
  const targets: BomTarget[] = [];
  for (const project of config.projects ?? []) {
    if (project.bom) {
      targets.push({ path: project.bom, project });
    }
    if (options.includeVariants) {
      for (const variant of project.variants ?? []) {
        if (variant.bom) {
          targets.push({ path: variant.bom, project });
        }
      }
    }
  }
  return targets;
}

function configProjectForContext(
  root: string,
  config: BoardReadyOpsConfig,
  project: ProjectContext,
): ConfigProject | undefined {
  return (config.projects ?? []).find((candidate) => {
    const target = path.resolve(root, normalizePathInput(candidate.path));
    return target === path.resolve(root, project.root) || target === path.resolve(root, project.projectFile);
  });
}

function configProjectForFile(root: string, config: BoardReadyOpsConfig, file: string): ConfigProject | undefined {
  const target = path.resolve(file);
  return (config.projects ?? [])
    .map((project) => ({ project, root: path.resolve(root, normalizePathInput(project.path)) }))
    .filter((entry) => isInside(entry.root, target))
    .sort((left, right) => right.root.length - left.root.length)[0]?.project;
}

function contextsForBomTarget(
  root: string,
  target: BomTarget,
  config: BoardReadyOpsConfig,
  projects: ProjectContext[],
): ProjectContext[] {
  if (!target.project) {
    return nearestProjectContextsForFile(root, target.path, projects);
  }
  return projects.filter((project) => configProjectForContext(root, config, project) === target.project);
}

function nearestProjectContextsForFile(root: string, file: string, projects: ProjectContext[]): ProjectContext[] {
  const target = path.resolve(file);
  const matches = projects
    .map((project) => ({ project, root: path.resolve(root, project.root) }))
    .filter((entry) => isInside(entry.root, target))
    .sort((left, right) => right.root.length - left.root.length);
  const nearest = matches[0]?.root;
  if (!nearest) {
    return projects;
  }
  return matches.filter((entry) => entry.root === nearest).map((entry) => entry.project);
}

function parseDelimitedDocument(text: string, file: string): DelimitedDocument {
  const delimiter = file.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  const rows = parseDelimitedRows(text, delimiter);
  const header = rows.shift()?.map((cell) => cell.trim()) ?? [];
  const width = header.length;
  return {
    delimiter,
    header,
    rows: rows
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) => Array.from({ length: Math.max(width, row.length) }, (_, index) => row[index]?.trim() ?? "")),
  };
}

function writeDelimitedDocument(document: DelimitedDocument): string {
  return [document.header, ...document.rows]
    .map((row) => row.map((cell) => encodeCell(cell, document.delimiter)).join(document.delimiter))
    .join("\n")
    .concat("\n");
}

function encodeCell(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes("\n") || value.includes("\r") || value.includes(delimiter)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function ensureColumn(header: string[], aliases: string[]): number {
  const existing = indexByAliases(header, aliases);
  if (existing >= 0) {
    return existing;
  }
  header.push("MPN");
  return header.length - 1;
}

function fieldByAliases(header: string[], row: string[], aliases: string[]): string {
  const index = indexByAliases(header, aliases);
  return index >= 0 ? cellAt(row, index) : "";
}

function indexByAliases(header: string[], aliases: string[]): number {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return header.findIndex((entry) => normalizedAliases.has(normalizeHeader(entry)));
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function cellAt(row: string[], index: number): string {
  return row[index]?.trim() ?? "";
}

function isDnpValue(value: string): boolean {
  if (!value) {
    return false;
  }
  if (/^(false|no|0)$/i.test(value)) {
    return false;
  }
  return /^(true|yes|1|dnp|do not populate|not fitted)$/i.test(value);
}

function compilePattern(pattern: string): RegExp | undefined {
  try {
    return new RegExp(pattern);
  } catch {
    return undefined;
  }
}

function ruleObjectConfig(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function revisionFromText(text: string): string | undefined {
  return /\(rev\s+"([^"]*)"/.exec(text)?.[1] ?? /\(revision\s+"([^"]*)"/.exec(text)?.[1];
}

function coerceSemver(revision: string | undefined): string {
  if (!revision) {
    return "0.1.0";
  }
  const parts = [...revision.matchAll(/\d+/g)].map((match) => match[0] ?? "").filter(Boolean);
  if (parts.length === 0) {
    return "0.1.0";
  }
  const [major = "0", minor = "0", patch = "0"] = parts;
  return `${Number(major)}.${Number(minor)}.${Number(patch)}`;
}

function setRevision(text: string, revision: string, rootForm: "kicad_pcb" | "kicad_sch"): string {
  if (/\(rev\s+"[^"]*"/.test(text)) {
    return text.replace(/(\(rev\s+")[^"]*(")/, `$1${revision}$2`);
  }
  if (/\(revision\s+"[^"]*"/.test(text)) {
    return text.replace(/(\(revision\s+")[^"]*(")/, `$1${revision}$2`);
  }
  if (/\(title_block\b/.test(text)) {
    return text.replace(/\(title_block\b/, `(title_block (rev "${revision}")`);
  }
  return text.replace(new RegExp(`\\(${rootForm}\\b`), `(${rootForm}\n  (title_block (rev "${revision}"))`);
}

function changelogHasRevision(text: string, revision: string): boolean {
  const escaped = revision.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+\\[?v?${escaped}\\]?\\b`, "m").test(text);
}

function createChangelog(revisions: string[]): string {
  return `# Changelog

${revisions.map(changelogEntry).join("\n")}`;
}

function appendChangelogEntries(text: string, revisions: string[]): string {
  const trimmed = text.trimEnd();
  return `${trimmed}

${revisions.map(changelogEntry).join("\n")}`;
}

function changelogEntry(revision: string): string {
  return `## ${revision}

- Hardware release notes scaffolded by boardreadyops fix.
`;
}

async function readVirtualText(file: string, virtualTexts: Map<string, string>): Promise<string> {
  return virtualTexts.get(file) ?? readTextFile(file);
}

async function readOptionalVirtualText(file: string, virtualTexts: Map<string, string>): Promise<string | undefined> {
  if (virtualTexts.has(file)) {
    return virtualTexts.get(file);
  }
  if (!(await pathExists(file))) {
    return undefined;
  }
  return readTextFile(file);
}

function addTextChange(
  plan: MutablePlan,
  virtualTexts: Map<string, string>,
  root: string,
  file: string,
  before: string | undefined,
  after: string,
  ruleIds: string[],
  summary: string,
): void {
  if (before === after) {
    return;
  }
  const target = resolveInsideRoot(root, file);
  const relative = normalizeRelative(root, target);
  const existing = plan.changes.find((change) => change.path === relative);
  if (existing) {
    existing.after = after;
    existing.ruleIds = [...new Set([...existing.ruleIds, ...ruleIds])].sort();
    existing.summary = `${existing.summary} ${summary}`;
  } else {
    const change: FixChange = { ruleIds: [...new Set(ruleIds)].sort(), path: relative, after, summary };
    if (before !== undefined) {
      change.before = before;
    }
    plan.changes.push(change);
  }
  virtualTexts.set(target, after);
}

function resolveInsideRoot(root: string, input: string): string {
  const target = path.resolve(root, normalizePathInput(input));
  if (!isInside(root, target)) {
    throw new Error(`Refusing to write outside workspace: ${input}`);
  }
  return target;
}

async function resolveWritablePathInsideRoot(root: string, input: string): Promise<string> {
  const target = resolveInsideRoot(root, input);
  const realRoot = await resolveExistingPathAlias(path.resolve(root));
  const realTarget = await resolveExistingPathAlias(target);
  if (!isInside(realRoot, realTarget)) {
    throw new Error(`Refusing to write outside workspace: ${input}`);
  }
  return target;
}

function shouldSurfaceRule(ruleId: string, selectedRules: string[]): boolean {
  return selectedRules.length === 0 || selectedRules.includes(ruleId);
}

function shouldSurfaceDrc(selectedRules: string[]): boolean {
  return (
    selectedRules.length === 0 ||
    selectedRules.includes("drc.kicad") ||
    selectedRules.some((ruleId) => ruleId.startsWith("drc."))
  );
}

function suggestionFromDiagnostic(raw: Record<string, unknown>, message: string): string | undefined {
  for (const key of ["suggestedFix", "suggested_fix", "fix", "fixSuggestion"] as const) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const fixes = raw.fixes;
  if (Array.isArray(fixes)) {
    const first = fixes.find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    if (first) {
      return first.trim();
    }
  }
  if (/clearance/i.test(message)) {
    return "Increase clearance or move the affected copper features, then rerun KiCad DRC.";
  }
  return undefined;
}

function normalizeReportPath(root: string, value: string): string {
  const target = path.isAbsolute(value) ? value : path.resolve(root, normalizePathInput(value));
  return isInside(root, target) ? normalizeRelative(root, target) : value;
}

function formatLocation(file: string, line: number | undefined, column: number | undefined): string {
  if (line && column) {
    return `${file}:${line}:${column}`;
  }
  if (line) {
    return `${file}:${line}`;
  }
  return file;
}

function formatUnifiedDiff(change: FixChange): string {
  const beforePath = change.before === undefined ? "/dev/null" : change.path;
  const beforeLines = splitDiffLines(change.before ?? "");
  const afterLines = splitDiffLines(change.after);
  const lines = [
    `--- ${beforePath}`,
    `+++ ${change.path}`,
    `@@ -${formatDiffRange(beforeLines.length, change.before === undefined)} +${formatDiffRange(afterLines.length, false)} @@`,
  ];
  for (const operation of diffLines(beforeLines, afterLines)) {
    lines.push(`${operation.prefix}${operation.line}`);
  }
  return lines.join("\n");
}

interface DiffOperation {
  prefix: " " | "-" | "+";
  line: string;
}

function diffLines(beforeLines: string[], afterLines: string[]): DiffOperation[] {
  const maxDistance = beforeLines.length + afterLines.length;
  let frontier = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    const nextFrontier = new Map(frontier);
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const insertion =
        diagonal === -distance ||
        (diagonal !== distance && getFrontier(frontier, diagonal - 1) < getFrontier(frontier, diagonal + 1));
      let beforeIndex = insertion ? getFrontier(frontier, diagonal + 1) : getFrontier(frontier, diagonal - 1) + 1;
      let afterIndex = beforeIndex - diagonal;
      while (
        beforeIndex < beforeLines.length &&
        afterIndex < afterLines.length &&
        beforeLines[beforeIndex] === afterLines[afterIndex]
      ) {
        beforeIndex += 1;
        afterIndex += 1;
      }
      nextFrontier.set(diagonal, beforeIndex);
      if (beforeIndex >= beforeLines.length && afterIndex >= afterLines.length) {
        trace.push(nextFrontier);
        return backtrackDiff(trace, beforeLines, afterLines);
      }
    }
    trace.push(nextFrontier);
    frontier = nextFrontier;
  }
  return [];
}

function backtrackDiff(trace: Map<number, number>[], beforeLines: string[], afterLines: string[]): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let beforeIndex = beforeLines.length;
  let afterIndex = afterLines.length;
  for (let distance = trace.length - 1; distance > 0; distance -= 1) {
    const previousFrontier = trace[distance - 1] ?? new Map<number, number>();
    const diagonal = beforeIndex - afterIndex;
    const insertion =
      diagonal === -distance ||
      (diagonal !== distance &&
        getFrontier(previousFrontier, diagonal - 1) < getFrontier(previousFrontier, diagonal + 1));
    const previousDiagonal = insertion ? diagonal + 1 : diagonal - 1;
    const previousBeforeIndex = getFrontier(previousFrontier, previousDiagonal);
    const previousAfterIndex = previousBeforeIndex - previousDiagonal;
    while (beforeIndex > previousBeforeIndex && afterIndex > previousAfterIndex) {
      beforeIndex -= 1;
      afterIndex -= 1;
      operations.push({ prefix: " ", line: beforeLines[beforeIndex] ?? "" });
    }
    if (insertion) {
      afterIndex -= 1;
      operations.push({ prefix: "+", line: afterLines[afterIndex] ?? "" });
    } else {
      beforeIndex -= 1;
      operations.push({ prefix: "-", line: beforeLines[beforeIndex] ?? "" });
    }
  }
  while (beforeIndex > 0 && afterIndex > 0) {
    beforeIndex -= 1;
    afterIndex -= 1;
    operations.push({ prefix: " ", line: beforeLines[beforeIndex] ?? "" });
  }
  while (beforeIndex > 0) {
    beforeIndex -= 1;
    operations.push({ prefix: "-", line: beforeLines[beforeIndex] ?? "" });
  }
  while (afterIndex > 0) {
    afterIndex -= 1;
    operations.push({ prefix: "+", line: afterLines[afterIndex] ?? "" });
  }
  return operations.reverse();
}

function getFrontier(frontier: Map<number, number>, diagonal: number): number {
  return frontier.get(diagonal) ?? Number.NEGATIVE_INFINITY;
}

function formatDiffRange(lineCount: number, emptyFile: boolean): string {
  if (emptyFile || lineCount === 0) {
    return "0,0";
  }
  return `1,${lineCount}`;
}

function splitDiffLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}
