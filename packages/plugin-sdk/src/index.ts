/** Supported finding severities emitted by plugin rules. */
export type PluginSeverity = "critical" | "high" | "medium" | "low" | "info";

/** Confidence levels a plugin can attach to a finding. */
export type PluginConfidenceLevel = "definite" | "high" | "medium" | "low";

/** Human-readable remediation guidance for a plugin finding. */
export interface PluginFixSuggestion {
  description: string;
  steps?: string[] | undefined;
  references?: string[] | undefined;
  automated?: boolean | undefined;
}

/** A finding emitted by a plugin rule against a project resource. */
export interface PluginFinding {
  ruleId: string;
  severity: PluginSeverity;
  message: string;
  project?: string | undefined;
  resource: {
    path: string;
    kind: "project" | "schematic" | "pcb" | "bom" | "pinmap" | "manifest";
  };
  location?:
    | {
        line?: number | undefined;
        column?: number | undefined;
        region?: {
          startLine: number;
          endLine: number;
          startColumn?: number | undefined;
          endColumn?: number | undefined;
        };
        boardCoordinates?: {
          x: number;
          y: number;
          layer?: string | undefined;
          units: "mm" | "in";
        };
      }
    | undefined;
  details?: Record<string, unknown> | undefined;
  references?: string[] | undefined;
  fix?: PluginFixSuggestion | undefined;
  confidence?: PluginConfidenceLevel | undefined;
  fingerprint?: string | undefined;
  suppressed?: boolean | undefined;
}

/** Metadata that registers and documents a plugin rule. */
export interface PluginRuleMetadata {
  id: string;
  title: string;
  description: string;
  rationale: string;
  defaultSeverity: PluginSeverity;
  appliesTo: string[];
  configKeys: string[];
  kicadVersions: ("9" | "10" | "future")[];
  tags: string[];
  docUrl?: string;
}

/** File discovery context for one KiCad project in the active workspace. */
export interface PluginProjectContext {
  projectFile: string;
  root: string;
  schematicFiles: string[];
  boardFiles: string[];
  jobsetFiles: string[];
}

/** Structured logger exposed to plugins during rule execution. */
export interface PluginLogger {
  /** Emit development diagnostics for a plugin execution event. */
  debug(event: string, data?: Record<string, unknown>): void;
  /** Emit an informational plugin execution event. */
  info(event: string, data?: Record<string, unknown>): void;
  /** Emit a recoverable plugin execution warning. */
  warn(event: string, data?: Record<string, unknown>): void;
  /** Emit an unrecoverable plugin execution error. */
  error(event: string, data?: Record<string, unknown>): void;
}

/** Execution context passed to each plugin rule. */
export interface PluginRuleContext {
  root: string;
  projects: PluginProjectContext[];
  config: unknown;
  options: Record<string, unknown>;
  logger: PluginLogger;
}

/** Runtime rule implementation contributed by a plugin. */
export interface Rule {
  meta: PluginRuleMetadata;
  /** Inspect the project context and return findings for this rule. */
  run(context: PluginRuleContext): PluginFinding[] | Promise<PluginFinding[]>;
}

/** Component adapter extension point reserved for plugin packages. */
export interface ComponentAdapter {
  id: string;
  [key: string]: unknown;
}

/** Report emitter extension point reserved for plugin packages. */
export interface ReportEmitter {
  id: string;
  [key: string]: unknown;
}

/** Vendor profile extension point reserved for plugin packages. */
export interface VendorProfile {
  id: string;
  [key: string]: unknown;
}

/** Notification extension point reserved for plugin packages. */
export interface Notifier {
  id: string;
  [key: string]: unknown;
}

/** Top-level plugin export consumed by BoardReadyOps plugin loading. */
export interface BoardReadyOpsPlugin {
  name: string;
  version: string;
  rules?: Rule[] | undefined;
  adapters?: ComponentAdapter[] | undefined;
  reportFormats?: ReportEmitter[] | undefined;
  vendorProfiles?: VendorProfile[] | undefined;
  notifiers?: Notifier[] | undefined;
}

/**
 * Returns a plugin definition with its public type checked at authoring time.
 *
 * @example
 * ```ts
 * import { definePlugin } from "@boardreadyops/plugin-sdk";
 *
 * export default definePlugin({
 *   name: "boardreadyops-plugin-example",
 *   version: "1.0.0",
 *   rules: [],
 * });
 * ```
 */
export function definePlugin(plugin: BoardReadyOpsPlugin): BoardReadyOpsPlugin {
  return plugin;
}
