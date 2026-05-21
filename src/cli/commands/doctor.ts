import { validateConfig } from "../../core/config.js";
import { detectKicadCli } from "../../kicad/cli.js";

export async function doctorCommand(streams: { stdout: NodeJS.WritableStream }): Promise<number> {
  const kicad = await detectKicadCli();
  const configErrors = validateConfig({ version: 1 });
  streams.stdout.write(`Node: ${process.version}\n`);
  streams.stdout.write(`kicad-cli: ${kicad.found ? `${kicad.path} ${kicad.version ?? ""}` : "not found"}\n`);
  streams.stdout.write(`config schema: ${configErrors.length === 0 ? "valid" : configErrors.join("; ")}\n`);
  return 0;
}
