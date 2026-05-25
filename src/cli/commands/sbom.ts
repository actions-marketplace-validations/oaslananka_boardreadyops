import path from "node:path";
import { loadConfig } from "../../core/config.js";
import { createLogger } from "../../core/logger.js";
import { canonicalRoot, runPipeline } from "../../core/pipeline.js";
import { resolveLocale, t } from "../../i18n/t.js";
import { formatHbom } from "../../report/hbom.js";
import { writeTextFile } from "../../util/fs.js";
import { normalizePathInput } from "../../util/path.js";

export interface SbomCliOptions {
  config?: string | undefined;
  project?: string | undefined;
  bom?: string | undefined;
  variant?: string | undefined;
  output?: string | undefined;
  format?: string | undefined;
}

export async function sbomCommand(
  pathInput: string | undefined,
  options: SbomCliOptions,
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream },
): Promise<number> {
  const format = options.format ?? "cyclonedx";
  if (format !== "cyclonedx") {
    streams.stderr.write(`SBOM format ${format} is not supported yet.\n`);
    return 2;
  }

  const locale = resolveLocale();
  const root = await canonicalRoot(path.resolve(normalizePathInput(pathInput ?? ".")));
  const loaded = await loadConfig(root, options.config);
  if (loaded.errors.length > 0) {
    for (const error of loaded.errors) {
      streams.stderr.write(`${t("cli.error.configuration", { error }, locale)}\n`);
    }
    return 2;
  }

  const result = await runPipeline(
    {
      cwd: process.cwd(),
      path: root,
      project: options.project,
      config: options.config,
      mode: "warn",
      requireKicad: false,
      bom: options.bom,
      variant: options.variant,
      failOn: "never",
      annotations: false,
      quiet: true,
      color: "never",
    },
    createLogger("silent"),
  );
  await writeHbom(root, options.output ?? "build/hbom.json", formatHbom(result), streams.stdout);
  return 0;
}

async function writeHbom(root: string, output: string, content: string, stdout: NodeJS.WritableStream): Promise<void> {
  if (output === "-") {
    stdout.write(content);
    return;
  }
  await writeTextFile(path.resolve(root, normalizePathInput(output)), content);
}
