import { describe, expect, it } from "vitest";
import type { RuleContext } from "../../../src/core/context.js";
import { createLogger } from "../../../src/core/logger.js";
import type { Rule } from "../../../src/core/rule-registry.js";
import { dnpConsistencyRule } from "../../../src/rules/bom/dnp-consistency.js";
import { eolDetectionRule } from "../../../src/rules/bom/eol-detection.js";
import { footprintMismatchRule } from "../../../src/rules/bom/footprint-mismatch.js";
import { lifecycleRule } from "../../../src/rules/bom/lifecycle.js";
import { missingMpnRule } from "../../../src/rules/bom/missing-mpn.js";
import { singleSourceRule } from "../../../src/rules/bom/single-source.js";
import { variantConsistencyRule } from "../../../src/rules/bom/variant-consistency.js";
import { boardOutlineRule } from "../../../src/rules/design/board-outline.js";
import { copperBalanceRule } from "../../../src/rules/design/copper-balance.js";
import { runDrcRule } from "../../../src/rules/drc/run-drc.js";
import { runErcRule } from "../../../src/rules/erc/run-erc.js";
import { drillCoverageRule } from "../../../src/rules/manufacturing/drill-coverage.js";
import { fabNotesRule } from "../../../src/rules/manufacturing/fab-notes.js";
import { jobsetOutputsRule } from "../../../src/rules/manufacturing/jobset-outputs.js";
import { layerStackupRule } from "../../../src/rules/manufacturing/layer-stackup.js";
import { outputsPresentRule } from "../../../src/rules/manufacturing/outputs-present.js";
import { panelSanityRule } from "../../../src/rules/manufacturing/panel-sanity.js";
import { pinmapNetLabelRule } from "../../../src/rules/pinmap/net-label.js";
import { pinmapCollisionRule, pinmapUnmappedPinRule, pinmapVerifyRule } from "../../../src/rules/pinmap/verify.js";
import { changelogPresentRule } from "../../../src/rules/release/changelog-present.js";
import { revisionSetRule } from "../../../src/rules/release/revision-set.js";
import { tagMatchesRevisionRule } from "../../../src/rules/release/tag-matches-revision.js";
import { versionFormatRule } from "../../../src/rules/release/version-format.js";

const rules: Rule[] = [
  runDrcRule,
  runErcRule,
  missingMpnRule,
  singleSourceRule,
  eolDetectionRule,
  lifecycleRule,
  footprintMismatchRule,
  dnpConsistencyRule,
  variantConsistencyRule,
  boardOutlineRule,
  copperBalanceRule,
  pinmapVerifyRule,
  pinmapUnmappedPinRule,
  pinmapCollisionRule,
  pinmapNetLabelRule,
  outputsPresentRule,
  jobsetOutputsRule,
  panelSanityRule,
  fabNotesRule,
  drillCoverageRule,
  layerStackupRule,
  revisionSetRule,
  changelogPresentRule,
  tagMatchesRevisionRule,
  versionFormatRule,
];

describe("disabled rules", () => {
  it("returns no findings from each rule when disabled in configuration", async () => {
    for (const candidate of rules) {
      const context = ruleContext({ [candidate.meta.id]: { enabled: false } });
      await expect(candidate.run(context), candidate.meta.id).resolves.toEqual([]);
    }
  });

  it("returns no pinmap findings when no pinmap is configured", async () => {
    const context = ruleContext({});
    await expect(pinmapVerifyRule.run(context)).resolves.toEqual([]);
    await expect(pinmapCollisionRule.run(context)).resolves.toEqual([]);
    await expect(pinmapUnmappedPinRule.run(context)).resolves.toEqual([]);
  });
});

function ruleContext(rulesConfig: NonNullable<RuleContext["config"]["rules"]>): RuleContext {
  return {
    root: process.cwd(),
    projects: [],
    config: { version: 1, rules: rulesConfig },
    options: {
      cwd: process.cwd(),
      path: process.cwd(),
      project: undefined,
      config: undefined,
      mode: "warn",
      requireKicad: false,
      kicadCli: undefined,
      bom: undefined,
      pinmap: undefined,
      variant: undefined,
      concurrency: 1,
      failOn: "never",
      gate: undefined,
      rules: [],
      skips: [],
      ignoreBaseline: false,
      annotations: false,
      quiet: true,
      verbose: false,
      color: "never",
    },
    logger: createLogger("silent"),
  };
}
