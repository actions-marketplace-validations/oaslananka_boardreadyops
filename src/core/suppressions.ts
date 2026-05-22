import path from "node:path";
import type { SuppressionConfig } from "./config.js";
import type { Finding } from "./findings.js";

export function applySuppressions(
  findings: Finding[],
  suppressions: SuppressionConfig[] = [],
  now = new Date(),
): Finding[] {
  if (suppressions.length === 0) {
    return findings;
  }
  return findings.map((finding) =>
    suppressions.some((suppression) => suppressionMatches(finding, suppression, now))
      ? { ...finding, suppressed: true }
      : finding,
  );
}

function suppressionMatches(finding: Finding, suppression: SuppressionConfig, now: Date): boolean {
  if (suppression.rule !== finding.ruleId || isExpired(suppression.expires, now)) {
    return false;
  }
  if (suppression.fingerprint && suppression.fingerprint.toLowerCase() !== finding.fingerprint) {
    return false;
  }
  if (suppression.project && !matchesProject(finding.resource.path, suppression.project)) {
    return false;
  }
  if (suppression.refs) {
    if (suppression.refs.length === 0) {
      return false;
    }
    const references = findingReferences(finding);
    if (!suppression.refs.some((reference) => references.has(reference))) {
      return false;
    }
  }
  return true;
}

function isExpired(expires: string | undefined, now: Date): boolean {
  return Boolean(expires && expires < now.toISOString().slice(0, 10));
}

function matchesProject(resourcePath: string, configuredProject: string): boolean {
  const normalizedResource = normalizeResourcePath(resourcePath);
  const normalizedProject = normalizeResourcePath(configuredProject).replace(/\/$/, "");
  return (
    !normalizedProject ||
    normalizedProject === "." ||
    normalizedResource === normalizedProject ||
    normalizedResource.startsWith(`${normalizedProject}/`)
  );
}

function normalizeResourcePath(value: string): string {
  return path.posix.normalize(value.replace(/\\/g, "/")).replace(/^\.\//, "");
}

function findingReferences(finding: Finding): Set<string> {
  const references = new Set<string>();
  addFindingReference(references, finding.references);
  addFindingReference(references, finding.details?.reference);
  addFindingReference(references, finding.details?.ref);
  addFindingReference(references, finding.details?.refs);
  addFindingReference(references, finding.details?.designator);
  if (finding.details?.entry && typeof finding.details.entry === "object") {
    addFindingReference(references, (finding.details.entry as Record<string, unknown>).designator);
  }
  return references;
}

function addFindingReference(target: Set<string>, value: unknown): void {
  if (typeof value === "string") {
    target.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      addFindingReference(target, entry);
    }
  }
}
