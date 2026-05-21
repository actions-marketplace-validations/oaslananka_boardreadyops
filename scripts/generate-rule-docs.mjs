import { mkdir, writeFile } from "node:fs/promises";

const rules = [
  {
    id: "drc.kicad",
    severity: "high",
    appliesTo: ["pcb"],
    configKeys: ["rules.drc.kicad.enabled", "rules.drc.severity-overrides"],
    checks: "Runs KiCad PCB DRC and normalizes KiCad diagnostics into BoardReadyOps findings.",
    fires: "Fires for every KiCad DRC diagnostic in the JSON report.",
    details: "{ source: 'kicad-cli', diagnostic: <KiCad diagnostic object> }",
  },
  {
    id: "erc.kicad",
    severity: "high",
    appliesTo: ["schematic"],
    configKeys: ["rules.erc.kicad.enabled", "rules.erc.severity-overrides"],
    checks: "Runs KiCad schematic ERC and normalizes KiCad diagnostics into BoardReadyOps findings.",
    fires: "Fires for every KiCad ERC diagnostic in the JSON report.",
    details: "{ source: 'kicad-cli', diagnostic: <KiCad diagnostic object> }",
  },
  {
    id: "bom.missing-mpn",
    severity: "high",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.missing-mpn.enabled", "rules.bom.missing-mpn.ignore-refs"],
    checks: "Checks normalized BOM rows for missing manufacturer part numbers.",
    fires: "Fires when a populated BOM row has no MPN and the reference is not ignored.",
    details: "{ reference, value, footprint }",
  },
  {
    id: "bom.single-source",
    severity: "medium",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.single-source.enabled", "rules.bom.single-source.severity"],
    checks: "Checks supplier columns for parts that only list one source.",
    fires: "Fires when supplier metadata is present and a row has a single supplier.",
    details: "{ reference, mpn, suppliers }",
  },
  {
    id: "bom.eol-detection",
    severity: "high",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.eol-detection.enabled", "rules.bom.eol-detection.severity"],
    checks: "Checks lifecycle-style columns for local end-of-life markers.",
    fires: "Fires when lifecycle text indicates obsolete, NRND, discontinued, or EOL status.",
    details: "{ reference, mpn, lifecycle }",
  },
  {
    id: "bom.lifecycle",
    severity: "medium",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.lifecycle.enabled", "rules.bom.lifecycle.db"],
    checks:
      "Checks BOM lifecycle columns or a local lifecycle database for EOL, NRND, preview, and discontinued markers.",
    fires: "Fires when a component lifecycle status carries release or sourcing risk.",
    details: "{ reference, mpn, lifecycle }",
  },
  {
    id: "bom.footprint-mismatch",
    severity: "medium",
    appliesTo: ["bom", "pcb"],
    configKeys: ["rules.bom.footprint-mismatch.enabled", "rules.bom.footprint-mismatch.severity"],
    checks: "Compares normalized BOM footprint strings with PCB footprint assignments.",
    fires: "Fires when a reference appears in both sources with different footprints.",
    details: "{ reference, bomFootprint, pcbFootprint }",
  },
  {
    id: "bom.dnp-consistency",
    severity: "medium",
    appliesTo: ["bom", "pcb"],
    configKeys: ["rules.bom.dnp-consistency.enabled", "rules.bom.dnp-consistency.severity"],
    checks: "Compares BOM DNP flags with PCB footprint population attributes.",
    fires: "Fires when BOM and PCB disagree on populated versus DNP state.",
    details: "{ reference, bomDnp, pcbDnp }",
  },
  {
    id: "bom.variant-consistency",
    severity: "high",
    appliesTo: ["bom", "project"],
    configKeys: ["projects.variants", "rules.bom.variant-consistency.enabled"],
    checks: "Checks KiCad 10 variant DNP overrides against each variant-specific BOM.",
    fires: "Fires when a component disabled by the active variant still appears populated in that variant BOM.",
    details: "{ variant, reference }",
  },
  {
    id: "design.copper-balance",
    severity: "low",
    appliesTo: ["pcb"],
    configKeys: ["rules.design.copper-balance.enabled", "rules.design.copper-balance.min-coverage-percent"],
    checks: "Checks filled copper area per layer against board area to identify low copper coverage.",
    fires: "Fires when a copper layer is below the configured minimum coverage percentage.",
    details: "{ layer, coveragePercent, minimum }",
  },
  {
    id: "design.board-outline",
    severity: "high",
    appliesTo: ["pcb"],
    configKeys: ["rules.design.board-outline.enabled"],
    checks: "Checks that the PCB Edge.Cuts outline is present and closed.",
    fires: "Fires when Edge.Cuts segments do not form a closed outline.",
    details: "{ outlineClosed }",
  },
  {
    id: "pinmap.verify",
    severity: "high",
    appliesTo: ["pinmap", "schematic"],
    configKeys: ["rules.pinmap.verify.enabled", "rules.pinmap.verify.severity"],
    checks: "Checks configured pinmap nets against schematic net labels.",
    fires: "Fires when a pinmap entry points at a net not present in the schematic.",
    details: "{ entry }",
  },
  {
    id: "pinmap.unmapped-pin",
    severity: "medium",
    appliesTo: ["pinmap", "schematic"],
    configKeys: ["rules.pinmap.unmapped-pin.enabled", "rules.pinmap.unmapped-pin.severity"],
    checks: "Checks connected schematic pins against pinmap entries.",
    fires: "Fires when a connected schematic pin has no matching pinmap entry.",
    details: "{ designator, pin, net }",
  },
  {
    id: "pinmap.collision",
    severity: "high",
    appliesTo: ["pinmap"],
    configKeys: ["rules.pinmap.collision.enabled", "rules.pinmap.collision.severity"],
    checks: "Checks pinmap files for duplicate pin or net assignments.",
    fires: "Fires when a pin key or net key appears more than once.",
    details: "{ key, kind }",
  },
  {
    id: "pinmap.net-label",
    severity: "medium",
    appliesTo: ["pinmap", "schematic"],
    configKeys: ["rules.pinmap.net-label.enabled", "pinmap", "projects.pinmap"],
    checks: "Checks pinmap net names against schematic global, local, and hierarchical labels.",
    fires: "Fires when a pinmap net has no matching schematic label.",
    details: "{ net, entry }",
  },
  {
    id: "manufacturing.outputs-present",
    severity: "high",
    appliesTo: ["manifest", "pcb"],
    configKeys: ["rules.manufacturing.outputs-present.required"],
    checks: "Checks configured fabrication outputs and freshness against PCB source mtimes.",
    fires: "Fires when a required output is missing or older than the PCB.",
    details: "{ required }",
  },
  {
    id: "manufacturing.jobset-outputs",
    severity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.manufacturing.jobset-outputs.enabled"],
    checks: "Checks enabled KiCad 10 jobset entries for their expected output files.",
    fires: "Fires when an enabled jobset output path does not exist.",
    details: "{ type, outputPath }",
  },
  {
    id: "manufacturing.panel-sanity",
    severity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.manufacturing.panel-sanity.panelized"],
    checks: "Checks that panelized builds include expected panel output files.",
    fires: "Fires when panelization is enabled but no panel output is present.",
    details: "{ panelized }",
  },
  {
    id: "manufacturing.fab-notes",
    severity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.manufacturing.fab-notes.enabled"],
    checks: "Checks for fabrication notes in known project paths.",
    fires: "Fires when no fabrication notes file is present.",
    details: "{ expectedPaths }",
  },
  {
    id: "manufacturing.drill-coverage",
    severity: "high",
    appliesTo: ["pcb"],
    configKeys: ["rules.manufacturing.drill-coverage.enabled"],
    checks: "Checks parsed PCB drill sizes against generated Excellon drill files.",
    fires: "Fires when a PCB drill size is absent from drill output.",
    details: "{ missingDrills }",
  },
  {
    id: "manufacturing.layer-stackup",
    severity: "medium",
    appliesTo: ["pcb"],
    configKeys: ["rules.manufacturing.layer-stackup.enabled", "rules.manufacturing.layer-stackup.expected-layers"],
    checks: "Checks KiCad PCB stackup layer count against expected copper layers.",
    fires: "Fires when the stackup block contains a different copper layer count than expected.",
    details: "{ expectedLayers, stackupLayers }",
  },
  {
    id: "release.revision-set",
    severity: "high",
    appliesTo: ["pcb"],
    configKeys: ["rules.release.revision-set.tag-pattern"],
    checks: "Checks board title-block revisions against the configured release tag pattern.",
    fires: "Fires when revision is empty or does not match the configured pattern.",
    details: "{ revision, tagPattern }",
  },
  {
    id: "release.changelog-present",
    severity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.release.changelog-present.enabled"],
    checks: "Checks CHANGELOG.md for an entry matching the current board revision.",
    fires: "Fires when CHANGELOG.md is missing or lacks the current revision entry.",
    details: "{ revision }",
  },
  {
    id: "release.tag-matches-revision",
    severity: "high",
    appliesTo: ["manifest", "pcb"],
    configKeys: ["rules.release.tag-matches-revision.enabled"],
    checks: "Checks tag CI context against board revision.",
    fires: "Fires when GITHUB_REF_TYPE=tag and GITHUB_REF_NAME does not match the revision.",
    details: "{ revision, tag }",
  },
  {
    id: "release.version-format",
    severity: "low",
    appliesTo: ["pcb", "schematic"],
    configKeys: ["rules.release.version-format.enabled", "rules.release.version-format.pattern"],
    checks: "Checks schematic and PCB revision strings against the configured release version pattern.",
    fires: "Fires when a revision does not match vMAJOR.MINOR or rMAJOR.MINOR by default.",
    details: "{ revision, pattern }",
  },
];

const groups = new Map();
for (const item of rules) {
  const group = item.id.split(".")[0];
  if (!groups.has(group)) {
    groups.set(group, []);
  }
  groups.get(group).push(item);
}

await mkdir("docs/rules", { recursive: true });
await writeFile(
  "docs/rules/index.md",
  `# Rules

BoardReadyOps rules use stable \`group.rule\` identifiers. Each rule page records the default severity, applicable input type, configuration keys, details shape, and reporting context.

${rules.map((rule) => `- [${rule.id}](${rule.id}.md)`).join("\n")}
`,
  "utf8",
);

for (const [group, items] of groups) {
  await writeFile(
    `docs/rules/${group}.md`,
    `# ${title(group)} Rules

${items.map((rule) => `- [${rule.id}](${rule.id}.md): ${rule.checks}`).join("\n")}
`,
    "utf8",
  );
}

for (const rule of rules) {
  await writeFile(`docs/rules/${rule.id}.md`, renderRule(rule), "utf8");
}

function renderRule(rule) {
  return `---
id: ${rule.id}
severity-default: ${rule.severity}
applies-to:
${rule.appliesTo.map((entry) => `  - ${entry}`).join("\n")}
config-keys:
${rule.configKeys.map((entry) => `  - ${entry}`).join("\n")}
---

# ${rule.id}

## What It Checks

${rule.checks}

## When It Fires

${rule.fires}

## Configuration Example

\`\`\`yaml
version: 1
rules:
  ${rule.id}:
    enabled: true
    severity: ${rule.severity}
\`\`\`

## JSON Finding Details Shape

\`\`\`text
${rule.details}
\`\`\`

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
`;
}

function title(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
