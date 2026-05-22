import fs from "node:fs/promises";
import path from "node:path";
import { boardReadyVersion } from "../generated/version.js";
import { pathExists, writeTextFile } from "../util/fs.js";
import type { BaselineConfig } from "./config.js";
import type { Finding } from "./findings.js";

interface BaselineFinding {
  fingerprint: string;
  ruleId: string;
  message: string;
  suppressedUntil: string | null;
}

export interface BaselineFile {
  version: 1;
  capturedAt: string;
  capturedBy: string;
  findings: BaselineFinding[];
}

export interface BaselineDiff {
  added: Finding[];
  removed: BaselineFinding[];
  unchanged: Finding[];
}

const defaultBaselineFile = ".boardreadyops-baseline.json";

export function createBaseline(findings: Finding[], now = new Date()): BaselineFile {
  return {
    version: 1,
    capturedAt: now.toISOString(),
    capturedBy: `boardreadyops/${boardReadyVersion}`,
    findings: findings.map((finding) => ({
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      message: finding.message,
      suppressedUntil: null,
    })),
  };
}

export function diffBaseline(findings: Finding[], baseline: BaselineFile): BaselineDiff {
  const current = new Map(findings.map((finding) => [finding.fingerprint, finding]));
  const previous = new Map(baseline.findings.map((finding) => [finding.fingerprint, finding]));
  return {
    added: findings.filter((finding) => !previous.has(finding.fingerprint)),
    removed: baseline.findings.filter((finding) => !current.has(finding.fingerprint)),
    unchanged: findings.filter((finding) => previous.has(finding.fingerprint)),
  };
}

export function applyBaseline(findings: Finding[], baseline: BaselineFile, mode: BaselineConfig["mode"]): Finding[] {
  if (mode !== "new-only") {
    return findings;
  }
  const fingerprints = new Set(baseline.findings.map((finding) => finding.fingerprint));
  return findings.map((finding) =>
    fingerprints.has(finding.fingerprint) ? { ...finding, suppressed: true } : finding,
  );
}

export function resolveBaselinePath(root: string, baseline?: Pick<BaselineConfig, "file">): string {
  return path.resolve(root, baseline?.file ?? defaultBaselineFile);
}

export async function readBaseline(file: string): Promise<BaselineFile | undefined> {
  if (!(await pathExists(file))) {
    return undefined;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  } catch {
    throw new Error(`Invalid baseline file: ${file}`);
  }
  const candidate = raw as Partial<BaselineFile> | null;
  if (!candidate || typeof candidate !== "object" || candidate.version !== 1 || !Array.isArray(candidate.findings)) {
    throw new Error(`Invalid baseline file: ${file}`);
  }
  if (!candidate.findings.every(isBaselineFinding)) {
    throw new Error(`Invalid baseline file: ${file}`);
  }
  return candidate as BaselineFile;
}

export async function writeBaseline(file: string, baseline: BaselineFile): Promise<void> {
  await writeTextFile(file, `${JSON.stringify(baseline, null, 2)}\n`);
}

function isBaselineFinding(value: unknown): value is BaselineFinding {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as {
    fingerprint?: unknown;
    ruleId?: unknown;
    message?: unknown;
    suppressedUntil?: unknown;
  };
  return (
    typeof candidate.fingerprint === "string" &&
    typeof candidate.ruleId === "string" &&
    typeof candidate.message === "string" &&
    (candidate.suppressedUntil === null || typeof candidate.suppressedUntil === "string")
  );
}
