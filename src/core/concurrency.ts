import os from "node:os";
import { mapLimit } from "../util/async.js";

export function defaultConcurrency(): number {
  return Math.max(1, os.availableParallelism?.() ?? os.cpus().length ?? 1);
}

export { mapLimit };
