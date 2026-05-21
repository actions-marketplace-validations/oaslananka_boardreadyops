import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, runFixture, writeFixture } from "../helpers.js";

describe("release.revision-set", () => {
  it("flags boards without title-block revisions", async () => {
    const result = await runFixture("release-missing-revision");
    const findings = expectRule(result, "release.revision-set", 1);
    expect(findings[0]?.resource.kind).toBe("pcb");
  });

  it("flags revisions that do not match the configured tag pattern", async () => {
    const fixture = await writeFixture({
      "rev.kicad_pro": "{}",
      "rev.kicad_sch": "(kicad_sch)",
      "rev.kicad_pcb": '(kicad_pcb (title_block (rev "prototype")))',
      "fab/README.md": "Fabrication notes.",
      "CHANGELOG.md": "## [prototype]\n\nPrototype release.\n",
      "boardreadyops.yml":
        "version: 1\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: false\n",
    });
    const result = await runPipeline({ path: fixture, failOn: "never" });
    expectRule(result, "release.revision-set", 1);
  });
});
