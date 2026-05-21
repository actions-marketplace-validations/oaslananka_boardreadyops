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
      generatedAt: "2026-05-18T00:00:00.000Z",
    } satisfies RunResult);

    expect(xml).toContain('failures="1"');
    expect(xml).toContain("bom.&lt;missing&gt;");
    expect(xml).toContain("R1 &amp; &quot;C1&quot; need &lt;MPN&gt;");
    expect(xml).toContain("bom&amp;parts.csv");
    expect(xml.match(/<failure/g)).toHaveLength(1);
  });
});
