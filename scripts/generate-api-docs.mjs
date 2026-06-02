import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["node_modules/typedoc/bin/typedoc", "--options", "typedoc.json"], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
