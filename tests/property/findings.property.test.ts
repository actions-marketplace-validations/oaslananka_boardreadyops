import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createFinding, fingerprintFor, sortFindings, summarizeFindings } from "../../src/core/findings.js";

describe("finding properties", () => {
  it("generates deterministic fingerprints", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (ruleId, resourcePath, message) => {
        const input = {
          ruleId,
          severity: "medium" as const,
          message,
          resource: { path: resourcePath, kind: "project" as const },
        };
        expect(fingerprintFor(input)).toBe(fingerprintFor(input));
      }),
    );
  });

  it("sortFindings is idempotent", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ ruleId: fc.string(), path: fc.string(), message: fc.string() })), (items) => {
        const findings = items.map((item) =>
          createFinding({
            ruleId: item.ruleId,
            severity: "low",
            message: item.message,
            resource: { path: item.path, kind: "project" },
          }),
        );
        expect(sortFindings(sortFindings(findings))).toEqual(sortFindings(findings));
      }),
    );
  });

  it("summarizeFindings counts every finding exactly once", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("critical", "high", "medium", "low", "info")), (severities) => {
        const findings = severities.map((severity, index) =>
          createFinding({
            ruleId: `test.${index}`,
            severity,
            message: `message ${index}`,
            resource: { path: `${index}.kicad_pro`, kind: "project" },
          }),
        );
        const summary = summarizeFindings(findings, "never");
        expect(summary.total).toBe(severities.length);
        expect(summary.critical + summary.high + summary.medium + summary.low + summary.info).toBe(severities.length);
      }),
    );
  });
});
