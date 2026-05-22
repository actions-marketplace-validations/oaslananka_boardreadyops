export interface CompatibilityConfig {
  kicad: {
    minimum: string;
    recommended: string;
    tested: string[];
    notes?: Record<string, string>;
  };
  node: {
    minimum: string;
    supported: string[];
    tested?: Record<string, string>;
  };
}

export interface NodeRelease {
  version: string;
  date?: string;
  lts?: string | false;
}

export interface CompatibilityDrift {
  kicad: Array<{ series: string; latest: string }>;
  node: Array<{
    major: string;
    latest: string;
    tested: string | null;
    reason: "new-minor" | "new-release" | "untested-supported" | "unsupported-current";
  }>;
}

export function renderSupportMatrix(input: CompatibilityConfig | unknown): string;

export function findCompatibilityDrift(
  input: CompatibilityConfig | unknown,
  sources: { kicadReleases?: string[]; nodeReleases?: NodeRelease[] },
): CompatibilityDrift;

export function buildDriftReport(drift: CompatibilityDrift): string;

export function fetchNodeReleases(fetchImpl?: typeof fetch): Promise<NodeRelease[]>;

export function fetchKicadReleaseTags(fetchImpl?: typeof fetch): Promise<string[]>;

export function main(args?: string[], options?: { root?: string; fetch?: typeof fetch }): Promise<void>;
