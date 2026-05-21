import yaml from "js-yaml";
import { readTextFile } from "../../util/fs.js";
import type { PinmapDocument } from "../types.js";

export async function readYamlPinmap(file: string): Promise<PinmapDocument> {
  return yaml.load(await readTextFile(file)) as PinmapDocument;
}
