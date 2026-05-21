import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("manufacturing.jobset-outputs", () => {
  it("flags missing enabled KiCad jobset output files", async () => {
    const root = await writeFixture({
      "jobset.kicad_pro": JSON.stringify({ jobsets: ["fab/outputs.kicad_jobset"] }),
      "jobset.kicad_sch": "(kicad_sch)",
      "jobset.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "fab/outputs.kicad_jobset": JSON.stringify({
        jobs: [{ type: "gerber", outputPath: "missing.gbr", destinationPath: "fabrication", enabled: true }],
      }),
      "boardreadyops.yml": "version: 1\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["manufacturing.jobset-outputs"], failOn: "never" });

    expect(result.findings[0]?.details).toMatchObject({ type: "gerber", outputPath: "fabrication/missing.gbr" });
  });
});
