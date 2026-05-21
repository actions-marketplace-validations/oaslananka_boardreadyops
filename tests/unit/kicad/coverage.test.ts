import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectKicadCli, runKicadReport } from "../../../src/kicad/cli.js";
import { detectApiServerSupport } from "../../../src/kicad/ipc.js";
import { parseJobset, runJobset } from "../../../src/kicad/jobset.js";
import { parseKicadDiagnostics } from "../../../src/kicad/parsers/drc-report.js";
import { parseProjectMetadata, readDesignFile } from "../../../src/kicad/parsers/project-files.js";
import { defaultKicadCliCandidates } from "../../../src/kicad/paths.js";
import { parsePcb } from "../../../src/kicad/pcb.js";
import { extractBlocks, parseSchematic } from "../../../src/kicad/schematic.js";
import { activeVariantDnpRefs, parseVariants } from "../../../src/kicad/variants.js";
import { parseKicadMajor } from "../../../src/kicad/version.js";
import { writeFixture } from "../rules/helpers.js";

const originalPlatform = process.platform;

afterEach(() => {
  Object.defineProperty(process, "platform", { value: originalPlatform });
});

describe("KiCad CLI adapters", () => {
  it("detects version output from explicit kicad-cli paths", async () => {
    const root = await writeFixture({});
    const cli = await writeExecutable(root, "version-cli", [
      `if (args[0] === "version") {`,
      `  process.stdout.write("10.0.2\\u0000\\n");`,
      `  process.exit(0);`,
      `}`,
      `process.exit(7);`,
    ]);

    expect(await detectKicadCli(cli)).toMatchObject({ found: true, path: cli, version: "10.0.2" });
    expect(await detectApiServerSupport(cli)).toEqual({ supported: true, version: "10.0.2" });
  });

  it("falls back to --version and reports unsupported API server versions", async () => {
    const root = await writeFixture({});
    const cli = await writeExecutable(root, "dash-version-cli", [
      `if (args[0] === "--version") {`,
      `  process.stdout.write("9.99.0\\n");`,
      `  process.exit(0);`,
      `}`,
      `process.exit(2);`,
    ]);

    expect(await detectKicadCli(cli)).toMatchObject({ found: true, version: "9.99.0" });
    expect(await detectApiServerSupport(cli)).toEqual({ supported: false, version: "9.99.0" });
    expect(await detectKicadCli(path.join(root, "missing", "kicad-cli"))).toEqual({ found: false });
    expect(await detectApiServerSupport(path.join(root, "missing", "kicad-cli"))).toEqual({ supported: false });
  });

  it("runs DRC and ERC reports without passing unsupported variant flags", async () => {
    const root = await writeFixture({ "board.kicad_pcb": "(kicad_pcb)", "board.kicad_sch": "(kicad_sch)" });
    const argsFile = path.join(root, "args.json");
    const cli = await writeExecutable(root, "report-cli", [
      `const fs = await import("node:fs");`,
      `const out = args[args.indexOf("--output") + 1];`,
      `fs.writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(args));`,
      `fs.writeFileSync(out, JSON.stringify({ diagnostics: [{ ruleId: "clearance", severity: "error", message: "bad\\u0000", file: args.at(-1), line: 5, column: 2 }] }));`,
      `process.exit(1);`,
    ]);

    const drc = await runKicadReport(cli, "drc", path.join(root, "board.kicad_pcb"), "production");
    expect(drc).toMatchObject({ status: "failed" });
    expect(drc.diagnostics[0]).toMatchObject({ ruleId: "clearance", line: 5, column: 2 });
    expect(JSON.parse(await fs.readFile(argsFile, "utf8"))).not.toContain("production");

    const erc = await runKicadReport(cli, "erc", path.join(root, "board.kicad_sch"));
    expect(erc.diagnostics[0]?.message).toBe("bad\u0000");
  });

  it("returns sanitized textual errors when KiCad emits no JSON diagnostics", async () => {
    const root = await writeFixture({ "board.kicad_pcb": "(kicad_pcb)" });
    const cli = await writeExecutable(root, "bad-report-cli", [
      `process.stdout.write("bad\\u0000 stdout");`,
      `process.stderr.write("bad\\u0001 stderr");`,
      `process.exit(3);`,
    ]);

    const result = await runKicadReport(cli, "drc", path.join(root, "board.kicad_pcb"));

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual([]);
    expect(result.error).toContain("bad stdout");
    expect(result.error).toContain("bad stderr");
  });

  it("classifies successful KiCad exits with and without diagnostics", async () => {
    const root = await writeFixture({ "board.kicad_pcb": "(kicad_pcb)" });
    const passing = await writeExecutable(root, "passing-report-cli", [
      `const fs = await import("node:fs");`,
      `const out = args[args.indexOf("--output") + 1];`,
      `fs.writeFileSync(out, "{}");`,
      `process.exit(0);`,
    ]);
    const withDiagnostics = await writeExecutable(root, "diagnostic-report-cli", [
      `const fs = await import("node:fs");`,
      `const out = args[args.indexOf("--output") + 1];`,
      `fs.writeFileSync(out, JSON.stringify({ violations: [{ message: "still bad" }] }));`,
      `process.exit(0);`,
    ]);

    expect(await runKicadReport(passing, "drc", path.join(root, "board.kicad_pcb"))).toMatchObject({
      status: "passed",
      diagnostics: [],
    });
    expect(await runKicadReport(withDiagnostics, "drc", path.join(root, "board.kicad_pcb"))).toMatchObject({
      status: "failed",
      diagnostics: [{ ruleId: "drc", message: "still bad" }],
    });
  });

  it("builds default candidate lists for supported host platforms", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(defaultKicadCliCandidates()).toContain("C:\\Program Files\\KiCad\\10.1\\bin\\kicad-cli.exe");

    Object.defineProperty(process, "platform", { value: "darwin" });
    expect(defaultKicadCliCandidates()[0]).toContain("/Applications/KiCad");

    Object.defineProperty(process, "platform", { value: "linux" });
    expect(defaultKicadCliCandidates()).toEqual(["kicad-cli"]);
  });
});

describe("KiCad parsers", () => {
  it("normalizes KiCad report shapes and recursive fallback diagnostics", () => {
    expect(parseKicadDiagnostics("", "drc")).toEqual([]);
    expect(
      parseKicadDiagnostics(
        JSON.stringify({
          violations: [{ rule: "too_close", message: "clearance" }],
          warnings: [{ key: "warn", description: "warning", path: "board.kicad_pcb" }],
        }),
        "drc",
      ).map((diagnostic) => diagnostic.ruleId),
    ).toEqual(["too_close", "warn"]);

    expect(
      parseKicadDiagnostics(JSON.stringify({ nested: { item: { message: "deep", type: "deep_rule" } } }), "erc")[0],
    ).toMatchObject({ ruleId: "deep_rule", message: "deep" });
    expect(parseKicadDiagnostics(JSON.stringify([{ message: "array item" }, null, "text"]), "drc")[0]).toMatchObject({
      ruleId: "drc",
      message: "array item",
    });
    expect(parseKicadDiagnostics(JSON.stringify({ a: { b: { c: primitiveNest(20) } } }), "erc")).toEqual([]);
    expect(parseKicadDiagnostics(JSON.stringify({ nested: { message: undefined } }), "erc")).toEqual([]);
  });

  it("parses project metadata from JSON and S-expressions", async () => {
    const json = JSON.stringify({
      board: {
        variants: [{ name: "prod", dnpOverrides: ["R2"] }],
        jobsets: ["outputs.kicad_jobset"],
        net_settings: { diff_pair_prefixes: ["USB", "USB"] },
      },
    });
    expect(parseProjectMetadata(json)).toEqual({
      variants: [{ name: "prod", dnpOverrides: ["R2"] }],
      jobsets: ["outputs.kicad_jobset"],
      differentialPairPrefixes: ["USB"],
    });

    expect(
      parseProjectMetadata(
        '(project (variants (variant "proto" (dnp "C1"))) (jobset "fab.kicad_jobset") (diff_pair_prefix "DIFF"))',
      ),
    ).toEqual({
      variants: [{ name: "proto", dnpOverrides: ["C1"] }],
      jobsets: ["fab.kicad_jobset"],
      differentialPairPrefixes: ["DIFF"],
    });
    expect(await readDesignFile(path.join(os.tmpdir(), "missing-kicad-project"))).toBeUndefined();
  });

  it("parses KiCad 10 PCB and schematic attributes", async () => {
    const root = await writeFixture({
      "board.kicad_pcb": `(kicad_pcb
        (layers (0 "F.Cu" signal) (1 "In1.Cu" signal) (2 "B.Cu" signal))
        (title_block (rev "v2.1"))
        (setup (stackup (layer "F.Cu") (layer "B.Cu")))
        (gr_line (start 0 0) (end 10 0) (layer "Edge.Cuts"))
        (gr_line (start 10 0) (end 10 10) (layer "Edge.Cuts"))
        (gr_line (start 10 10) (end 0 10) (layer "Edge.Cuts"))
        (gr_line (start 0 10) (end 0 0) (layer "Edge.Cuts"))
        (zone (layer "F.Cu") (filled_polygon (pts (xy 0 0) (xy 10 0) (xy 10 10) (xy 0 10))))
        (design_block_instances (design_block_instance (path "/block")))
        (footprint "Package:QFN" (layer "In1.Cu") (property "Reference" "U1") (attr smd board_only dnp) (drill 0.25))
      )`,
      "board.kicad_sch": `(kicad_sch
        (label "NET_A")
        (global_label "NET_B")
        (hierarchical_label "NET_C")
        (hop_over)
        (symbol
          (property "Reference" "U1")
          (property "Value" "MCU")
          (property "Footprint" "Package:QFN")
          (property "Mfr" "Vendor")
          (property "Manufacturer Part Number" "ABC")
          (property "DNP" "yes")
          (property "Variant" "prototype")
        )
        (pin "PA0" (net "NET_A") (ref "U1"))
      )`,
    });

    const pcb = await parsePcb(path.join(root, "board.kicad_pcb"));
    expect(pcb.revision).toBe("v2.1");
    expect(pcb.outlineClosed).toBe(true);
    expect(pcb.boardArea).toBe(100);
    expect(pcb.copperAreas.get("F.Cu")).toBe(100);
    expect(pcb.copperLayerCount).toBe(3);
    expect(pcb.stackupLayerCount).toBe(2);
    expect(pcb.designBlockInstances).toBe(1);
    expect(pcb.footprints[0]).toMatchObject({ reference: "U1", dnp: true, boardOnly: true, layers: ["In1.Cu"] });
    const sparsePcb = await parsePcb(
      path.join(
        await writeFixture({
          "sparse.kicad_pcb": '(kicad_pcb (footprint "Package:NoRef") (zone (polygon (pts (xy 0 0) (xy 1 0)))) )',
        }),
        "sparse.kicad_pcb",
      ),
    );
    expect(sparsePcb.footprints).toEqual([]);
    expect(sparsePcb.boardArea).toBeUndefined();
    expect(sparsePcb.outlineClosed).toBe(false);

    const geometryRoot = await writeFixture({
      "geometry.kicad_pcb": `(kicad_pcb
        (layers (0 "TopLayer" signal) (31 "BottomLayer" signal))
        (gr_circle (center 5 5) (end 10 5) (layer "Edge.Cuts"))
        (zone (layer "TopLayer")
          (filled_polygon
            (pts (xy 0 0) (xy 10 0) (xy 10 10) (xy 0 10))
            (pts (xy 2 2) (xy 4 2) (xy 4 4) (xy 2 4))
          )
        )
      )`,
      "open.kicad_pcb": `(kicad_pcb
        (gr_line (layer "Edge.Cuts") (start 0 0) (end 10 0) (stroke (width 0.1)))
        (gr_line (layer "Edge.Cuts") (start 10 0) (end 10 10) (stroke (width 0.1)))
        (gr_arc (layer "Edge.Cuts") (start 99 99) (mid 100 100))
      )`,
    });
    const circular = await parsePcb(path.join(geometryRoot, "geometry.kicad_pcb"));
    expect(circular.outlineClosed).toBe(true);
    expect(circular.boardArea).toBeCloseTo(Math.PI * 25);
    expect(circular.copperLayers).toEqual(["TopLayer", "BottomLayer"]);
    expect(circular.copperAreas.get("TopLayer")).toBe(96);
    const open = await parsePcb(path.join(geometryRoot, "open.kicad_pcb"));
    expect(open.outlineClosed).toBe(false);
    expect(open.boardArea).toBeUndefined();

    const cutoutRoot = await writeFixture({
      "cutout.kicad_pcb": `(kicad_pcb
        (gr_line (start 0 0) (end 10 0) (layer "Edge.Cuts"))
        (gr_line (start 10 0) (end 10 10) (layer "Edge.Cuts"))
        (gr_line (start 10 10) (end 0 10) (layer "Edge.Cuts"))
        (gr_line (start 0 10) (end 0 0) (layer "Edge.Cuts"))
        (gr_line (start 4 4) (end 6 4) (layer "Edge.Cuts"))
        (gr_line (start 6 4) (end 6 6) (layer "Edge.Cuts"))
        (gr_line (start 6 6) (end 4 6) (layer "Edge.Cuts"))
        (gr_line (start 4 6) (end 4 4) (layer "Edge.Cuts"))
      )`,
    });
    const cutout = await parsePcb(path.join(cutoutRoot, "cutout.kicad_pcb"));
    expect(cutout.outlineClosed).toBe(true);
    expect(cutout.boardArea).toBe(96);

    const schematic = await parseSchematic(path.join(root, "board.kicad_sch"));
    expect([...schematic.netLabels]).toEqual(["NET_A", "NET_B", "NET_C"]);
    expect(schematic.connectedPins).toEqual([{ designator: "U1", pin: "PA0", net: "NET_A" }]);
    expect(schematic.variantProperties.get("U1")).toBe("prototype");
    expect(schematic.hopOverWireCrossings).toBe(1);
    expect(schematic.components[0]).toMatchObject({ manufacturer: "Vendor", mpn: "ABC", dnp: true });

    const skipped = await parseSchematic(
      path.join(
        await writeFixture({
          "symbols.kicad_sch": '(kicad_sch (symbol (property "Reference" "PWR") (property "Value" "power"))) ',
        }),
        "symbols.kicad_sch",
      ),
    );
    expect(skipped.components).toEqual([]);
    expect(extractBlocks('(symbol (property "Value" "escaped \\" quote"))', "symbol")).toHaveLength(1);
  });

  it("parses variants and jobsets from fallback formats", async () => {
    expect(parseVariants("not json")).toEqual([]);
    expect(activeVariantDnpRefs({ name: "none", dnpOverrides: [] }, ["R1"])).toEqual([]);

    const root = await writeFixture({
      "board.kicad_jobset":
        '(kicad_jobset (job "gerber files" (output "fab/out.gbr") (enabled true)) (job drill (destination_path "fab") (output "holes.drl")) (job "step" (output_path "fab/out.step") (enabled  false)) (job "missing"))',
      "json.kicad_jobset": JSON.stringify({
        jobs: [
          null,
          {},
          { kind: "pdf", output: "fab/out.pdf" },
          { kind: "pdf", output: "fab/out.pdf" },
          { type: "bad" },
        ],
      }),
    });
    const parsed = await parseJobset(path.join(root, "board.kicad_jobset"));
    expect(parsed.jobs).toEqual([
      { type: "gerber files", outputPath: "fab/out.gbr", enabled: true },
      { type: "drill", outputPath: "holes.drl", destinationPath: "fab", enabled: true },
      { type: "step", outputPath: "fab/out.step", enabled: false },
    ]);
    expect((await parseJobset(path.join(root, "json.kicad_jobset"))).jobs).toEqual([
      { type: "pdf", outputPath: "fab/out.pdf", enabled: true },
    ]);
    expect(await parseJobset(path.join(root, "missing.kicad_jobset"))).toEqual({ jobs: [] });
  });

  it("runs KiCad jobsets and redacts subprocess output", async () => {
    const root = await writeFixture({ "board.kicad_pro": "{}" });
    const cli = await writeExecutable(root, "jobset-cli", [
      `process.stdout.write("ok\\u0000");`,
      `process.stderr.write("warn\\u0001");`,
      `process.exit(0);`,
    ]);

    expect(await runJobset(cli, path.join(root, "board.kicad_pro"), path.join(root, "out"))).toMatchObject({
      code: 0,
      stdout: "ok",
      stderr: "warn",
      timedOut: false,
    });
  });

  it("parses KiCad major versions conservatively", () => {
    expect(parseKicadMajor("KiCad 10.1.0")).toBe(10);
    expect(parseKicadMajor("no version")).toBeUndefined();
  });
});

function primitiveNest(depth: number): unknown {
  let value: unknown = "leaf";
  for (let index = 0; index < depth; index += 1) {
    value = { value };
  }
  return value;
}

async function writeExecutable(root: string, basename: string, bodyLines: string[]): Promise<string> {
  const js = path.join(root, `${basename}.mjs`);
  const script = path.join(root, process.platform === "win32" ? `${basename}.cmd` : basename);
  await fs.writeFile(js, `const args = process.argv.slice(2);\n${bodyLines.join("\n")}\n`, "utf8");
  if (process.platform === "win32") {
    await fs.writeFile(script, `@echo off\r\n"${process.execPath}" "${js}" %*\r\n`, "utf8");
  } else {
    await fs.writeFile(script, `#!/bin/sh\n"${process.execPath}" "${js}" "$@"\n`, "utf8");
    await fs.chmod(script, 0o755);
  }
  return script;
}
