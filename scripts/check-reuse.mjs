import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
let exitCode = 0;

const w = (msg) => process.stdout.write(`${msg}\n`);

w("REUSE compliance check");
w("======================");

const reuseToml = resolve(ROOT, "REUSE.toml");
if (existsSync(reuseToml)) {
  w("  PASS  REUSE.toml exists");
} else {
  w("  FAIL  REUSE.toml missing");
  exitCode = 1;
}

const licensesDir = resolve(ROOT, "LICENSES");
if (existsSync(licensesDir)) {
  const files = readdirSync(licensesDir).filter((f) => f.endsWith(".txt"));
  if (files.length > 0) {
    w(`  PASS  LICENSES/ directory exists with ${files.length} license file(s)`);
  } else {
    w("  FAIL  LICENSES/ directory is empty");
    exitCode = 1;
  }
} else {
  w("  FAIL  LICENSES/ directory missing");
  exitCode = 1;
}

const licenseFile = resolve(ROOT, "LICENSE");
if (existsSync(licenseFile)) {
  w("  PASS  LICENSE file exists");
} else {
  w("  FAIL  LICENSE file missing");
  exitCode = 1;
}

const noticeFile = resolve(ROOT, "NOTICE");
if (existsSync(noticeFile)) {
  w("  PASS  NOTICE file exists");
} else {
  w("  FAIL  NOTICE file missing");
  exitCode = 1;
}

try {
  const reuseConfig = readFileSync(reuseToml, "utf-8");
  if (reuseConfig.includes("SPDX-License-Identifier")) {
    w("  PASS  REUSE.toml contains SPDX-License-Identifier annotations");
  } else {
    w("  FAIL  REUSE.toml does not contain SPDX-License-Identifier");
    exitCode = 1;
  }
} catch {
  w("  FAIL  Could not read REUSE.toml");
  exitCode = 1;
}

w(`\nExit code: ${exitCode}`);
process.exit(exitCode);
