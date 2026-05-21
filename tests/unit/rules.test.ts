import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBom } from "../../src/bom/loader.js";
import { runPipeline } from "../../src/core/pipeline.js";
import { parsePcb } from "../../src/kicad/pcb.js";
import { parseSchematic } from "../../src/kicad/schematic.js";
import { loadPinmap } from "../../src/pinmap/loader.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("BOM and KiCad parsers", () => {
  it("normalizes BOM rows", async () => {
    const rows = await loadBom(path.join(fixtureRoot, "bom-missing-mpn", "bom.csv"));
    expect(rows[0]).toMatchObject({ reference: "R1", manufacturer: "Yageo", sourceKind: "bom" });
  });

  it("extracts schematic components and PCB footprints", async () => {
    const schematic = await parseSchematic(path.join(fixtureRoot, "safe-basic", "safe-basic.kicad_sch"));
    const pcb = await parsePcb(path.join(fixtureRoot, "safe-basic", "safe-basic.kicad_pcb"));
    expect(schematic.components[0]?.reference).toBe("R1");
    expect(schematic.netLabels.has("MCU_PA0")).toBe(true);
    expect(pcb.footprints[0]).toMatchObject({ reference: "R1", footprint: "Resistor_SMD:R_0603" });
  });
});

describe("rules", () => {
  it("reports missing MPN", async () => {
    const result = await runPipeline({ path: path.join(fixtureRoot, "bom-missing-mpn"), failOn: "never" });
    expect(result.findings.some((finding) => finding.ruleId === "bom.missing-mpn")).toBe(true);
  });

  it("reports pinmap mismatch", async () => {
    const result = await runPipeline({ path: path.join(fixtureRoot, "pinmap-mismatch"), failOn: "never" });
    expect(result.findings.filter((finding) => finding.ruleId === "pinmap.verify")).toHaveLength(1);
  });

  it("loads pinmap documents", async () => {
    const loaded = await loadPinmap(path.join(fixtureRoot, "pinmap-mismatch", "firmware-pins.yml"));
    expect(loaded.errors).toEqual([]);
    expect(loaded.document?.pins[0]?.net).toBe("MCU_PA1");
  });
});
