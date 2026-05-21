import { readTextFile } from "../../util/fs.js";
import type { PinmapDocument } from "../types.js";

export async function readJsonPinmap(file: string): Promise<PinmapDocument> {
  return JSON.parse(await readTextFile(file)) as PinmapDocument;
}
