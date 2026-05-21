import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, writeFixture } from "../helpers.js";

describe("manufacturing.panel-sanity", () => {
  it("flags configured panelization without panel outputs", async () => {
    const fixture = await writeFixture({
      "panel.kicad_pro": "{}",
      "panel.kicad_sch": "(kicad_sch)",
      "panel.kicad_pcb": '(kicad_pcb (title_block (rev "1.0.0")))',
      "fab/README.md": "Fabrication notes.",
      "boardreadyops.yml":
        "version: 1\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: false\n  manufacturing.panel-sanity:\n    enabled: true\n    panelized: true\n",
    });
    const result = await runPipeline({ path: fixture, failOn: "never" });
    const findings = expectRule(result, "manufacturing.panel-sanity", 1);
    expect(findings[0]?.message).toContain("Panelization");
  });
});
