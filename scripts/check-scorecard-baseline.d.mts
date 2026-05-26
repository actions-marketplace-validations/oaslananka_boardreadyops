export interface ScorecardCheck {
  name: string;
  score: number;
  reason?: string;
  details?: string[];
}

export interface ScorecardReport {
  score: number;
  checks?: ScorecardCheck[];
}

export interface ScorecardBaselineOptions {
  minimum?: number;
  requiredChecks?: readonly string[];
}

export interface ScorecardBaselineResult {
  passed: boolean;
  failures: string[];
  summary: string;
}

export const defaultRequiredChecks: readonly string[];

export function checkScorecardBaseline(
  report: ScorecardReport,
  options?: ScorecardBaselineOptions,
): ScorecardBaselineResult;

export function formatScorecardSummary(
  report: ScorecardReport,
  requiredChecks?: readonly string[],
  minimum?: number,
): string;

export function main(argv?: string[], env?: NodeJS.ProcessEnv, root?: string): Promise<void>;
