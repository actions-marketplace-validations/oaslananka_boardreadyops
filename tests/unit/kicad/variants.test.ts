import { describe, expect, it } from "vitest";
import { activeVariantDnpRefs, parseVariants } from "../../../src/kicad/variants.js";

describe("KiCad 10 variants", () => {
  it("parses JSON project variant DNP overrides", () => {
    const variants = parseVariants(
      JSON.stringify({
        board: {
          variants: [
            { name: "production", dnpOverrides: ["R2"] },
            { name: "prototype", dnp_overrides: ["C3"] },
          ],
        },
      }),
    );

    expect(variants).toEqual([
      { name: "production", dnpOverrides: ["R2"] },
      { name: "prototype", dnpOverrides: ["C3"] },
    ]);
  });

  it("keeps active variant DNP refs limited to known components", () => {
    expect(activeVariantDnpRefs({ name: "production", dnpOverrides: ["R2", "C9"] }, ["R1", "R2"])).toEqual(["R2"]);
  });

  it("parses nested S-expression variant DNP overrides", () => {
    expect(parseVariants('(project (variants (variant "proto" (dnp "C1") (dnp_override "R2"))))')).toEqual([
      { name: "proto", dnpOverrides: ["C1", "R2"] },
    ]);
  });
});
