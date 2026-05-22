import path from "node:path";
import yaml from "js-yaml";
import { loadConfig } from "../../core/config.js";
import type { ProjectContext } from "../../core/context.js";
import { discoverProjects } from "../../core/discovery.js";
import { boardReadyVersion } from "../../generated/version.js";
import { detectKicadCli } from "../../kicad/cli.js";
import { pathExists, readTextFile } from "../../util/fs.js";
import { globFiles } from "../../util/glob.js";
import { runProcess } from "../../util/process.js";

const doctorChecks = ["runtime", "kicad", "adapters", "repository", "suppressions", "action"] as const;

type DoctorCheckName = (typeof doctorChecks)[number];
type DoctorSeverity = "pass" | "warn" | "fail" | "info";

export interface DoctorCommandOptions {
  check?: string | undefined;
  format?: string | undefined;
}

interface DoctorItem {
  severity: DoctorSeverity;
  message: string;
  recommendation?: string | undefined;
}

interface DoctorCheck {
  name: DoctorCheckName;
  title: string;
  items: DoctorItem[];
}

interface DoctorReport {
  schemaVersion: 1;
  tool: {
    name: "boardreadyops";
    version: string;
  };
  checks: DoctorCheck[];
  recommendations: string[];
}

export async function doctorCommand(
  options: DoctorCommandOptions,
  streams: { stdout: NodeJS.WritableStream },
): Promise<number> {
  const format = parseDoctorFormat(options.format);
  const report = await createDoctorReport(options.check);
  streams.stdout.write(format === "json" ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  return 0;
}

async function createDoctorReport(selected: string | undefined): Promise<DoctorReport> {
  const selectedCheck = parseDoctorCheck(selected);
  const checks = await Promise.all(
    [
      { name: "runtime" as const, title: "Runtime", run: runtimeCheck },
      { name: "kicad" as const, title: "KiCad", run: kicadCheck },
      { name: "adapters" as const, title: "Adapters", run: adaptersCheck },
      { name: "repository" as const, title: "Repository", run: repositoryCheck },
      { name: "suppressions" as const, title: "Suppressions", run: suppressionsCheck },
      { name: "action" as const, title: "Action / Workflow", run: actionCheck },
    ]
      .filter((check) => !selectedCheck || check.name === selectedCheck)
      .map(async (check) => ({
        name: check.name,
        title: check.title,
        items: await check.run(process.cwd()),
      })),
  );
  return {
    schemaVersion: 1,
    tool: { name: "boardreadyops", version: boardReadyVersion },
    checks,
    recommendations: collectRecommendations(checks),
  };
}

function renderText(report: DoctorReport): string {
  const checks = report.checks
    .map((check) => `${check.title}\n${check.items.map((entry) => `  ${renderItem(entry)}`).join("\n")}`)
    .join("\n\n");
  const recommendations =
    report.recommendations.length === 0
      ? ""
      : `\n\nRecommendations\n${report.recommendations
          .map((recommendation, index) => `  ${index + 1}. ${recommendation}`)
          .join("\n")}`;
  return `BoardReadyOps Doctor - Environment & Repository Diagnosis\n\n${checks}${recommendations}\n`;
}

async function runtimeCheck(): Promise<DoctorItem[]> {
  const npmVersion = await runProcess("npm", ["--version"], {
    timeoutMs: 2_000,
    maxStdoutBytes: 4 * 1024,
    maxStderrBytes: 4 * 1024,
  });
  const supportedNode = supportsDoctorNodeVersion(process.versions.node);
  return [
    item(supportedNode ? "pass" : "fail", `Node: ${process.version} (required: >=24 <25)`, {
      recommendation: supportedNode ? undefined : "Install a supported Node.js 24 runtime.",
    }),
    item("pass", `boardreadyops: v${boardReadyVersion}`),
    npmVersion.code === 0
      ? item("pass", `npm: v${npmVersion.stdout.trim()}`)
      : item("warn", "npm not found.", { recommendation: "Install npm for package-based BoardReadyOps workflows." }),
  ];
}

async function kicadCheck(): Promise<DoctorItem[]> {
  const kicad = await detectKicadCli();
  if (!kicad.found) {
    return [item("warn", "kicad-cli not found.", { recommendation: "Install KiCad CLI to run DRC and ERC checks." })];
  }
  const version = kicad.version ? ` ${kicad.version}` : "";
  return [
    item("pass", `kicad-cli${version} found at ${kicad.path}.`),
    item("pass", "DRC available."),
    item("pass", "ERC available."),
  ];
}

async function adaptersCheck(): Promise<DoctorItem[]> {
  if (process.env.NEXAR_CLIENT_ID && process.env.NEXAR_CLIENT_SECRET) {
    return [item("pass", "Nexar credentials present.")];
  }
  return [
    item("warn", "Nexar credentials not present.", {
      recommendation: "Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET for Nexar-backed lifecycle checks.",
    }),
  ];
}

async function repositoryCheck(root: string): Promise<DoctorItem[]> {
  const [loaded, projects] = await Promise.all([loadConfig(root), discoverProjects(root)]);
  const gerbers = await discoverGerberOutputs(root, projects);
  const items: DoctorItem[] = [];
  if (loaded.errors.length > 0) {
    items.push(
      item("fail", `boardreadyops configuration is invalid: ${loaded.errors.join("; ")}`, {
        recommendation: "Fix boardreadyops.yml before running repository checks.",
      }),
    );
  } else if (loaded.path) {
    items.push(item("pass", `${path.basename(loaded.path)} found and valid.`));
  } else {
    items.push(item("info", "No boardreadyops configuration file found; defaults are valid."));
  }
  items.push(
    projects.length === 0
      ? item("warn", "No KiCad projects discovered.", { recommendation: "Add a .kicad_pro project before CI." })
      : item(
          projects.length === 1 ? "pass" : "warn",
          `${projects.length} KiCad project${plural(projects.length)} discovered.`,
        ),
  );
  items.push(
    gerbers.length === 0
      ? item("fail", "No Gerber outputs found.", { recommendation: "Generate Gerber outputs from KiCad before CI." })
      : item("pass", `${gerbers.length} Gerber output${plural(gerbers.length)} found.`),
  );
  return items;
}

async function suppressionsCheck(root: string): Promise<DoctorItem[]> {
  const [suppressionsFile, baselineFile] = await Promise.all([
    firstExisting(root, [
      ".boardreadyops-suppressions.yml",
      ".boardreadyops-suppressions.yaml",
      ".boardreadyops-suppressions.json",
    ]),
    firstExisting(root, [".boardreadyops-baseline.json"]),
  ]);
  return [
    suppressionsFile
      ? item("info", `${suppressionsFile} suppressions file found.`)
      : item("pass", "No suppressions file found."),
    baselineFile ? item("info", `${baselineFile} baseline found.`) : item("info", "No baseline captured."),
  ];
}

async function actionCheck(root: string): Promise<DoctorItem[]> {
  const workflow = await findBoardReadyWorkflow(root);
  if (!workflow) {
    return [
      item("warn", "No .github/workflows/boardreadyops.yml workflow found.", {
        recommendation: "Add the BoardReadyOps GitHub Action workflow for pull request preflight.",
      }),
    ];
  }
  let document: unknown;
  try {
    document = yaml.load(await readTextFile(workflow.path)) ?? {};
  } catch {
    return [
      item("warn", `Unable to read or parse ${workflow.relativePath} workflow.`, {
        recommendation: "Fix the BoardReadyOps workflow YAML before relying on action diagnostics.",
      }),
    ];
  }
  return [
    item("pass", `${workflow.relativePath} found.`),
    checkoutPinnedItem(document),
    hasPullRequestCommentPermission(document)
      ? item("pass", "permissions: pull-requests or issues write configured.")
      : item("warn", "permissions: pull-requests or issues write missing for PR comments.", {
          recommendation:
            "Add `permissions: { pull-requests: write }` or `permissions: { issues: write }` to the BoardReadyOps job.",
        }),
  ];
}

function checkoutPinnedItem(workflow: unknown): DoctorItem {
  const checkoutUses = workflowUses(workflow).filter(isCheckoutUse);
  if (checkoutUses.length > 0 && checkoutUses.every(isPinnedCheckoutUse)) {
    return item("pass", "actions/checkout is SHA-pinned.");
  }
  return item("warn", "actions/checkout is not SHA-pinned.", {
    recommendation: "Pin actions/checkout to an immutable commit SHA.",
  });
}

export function supportsDoctorNodeVersion(version: string): boolean {
  const major = Number(version.replace(/^v/, "").split(".")[0]);
  return Number.isInteger(major) && major >= 24 && major < 25;
}

function parseDoctorFormat(format: string | undefined): "text" | "json" {
  const candidate = format ?? "text";
  if (candidate === "text" || candidate === "json") {
    return candidate;
  }
  throw new Error(`Unknown doctor format: ${candidate}. Available formats: text, json`);
}

function parseDoctorCheck(check: string | undefined): DoctorCheckName | undefined {
  if (!check) {
    return undefined;
  }
  if (isDoctorCheckName(check)) {
    return check;
  }
  throw new Error(`Unknown doctor check: ${check}. Available checks: ${doctorChecks.join(", ")}`);
}

function isDoctorCheckName(value: string): value is DoctorCheckName {
  return doctorChecks.some((check) => check === value);
}

async function discoverGerberOutputs(root: string, projects: ProjectContext[]): Promise<string[]> {
  const projectRoots = projects.length > 0 ? projects.map((project) => project.root) : [];
  const files = await Promise.all(
    projectRoots.map((projectRoot) => globFiles(path.resolve(root, projectRoot), ["**/*.gbr", "**/*.gbrjob"])),
  );
  return [...new Set(files.flat())].sort((left, right) => left.localeCompare(right));
}

async function firstExisting(root: string, relativePaths: string[]): Promise<string | undefined> {
  for (const relativePath of relativePaths) {
    if (await pathExists(path.join(root, relativePath))) {
      return relativePath;
    }
  }
  return undefined;
}

interface WorkflowFile {
  path: string;
  relativePath: string;
}

async function findBoardReadyWorkflow(root: string): Promise<WorkflowFile | undefined> {
  for (const relativePath of [".github/workflows/boardreadyops.yml", ".github/workflows/boardreadyops.yaml"]) {
    const workflowPath = path.join(root, relativePath);
    if (await pathExists(workflowPath)) {
      return { path: workflowPath, relativePath };
    }
  }
  return undefined;
}

function workflowUses(workflow: unknown): string[] {
  return workflowJobs(workflow).flatMap((job) => jobUses(job));
}

function jobUses(job: WorkflowJob): string[] {
  return job.steps.flatMap((step) => {
    const stepRecord = asRecord(step);
    return typeof stepRecord?.uses === "string" ? [stepRecord.uses] : [];
  });
}

interface WorkflowJob {
  permissions: unknown;
  steps: unknown[];
}

function workflowJobs(workflow: unknown): WorkflowJob[] {
  const jobs = asRecord(asRecord(workflow)?.jobs);
  if (!jobs) {
    return [];
  }
  return Object.values(jobs).map((job) => {
    const jobRecord = asRecord(job);
    const steps = jobRecord && Array.isArray(jobRecord.steps) ? jobRecord.steps : [];
    return { permissions: jobRecord?.permissions, steps };
  });
}

function hasPullRequestCommentPermission(workflow: unknown): boolean {
  const workflowRecord = asRecord(workflow);
  if (!workflowRecord) {
    return false;
  }
  const jobs = workflowJobs(workflow).filter((job) => jobUses(job).some(isBoardReadyOpsActionUse));
  if (jobs.length === 0) {
    return false;
  }
  return jobs.every((job) => permissionsAllowIssueCommentWrite(job.permissions ?? workflowRecord.permissions));
}

function permissionsAllowIssueCommentWrite(permissions: unknown): boolean {
  if (permissions === "write-all") {
    return true;
  }
  const record = asRecord(permissions);
  return record?.["pull-requests"] === "write" || record?.issues === "write";
}

function isCheckoutUse(uses: string): boolean {
  return /^actions\/checkout@/i.test(uses);
}

function isPinnedCheckoutUse(uses: string): boolean {
  return /^actions\/checkout@[0-9a-f]{40}$/i.test(uses);
}

function isBoardReadyOpsActionUse(uses: string): boolean {
  return /^oaslananka\/boardreadyops(?:\/apps\/container)?@/i.test(uses);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function item(
  severity: DoctorSeverity,
  message: string,
  options: { recommendation?: string | undefined } = {},
): DoctorItem {
  return { severity, message, recommendation: options.recommendation };
}

function collectRecommendations(checks: DoctorCheck[]): string[] {
  return [
    ...new Set(
      checks.flatMap((check) => check.items.flatMap((entry) => (entry.recommendation ? [entry.recommendation] : []))),
    ),
  ];
}

function renderItem(entry: DoctorItem): string {
  return `[${entry.severity}] ${entry.message}`;
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}
