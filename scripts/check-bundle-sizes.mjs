import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const w = (msg) => process.stdout.write(`${msg}\n`);

const BUDGETS = {
  "dist/action/index.cjs": 16_000_000,
  "dist/cli/index.cjs": 12_500_000,
};

let exitCode = 0;

w("Bundle size budget check");
w("========================");

for (const [relativePath, budget] of Object.entries(BUDGETS)) {
  const absolutePath = resolve(ROOT, relativePath);
  try {
    const { size } = statSync(absolutePath);
    const pct = ((size / budget) * 100).toFixed(1);
    const status = size <= budget ? "PASS" : "FAIL";
    if (status === "FAIL") exitCode = 1;
    w(
      `  ${status}  ${relativePath}: ${(size / 1_000_000).toFixed(2)} MB / ${(budget / 1_000_000).toFixed(2)} MB (${pct}%)`,
    );
  } catch {
    w(`  FAIL  ${relativePath}: not found`);
    exitCode = 1;
  }
}

let packResult;
try {
  const raw = execSync("pnpm npm pack --dry-run --json", { cwd: ROOT, encoding: "utf-8" });
  const jsonStart = raw.indexOf("[");
  const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  const parsed = JSON.parse(jsonStr);
  packResult = Array.isArray(parsed) ? parsed[0] : parsed;
} catch {
  w("  FAIL  npm pack --dry-run failed");
  process.exit(1);
}

const PACK_BUDGET = 6_000_000;
const UNPACK_BUDGET = 32_000_000;

const packSize = packResult.size;
const unpackedSize = packResult.unpackedSize;

w("");
w("npm pack size budget check");
w("==========================");

for (const [label, actual, budget] of [
  ["packed size", packSize, PACK_BUDGET],
  ["unpacked size", unpackedSize, UNPACK_BUDGET],
]) {
  const pct = ((actual / budget) * 100).toFixed(1);
  const status = actual <= budget ? "PASS" : "FAIL";
  if (status === "FAIL") exitCode = 1;
  w(`  ${status}  ${label}: ${(actual / 1_000_000).toFixed(2)} MB / ${(budget / 1_000_000).toFixed(2)} MB (${pct}%)`);
}

w(`\nExit code: ${exitCode}`);
process.exit(exitCode);
