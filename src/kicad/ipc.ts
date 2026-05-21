import { detectKicadCli } from "./cli.js";
import { parseKicadMajor } from "./version.js";

export interface KicadApiServerSupport {
  supported: boolean;
  version?: string | undefined;
}

export async function detectApiServerSupport(cliPath?: string): Promise<KicadApiServerSupport> {
  const detected = await detectKicadCli(cliPath);
  if (!detected.found || !detected.version) {
    return { supported: false };
  }
  const major = parseKicadMajor(detected.version);
  return {
    supported: major !== undefined && major >= 10,
    version: detected.version,
  };
}
