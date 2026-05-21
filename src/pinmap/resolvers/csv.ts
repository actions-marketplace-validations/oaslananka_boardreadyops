import { parseDelimited } from "../../bom/loader.js";
import { readTextFile } from "../../util/fs.js";
import type { PinmapDocument } from "../types.js";

export async function readCsvPinmap(file: string): Promise<PinmapDocument> {
  const rows = parseDelimited(await readTextFile(file), ",");
  return {
    version: 1,
    pins: rows.map((row) => ({
      designator: row.designator ?? row.Designator ?? row.ref ?? row.Ref ?? "",
      pin: row.pin ?? row.Pin ?? "",
      net: row.net ?? row.Net ?? "",
      firmware: row.firmware ?? row.Firmware,
    })),
  };
}
