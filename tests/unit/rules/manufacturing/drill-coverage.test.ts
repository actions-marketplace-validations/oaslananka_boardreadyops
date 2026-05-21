import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("manufacturing.drill-coverage", () => {
  it("flags PCB drill sizes missing from Excellon output", async () => {
    const result = await runFixture("manufacturing-drill-missing");
    const findings = expectRule(result, "manufacturing.drill-coverage", 1);
    expect(findings[0]?.details).toMatchObject({ drillSize: "0.4" });
  });
});
