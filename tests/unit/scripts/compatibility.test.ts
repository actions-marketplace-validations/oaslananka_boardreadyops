import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import { buildDriftReport, findCompatibilityDrift, renderSupportMatrix } from "../../../scripts/compatibility.mjs";

type Workflow = {
  on?: {
    schedule?: Array<{ cron?: string }>;
    pull_request?: unknown;
    push?: unknown;
    workflow_dispatch?: unknown;
  };
  permissions?: Record<string, string>;
  jobs?: Record<string, WorkflowJob>;
};

type WorkflowJob = {
  name?: string;
  strategy?: {
    matrix?: {
      include?: Array<Record<string, string | number>>;
    };
  };
  steps?: Array<{ uses?: string; run?: string; env?: Record<string, string> }>;
};

describe("compatibility matrix", () => {
  it("renders docs/support-matrix.md from docs/compatibility.yaml", async () => {
    const config = yaml.load(await readFile("docs/compatibility.yaml", "utf8"));
    const supportMatrix = await readFile("docs/support-matrix.md", "utf8");

    expect(supportMatrix).toBe(renderSupportMatrix(config));
    expect(supportMatrix).toContain("| KiCad | 9.0 | Supported | Variants are partially supported. |");
    expect(supportMatrix).toContain("| KiCad | 10.x | Recommended | Full variant + native IPC API support. |");
    expect(supportMatrix).toContain("| Node.js | 22 | Minimum supported runtime |");
    expect(supportMatrix).toContain("| Node.js | 24 | Supported LTS runtime |");
  });

  it("escapes Markdown table notes before rendering", () => {
    const markdown = renderSupportMatrix({
      kicad: {
        minimum: "9.0",
        recommended: "10.x",
        tested: ["9.0"],
        notes: {
          "9.0": String.raw`Backslash \ and pipe | are literal.`,
          "10.x": "Recommended.",
        },
      },
      node: {
        minimum: "22",
        supported: ["22"],
        tested: {
          "22": "22.22.3",
        },
      },
    });

    expect(markdown).toContain(String.raw`| KiCad | 9.0 | Supported | Backslash \\ and pipe \| are literal. |`);
  });

  it("detects untested KiCad release series and Node minor drift", () => {
    const drift = findCompatibilityDrift(
      {
        kicad: {
          minimum: "9.0",
          recommended: "10.x",
          tested: ["9.0", "9.1", "10.0", "10.1"],
          notes: {
            "9.0": "Variants are partially supported.",
            "10.x": "Full variant + native IPC API support.",
          },
        },
        node: {
          minimum: "22",
          supported: ["22", "24"],
          tested: {
            "22": "22.22.3",
            "24": "24.16.0",
          },
        },
      },
      {
        kicadReleases: ["11.0.0", "10.1.2", "10.0.3", "9.1.1"],
        nodeReleases: [
          { version: "v26.2.0", date: "2026-05-20", lts: false },
          { version: "v24.17.0", date: "2026-06-18", lts: "Krypton" },
          { version: "v22.22.3", date: "2026-05-13", lts: "Jod" },
        ],
      },
    );

    expect(drift.kicad).toEqual([{ series: "11.0", latest: "11.0.0" }]);
    expect(drift.node).toEqual([
      { major: "24", latest: "24.17.0", tested: "24.16.0", reason: "new-minor" },
      { major: "26", latest: "26.2.0", tested: null, reason: "unsupported-current" },
    ]);
    expect(buildDriftReport(drift)).toContain("KiCad 11.0");
    expect(buildDriftReport(drift)).toContain("Node.js 24.17.0");
    expect(buildDriftReport(drift)).toContain("Node.js 26.2.0");
  });

  it("keeps CI integration tests explicit per KiCad and Node pair", async () => {
    const workflow = yaml.load(await readFile(".github/workflows/ci.yml", "utf8")) as Workflow;
    const integration = workflow.jobs?.["test-int"];

    const kicadExpression = "${" + "{ matrix.kicad-version }}";
    const nodeExpression = "${" + "{ matrix.node-version }}";
    expect(integration?.name).toBe(`ci / test-int (KiCad ${kicadExpression}, Node ${nodeExpression})`);
    expect(integration?.strategy?.matrix?.include).toEqual([
      {
        "kicad-version": "9.0",
        "kicad-ppa-series": "9.0",
        "node-version": 22,
      },
      {
        "kicad-version": "10.0",
        "kicad-ppa-series": "10.0",
        "node-version": 24,
      },
    ]);
  });

  it("defines a scheduled drift workflow that can open GitHub issues", async () => {
    const workflow = yaml.load(await readFile(".github/workflows/compatibility-drift.yml", "utf8")) as Workflow;
    const job = workflow.jobs?.["check-drift"];
    const runCommands = (job?.steps ?? []).map((step) => step.run ?? "").join("\n");

    expect(workflow.on?.schedule).toEqual([{ cron: "23 5 * * 1" }]);
    expect(workflow.permissions).toMatchObject({ contents: "read", issues: "write" });
    expect(job?.steps?.some((step) => step.uses?.startsWith("actions/checkout@"))).toBe(true);
    expect(job?.steps?.some((step) => step.uses?.startsWith("actions/setup-node@"))).toBe(true);
    expect(runCommands).toContain("pnpm run compatibility:drift");
    expect(runCommands).toContain("gh issue create");
  });
});
