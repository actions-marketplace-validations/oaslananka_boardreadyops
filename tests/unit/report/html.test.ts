import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Window } from "happy-dom";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { writeReports } from "../../../src/cli/output.js";
import { type LoadedConfig, validateConfig } from "../../../src/core/config.js";
import { createFinding, summarizeFindings } from "../../../src/core/findings.js";
import type { RunResult } from "../../../src/core/result.js";
import { formatHtml } from "../../../src/report/html.js";

describe("HTML report", () => {
  it("renders a stable standalone report snapshot", () => {
    expect(formatHtml(sampleResult())).toMatchSnapshot();
  });

  it("passes html-validate recommended linting", async () => {
    const htmlvalidate = new HtmlValidate({
      extends: ["html-validate:recommended"],
    });

    const report = await htmlvalidate.validateString(formatHtml(sampleResult()));

    expect(
      report.valid,
      report.results
        .flatMap((result) => result.messages)
        .map((message) => `${message.ruleId}: ${message.message}`)
        .join("\n"),
    ).toBe(true);
  });

  it("has no WCAG A/AA axe violations in the static report shell", async () => {
    const window = new Window({ url: "https://example.test/boardreadyops.report.html" });
    window.document.write(formatHtml(sampleResult()));
    const previous = installDomGlobals(window);
    try {
      const axe = (await import("axe-core")).default;
      const result = await axe.run(window.document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa"],
        },
      });

      expect(
        result.violations,
        result.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
      ).toEqual([]);
    } finally {
      restoreDomGlobals(previous);
      await window.close();
    }
  });

  it("accepts configured HTML report paths and writes the report", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-html-report-"));
    const written = await writeReports(
      sampleResult(),
      root,
      {},
      loadedConfig("build/boardreadyops.report.html"),
      nullStream(),
    );

    expect(written).toMatchObject({ html: path.join(root, "build/boardreadyops.report.html") });
    const html = await fs.readFile(path.join(root, "build/boardreadyops.report.html"), "utf8");
    expect(html).toContain('id="severity-filter"');
    expect(html).toContain('data-rule="bom.missing-mpn"');
    expect(html).toContain('data-project="assembly/main.kicad_pro"');
  });

  it("validates report.html in the config schema", () => {
    expect(validateConfig({ version: 1, report: { html: "build/boardreadyops.report.html" } })).toEqual([]);
    expect(validateConfig({ version: 1, report: { html: false } })).toEqual([]);
  });

  it("renders empty report sections without filter rows", () => {
    const html = formatHtml(sampleResult([], []));

    expect(html).toContain("No projects were reported.");
    expect(html).toContain("No rules produced findings.");
    expect(html).toContain("No findings.");
    expect(html).toContain("0 findings");
  });

  it("renders Turkish HTML report labels without translating finding messages", () => {
    const html = formatHtml(sampleResult([], []), "tr");

    expect(html).toContain('<html lang="tr">');
    expect(html).toContain("BoardReadyOps Raporu");
    expect(html).toContain("Önem Derecesine Göre Özet");
    expect(html).toContain("Proje Bazında Dağılım");
    expect(html).toContain("Tüm önem dereceleri");
    expect(html).toContain("Bulgu yok.");
    expect(html).toContain("0 bulgu");
  });

  it("renders pseudo-locale HTML labels for hard-coded string smoke coverage", () => {
    const html = formatHtml(sampleResult([], []), "__PSEUDO__");

    expect(html).toContain("[[BoardReadyOps Report]]");
    expect(html).toContain("[[Summary by Severity]]");
    expect(html).toContain("[[No findings.]]");
  });

  it("renders advanced finding detail branches", () => {
    const html = formatHtml(
      sampleResult([
        createFinding({
          ruleId: "design.board-outline",
          severity: "critical",
          message: "Board outline has a gap.",
          project: "hardware/main.kicad_pro",
          resource: { path: "hardware/main.kicad_pcb", kind: "pcb" },
          location: {
            region: {
              startLine: 42,
              endLine: 44,
            },
            boardCoordinates: {
              x: -0,
              y: 14,
              units: "in",
            },
          },
          confidence: "definite",
          fix: { description: "Close the outline before release." },
          references: ["https://example.test/outline"],
        }),
      ]),
    );

    expect(html).toContain("lines 42-44, board (0in, 14in)");
    expect(html).toContain("Confidence: definite");
    expect(html).toContain("Close the outline before release.");
    expect(html).not.toContain("<ol>");
  });

  it("renders details without optional confidence", () => {
    const html = formatHtml(
      sampleResult([
        createFinding({
          ruleId: "design.copper-balance",
          severity: "low",
          message: "Copper balance is low near the board origin.",
          resource: { path: "hardware/main.kicad_pcb", kind: "pcb" },
          location: {
            boardCoordinates: {
              x: 1.234567,
              y: 2.5,
              layer: "F.Cu",
              units: "mm",
            },
          },
          details: { note: "Needs review" },
        }),
      ]),
    );

    expect(html).toContain("F.Cu (1.234567mm, 2.5mm)");
    expect(html).toContain("&quot;note&quot;: &quot;Needs review&quot;");
    expect(html).not.toContain("Confidence:");
  });
});

function loadedConfig(html: string): LoadedConfig {
  return {
    config: { version: 1, report: { html } },
    errors: [],
  };
}

function sampleResult(
  findings = [
    createFinding({
      ruleId: "bom.missing-mpn",
      severity: "high",
      message: "R1 is missing an MPN.",
      project: "assembly/main.kicad_pro",
      resource: { path: "bom.csv", kind: "bom" },
      location: { line: 2, column: 1 },
      details: { reference: "R1" },
      references: ["https://github.com/oaslananka/boardreadyops/blob/main/docs/rules/bom.md"],
      fix: {
        description: "Add manufacturer part numbers.",
        steps: ["Populate the MPN column.", "Re-run the BOM check."],
        references: ["https://example.test/mpn"],
        automated: false,
      },
      confidence: "high",
    }),
    createFinding({
      ruleId: "manufacturing.outputs-present",
      severity: "critical",
      message: "Gerber outputs are missing.",
      project: "fabrication/prototype.kicad_pro",
      resource: { path: "fabrication/", kind: "manifest" },
      fix: {
        description: "Generate fabrication outputs before release.",
        steps: ["Open KiCad Plot.", "Export Gerbers and drill files."],
      },
    }),
    createFinding({
      ruleId: "info.note",
      severity: "info",
      message: "Lifecycle source was unavailable.",
      resource: { path: "bom.csv", kind: "bom" },
    }),
  ],
  projects = [
    {
      projectFile: "assembly/main.kicad_pro",
      root: "assembly",
      schematicFiles: ["main.kicad_sch"],
      boardFiles: ["main.kicad_pcb"],
      jobsetFiles: [],
    },
    {
      projectFile: "fabrication/prototype.kicad_pro",
      root: "fabrication",
      schematicFiles: ["prototype.kicad_sch"],
      boardFiles: ["prototype.kicad_pcb"],
      jobsetFiles: [],
    },
  ],
): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "boardreadyops", version: "1.0.2" },
    summary: summarizeFindings(findings, "high"),
    projects,
    findings,
    fabrication: { bom: [], outputs: [] },
    generatedAt: "2026-05-22T00:00:00.000Z",
  };
}

const domGlobalKeys = ["window", "document", "Node", "Element", "Document", "HTMLElement", "SVGElement"] as const;
type DomGlobalKey = (typeof domGlobalKeys)[number];
type DomGlobalSnapshot = Record<DomGlobalKey, unknown>;

function installDomGlobals(window: Window): DomGlobalSnapshot {
  const globalObject = globalThis as unknown as Record<string, unknown>;
  const previous = Object.fromEntries(domGlobalKeys.map((key) => [key, globalObject[key]])) as DomGlobalSnapshot;
  Object.assign(globalObject, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    Document: window.Document,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
  });
  return previous;
}

function restoreDomGlobals(previous: DomGlobalSnapshot): void {
  const globalObject = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      Reflect.deleteProperty(globalObject, key);
    } else {
      Reflect.set(globalObject, key, value);
    }
  }
}

function nullStream(): NodeJS.WritableStream {
  return {
    write() {
      return true;
    },
  } as unknown as NodeJS.WritableStream;
}
