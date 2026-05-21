import { z } from "zod";
import { readCsvPinmap } from "./resolvers/csv.js";
import { readJsonPinmap } from "./resolvers/json.js";
import { readYamlPinmap } from "./resolvers/yaml.js";
import type { PinmapDocument } from "./types.js";

const pinmapSchema = z.object({
  version: z.literal(1),
  pins: z.array(
    z.object({
      designator: z.string().min(1),
      pin: z.string().min(1),
      net: z.string().min(1),
      firmware: z.string().optional(),
    }),
  ),
});

export interface LoadedPinmap {
  document?: PinmapDocument;
  errors: string[];
}

export async function loadPinmap(file: string): Promise<LoadedPinmap> {
  try {
    const lowered = file.toLowerCase();
    const document = lowered.endsWith(".json")
      ? await readJsonPinmap(file)
      : lowered.endsWith(".csv")
        ? await readCsvPinmap(file)
        : await readYamlPinmap(file);
    const parsed = pinmapSchema.safeParse(document);
    if (!parsed.success) {
      return { errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
    }
    return { document: parsed.data, errors: [] };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "pinmap could not be loaded"] };
  }
}
