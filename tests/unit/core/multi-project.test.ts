import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateConfig } from "../../../src/core/config.js";
import { runPipeline } from "../../../src/core/pipeline.js";
import { writeFixture } from "../rules/helpers.js";

describe("multi-project workspaces", () => {
  it("discovers sibling and nested projects without crossing ignored workspace folders", async () => {
    const root = await writeFixture({
      "hardware/main/main.kicad_pro": "{}",
      "hardware/main/main.kicad_sch": "(kicad_sch)",
      "hardware/main/main.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "hardware/prototype/prototype.kicad_pro": "{}",
      "hardware/prototype/prototype.kicad_sch": "(kicad_sch)",
      "hardware/prototype/prototype.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "hardware/prototype/radio/radio.kicad_pro": "{}",
      "hardware/prototype/radio/radio.kicad_sch": "(kicad_sch)",
      "hardware/prototype/radio/radio.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "node_modules/vendor/ignored.kicad_pro": "{}",
      "firmware/package.json": "{}",
    });

    const result = await runPipeline({
      path: root,
      rules: ["release.revision-set"],
      failOn: "never",
      concurrency: 2,
    });

    expect(result.projects.map((project) => project.projectFile)).toEqual([
      "hardware/main/main.kicad_pro",
      "hardware/prototype/prototype.kicad_pro",
      "hardware/prototype/radio/radio.kicad_pro",
    ]);
  });

  it("keeps per-project rule overrides and finding attribution isolated under concurrent execution", async () => {
    const root = await writeFixture({
      "hardware/main/main.kicad_pro": "{}",
      "hardware/main/main.kicad_sch": "(kicad_sch)",
      "hardware/main/main.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "hardware/prototype/prototype.kicad_pro": "{}",
      "hardware/prototype/prototype.kicad_sch": "(kicad_sch)",
      "hardware/prototype/prototype.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "boardreadyops.yml": `version: 1
projects:
  - path: hardware/main
    rules:
      release.revision-set:
        severity: critical
  - path: hardware/prototype
    mode: warn
    rules:
      release.revision-set:
        severity: low
fail-on: never
`,
    });

    const result = await runPipeline({
      path: root,
      rules: ["release.revision-set"],
      failOn: "never",
      concurrency: 2,
    });

    expect(
      result.findings.map((finding) => ({
        project: finding.project,
        severity: finding.severity,
        resource: finding.resource.path,
      })),
    ).toEqual([
      {
        project: "hardware/main/main.kicad_pro",
        severity: "critical",
        resource: "hardware/main/main.kicad_pcb",
      },
      {
        project: "hardware/prototype/prototype.kicad_pro",
        severity: "low",
        resource: "hardware/prototype/prototype.kicad_pcb",
      },
    ]);
  });

  it("merges project rule overrides for directories and project files", async () => {
    const root = await writeFixture({
      "hardware/main/main.kicad_pro": "{}",
      "hardware/main/main.kicad_sch": "(kicad_sch)",
      "hardware/main/main.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "hardware/prototype/prototype.kicad_pro": "{}",
      "hardware/prototype/prototype.kicad_sch": "(kicad_sch)",
      "hardware/prototype/prototype.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "hardware/sensor/sensor.kicad_pro": "{}",
      "hardware/sensor/sensor.kicad_sch": "(kicad_sch)",
      "hardware/sensor/sensor.kicad_pcb": '(kicad_pcb (title_block (rev "")))',
      "boardreadyops.yml": `version: 1
rules:
  release.revision-set:
    severity: medium
projects:
  - path: hardware/main/main.kicad_pro
    rules:
      release.revision-set:
        severity: critical
  - path: hardware/prototype
    rules:
      release.revision-set: false
  - path: hardware/sensor
    mode: warn
fail-on: never
`,
    });

    const result = await runPipeline({
      path: root,
      rules: ["release.revision-set"],
      failOn: "never",
    });

    expect(
      result.findings.map((finding) => ({
        project: finding.project,
        severity: finding.severity,
      })),
    ).toEqual([
      {
        project: "hardware/main/main.kicad_pro",
        severity: "critical",
      },
      {
        project: "hardware/sensor/sensor.kicad_pro",
        severity: "medium",
      },
    ]);
  });

  it("uses project BOM and pinmap overrides before global runtime defaults", async () => {
    const root = await writeFixture({
      "global.csv": "Reference,MPN\nG1,GLOBAL\n",
      "global-pins.yml": "version: 1\npins: []\n",
      "hardware/main/main.kicad_pro": "{}",
      "hardware/main/main.kicad_sch": "(kicad_sch)",
      "hardware/main/main.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "hardware/main/bom.csv": "Reference,MPN\nR1,\nR2,ABC\n",
      "hardware/main/pins.yml":
        "version: 1\npins:\n  - designator: U1\n    pin: '1'\n    net: N1\n  - designator: U1\n    pin: '1'\n    net: N1\n",
      "boardreadyops.yml": `version: 1
projects:
  - path: hardware/main
    bom: hardware/main/bom.csv
    pinmap: hardware/main/pins.yml
fail-on: never
`,
    });

    const result = await runPipeline({
      path: root,
      rules: ["bom.missing-mpn", "pinmap.collision"],
      bom: "global.csv",
      pinmap: "global-pins.yml",
      failOn: "never",
    });

    expect(
      result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        project: finding.project,
        resource: finding.resource.path,
      })),
    ).toEqual([
      {
        ruleId: "bom.missing-mpn",
        project: "hardware/main/main.kicad_pro",
        resource: "hardware/main/bom.csv",
      },
      {
        ruleId: "pinmap.collision",
        project: "hardware/main/main.kicad_pro",
        resource: "hardware/main/pins.yml",
      },
    ]);
  });

  it("uses the selected project variant BOM for BOM-backed rules", async () => {
    const root = await writeFixture({
      "aaa-bom.csv": "Reference,MPN\nG1,GLOBAL\n",
      "hardware/main/main.kicad_pro": "{}",
      "hardware/main/main.kicad_sch": "(kicad_sch)",
      "hardware/main/main.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "hardware/main/bom/prod.csv": "Reference,MPN\nR1,\nR2,ABC\n",
      "boardreadyops.yml": `version: 1
projects:
  - path: hardware/main
    variants:
      - name: production
        bom: hardware/main/bom/prod.csv
fail-on: never
`,
    });

    const result = await runPipeline({
      path: root,
      rules: ["bom.missing-mpn"],
      bom: "aaa-bom.csv",
      variant: "production",
      failOn: "never",
    });

    expect(
      result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        project: finding.project,
        resource: finding.resource.path,
      })),
    ).toEqual([
      {
        ruleId: "bom.missing-mpn",
        project: "hardware/main/main.kicad_pro",
        resource: "hardware/main/bom/prod.csv",
      },
    ]);
  });

  it("accepts project-local mode and rule overrides in config", () => {
    expect(
      validateConfig({
        version: 1,
        projects: [
          {
            path: path.posix.join("hardware", "main"),
            mode: "warn",
            rules: {
              "manufacturing.outputs-present": {
                severity: "critical",
              },
            },
          },
        ],
      }),
    ).toEqual([]);
  });
});
