import path from "node:path";
import * as core from "@actions/core";
import type { PipelineOptions } from "../core/context.js";
import type { FailOn } from "../core/findings.js";
import { isInside } from "../util/path.js";

export interface ActionInputs extends Partial<PipelineOptions> {
  outputs: {
    sarif?: string | undefined;
    json?: string | undefined;
    markdown?: string | undefined;
  };
  uploadSarif: boolean;
  uploadArtifacts: boolean;
  commentPr: boolean;
  artifactName: string;
}

export function readActionInputs(workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()): ActionInputs {
  const root = path.resolve(workspace);
  return {
    cwd: root,
    path: workspacePath(root, core.getInput("path") || "."),
    project: optionalPath(root, core.getInput("project")),
    config: optionalPath(root, core.getInput("config") || "boardreadyops.yml"),
    mode: modeInput(core.getInput("mode") || "warn"),
    requireKicad: boolInput("require-kicad", false),
    kicadCli: empty(core.getInput("kicad-cli")),
    bom: bomInput(root, core.getInput("bom") || "auto"),
    pinmap: optionalPath(root, core.getInput("pinmap")),
    variant: empty(core.getInput("variant")),
    failOn: failOnInput(core.getInput("fail-on") || "high"),
    annotations: boolInput("annotations", true),
    quiet: false,
    verbose: false,
    color: "never",
    rules: [],
    skips: [],
    outputs: {
      sarif: empty(core.getInput("sarif")),
      json: empty(core.getInput("json")),
      markdown: empty(core.getInput("markdown")),
    },
    uploadSarif: boolInput("upload-sarif", true),
    uploadArtifacts: boolInput("upload-artifacts", true),
    commentPr: boolInput("comment-pr", true),
    artifactName: artifactName(core.getInput("artifact-name") || "boardreadyops"),
  };
}

function boolInput(name: string, fallback: boolean): boolean {
  const value = core.getInput(name);
  if (value.trim() === "") {
    return fallback;
  }
  if (/^(true|1|yes)$/i.test(value)) {
    return true;
  }
  if (/^(false|0|no)$/i.test(value)) {
    return false;
  }
  throw new Error(`Input ${name} must be true or false.`);
}

function modeInput(value: string): "warn" | "enforce" {
  if (value === "warn" || value === "enforce") {
    return value;
  }
  throw new Error("Input mode must be warn or enforce.");
}

function failOnInput(value: string): FailOn {
  if (value === "critical" || value === "high" || value === "medium" || value === "low" || value === "never") {
    return value;
  }
  throw new Error("Input fail-on must be critical, high, medium, low, or never.");
}

function workspacePath(workspace: string, value: string): string {
  const resolved = path.resolve(workspace, value);
  if (!isInside(workspace, resolved)) {
    throw new Error(`Input path must stay inside GITHUB_WORKSPACE: ${value}`);
  }
  return resolved;
}

function optionalPath(workspace: string, value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : workspacePath(workspace, trimmed);
}

function bomInput(workspace: string, value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "auto" ? trimmed || "auto" : workspacePath(workspace, trimmed);
}

function empty(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function artifactName(value: string): string {
  if (value.trim() === "" || /[\\/]/.test(value)) {
    throw new Error("artifact-name must be a non-empty artifact name.");
  }
  return value.trim();
}
