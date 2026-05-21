import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const gitDir = join(rootDir, ".git");

if (
  process.env.CI === "true" ||
  process.env.HUSKY === "0" ||
  process.env.NODE_ENV === "production" ||
  !existsSync(gitDir)
) {
  process.exit(0);
}

let husky;

try {
  ({ default: husky } = await import("husky"));
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") {
    process.exit(0);
  }

  throw error;
}

husky();
