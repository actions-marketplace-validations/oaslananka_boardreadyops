import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, runFixture, writeFixture } from "../helpers.js";

describe("bom.eol-detection", () => {
  it("flags lifecycle markers that indicate end of life risk", async () => {
    const result = await runFixture("bom-eol");
    const findings = expectRule(result, "bom.eol-detection", 1);
    expect(findings[0]?.details).toMatchObject({ lifecycle: "EOL", reference: "R1" });
  });

  it("ignores DNP rows even when lifecycle text is risky", async () => {
    const root = await writeFixture({
      "board.kicad_pro": "{}",
      "board.kicad_sch": "(kicad_sch)",
      "board.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "bom.csv": "Reference,MPN,Lifecycle,DNP\nR1,OLD,EOL,true\nR2,NEW,Active,false\n",
      "boardreadyops.yml": "version: 1\nprojects:\n  - path: .\n    bom: bom.csv\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["bom.eol-detection"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });
});
