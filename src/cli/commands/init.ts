import path from "node:path";
import { t } from "../../i18n/t.js";
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
    streams.stdout.write(`${t("cli.init.exists")}\n`);
    return 0;
  }
  await writeTextFile(file, starter);
  streams.stdout.write(`${t("cli.init.created")}\n`);
  return 0;
}
