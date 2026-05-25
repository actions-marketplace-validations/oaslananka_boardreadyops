import configSchema from "../../../schemas/config.schema.json" with { type: "json" };
import doctorSchema from "../../../schemas/doctor.schema.json" with { type: "json" };
import findingsSchema from "../../../schemas/findings.schema.json" with { type: "json" };
import hbomSchema from "../../../schemas/hbom.schema.json" with { type: "json" };
import pinmapSchema from "../../../schemas/pinmap.schema.json" with { type: "json" };

export function schemaCommand(name: string | undefined, streams: { stdout: NodeJS.WritableStream }): number {
  const schema =
    name === "doctor"
      ? doctorSchema
      : name === "findings"
        ? findingsSchema
        : name === "hbom"
          ? hbomSchema
          : name === "pinmap"
            ? pinmapSchema
            : configSchema;
  streams.stdout.write(`${JSON.stringify(schema, null, 2)}\n`);
  return 0;
}
