import { describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

describe("pinmap.verify", () => {
  it("flags pinmap nets missing from schematic labels", async () => {
    const result = await runFixture("pinmap-mismatch");
    const findings = expectRule(result, "pinmap.verify", 1);
    expect(findings[0]?.resource.kind).toBe("pinmap");
  });
});
