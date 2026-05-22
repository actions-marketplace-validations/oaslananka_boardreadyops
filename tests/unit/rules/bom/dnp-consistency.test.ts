import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("bom.dnp-consistency", () => {
  it("flags DNP state mismatches between BOM and PCB", async () => {
    const result = await runFixture("bom-dnp-consistency");
    const findings = expectRule(result, "bom.dnp-consistency", 1);
    expect(findings[0]?.details).toMatchObject({ reference: "R1", bomDnp: false, pcbDnp: true });
  });
});
