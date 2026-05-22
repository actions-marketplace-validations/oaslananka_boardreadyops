import { describe, expect, it } from "vitest";
import { createFinding, summarizeFindings } from "../../../src/core/findings.js";
import type { RunResult } from "../../../src/core/result.js";
import { emitAnnotations, formatAnnotation } from "../../../src/report/annotations.js";
import { formatJunit } from "../../../src/report/junit.js";

describe("workflow annotations", () => {
  it("escapes command properties and message data", () => {
    const finding = createFinding({
      ruleId: "bom.rule:comma",
      severity: "critical",
      message: "line 1\nline 2% done",
      resource: { path: "boards/main,rev:a.kicad_pcb", kind: "pcb" },
      location: { line: 12, column: 4 },
    });

    expect(formatAnnotation(finding)).toBe(
      "::error file=boards/main%2Crev%3Aa.kicad_pcb,line=12,col=4,title=bom.rule%3Acomma::line 1%0Aline 2%25 done",
    );
  });

  it("emits one line per finding to the provided stream", () => {
    let output = "";
    const stream = {
      write(chunk: string) {
        output += chunk;
        return true;
      },
    } as NodeJS.WritableStream;

    emitAnnotations(
      [
        createFinding({
          ruleId: "medium.rule",
          severity: "medium",
          message: "warning",
          resource: { path: "warning.txt", kind: "project" },
        }),
        createFinding({
          ruleId: "info.rule",
          severity: "info",
          message: "notice",
          resource: { path: "notice.txt", kind: "project" },
        }),
      ],
      stream,
    );

    expect(output).toContain("::warning");
    expect(output).toContain("::notice");
    expect(output.trim().split("\n")).toHaveLength(2);
  });
});

describe("JUnit report", () => {
  it("escapes XML and omits failures for info findings", () => {
    const findings = [
      createFinding({
        ruleId: "bom.<missing>",
        severity: "high",
        message: 'R1 & "C1" need <MPN>',
        resource: { path: "bom&parts.csv", kind: "bom" },
        details: { ref: "R1", message: "A < B" },
        fix: {
          description: "Add the missing MPN before release.",
          steps: ["Open the BOM.", "Fill the MPN field."],
        },
      }),
      createFinding({
        ruleId: "info.rule",
        severity: "info",
        message: "skipped",
        resource: { path: "project.kicad_pro", kind: "project" },
      }),
    ];

    const xml = formatJunit({
      schemaVersion: 1,
      tool: { name: "boardreadyops", version: "0.9.0" },
      summary: summarizeFindings(findings, "high"),
      projects: [],
      findings,
      fabrication: { bom: [], outputs: [] },
      generatedAt: "2026-05-18T00:00:00.000Z",
    } satisfies RunResult);

    expect(xml).toContain('failures="1"');
    expect(xml).toContain("bom.&lt;missing&gt;");
    expect(xml).toContain("R1 &amp; &quot;C1&quot; need &lt;MPN&gt;");
    expect(xml).toContain("bom&amp;parts.csv");
    expect(JSON.parse(decodeXml(failureBody(xml)))).toEqual({
      ref: "R1",
      message: "A < B",
      fix: {
        description: "Add the missing MPN before release.",
        steps: ["Open the BOM.", "Fill the MPN field."],
      },
    });
    expect(xml.match(/<failure/g)).toHaveLength(1);
  });

  it("emits structured fix JSON when a finding has no details or fix steps", () => {
    const finding = createFinding({
      ruleId: "bom.single-source",
      severity: "medium",
      message: "R1 has one source.",
      resource: { path: "bom.csv", kind: "bom" },
      fix: { description: "Add an alternate approved source." },
    });

    const xml = formatJunit({
      schemaVersion: 1,
      tool: { name: "boardreadyops", version: "0.9.0" },
      summary: summarizeFindings([finding], "high"),
      projects: [],
      findings: [finding],
      fabrication: { bom: [], outputs: [] },
      generatedAt: "2026-05-18T00:00:00.000Z",
    } satisfies RunResult);

    expect(JSON.parse(decodeXml(failureBody(xml)))).toEqual({
      fix: { description: "Add an alternate approved source." },
    });
  });

  it("keeps JUnit failure body parseable when remediation is present", () => {
    const finding = createFinding({
      ruleId: "bom.missing-mpn",
      severity: "high",
      message: "R1 is missing an MPN.",
      resource: { path: "bom.csv", kind: "bom" },
      details: { reference: "R1", mpn: "UNKNOWN" },
      fix: {
        description: "Add the missing MPN before release.",
        steps: ["Open the BOM.", "Fill the MPN field."],
      },
    });

    const xml = formatJunit({
      schemaVersion: 1,
      tool: { name: "boardreadyops", version: "0.9.0" },
      summary: summarizeFindings([finding], "high"),
      projects: [],
      findings: [finding],
      fabrication: { bom: [], outputs: [] },
      generatedAt: "2026-05-18T00:00:00.000Z",
    } satisfies RunResult);

    const body = decodeXml(failureBody(xml));
    expect(JSON.parse(body)).toEqual({
      reference: "R1",
      mpn: "UNKNOWN",
      fix: {
        description: "Add the missing MPN before release.",
        steps: ["Open the BOM.", "Fill the MPN field."],
      },
    });
  });
});

function failureBody(xml: string): string {
  const match = xml.match(/<failure[^>]*>([\s\S]*)<\/failure>/);
  expect(match?.[1]).toBeDefined();
  return match?.[1] ?? "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}
