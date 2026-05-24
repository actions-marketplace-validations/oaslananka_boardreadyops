export type PluginSeverity = "critical" | "high" | "medium" | "low" | "info";
export type PluginConfidenceLevel = "definite" | "high" | "medium" | "low";

export interface PluginFixSuggestion {
  description: string;
  steps?: string[] | undefined;
  references?: string[] | undefined;
  automated?: boolean | undefined;
}

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

export interface PluginProjectContext {
  projectFile: string;
  root: string;
  schematicFiles: string[];
  boardFiles: string[];
  jobsetFiles: string[];
}

export interface PluginLogger {
  debug(event: string, data?: Record<string, unknown>): void;
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

export interface PluginRuleContext {
  root: string;
  projects: PluginProjectContext[];
  config: unknown;
  options: Record<string, unknown>;
  logger: PluginLogger;
}

export interface Rule {
  meta: PluginRuleMetadata;
  run(context: PluginRuleContext): PluginFinding[] | Promise<PluginFinding[]>;
}

export interface ComponentAdapter {
  id: string;
  [key: string]: unknown;
}

export interface ReportEmitter {
  id: string;
  [key: string]: unknown;
}

export interface VendorProfile {
  id: string;
  [key: string]: unknown;
}

export interface Notifier {
  id: string;
  [key: string]: unknown;
}

export interface BoardReadyOpsPlugin {
  name: string;
  version: string;
  rules?: Rule[] | undefined;
  adapters?: ComponentAdapter[] | undefined;
  reportFormats?: ReportEmitter[] | undefined;
  vendorProfiles?: VendorProfile[] | undefined;
  notifiers?: Notifier[] | undefined;
}

export function definePlugin(plugin: BoardReadyOpsPlugin): BoardReadyOpsPlugin {
  return plugin;
}
