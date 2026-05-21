import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, runFixture, writeFixture } from "../helpers.js";

describe("bom.missing-mpn", () => {
  it("flags populated BOM rows without manufacturer part numbers", async () => {
    const result = await runFixture("bom-missing-mpn");
    const findings = expectRule(result, "bom.missing-mpn", 1);
    expect(findings[0]?.details).toMatchObject({ reference: "R1" });
  });

  it("uses explicit BOM options and schematic fallback rows", async () => {
    const explicitBom = await writeFixture({
      "board.kicad_pro": "{}",
      "board.kicad_sch": "(kicad_sch)",
      "board.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "manual.csv": "Reference,MPN\nR1,\nR2,ABC\n",
    });
    const explicit = await runPipeline({
      path: explicitBom,
      bom: "manual.csv",
      rules: ["bom.missing-mpn"],
      failOn: "never",
    });
    expectRule(explicit, "bom.missing-mpn", 1);

    const schematicOnly = await writeFixture({
      "board.kicad_pro": "{}",
      "board.kicad_sch": `(kicad_sch
        (symbol
          (property "Reference" "U1")
          (property "Value" "MCU")
          (property "Footprint" "Package:QFN")
        )
      )`,
      "board.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
    });
    const fallback = await runPipeline({ path: schematicOnly, rules: ["bom.missing-mpn"], failOn: "never" });
    const findings = expectRule(fallback, "bom.missing-mpn", 1);
    expect(findings[0]?.resource.kind).toBe("schematic");
  });
});
