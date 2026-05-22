import { registerRule } from "../core/rule-registry.js";
import { dnpConsistencyRule } from "./bom/dnp-consistency.js";
import { eolDetectionRule } from "./bom/eol-detection.js";
import { footprintMismatchRule } from "./bom/footprint-mismatch.js";
import { lifecycleRule } from "./bom/lifecycle.js";
import { missingMpnRule } from "./bom/missing-mpn.js";
import { singleSourceRule } from "./bom/single-source.js";
import { variantConsistencyRule } from "./bom/variant-consistency.js";
import { boardOutlineRule } from "./design/board-outline.js";
import { copperBalanceRule } from "./design/copper-balance.js";
import { runDrcRule } from "./drc/run-drc.js";
import { runErcRule } from "./erc/run-erc.js";
import { drillCoverageRule } from "./manufacturing/drill-coverage.js";
import { fabNotesRule } from "./manufacturing/fab-notes.js";
import { jobsetOutputsRule } from "./manufacturing/jobset-outputs.js";
import { layerStackupRule } from "./manufacturing/layer-stackup.js";
import { outputsPresentRule } from "./manufacturing/outputs-present.js";
import { panelSanityRule } from "./manufacturing/panel-sanity.js";
import { pinmapNetLabelRule } from "./pinmap/net-label.js";
import { pinmapCollisionRule, pinmapUnmappedPinRule, pinmapVerifyRule } from "./pinmap/verify.js";
import { changelogPresentRule } from "./release/changelog-present.js";
import { revisionSetRule } from "./release/revision-set.js";
import { tagMatchesRevisionRule } from "./release/tag-matches-revision.js";
import { versionFormatRule } from "./release/version-format.js";

let registered = false;

export function registerBuiltInRules(): void {
  if (registered) {
    return;
  }
  [
    runDrcRule,
    runErcRule,
    missingMpnRule,
    singleSourceRule,
    eolDetectionRule,
    lifecycleRule,
    footprintMismatchRule,
    dnpConsistencyRule,
    variantConsistencyRule,
    copperBalanceRule,
    boardOutlineRule,
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
  ].forEach(registerRule);
  registered = true;
}

export function resetBuiltInRuleRegistrationForTests(): void {
  registered = false;
}
