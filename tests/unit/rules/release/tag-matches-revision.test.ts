import { afterEach, describe, expect, it } from "vitest";
import { expectRule, runFixture } from "../helpers.js";

const previousType = process.env.GITHUB_REF_TYPE;
const previousName = process.env.GITHUB_REF_NAME;

describe("release.tag-matches-revision", () => {
  afterEach(() => {
    restore("GITHUB_REF_TYPE", previousType);
    restore("GITHUB_REF_NAME", previousName);
  });

  it("flags tag contexts that do not match the board revision", async () => {
    process.env.GITHUB_REF_TYPE = "tag";
    process.env.GITHUB_REF_NAME = "v2.0.0";
    const result = await runFixture("release-tag-mismatch");
    const findings = expectRule(result, "release.tag-matches-revision", 1);
    expect(findings[0]?.details).toMatchObject({ tag: "v2.0.0", revision: "1.0.0" });
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
