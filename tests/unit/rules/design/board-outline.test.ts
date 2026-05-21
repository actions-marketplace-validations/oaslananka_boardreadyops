import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("design.board-outline", () => {
  it("flags an open Edge.Cuts outline", async () => {
    const root = await writeFixture({
      "outline.kicad_pro": "{}",
      "outline.kicad_sch": "(kicad_sch)",
      "outline.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (gr_line (start 0 0) (end 10 0) (layer "Edge.Cuts"))
        (gr_line (start 10 0) (end 10 10) (layer "Edge.Cuts"))
      )`,
      "boardreadyops.yml": "version: 1\nrules:\n  design.board-outline:\n    enabled: true\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["design.board-outline"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("design.board-outline");
  });

  it("accepts circular Edge.Cuts outlines", async () => {
    const root = await writeFixture({
      "outline.kicad_pro": "{}",
      "outline.kicad_sch": "(kicad_sch)",
      "outline.kicad_pcb": `(kicad_pcb
        (title_block (rev "v1.0"))
        (gr_circle (center 5 5) (end 10 5) (layer "Edge.Cuts"))
      )`,
      "boardreadyops.yml": "version: 1\nrules:\n  design.board-outline:\n    enabled: true\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["design.board-outline"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });
});
