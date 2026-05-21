import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDelimited } from "../../src/bom/loader.js";
import { normalizeBomRows } from "../../src/bom/normalizer.js";
import { isRuleEnabled, loadConfig, ruleConfig, ruleSeverity, validateConfig } from "../../src/core/config.js";
import type { RuleContext } from "../../src/core/context.js";
import { discoverProjects } from "../../src/core/discovery.js";
import { createFinding } from "../../src/core/findings.js";
import { createLogger } from "../../src/core/logger.js";
import { runPipeline } from "../../src/core/pipeline.js";
import { listRules, registerRule } from "../../src/core/rule-registry.js";
import { loadPinmap } from "../../src/pinmap/loader.js";
import { readCsvPinmap } from "../../src/pinmap/resolvers/csv.js";
import { readJsonPinmap } from "../../src/pinmap/resolvers/json.js";
import { formatAnnotation } from "../../src/report/annotations.js";
import { formatJunit } from "../../src/report/junit.js";
import { formatSarif } from "../../src/report/sarif.js";
import { kicadSeverityToFindingSeverity } from "../../src/rules/drc/severity-map.js";
import { configuredSeverity, filtered, globLike, refIgnored, shouldRun } from "../../src/rules/helpers.js";
import { pinmapFormat } from "../../src/rules/pinmap/format-detect.js";

describe("report helpers", () => {
  it("formats annotations, junit, and SARIF with findings", async () => {
    const result = await runPipeline({
      path: path.resolve("tests/fixtures/projects/bom-missing-mpn"),
      failOn: "never",
    });
    const finding = result.findings.find((entry) => entry.ruleId === "bom.missing-mpn");
    expect(finding).toBeTruthy();
    if (!finding) {
      throw new Error("Expected bom.missing-mpn finding");
    }
    expect(formatAnnotation(finding)).toContain("::error");
    expect(
      formatAnnotation(
        createFinding({
          ruleId: "info.rule",
          severity: "info",
          message: "notice, escaped",
          resource: { path: "a:b", kind: "manifest" },
        }),
      ),
    ).toContain("::notice");
    expect(
      formatAnnotation(
        createFinding({
          ruleId: "medium.rule",
          severity: "medium",
          message: "warning",
          resource: { path: "file", kind: "manifest" },
          location: { line: 2, column: 3 },
        }),
      ),
    ).toContain("::warning");
    expect(formatJunit(result)).toContain("<testsuite");
    const synthetic = {
      ...result,
      findings: [
        ...result.findings,
        createFinding({
          ruleId: "low.rule",
          severity: "low",
          message: "low",
          resource: { path: "low", kind: "manifest" },
        }),
        createFinding({
          ruleId: "info.rule",
          severity: "info",
          message: "info",
          resource: { path: "info", kind: "manifest" },
        }),
      ],
    };
    expect(JSON.parse(formatSarif(synthetic)).runs[0].results.length).toBeGreaterThan(0);
  });
});

describe("support utilities", () => {
  it("parses quoted delimited files and pinmap formats", async () => {
    expect(parseDelimited('Reference,Value\n"R1,R2","10k"\n')[0]?.Reference).toBe("R1,R2");
    expect(parseDelimited('Reference,Value\n"R1","10""k"\n')[0]?.Value).toBe('10"k');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-pinmap-"));
    const jsonFile = path.join(temp, "pins.json");
    const csvFile = path.join(temp, "pins.csv");
    await fs.writeFile(
      jsonFile,
      JSON.stringify({ version: 1, pins: [{ designator: "U1", pin: "1", net: "N1" }] }),
      "utf8",
    );
    await fs.writeFile(csvFile, "designator,pin,net,firmware\nU1,1,N1,gpio\n", "utf8");
    const invalidFile = path.join(temp, "invalid.json");
    await fs.writeFile(invalidFile, JSON.stringify({ version: 2, pins: [] }), "utf8");
    expect((await readJsonPinmap(jsonFile)).pins[0]?.net).toBe("N1");
    expect((await readCsvPinmap(csvFile)).pins[0]?.firmware).toBe("gpio");
    expect((await loadPinmap(jsonFile)).errors).toEqual([]);
    expect((await loadPinmap(csvFile)).errors).toEqual([]);
    expect((await loadPinmap(invalidFile)).errors.length).toBeGreaterThan(0);
    expect((await loadPinmap(path.join(temp, "missing.yml"))).errors.length).toBeGreaterThan(0);
    expect(pinmapFormat(jsonFile)).toBe("json");
    expect(pinmapFormat(csvFile)).toBe("csv");
    expect(pinmapFormat("pins.yml")).toBe("yaml");
  });

  it("covers pinmap CSV fallback headers and BOM normalization branches", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-fallbacks-"));
    const designator = path.join(temp, "designator.csv");
    const ref = path.join(temp, "ref.csv");
    const upperRef = path.join(temp, "upper-ref.csv");
    const empty = path.join(temp, "empty.csv");
    await fs.writeFile(designator, "Designator,Pin,Net,Firmware\nU1,PA0,N1,gpio\n", "utf8");
    await fs.writeFile(ref, "ref,pin,net\nU2,PA1,N2\n", "utf8");
    await fs.writeFile(upperRef, "Ref,Pin,Net\nU3,PA2,N3\n", "utf8");
    await fs.writeFile(empty, "other\nvalue\n", "utf8");
    expect((await readCsvPinmap(designator)).pins[0]).toMatchObject({
      designator: "U1",
      pin: "PA0",
      net: "N1",
      firmware: "gpio",
    });
    expect((await readCsvPinmap(ref)).pins[0]).toMatchObject({ designator: "U2", pin: "PA1", net: "N2" });
    expect((await readCsvPinmap(upperRef)).pins[0]).toMatchObject({ designator: "U3", pin: "PA2", net: "N3" });
    expect((await readCsvPinmap(empty)).pins[0]).toMatchObject({ designator: "", pin: "", net: "" });

    const rows = normalizeBomRows(
      [
        { References: "R1 R2", Qty: "2", Populate: "no", Vendor: "DigiKey" },
        { References: "", Qty: "nan" },
        { Reference: "C1", DNP: "yes" },
      ],
      "bom.tsv",
    );
    expect(rows.map((row) => row.reference)).toEqual(["R1", "R2", "C1"]);
    expect(rows[0]?.quantity).toBe(2);
    expect(rows[0]?.dnp).toBe(false);
    expect(rows[0]?.suppliers).toEqual(["DigiKey"]);
    expect(rows[2]?.dnp).toBe(true);
  });

  it("maps KiCad severities and logs text/json", () => {
    expect(kicadSeverityToFindingSeverity("critical")).toBe("critical");
    expect(kicadSeverityToFindingSeverity("fatal")).toBe("critical");
    expect(kicadSeverityToFindingSeverity("error")).toBe("high");
    expect(kicadSeverityToFindingSeverity("warning")).toBe("medium");
    expect(kicadSeverityToFindingSeverity("other")).toBe("low");
    let text = "";
    const stream = {
      write(value: string) {
        text += value;
        return true;
      },
    } as NodeJS.WritableStream;
    createLogger("debug", false, stream).debug("debug", { a: 1 });
    createLogger("info", true, stream).info("json");
    createLogger("error", false, stream).warn("hidden");
    createLogger("error", false, stream).error("err");
    createLogger("silent", false, stream).error("silent");
    expect(text).toContain("debug");
    expect(text).toContain('"message":"json"');
    expect(text).toContain("err");
    expect(text).not.toContain("hidden");
    expect(text).not.toContain("silent");
  });

  it("covers config and discovery edge branches", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-edge-"));
    expect(
      (await runPipeline({ path: temp, failOn: "never" })).findings.some(
        (finding) => finding.ruleId === "manifest.project-discovery",
      ),
    ).toBe(true);
    await fs.writeFile(path.join(temp, "edge.kicad_pro"), "{}", "utf8");
    const projects = await discoverProjects(temp, "edge.kicad_pro");
    expect(projects[0]?.boardFiles).toEqual([]);
    expect(validateConfig(false).length).toBeGreaterThan(0);
    expect(validateConfig({ version: 1, rules: { "x.y": true }, report: { json: false } })).toEqual([]);
    expect((await loadConfig(temp, "missing.yml")).errors.join("\n")).toContain("config file not found");
    await fs.writeFile(path.join(temp, "valid.yml"), "version: 1\nmode: enforce\n", "utf8");
    expect((await loadConfig(temp, "valid.yml")).config.mode).toBe("enforce");
    await fs.writeFile(path.join(temp, "broken.yml"), "version: [\n", "utf8");
    expect((await loadConfig(temp, "broken.yml")).errors.length).toBeGreaterThan(0);
    expect(isRuleEnabled({ version: 1, rules: { "x.y": false } }, "x.y")).toBe(false);
    expect(ruleSeverity({ version: 1, rules: { "x.y": { severity: "low" } } }, "x.y", "high")).toBe("low");
    expect(ruleConfig({ version: 1, rules: { "x.y": true } }, "x.y")).toEqual({});
  });

  it("covers rule helper filtering and matching branches", () => {
    const context = {
      root: process.cwd(),
      projects: [],
      config: { version: 1, rules: { "sample.rule": { severity: "medium" } } },
      options: { rules: ["other.rule"], skips: ["skipped.rule"] },
      logger: createLogger("silent"),
    } as unknown as RuleContext;
    expect(filtered(context, "sample.rule")).toBe(false);
    expect(shouldRun(context, "sample.rule")).toBe(false);
    expect(configuredSeverity(context, "sample.rule", "high")).toBe("medium");
    expect(refIgnored("TP1", undefined)).toBe(false);
    expect(refIgnored("TP1", ["TP*"])).toBe(true);
    expect(globLike("R?.*", "R?.1")).toBe(true);
  });

  it("rejects duplicate rule registration", async () => {
    const sample = {
      meta: { id: "sample.rule", title: "sample", defaultSeverity: "info" as const, appliesTo: [], configKeys: [] },
      run: async () => [],
    };
    registerRule(sample);
    expect(listRules().some((rule) => rule.meta.id === "sample.rule")).toBe(true);
    expect(() => registerRule(sample)).toThrow("Duplicate rule id");
    await runPipeline({ path: path.resolve("tests/fixtures/projects/safe-basic"), failOn: "never" });
  });
});

describe("rule groups", () => {
  it("normalizes DRC and ERC diagnostics from kicad-cli", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-kicad-"));
    await fs.cp(path.resolve("tests/fixtures/projects/safe-basic"), temp, { recursive: true });
    const cli = await fakeKicadCli(temp);
    const result = await runPipeline({
      path: temp,
      config: "absent.yml",
      kicadCli: cli,
      rules: ["drc.kicad", "erc.kicad"],
      skips: [],
      failOn: "never",
    });
    expect(result.findings.some((finding) => finding.ruleId === "drc.track_too_close")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "erc.unconnected_pin")).toBe(true);
  });

  it("covers DRC and ERC missing kicad paths", async () => {
    const result = await runPipeline({
      path: path.resolve("tests/fixtures/projects/safe-basic"),
      config: "missing-config.yml",
      kicadCli: path.join(os.tmpdir(), "definitely-missing-kicad-cli"),
      rules: ["drc.kicad", "erc.kicad"],
      skips: [],
      failOn: "never",
    });
    expect(result.findings.some((finding) => finding.ruleId === "drc.kicad-cli-unavailable")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "erc.kicad-cli-unavailable")).toBe(true);
  });

  it("covers BOM risk variants", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-bom-"));
    await fs.writeFile(path.join(temp, "risk.kicad_pro"), "{}", "utf8");
    await fs.writeFile(
      path.join(temp, "risk.kicad_sch"),
      `(kicad_sch
        (symbol (property "Reference" "R1") (property "Value" "10k") (property "Footprint" "Resistor_SMD:R_0603") (property "MPN" "A"))
        (symbol (property "Reference" "C1") (property "Value" "1uF") (property "Footprint" "Capacitor_SMD:C_0603") (property "MPN" "B"))
      )`,
      "utf8",
    );
    await fs.writeFile(
      path.join(temp, "risk.kicad_pcb"),
      `(kicad_pcb
        (title_block (rev "1.0.0"))
        (footprint "Resistor_SMD:R_0805" (property "Reference" "R1"))
        (footprint "Capacitor_SMD:C_0603" (property "Reference" "C1") (attr smd dnp))
      )`,
      "utf8",
    );
    await fs.writeFile(
      path.join(temp, "bom.csv"),
      "Reference,Value,Footprint,Manufacturer,MPN,Supplier 1,Lifecycle,DNP\nR1,10k,Resistor_SMD:R_0603,Y,A,DigiKey,EOL,false\nC1,1uF,Capacitor_SMD:C_0603,Y,B,Mouser,Active,false\n",
      "utf8",
    );
    await fs.mkdir(path.join(temp, "fab"));
    await fs.writeFile(path.join(temp, "fab", "README.md"), "notes", "utf8");
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      `version: 1
projects:
  - path: .
    bom: bom.csv
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  release.changelog-present:
    enabled: false
fail-on: never
`,
      "utf8",
    );
    const result = await runPipeline({ path: temp, failOn: "never" });
    expect(result.findings.some((finding) => finding.ruleId === "bom.single-source")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "bom.eol-detection")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "bom.footprint-mismatch")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "bom.dnp-consistency")).toBe(true);
  });

  it("covers pinmap collision and unmapped pin rules", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-pin-rules-"));
    await fs.writeFile(path.join(temp, "pin.kicad_pro"), "{}", "utf8");
    await fs.writeFile(path.join(temp, "pin.kicad_pcb"), '(kicad_pcb (title_block (rev "1.0.0")))', "utf8");
    await fs.writeFile(
      path.join(temp, "pin.kicad_sch"),
      '(kicad_sch (label "N1") (pin "1" (net "N1") (ref "U1")) (pin "2" (net "N2") (ref "U1")))',
      "utf8",
    );
    await fs.writeFile(
      path.join(temp, "pins.yml"),
      "version: 1\npins:\n  - designator: U1\n    pin: '1'\n    net: N1\n  - designator: U1\n    pin: '1'\n    net: N1\n",
      "utf8",
    );
    await fs.mkdir(path.join(temp, "fab"));
    await fs.writeFile(path.join(temp, "fab", "README.md"), "notes", "utf8");
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      "version: 1\nprojects:\n  - path: .\n    pinmap: pins.yml\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: false\n",
      "utf8",
    );
    const result = await runPipeline({ path: temp, failOn: "never" });
    expect(result.findings.some((finding) => finding.ruleId === "pinmap.collision")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "pinmap.unmapped-pin")).toBe(true);
  });

  it("covers manufacturing and release findings", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-mfg-"));
    await fs.writeFile(path.join(temp, "mfg.kicad_pro"), "{}", "utf8");
    await fs.writeFile(path.join(temp, "mfg.kicad_sch"), "(kicad_sch (version 20250114))", "utf8");
    await fs.writeFile(
      path.join(temp, "mfg.kicad_pcb"),
      '(kicad_pcb (version 20250114) (footprint "Pkg:X" (property "Reference" "U1") (drill 0.4)))',
      "utf8",
    );
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      `version: 1
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  manufacturing.outputs-present:
    enabled: true
    required: [gerber, drill]
  manufacturing.panel-sanity:
    enabled: true
    panelized: true
  manufacturing.drill-coverage:
    enabled: true
  release.changelog-present:
    enabled: true
fail-on: never
`,
      "utf8",
    );
    const result = await runPipeline({ path: temp, failOn: "never" });
    expect(result.findings.some((finding) => finding.ruleId === "manufacturing.outputs-present")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "manufacturing.panel-sanity")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "manufacturing.fab-notes")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "release.revision-set")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "release.changelog-present")).toBe(true);
  });

  it("covers manufacturing freshness and changelog entry branches", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-fresh-"));
    await fs.writeFile(path.join(temp, "fresh.kicad_pro"), "{}", "utf8");
    await fs.writeFile(path.join(temp, "fresh.kicad_sch"), "(kicad_sch)", "utf8");
    const board = path.join(temp, "fresh.kicad_pcb");
    await fs.writeFile(board, '(kicad_pcb (title_block (rev "1.0.0")))', "utf8");
    await fs.mkdir(path.join(temp, "fab"));
    await fs.writeFile(path.join(temp, "fab", "README.md"), "notes", "utf8");
    const drill = path.join(temp, "fresh.drl");
    await fs.writeFile(drill, "T1C0.4\n", "utf8");
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      `version: 1
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  manufacturing.outputs-present:
    enabled: true
    required: [drill]
  release.changelog-present:
    enabled: true
fail-on: never
`,
      "utf8",
    );
    await fs.writeFile(path.join(temp, "CHANGELOG.md"), "No release entries yet.\n", "utf8");
    const missingEntry = await runPipeline({ path: temp, failOn: "never" });
    expect(missingEntry.findings.some((finding) => finding.ruleId === "release.changelog-present")).toBe(true);

    await fs.writeFile(path.join(temp, "CHANGELOG.md"), "## [1.0.0]\n\nInitial release.\n", "utf8");
    const fresh = await runPipeline({ path: temp, failOn: "never" });
    expect(fresh.findings.some((finding) => finding.ruleId === "manufacturing.outputs-present")).toBe(false);
    expect(fresh.findings.some((finding) => finding.ruleId === "release.changelog-present")).toBe(false);

    await fs.utimes(drill, new Date(0), new Date(0));
    const stale = await runPipeline({ path: temp, failOn: "never" });
    expect(
      stale.findings.some(
        (finding) => finding.ruleId === "manufacturing.outputs-present" && finding.message.includes("stale"),
      ),
    ).toBe(true);
  });

  it("covers drill coverage and release tag mismatch", async () => {
    const previousType = process.env.GITHUB_REF_TYPE;
    const previousName = process.env.GITHUB_REF_NAME;
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-drill-"));
    await fs.writeFile(path.join(temp, "drill.kicad_pro"), "{}", "utf8");
    await fs.writeFile(path.join(temp, "drill.kicad_sch"), "(kicad_sch)", "utf8");
    await fs.writeFile(
      path.join(temp, "drill.kicad_pcb"),
      '(kicad_pcb (title_block (rev "1.0.0")) (footprint "X" (property "Reference" "U1") (drill 0.4)))',
      "utf8",
    );
    await fs.writeFile(path.join(temp, "drill.drl"), "T1C0.3\n", "utf8");
    await fs.mkdir(path.join(temp, "fab"));
    await fs.writeFile(path.join(temp, "fab", "README.md"), "notes", "utf8");
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      "version: 1\nrules:\n  drc.kicad:\n    enabled: false\n  erc.kicad:\n    enabled: false\n  release.changelog-present:\n    enabled: false\n",
      "utf8",
    );
    process.env.GITHUB_REF_TYPE = "tag";
    process.env.GITHUB_REF_NAME = "v2.0.0";
    const result = await runPipeline({ path: temp, failOn: "never" });
    expect(result.findings.some((finding) => finding.ruleId === "manufacturing.drill-coverage")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "release.tag-matches-revision")).toBe(true);
    restoreEnv("GITHUB_REF_TYPE", previousType);
    restoreEnv("GITHUB_REF_NAME", previousName);
  });
});

async function fakeKicadCli(dir: string): Promise<string> {
  const script = path.join(dir, process.platform === "win32" ? "kicad-cli.cmd" : "kicad-cli");
  const js = path.join(dir, "fake-kicad.mjs");
  await fs.writeFile(
    js,
    `import fs from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "version" || args[0] === "--version") {
  console.log("10.0.0");
  process.exit(0);
}
const output = args[args.indexOf("--output") + 1];
const isDrc = args.includes("drc");
const payload = isDrc
  ? { violations: [{ rule: "track_too_close", severity: "error", message: "clearance", file: args.at(-1), line: 12, column: 3 }] }
  : { diagnostics: [{ rule: "unconnected_pin", severity: "warning", message: "pin", file: args.at(-1), line: 7, column: 1 }] };
fs.writeFileSync(output, JSON.stringify(payload));
process.exit(1);
`,
    "utf8",
  );
  if (process.platform === "win32") {
    await fs.writeFile(script, `@echo off\r\n"${process.execPath}" "${js}" %*\r\n`, "utf8");
  } else {
    await fs.writeFile(script, `#!/bin/sh\n"${process.execPath}" "${js}" "$@"\n`, "utf8");
    await fs.chmod(script, 0o755);
  }
  return script;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
