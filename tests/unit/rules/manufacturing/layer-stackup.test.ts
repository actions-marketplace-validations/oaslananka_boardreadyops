import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("manufacturing.layer-stackup", () => {
  it("flags stackup layer count mismatches", async () => {
    const root = await writeFixture({
      "stack.kicad_pro": "{}",
      "stack.kicad_sch": "(kicad_sch)",
      "stack.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (layers (0 "F.Cu" signal) (31 "B.Cu" signal))
        (stackup (layer "F.Cu") (layer "In1.Cu") (layer "In2.Cu") (layer "B.Cu"))
      )`,
      "boardreadyops.yml":
        "version: 1\nrules:\n  manufacturing.layer-stackup:\n    expected-layers: 2\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["manufacturing.layer-stackup"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "manufacturing.layer-stackup",
      severity: "medium",
      message: "PCB stackup has 4 layers, expected 2.",
      resource: { kind: "pcb", path: "stack.kicad_pcb" },
      details: { expectedLayers: 2, stackupLayers: 4 },
    });
  });

  it("does not flag stackups that match the expected layer count", async () => {
    const root = await writeFixture({
      "stack.kicad_pro": "{}",
      "stack.kicad_sch": "(kicad_sch)",
      "stack.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (layers (0 "F.Cu" signal) (31 "B.Cu" signal))
        (stackup (layer "F.Cu") (layer "B.Cu"))
      )`,
      "boardreadyops.yml":
        "version: 1\nrules:\n  manufacturing.layer-stackup:\n    expected-layers: 2\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["manufacturing.layer-stackup"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });
});
