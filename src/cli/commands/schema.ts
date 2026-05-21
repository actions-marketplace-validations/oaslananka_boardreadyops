import configSchema from "../../../schemas/config.schema.json" with { type: "json" };
import findingsSchema from "../../../schemas/findings.schema.json" with { type: "json" };
import pinmapSchema from "../../../schemas/pinmap.schema.json" with { type: "json" };

export function schemaCommand(name: string | undefined, streams: { stdout: NodeJS.WritableStream }): number {
  const schema = name === "findings" ? findingsSchema : name === "pinmap" ? pinmapSchema : configSchema;
  streams.stdout.write(`${JSON.stringify(schema, null, 2)}\n`);
  return 0;
}
