import { describe, expect, it } from "vitest";

import { findUnpinnedActionUses } from "../../../scripts/check-action-pins.mjs";

describe("check-action-pins", () => {
  it("rejects Markdown action examples without a release SHA and tag comment", () => {
    expect(
      findUnpinnedActionUses(
        "README.md",
        [
          "      - uses: actions/checkout@v6",
          "      - uses: oaslananka/boardreadyops@0123456789012345678901234567890123456789 # v1.0.2",
        ].join("\n"),
      ),
    ).toEqual(["README.md:1:       - uses: actions/checkout@v6"]);
  });

  it("accepts SHA-pinned action examples when the version comment has compact spacing", () => {
    expect(
      findUnpinnedActionUses(
        "README.md",
        "      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd# v6.0.2",
      ),
    ).toEqual([]);
  });

  it("ignores prose that mentions uses-like text outside YAML action steps", () => {
    expect(
      findUnpinnedActionUses("README.md", "The workflow uses: actions/checkout@v6 before running BoardReadyOps."),
    ).toEqual([]);
  });
});
