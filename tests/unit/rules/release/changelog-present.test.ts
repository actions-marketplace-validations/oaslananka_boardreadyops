import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { expectRule, writeFixture } from "../helpers.js";

const SLOW_FIXTURE_TIMEOUT_MS = 15_000;

describe("release.changelog-present", () => {
  it(
    "flags changelogs without the current board revision entry",
    async () => {
      const fixture = await writeFixture({
        "release.kicad_pro": "{}",
        "release.kicad_sch": "(kicad_sch)",
        "release.kicad_pcb": '(kicad_pcb (title_block (rev "1.2.3")))',
        "fab/README.md": "Fabrication notes.",
        "CHANGELOG.md": "## [1.0.0]\n\nInitial release.\n",
        "boardreadyops.yml":
          "version: 1\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: true\n",
      });
      const result = await runPipeline({ path: fixture, failOn: "never" });
      const findings = expectRule(result, "release.changelog-present", 1);
      expect(findings[0]?.details).toMatchObject({ missingRevisions: ["1.2.3"] });
    },
    SLOW_FIXTURE_TIMEOUT_MS,
  );
});
