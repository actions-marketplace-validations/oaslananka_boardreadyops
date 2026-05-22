import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

type ActionMetadata = {
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  runs?: Record<string, unknown>;
};

type PackageManifest = {
  engines?: {
    node?: string;
  };
};

describe("container action release surfaces", () => {
  it("keeps the Docker action contract aligned with the Node action", async () => {
    const [nodeAction, containerAction] = await Promise.all([
      loadActionMetadata("action.yml"),
      loadActionMetadata("apps/container/action.yml"),
    ]);

    expect(containerAction.inputs).toEqual(nodeAction.inputs);
    expect(containerAction.outputs).toEqual(nodeAction.outputs);
    expect(containerAction.runs).toMatchObject({
      using: "docker",
      image: "docker://ghcr.io/oaslananka/boardreadyops-full:v1",
      entrypoint: "/usr/local/bin/boardreadyops-action",
    });
    expect(containerAction.runs?.args).toEqual(
      Object.keys(nodeAction.inputs ?? {}).map((input) => inputExpression(input)),
    );
  });

  it("maps Docker action args to the Node action input environment", async () => {
    const entrypoint = await readFile("apps/container/action-entrypoint.sh", "utf8");

    expect(entrypoint).toContain(inputEnvAssignment("INPUT_PATH", 1));
    expect(entrypoint).toContain(inputEnvAssignment("INPUT_PROJECT", 2));
    expect(entrypoint).toContain(inputEnvAssignment("INPUT_REQUIRE-KICAD", 5));
    expect(entrypoint).toContain(inputEnvAssignment("INPUT_UPLOAD-SARIF", 13));
    expect(entrypoint).toContain(inputEnvAssignment("INPUT_FAIL-ON", 17));
  });

  it("builds a GitHub-compatible Ubuntu image with an unprivileged account", async () => {
    const dockerfile = await readFile("apps/container/Dockerfile", "utf8");

    expect(dockerfile).toContain("FROM ubuntu:24.04@sha256:");
    expect(dockerfile).toContain("ARG NODE_VERSION=22.");
    expect(dockerfile).toContain("ARG NPM_VERSION=11.15.0");
    expect(dockerfile).toContain(`npm install --global "npm@\${NPM_VERSION}"`);
    expect(dockerfile).toContain(`npm install --global "boardreadyops@\${BOARDREADYOPS_VERSION}"`);
    expect(dockerfile).toContain("useradd --create-home --shell /bin/bash --uid 10001 boardreadyops");
    expect(dockerfile).not.toContain("\nUSER ");
    expect(dockerfile).toContain('ENTRYPOINT ["boardreadyops"]');
  });

  it("keeps the container Node pin inside the package engine range", async () => {
    const [dockerfile, workflow, packageJson] = await Promise.all([
      readFile("apps/container/Dockerfile", "utf8"),
      readFile(".github/workflows/container-build.yml", "utf8"),
      readPackageManifest(),
    ]);

    const dockerNodeMajor = Number(requireMatch(dockerfile, /^ARG NODE_VERSION=(\d+)\./m));
    const workflowNodeMajor = Number(requireMatch(workflow, /^\s+NODE_VERSION: "(\d+)\./m));
    const engineRange = packageJson.engines?.node ?? "";
    const minimumMajor = Number(requireMatch(engineRange, />=(\d+)/));
    const exclusiveMaximumMajor = Number(requireMatch(engineRange, /<(\d+)/));

    expect(workflowNodeMajor).toBe(dockerNodeMajor);
    expect(dockerNodeMajor).toBeGreaterThanOrEqual(minimumMajor);
    expect(dockerNodeMajor).toBeLessThan(exclusiveMaximumMajor);
  });

  it("publishes signed multi-arch GHCR images with scan and SBOM coverage", async () => {
    const workflow = await readFile(".github/workflows/container-build.yml", "utf8");

    expect(workflow).toContain("ghcr.io/oaslananka/boardreadyops-full");
    expect(workflow).toContain("linux/amd64,linux/arm64");
    expect(workflow).toContain("sbom: true");
    expect(workflow).toContain("cosign sign");
    expect(workflow).toContain("aquasecurity/trivy-action@");
  });

  it("waits for npm package availability before publishing the container", async () => {
    const workflow = await readFile(".github/workflows/container-build.yml", "utf8");

    expect(workflow).toContain("Wait for npm package availability");
    expect(workflow).toContain(`npm view "boardreadyops@${shellVariable("PACKAGE_VERSION")}" version`);
  });

  it("falls back to a published package version for pull request smoke builds", async () => {
    const workflow = await readFile(".github/workflows/container-build.yml", "utf8");

    expect(workflow).toContain(`elif [ "${shellVariable("GITHUB_EVENT_NAME")}" = "pull_request" ]; then`);
    expect(workflow).toContain(`candidate="$(jq -er '.version' package.json)"`);
    expect(workflow).toContain(`npm view "boardreadyops@${shellVariable("candidate")}" version`);
    expect(workflow).toContain(`version="$(npm view boardreadyops version)"`);
    expect(workflow).toContain("using latest published");
  });

  it("waits for npm package availability before release smoke builds", async () => {
    const workflow = await readFile(".github/workflows/container-build.yml", "utf8");

    const waitIndex = workflow.indexOf("Wait for npm package availability");
    const smokeBuildIndex = workflow.indexOf("Build local smoke image");

    expect(waitIndex).toBeGreaterThan(-1);
    expect(waitIndex).toBeLessThan(smokeBuildIndex);
  });

  it("only publishes stable moving aliases for stable release tags", async () => {
    const workflow = await readFile(".github/workflows/container-build.yml", "utf8");

    expect(workflow).toContain("Resolve image tags");
    expect(workflow).toContain(`if [[ "${shellVariable("version")}" != *-* ]]; then`);
    expect(workflow).toContain(`echo "${shellVariable("IMAGE_NAME")}:v${shellVariable("major")}"`);
    expect(workflow).toContain(`echo "${shellVariable("IMAGE_NAME")}:latest"`);
    expect(workflow).toContain(`tags: ${actionExpression("steps.image-tags.outputs.tags")}`);
  });
});

async function loadActionMetadata(file: string): Promise<ActionMetadata> {
  return yaml.load(await readFile(file, "utf8")) as ActionMetadata;
}

async function readPackageManifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile("package.json", "utf8")) as PackageManifest;
}

function requireMatch(value: string, pattern: RegExp): string {
  const match = value.match(pattern);
  expect(match).not.toBeNull();
  return match?.[1] ?? "";
}

function inputExpression(input: string): string {
  return `\${{ inputs['${input}'] }}`;
}

function inputEnvAssignment(name: string, position: number): string {
  return `"${name}=\${${position}-}"`;
}

function shellVariable(name: string): string {
  return `\${${name}}`;
}

function actionExpression(expression: string): string {
  return `\${{ ${expression} }}`;
}
