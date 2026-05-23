import fs from "node:fs/promises";
import path from "node:path";
import { boardReadyVersion } from "../generated/version.js";
import { registerBuiltInRules } from "../rules/_index.js";
import { captureFabricationSnapshot } from "../rules/fabrication-snapshot.js";
import { normalizePathInput } from "../util/path.js";
import { applyBaseline, readBaseline, resolveBaselinePath } from "./baseline.js";
import { defaultConcurrency, mapLimit } from "./concurrency.js";
import {
  type BoardReadyOpsConfig,
  defaultConfig,
  type GateConfig,
  type LoadedConfig,
  loadConfig,
  type RuleConfig,
} from "./config.js";
import type { PipelineOptions, ProjectContext, RuleContext } from "./context.js";
import { discoverProjects } from "./discovery.js";
import { createFinding, type FailOn, type Finding, sortFindings, summarizeFindings } from "./findings.js";
import { gateRequirementFindings, requiredGateRules, requiredManufacturingOutputs } from "./gates/requirements.js";
import { createLogger, type Logger } from "./logger.js";
import type { RunResult } from "./result.js";
import { listRules } from "./rule-registry.js";
import { applySuppressions } from "./suppressions.js";

export async function runPipeline(
  input: Partial<PipelineOptions> & { cwd?: string; path?: string } = {},
  logger?: Logger,
): Promise<RunResult> {
  registerPipelineRules();
  const cwd = input.cwd ?? process.cwd();
  const root = await canonicalRoot(path.resolve(cwd, normalizePathInput(input.path ?? ".")));
  const loaded = await loadConfig(root, input.config);
  const loadedConfig = { ...defaultConfig(), ...loaded.config };
  const gate = input.gate ? loadedConfig.gates?.[input.gate] : undefined;
  const missingExplicitGate =
    input.gate && !gate && input.gateAutoDetected !== true
      ? `Gate "${input.gate}" not found in configuration.`
      : undefined;
  if (missingExplicitGate) {
    loaded.errors.push(missingExplicitGate);
  }
  const config = gate ? applyGateRequirements(loadedConfig, gate) : loadedConfig;
  const options = normalizeOptions(cwd, root, config, input, gate, missingExplicitGate ? "critical" : undefined);
  const activeLogger = logger ?? createLogger(options.quiet ? "silent" : options.verbose ? "debug" : "info");
  const pipelineStart = performance.now();
  activeLogger.debug("pipeline.start", {
    path: root,
    project_count: projectsLengthHint(input),
  });
  const projects = await discoverConfiguredProjects(root, options);
  const findings: Finding[] = [];
  findings.push(...configFindings(root, loaded, missingExplicitGate ? new Set([missingExplicitGate]) : undefined));
  findings.push(...projectShapeFindings(projects));
  const activeRules = listRules().filter((rule) => {
    if (options.rules.length > 0 && !options.rules.includes(rule.meta.id)) {
      return false;
    }
    if (options.skips.includes(rule.meta.id)) {
      return false;
    }
    return true;
  });
  const projectFindings = await mapLimit(projects, options.concurrency, async (project) => {
    const projectConfig = configForProject(root, config, project);
    const override = projectConfig.projects?.[0];
    const variantMatch = override?.variants?.find((variant) => variant.name === options.variant);
    const context: RuleContext = {
      root,
      projects: [project],
      config: projectConfig,
      options: {
        ...options,
        mode: projectConfig.mode ?? options.mode,
        bom: variantMatch?.bom ?? override?.bom ?? options.bom,
        pinmap: override?.pinmap ?? options.pinmap,
      },
      logger: activeLogger,
    };
    const output: Finding[] = [];
    for (const rule of activeRules) {
      const startedAt = performance.now();
      activeLogger.debug("pipeline.rule.start", {
        rule: rule.meta.id,
        project: project.projectFile,
      });
      try {
        output.push(...(await rule.run(context)));
        activeLogger.debug("pipeline.rule.finish", {
          rule: rule.meta.id,
          project: project.projectFile,
          latency_ms: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        activeLogger.error("pipeline.rule.error", {
          rule: rule.meta.id,
          project: project.projectFile,
          latency_ms: Math.round(performance.now() - startedAt),
          error,
        });
        throw error;
      }
    }
    return output;
  });
  for (const group of projectFindings) {
    findings.push(...group);
  }
  const gatedFindings = sortFindings([
    ...findings,
    ...gateRequirementFindings(findings, gate?.require ?? [], projects),
  ]);
  const sorted = await controlledFindings(root, config, options, gatedFindings);
  const fabrication = await captureFabricationSnapshot(root, projects, options, config);
  const result: RunResult = {
    schemaVersion: 1,
    tool: {
      name: "boardreadyops",
      version: boardReadyVersion,
    },
    summary: summarizeFindings(sorted, options.failOn),
    projects,
    findings: sorted,
    fabrication,
    generatedAt: new Date().toISOString(),
  };
  activeLogger.debug("pipeline.finish", {
    latency_ms: Math.round(performance.now() - pipelineStart),
    findings: result.summary.total,
  });
  return result;
}

function projectsLengthHint(input: Partial<PipelineOptions>): number | undefined {
  return input.project ? 1 : undefined;
}

export function registerPipelineRules(): void {
  registerBuiltInRules();
}

async function controlledFindings(
  root: string,
  config: BoardReadyOpsConfig,
  options: PipelineOptions,
  findings: Finding[],
): Promise<Finding[]> {
  const suppressed = applySuppressions(findings, config.suppressions);
  if (options.ignoreBaseline || !config.baseline || config.baseline.mode === "all") {
    return suppressed;
  }
  const baseline = await readBaseline(resolveBaselinePath(root, config.baseline));
  return baseline ? applyBaseline(suppressed, baseline, config.baseline.mode) : suppressed;
}

export async function canonicalRoot(input: string): Promise<string> {
  try {
    return await fs.realpath(input);
  } catch {
    return input;
  }
}

function normalizeOptions(
  cwd: string,
  root: string,
  config: BoardReadyOpsConfig,
  input: Partial<PipelineOptions>,
  gate?: GateConfig,
  forceFailOn?: FailOn,
): PipelineOptions {
  const gateRules = requiredGateRules(gate?.require ?? []);
  const inputRules = input.rules ?? [];
  return {
    cwd,
    path: root,
    project: input.project,
    config: input.config,
    mode: gate ? "enforce" : (input.mode ?? config.mode ?? "warn"),
    requireKicad: input.requireKicad ?? false,
    kicadCli: input.kicadCli,
    bom: input.bom,
    pinmap: input.pinmap,
    variant: input.variant,
    concurrency: input.concurrency ?? defaultConcurrency(),
    failOn: forceFailOn ?? gate?.["fail-on"] ?? input.failOn ?? config["fail-on"] ?? "high",
    gate: input.gate,
    gateAutoDetected: input.gateAutoDetected ?? false,
    rules: inputRules.length > 0 ? [...new Set([...inputRules, ...gateRules])] : [],
    skips: (input.skips ?? []).filter((ruleId) => !gateRules.includes(ruleId)),
    ignoreBaseline: input.ignoreBaseline ?? false,
    annotations: input.annotations ?? true,
    quiet: input.quiet ?? false,
    verbose: input.verbose ?? false,
    color: input.color ?? "auto",
  };
}

async function discoverConfiguredProjects(root: string, options: PipelineOptions) {
  if (options.project) {
    return discoverProjects(root, options.project);
  }
  return discoverProjects(root);
}

function applyGateRequirements(config: BoardReadyOpsConfig, gate: GateConfig): BoardReadyOpsConfig {
  const requiredRules = requiredGateRules(gate.require ?? []);
  const requiredOutputs = requiredManufacturingOutputs(gate.require ?? []);
  if (requiredRules.length === 0) {
    return config;
  }
  const rules = { ...config.rules };
  for (const ruleId of requiredRules) {
    rules[ruleId] = enableRule(rules[ruleId]);
  }
  const outputConfig = ruleObjectConfig(rules["manufacturing.outputs-present"]);
  const existingRequired = Array.isArray(outputConfig.required)
    ? outputConfig.required.filter((entry): entry is string => typeof entry === "string")
    : [];
  if (requiredOutputs.length > 0) {
    rules["manufacturing.outputs-present"] = {
      ...outputConfig,
      enabled: true,
      required: [...new Set([...existingRequired, ...requiredOutputs])],
    };
  }
  return {
    ...config,
    rules,
  };
}

function enableRule(ruleConfig: RuleConfig | boolean | undefined): RuleConfig {
  return {
    ...ruleObjectConfig(ruleConfig),
    enabled: true,
  };
}

function ruleObjectConfig(ruleConfig: RuleConfig | boolean | undefined): RuleConfig {
  return typeof ruleConfig === "object" && ruleConfig !== null ? ruleConfig : {};
}

function configForProject(root: string, config: BoardReadyOpsConfig, project: ProjectContext): BoardReadyOpsConfig {
  const override = config.projects?.find((candidate) => {
    const target = path.resolve(root, normalizePathInput(candidate.path));
    return target === path.resolve(root, project.root) || target === path.resolve(root, project.projectFile);
  });
  if (!override) {
    return {
      ...config,
      projects: [],
    };
  }
  const projectConfig: BoardReadyOpsConfig = {
    ...config,
    projects: [override],
  };
  if (override.mode) {
    projectConfig.mode = override.mode;
  }
  if (override.rules) {
    projectConfig.rules = mergeRules(config.rules, override.rules);
  }
  return projectConfig;
}

function mergeRules(
  rules: BoardReadyOpsConfig["rules"],
  overrides: NonNullable<NonNullable<BoardReadyOpsConfig["projects"]>[number]["rules"]>,
): NonNullable<BoardReadyOpsConfig["rules"]> {
  const merged = { ...(rules ?? {}) };
  for (const [id, override] of Object.entries(overrides)) {
    const current = merged[id];
    merged[id] =
      isRuleConfig(current) && isRuleConfig(override)
        ? {
            ...current,
            ...override,
          }
        : override;
  }
  return merged;
}

function isRuleConfig(value: RuleConfig | boolean | undefined): value is RuleConfig {
  return typeof value === "object" && value !== null;
}

function configFindings(root: string, loaded: LoadedConfig, criticalErrors = new Set<string>()): Finding[] {
  return loaded.errors.map((error) =>
    createFinding({
      ruleId: "config.invalid",
      severity: criticalErrors.has(error) ? "critical" : "high",
      message: `Configuration is invalid: ${error}`,
      resource: {
        path: loaded.path ? path.relative(root, loaded.path).replace(/\\/g, "/") : "boardreadyops.yml",
        kind: "manifest",
      },
      location: { line: 1, column: 1 },
      fix: {
        description: "Correct the BoardReadyOps configuration before checking the repository again.",
        steps: [
          "Review the reported configuration error.",
          "Update the configuration file.",
          "Run BoardReadyOps again.",
        ],
      },
      confidence: "definite",
    }),
  );
}

function projectShapeFindings(projects: Awaited<ReturnType<typeof discoverProjects>>): Finding[] {
  if (projects.length === 0) {
    return [
      createFinding({
        ruleId: "manifest.project-discovery",
        severity: "high",
        message: "No .kicad_pro project was found.",
        resource: { path: ".", kind: "manifest" },
        fix: {
          description: "Add a KiCad project file or point BoardReadyOps at the project to review.",
          steps: ["Confirm the repository contains a .kicad_pro file.", "Run BoardReadyOps with the project path."],
        },
        confidence: "definite",
      }),
    ];
  }
  const findings: Finding[] = [];
  for (const project of projects) {
    if (project.schematicFiles.length === 0) {
      findings.push(
        createFinding({
          ruleId: "manifest.project-discovery",
          severity: "high",
          message: `${project.projectFile} has no matching schematic file.`,
          project: project.projectFile,
          resource: { path: project.projectFile, kind: "project" },
          fix: {
            description: "Restore the schematic that belongs to this KiCad project.",
            steps: ["Check the project schematic path.", "Add or rename the matching .kicad_sch file."],
          },
          confidence: "definite",
        }),
      );
    }
    if (project.boardFiles.length === 0) {
      findings.push(
        createFinding({
          ruleId: "manifest.project-discovery",
          severity: "high",
          message: `${project.projectFile} has no matching board file.`,
          project: project.projectFile,
          resource: { path: project.projectFile, kind: "project" },
          fix: {
            description: "Restore the board file that belongs to this KiCad project.",
            steps: ["Check the project board path.", "Add or rename the matching .kicad_pcb file."],
          },
          confidence: "definite",
        }),
      );
    }
  }
  return findings;
}
