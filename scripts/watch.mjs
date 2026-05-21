import { spawn } from "node:child_process";

const child = spawn("node", ["scripts/build.mjs", "--watch"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  windowsHide: true,
});

child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
