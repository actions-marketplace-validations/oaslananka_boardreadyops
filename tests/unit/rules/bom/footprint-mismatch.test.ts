import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("bom.footprint-mismatch", () => {
  it("flags BOM footprint strings that differ from the PCB footprint", async () => {
    const result = await runFixture("bom-footprint-mismatch");
    const findings = expectRule(result, "bom.footprint-mismatch", 1);
    expect(findings[0]?.details).toMatchObject({
      reference: "R1",
      bom: "Resistor_SMD:R_0603",
      pcb: "Resistor_SMD:R_0805",
    });
  });
});
