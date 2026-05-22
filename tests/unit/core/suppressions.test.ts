import { describe, expect, it } from "vitest";
import type { Finding } from "../../../src/core/findings.js";
import { applySuppressions } from "../../../src/core/suppressions.js";

describe("finding suppressions", () => {
  it("matches rules, projects, refs, and fingerprints while ignoring expired entries", () => {
    const findings = [
      finding({
        ruleId: "manufacturing.outputs-present",
        resource: { path: "hardware/prototype/fab", kind: "manifest" },
        fingerprint: "rule-project",
      }),
      finding({
        ruleId: "bom.lifecycle",
        details: { reference: "U3" },
        fingerprint: "ref-match",
      }),
      finding({
        ruleId: "bom.eol-detection",
        fingerprint: "fingerprint-match",
      }),
      finding({
        ruleId: "bom.eol-detection",
        fingerprint: "expired",
      }),
    ];

    expect(
      applySuppressions(
        findings,
        [
          {
            rule: "manufacturing.outputs-present",
            project: "hardware/prototype",
            reason: "prototype fab outputs are not published",
          },
          { rule: "bom.lifecycle", refs: ["U3"], reason: "tracked lifecycle exception" },
          { rule: "bom.eol-detection", fingerprint: "fingerprint-match", reason: "tracked component exception" },
          {
            rule: "bom.eol-detection",
            fingerprint: "expired",
            reason: "stale exception",
            expires: "2026-05-20",
          },
        ],
        new Date("2026-05-21T10:00:00Z"),
      ).map((entry) => entry.suppressed),
    ).toEqual([true, true, true, undefined]);
  });

  it("leaves unmatched findings visible and reads ref arrays and pinmap entry designators", () => {
    const findings = [
      finding({
        ruleId: "manufacturing.outputs-present",
        resource: { path: "hardware/production/fab", kind: "manifest" },
        fingerprint: "project-miss",
      }),
      finding({
        ruleId: "bom.lifecycle",
        details: { refs: ["U4", "U5"] },
        fingerprint: "refs-array",
      }),
      finding({
        ruleId: "pinmap.verify",
        details: { entry: { designator: "U6" } },
        fingerprint: "entry-ref",
      }),
      finding({
        ruleId: "bom.lifecycle",
        details: { reference: "U8" },
        fingerprint: "ref-miss",
      }),
    ];

    expect(applySuppressions(findings, []).map((entry) => entry.suppressed)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(
      applySuppressions(findings, [
        { rule: "manufacturing.outputs-present", project: "hardware/prototype", reason: "project mismatch" },
        { rule: "bom.lifecycle", refs: ["U5"], reason: "array match" },
        { rule: "pinmap.verify", refs: ["U6"], reason: "entry match" },
        { rule: "bom.lifecycle", refs: ["U7"], reason: "reference mismatch" },
      ]).map((entry) => entry.suppressed),
    ).toEqual([undefined, true, true, undefined]);
  });

  it("matches configured fingerprints regardless of hex casing", () => {
    const suppressed = applySuppressions(
      [finding({ ruleId: "bom.lifecycle", fingerprint: "a1b2c3" })],
      [{ rule: "bom.lifecycle", fingerprint: "A1B2C3", reason: "captured fingerprint" }],
    );

    expect(suppressed[0]?.suppressed).toBe(true);
  });

  it("treats the repository root as a project suppression scope", () => {
    const suppressed = applySuppressions(
      [
        finding({
          ruleId: "manufacturing.outputs-present",
          resource: { path: "hardware/release/fab", kind: "manifest" },
          fingerprint: "root-project",
        }),
      ],
      [{ rule: "manufacturing.outputs-present", project: "./", reason: "repository-wide exception" }],
    );

    expect(suppressed[0]?.suppressed).toBe(true);
  });

  it("matches top-level finding references", () => {
    const suppressed = applySuppressions(
      [finding({ ruleId: "bom.lifecycle", references: ["U9"], fingerprint: "top-level-reference" })],
      [{ rule: "bom.lifecycle", refs: ["U9"], reason: "reference exception" }],
    );

    expect(suppressed[0]?.suppressed).toBe(true);
  });

  it("matches detail designators and leaves empty ref scopes visible", () => {
    const suppressed = applySuppressions(
      [
        finding({
          ruleId: "pinmap.unmapped-pin",
          details: { designator: "U10" },
          fingerprint: "detail-designator",
        }),
        finding({
          ruleId: "pinmap.unmapped-pin",
          details: { designator: "U11" },
          fingerprint: "empty-refs",
        }),
      ],
      [
        { rule: "pinmap.unmapped-pin", refs: ["U10"], reason: "designator exception" },
        { rule: "pinmap.unmapped-pin", refs: [], reason: "invalid empty ref exception" },
      ],
    );

    expect(suppressed.map((entry) => entry.suppressed)).toEqual([true, undefined]);
  });
});

function finding(input: Partial<Finding> & Pick<Finding, "ruleId" | "fingerprint">): Finding {
  return {
    ruleId: input.ruleId,
    severity: input.severity ?? "high",
    message: input.message ?? "finding",
    resource: input.resource ?? { path: "hardware/prototype/project.kicad_pro", kind: "project" },
    details: input.details,
    references: input.references,
    fingerprint: input.fingerprint,
  };
}
