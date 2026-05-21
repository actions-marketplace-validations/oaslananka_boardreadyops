import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("design.copper-balance", () => {
  it("flags layers below the minimum copper coverage", async () => {
    const root = await writeFixture({
      "copper.kicad_pro": "{}",
      "copper.kicad_sch": "(kicad_sch)",
      "copper.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (gr_rect (start 0 0) (end 10 10) (layer "Edge.Cuts"))
        (zone (net 1) (layer "F.Cu") (filled_polygon (pts (xy 0 0) (xy 1 0) (xy 1 1) (xy 0 1))))
      )`,
      "boardreadyops.yml":
        "version: 1\nrules:\n  design.copper-balance:\n    min-coverage-percent: 2\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["design.copper-balance"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "design.copper-balance",
      severity: "low",
      message: "F.Cu copper coverage is 1.0%, below 2%.",
      resource: { kind: "pcb", path: "copper.kicad_pcb" },
      details: { layer: "F.Cu", coveragePercent: 1, minimum: 2 },
    });
  });

  it("does not flag layers that meet the configured coverage threshold", async () => {
    const root = await writeFixture({
      "copper.kicad_pro": "{}",
      "copper.kicad_sch": "(kicad_sch)",
      "copper.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (gr_rect (start 0 0) (end 10 10) (layer "Edge.Cuts"))
        (zone (net 1) (layer "F.Cu") (filled_polygon (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5))))
      )`,
      "boardreadyops.yml":
        "version: 1\nrules:\n  design.copper-balance:\n    min-coverage-percent: 20\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["design.copper-balance"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });

  it("checks copper layers with no filled copper zones", async () => {
    const root = await writeFixture({
      "copper.kicad_pro": "{}",
      "copper.kicad_sch": "(kicad_sch)",
      "copper.kicad_pcb": `(kicad_pcb
        (layers (0 "Top" signal) (31 "Bottom" signal))
        (title_block (rev "v1.0"))
        (gr_rect (start 0 0) (end 10 10) (layer "Edge.Cuts"))
        (zone (net 1) (layer "Top") (filled_polygon (pts (xy 0 0) (xy 5 0) (xy 5 5) (xy 0 5))))
      )`,
      "boardreadyops.yml":
        "version: 1\nrules:\n  design.copper-balance:\n    min-coverage-percent: 1\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["design.copper-balance"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      message: "Bottom copper coverage is 0.0%, below 1%.",
      details: { layer: "Bottom", coveragePercent: 0, minimum: 1 },
    });
  });
});
