import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { t } from "../../i18n/t.js";
import { pathExists, writeTextFile } from "../../util/fs.js";

type Profile = "basic" | "ci" | "manufacturing" | "strict" | "kicad-plugin";

export interface InitCommandOptions {
  output?: string;
  profile?: Profile;
  workflow?: "github";
  force?: boolean;
}

const yamlHeader = `version: 1
mode: `;

function yamlFooter(failOn: string, reports: string): string {
  return `fail-on: ${failOn}
report:
${reports}`;
}

function profileYaml(mode: string, rules: string, failOn: string, reports: string): string {
  return `${yamlHeader}${mode}
projects:
  - path: .
rules:
${rules}${yamlFooter(failOn, reports)}`;
}

const profiles: Record<Profile, string> = {
  basic: profileYaml(
    "warn",
    `  drc.kicad:
    enabled: true
  erc.kicad:
    enabled: true
  bom.missing-mpn:
    enabled: true
    severity: high
    ignore-refs: ["TP*", "FID*"]
`,
    "never",
    `  json: build/boardreadyops.findings.json
  markdown: build/boardreadyops.report.md`,
  ),

  ci: profileYaml(
    "enforce",
    `  drc.kicad:       { enabled: true }
  erc.kicad:       { enabled: true }
  pinmap.verify:   { enabled: true }
  bom.missing-mpn:
    enabled: true
    severity: high
  manufacturing.outputs-present:
    enabled: true
    required:
      - gerber
      - drill
`,
    "high",
    `  sarif: boardreadyops.sarif.json
  json: boardreadyops.findings.json
  markdown: boardreadyops.report.md
  html: boardreadyops.report.html`,
  ),

  manufacturing: profileYaml(
    "enforce",
    `  manufacturing.outputs-present:
    enabled: true
    required:
      - gerber
      - drill
      - paste
      - silkscreen
      - soldermask
      - assembly
  manufacturing.jobset-outputs:
    enabled: true
  manufacturing.layer-stackup:
    enabled: true
  manufacturing.fab-notes:
    enabled: true
  manufacturing.drill-coverage:
    enabled: true
  manufacturing.panel-sanity:
    enabled: true
`,
    "high",
    `  json: build/boardreadyops.findings.json
  markdown: build/boardreadyops.report.md`,
  ),

  strict: profileYaml(
    "enforce",
    `  drc.kicad:
    enabled: true
  erc.kicad:
    enabled: true
  bom.missing-mpn:
    enabled: true
    severity: high
  bom.footprint-mismatch:
    enabled: true
  bom.single-source:
    enabled: true
  bom.eol-detection:
    enabled: true
  bom.lifecycle:
    enabled: true
  pinmap.verify:
    enabled: true
  pinmap.collision:
    enabled: true
  pinmap.net-label:
    enabled: true
  manufacturing.outputs-present:
    enabled: true
    required:
      - gerber
      - drill
  manufacturing.layer-stackup:
    enabled: true
  design.board-outline:
    enabled: true
  design.copper-balance:
    enabled: true
  release.changelog-present:
    enabled: true
  release.revision-set:
    enabled: true
  release.version-format:
    enabled: true
  release.tag-matches-revision:
    enabled: true
`,
    "medium",
    `  sarif: boardreadyops.sarif.json
  json: build/boardreadyops.findings.json
  markdown: boardreadyops.report.md
  html: build/boardreadyops.report.html
  junit: build/boardreadyops.junit.xml`,
  ),

  "kicad-plugin": profileYaml(
    "warn",
    `  drc.kicad:       { enabled: true }
  erc.kicad:       { enabled: true }
  pinmap.verify:   { enabled: true }
  bom.missing-mpn:
    enabled: true
    severity: high
`,
    "high",
    `  json: build/boardreadyops.findings.json
  markdown: build/boardreadyops.report.md
  html: build/boardreadyops.report.html`,
  ),
};

const githubWorkflowYml = `name: boardreadyops
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
  pull-requests: write
  security-events: write
jobs:
  boardreadyops:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
      - uses: oaslananka/boardreadyops@v1
        with:
          config: boardreadyops.yml
          mode: enforce
          fail-on: high
          sarif: boardreadyops.sarif.json
          json: boardreadyops.findings.json
          markdown: boardreadyops.report.md
          upload-sarif: "true"
          upload-artifacts: "true"
          comment-pr: "true"
`;

export async function initCommand(
  cwd: string,
  options: InitCommandOptions,
  streams: { stdout: NodeJS.WritableStream },
): Promise<number> {
  const outputDir = options.output ? path.resolve(cwd, options.output) : cwd;
  const profile: Profile = options.profile ?? "basic";
  const configContent = profiles[profile];

  if (!configContent) {
    streams.stdout.write(`${t("cli.init.invalidProfile", { profile })}\n`);
    return 2;
  }

  const configFile = path.resolve(outputDir, "boardreadyops.yml");
  const configExists = await pathExists(configFile);

  if (configExists && !options.force) {
    streams.stdout.write(`${t("cli.init.exists")}\n`);
    return 0;
  }

  if (!configExists) {
    await writeTextFile(configFile, configContent);
    streams.stdout.write(`${t("cli.init.created")}: ${configFile}\n`);
  }

  if (options.workflow === "github") {
    const workflowDir = path.resolve(outputDir, ".github/workflows");
    await mkdir(workflowDir, { recursive: true });
    const workflowFile = path.resolve(workflowDir, "boardreadyops.yml");
    if (!(await pathExists(workflowFile)) || options.force) {
      await writeFile(workflowFile, githubWorkflowYml, "utf-8");
      streams.stdout.write(`${t("cli.init.workflowCreated")}: ${workflowFile}\n`);
    } else {
      streams.stdout.write(`${t("cli.init.workflowExists")}: ${workflowFile}\n`);
    }
  }

  return 0;
}
