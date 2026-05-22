import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("bom.single-source", () => {
  it("flags MPNs with only one supplier column populated", async () => {
    const result = await runFixture("bom-single-source");
    const findings = expectRule(result, "bom.single-source", 1);
    expect(findings[0]?.details).toMatchObject({ reference: "R1", supplier: "DigiKey" });
  });
});
