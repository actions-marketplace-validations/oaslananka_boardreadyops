import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("manufacturing.outputs-present", () => {
  it("flags missing required manufacturing outputs", async () => {
    const result = await runFixture("manufacturing-missing-outputs");
    const findings = expectRule(result, "manufacturing.outputs-present");
    expect(findings.map((finding) => finding.details?.required)).toContain("gerber");
  });
});
