import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseJobset } from "../../../src/kicad/jobset.js";
import { writeFixture } from "../rules/helpers.js";

describe("KiCad 10 jobset parser", () => {
  it("parses enabled KiCad jobset outputs", async () => {
    const root = await writeFixture({
      "board.kicad_jobset": JSON.stringify({
        jobs: [
          { type: "gerber", outputPath: "fab/board.gbr", enabled: true },
          { type: "step", output_path: "fab/board.step", enabled: false },
          { type: "pdf", output: "board.pdf", destinationPath: "fab", enabled: true },
        ],
      }),
    });

    const parsed = await parseJobset(path.join(root, "board.kicad_jobset"));

    expect(parsed.jobs).toEqual([
      { type: "gerber", outputPath: "fab/board.gbr", enabled: true },
      { type: "step", outputPath: "fab/board.step", enabled: false },
      { type: "pdf", outputPath: "board.pdf", destinationPath: "fab", enabled: true },
    ]);
    await fs.rm(root, { recursive: true, force: true });
  });

  it("parses every job inside a grouped S-expression jobset", async () => {
    const root = await writeFixture({
      "board.kicad_jobset": `(kicad_jobset
        (jobs
          (job "Gerber Files" (destination "fab") (output "board.gbr"))
          (job drill (destination_path "fab") (output "board.drl") (enabled  false))
        )
      )`,
    });

    const parsed = await parseJobset(path.join(root, "board.kicad_jobset"));

    expect(parsed.jobs).toEqual([
      { type: "Gerber Files", outputPath: "board.gbr", destinationPath: "fab", enabled: true },
      { type: "drill", outputPath: "board.drl", destinationPath: "fab", enabled: false },
    ]);
    await fs.rm(root, { recursive: true, force: true });
  });
});
