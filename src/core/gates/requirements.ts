import type { ProjectContext } from "../context.js";
import { createFinding, type Finding } from "../findings.js";

const gateRequirementNames = [
  "clean-drc",
  "clean-erc",
  "gerber",
  "drill",
  "position",
  "bom",
  "changelog",
  "tagged-release",
  "no-eol-components",
] as const;

type GateRequirementName = (typeof gateRequirementNames)[number];

const manufacturingOutputRequirements = new Set<GateRequirementName>(["gerber", "drill", "position", "bom"]);

const gateRequirementRules: Record<GateRequirementName, string> = {
  "clean-drc": "drc.kicad",
  "clean-erc": "erc.kicad",
  gerber: "manufacturing.outputs-present",
  drill: "manufacturing.outputs-present",
  position: "manufacturing.outputs-present",
  bom: "manufacturing.outputs-present",
  changelog: "release.changelog-present",
  "tagged-release": "release.tag-matches-revision",
  "no-eol-components": "bom.eol-detection",
};

export function requiredManufacturingOutputs(requirements: string[]): string[] {
  return requirements.filter(
    (requirement): requirement is GateRequirementName =>
      isGateRequirement(requirement) && manufacturingOutputRequirements.has(requirement),
  );
}

export function requiredGateRules(requirements: string[]): string[] {
  return [
    ...new Set(
      requirements
        .filter((requirement): requirement is GateRequirementName => isGateRequirement(requirement))
        .map((requirement) => gateRequirementRules[requirement]),
    ),
  ];
}

export function gateRequirementFindings(
  findings: Finding[],
  requirements: string[],
  projects?: ProjectContext[],
): Finding[] {
  return requirements
    .filter(isGateRequirement)
    .flatMap((requirement) => requirementFindings(findings, requirement, projects))
    .map(({ requirement, blockedBy, reason }) =>
      createFinding({
        ruleId: "gate.requirement",
        severity: "critical",
        message: `Gate requirement ${requirement} is not satisfied.`,
        resource: { path: ".", kind: "manifest" },
        details: {
          requirement,
          blockedBy: blockedBy.map((finding) => finding.ruleId),
          ...(reason ? { reason } : {}),
        },
      }),
    );
}

function isGateRequirement(value: string): value is GateRequirementName {
  return gateRequirementNames.includes(value as GateRequirementName);
}

function requirementFindings(
  findings: Finding[],
  requirement: GateRequirementName,
  projects?: ProjectContext[],
): Array<{ requirement: GateRequirementName; blockedBy: Finding[]; reason?: string }> {
  const blockedBy = findings.filter((finding) => requirementMatchesFinding(requirement, finding));
  if (blockedBy.length > 0) {
    return [{ requirement, blockedBy }];
  }
  const reason = skippedTargetReason(requirement, projects);
  return reason ? [{ requirement, blockedBy: [], reason }] : [];
}

function skippedTargetReason(requirement: GateRequirementName, projects?: ProjectContext[]): string | undefined {
  if (!projects) {
    return undefined;
  }
  if (requirement === "clean-drc" && projects.flatMap((project) => project.boardFiles).length === 0) {
    return "no PCB files were checked";
  }
  if (requirement === "clean-erc" && projects.flatMap((project) => project.schematicFiles).length === 0) {
    return "no schematic files were checked";
  }
  return undefined;
}

function requirementMatchesFinding(requirement: GateRequirementName, finding: Finding): boolean {
  switch (requirement) {
    case "clean-drc":
      return finding.ruleId.startsWith("drc.");
    case "clean-erc":
      return finding.ruleId.startsWith("erc.");
    case "gerber":
    case "drill":
    case "position":
    case "bom":
      return finding.ruleId === "manufacturing.outputs-present" && finding.details?.required === requirement;
    case "changelog":
      return finding.ruleId === "release.changelog-present";
    case "tagged-release":
      return finding.ruleId === "release.tag-matches-revision";
    case "no-eol-components":
      return finding.ruleId === "bom.eol-detection";
  }
}
