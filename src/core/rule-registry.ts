import type { RuleContext } from "./context.js";
import type { Finding, Severity } from "./findings.js";

export interface RuleMetadata {
  id: string;
  title: string;
  description: string;
  rationale: string;
  defaultSeverity: Severity;
  appliesTo: string[];
  configKeys: string[];
  kicadVersions: ("9" | "10" | "future")[];
  tags: string[];
  docUrl?: string;
}

interface RuleExplanationSection {
  title: string;
  lines: string[];
}

export interface RuleExplanation {
  ruleId: string;
  summary: string;
  sections: RuleExplanationSection[];
}

interface RuleExplainer {
  explain(context: RuleContext): Promise<RuleExplanation>;
}

export interface Rule extends Partial<RuleExplainer> {
  meta: RuleMetadata;
  run(context: RuleContext): Promise<Finding[]>;
}

const registry = new Map<string, Rule>();

export function registerRule(rule: Rule): void {
  if (registry.has(rule.meta.id)) {
    throw new Error(`Duplicate rule id: ${rule.meta.id}`);
  }
  registry.set(rule.meta.id, rule);
}

export function listRules(): Rule[] {
  return [...registry.values()].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

export function clearRulesForTests(): void {
  registry.clear();
}
