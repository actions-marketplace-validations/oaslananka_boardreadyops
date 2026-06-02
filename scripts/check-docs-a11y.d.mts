export interface Pa11yIssue {
  code: string;
  context: string;
  message: string;
  selector: string;
  type: string;
  typeCode: number;
}

export interface Pa11yPageResult {
  page: string;
  issues: Pa11yIssue[];
}

export const pa11yOptions: {
  standard: "WCAG2AA";
  runners: ["axe", "htmlcs"];
  includeWarnings: false;
  includeNotices: false;
  timeout: number;
  wait: number;
};

export function createChromeLaunchConfig(): Promise<{ executablePath?: string; args: string[] }>;

export function candidateChromeExecutables(env?: NodeJS.ProcessEnv): string[];

export function collectHtmlFiles(siteDir: string): Promise<string[]>;

export function formatPa11yFailures(siteDir: string, results: Pa11yPageResult[]): string;

export function pageUrlForFile(origin: string, siteDir: string, file: string): string;

export function main(root?: string): Promise<void>;
