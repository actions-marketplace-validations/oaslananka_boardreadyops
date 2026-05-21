import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, writeFixture } from "../helpers.js";

describe("manufacturing.fab-notes", () => {
  it("flags projects without known fabrication notes files", async () => {
    const fixture = await writeFixture({
      "notes.kicad_pro": "{}",
      "notes.kicad_sch": "(kicad_sch)",
      "notes.kicad_pcb": '(kicad_pcb (title_block (rev "1.0.0")))',
      "boardreadyops.yml":
        "version: 1\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: false\n",
    });
    const result = await runPipeline({ path: fixture, failOn: "never" });
    const findings = expectRule(result, "manufacturing.fab-notes", 1);
    expect(findings[0]?.resource.kind).toBe("manifest");
  });
});
