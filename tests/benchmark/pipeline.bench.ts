import path from "node:path";
import { bench, describe } from "vitest";
import { runPipeline } from "../../src/core/pipeline.js";

describe("pipeline throughput", () => {
  bench("safe-basic project, no kicad", async () => {
    await runPipeline({ path: path.resolve("tests/fixtures/projects/safe-basic"), requireKicad: false });
  });

  bench("multiple projects, no kicad", async () => {
    await runPipeline({ path: path.resolve("tests/fixtures/projects/multiple-projects"), requireKicad: false });
  });
});
