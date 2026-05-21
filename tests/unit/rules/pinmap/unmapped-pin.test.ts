import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, pinmapCollisionFixture } from "../helpers.js";

describe("pinmap.unmapped-pin", () => {
  it("flags connected schematic pins without pinmap entries", async () => {
    const fixture = await pinmapCollisionFixture();
    const result = await runPipeline({ path: fixture, failOn: "never" });
    const findings = expectRule(result, "pinmap.unmapped-pin", 1);
    expect(findings[0]?.details).toMatchObject({ pin: "2", net: "N2", designator: "U1" });
  });
});
