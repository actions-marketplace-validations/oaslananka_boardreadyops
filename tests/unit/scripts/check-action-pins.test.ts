import { describe, expect, it } from "vitest";

import { findUnpinnedActionUses } from "../../../scripts/check-action-pins.mjs";

describe("check-action-pins", () => {
  it("rejects Markdown action examples without a release SHA and source comment", () => {
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

  it("accepts SHA-pinned action examples when the source comment has compact spacing", () => {
    expect(
      findUnpinnedActionUses(
        "README.md",
        "      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd# v6.0.2",
      ),
    ).toEqual([]);
  });

  it("accepts SHA-pinned current-contract examples without a release tag", () => {
    expect(
      findUnpinnedActionUses(
        "README.md",
        "      - uses: oaslananka/boardreadyops@4efcd6d73e2e0de15a39c745b1a67e6c7a4f9ce0 # current action contract",
      ),
    ).toEqual([]);
  });

  it("ignores prose that mentions uses-like text outside YAML action steps", () => {
    expect(
      findUnpinnedActionUses("README.md", "The workflow uses: actions/checkout@v6 before running BoardReadyOps."),
    ).toEqual([]);
  });
});
