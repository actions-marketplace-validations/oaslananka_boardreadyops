import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, pinmapCollisionFixture } from "../helpers.js";

describe("pinmap.collision", () => {
  it("flags duplicate pin or net entries", async () => {
    const fixture = await pinmapCollisionFixture();
    const result = await runPipeline({ path: fixture, failOn: "never" });
    const findings = expectRule(result, "pinmap.collision", 1);
    expect(findings[0]?.details).toHaveProperty("entry");
  });
});
