import path from "node:path";
import { pathExists, writeTextFile } from "../../util/fs.js";

const starter = `version: 1
mode: warn
projects:
  - path: .
rules:
  drc.kicad:
    enabled: true
  erc.kicad:
    enabled: true
  bom.missing-mpn:
    enabled: true
    severity: high
    ignore-refs: ["TP*", "FID*"]
  pinmap.verify:
    enabled: true
    severity: high
  manufacturing.outputs-present:
    enabled: true
    required:
      - gerber
      - drill
fail-on: high
report:
  sarif: build/boardreadyops.sarif.json
  json: build/boardreadyops.findings.json
  markdown: build/boardreadyops.report.md
  html: build/boardreadyops.report.html
  # junit: build/boardreadyops.junit.xml
`;

export async function initCommand(cwd: string, streams: { stdout: NodeJS.WritableStream }): Promise<number> {
  const file = path.resolve(cwd, "boardreadyops.yml");
  if (await pathExists(file)) {
    streams.stdout.write("boardreadyops.yml already exists\n");
    return 0;
  }
  await writeTextFile(file, starter);
  streams.stdout.write("created boardreadyops.yml\n");
  return 0;
}
