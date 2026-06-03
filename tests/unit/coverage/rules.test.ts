import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../src/core/pipeline.js";

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
