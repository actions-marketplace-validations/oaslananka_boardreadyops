import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runWithMkDocsWarningSuppressed } from "./lib/run-command.mjs";

const markdownFiles = [];
await collect("docs");
for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  if (/{{[#/^]?[A-Za-z0-9_.-]+}}/.test(text) && !file.includes("templates")) {
    throw new Error(`unresolved template token in ${file}`);
  }
}

const siteDir = await mkdtemp(path.join(os.tmpdir(), "boardreadyops-mkdocs-"));
try {
  await runWithMkDocsWarningSuppressed("python", [
    "-m",
    "mkdocs",
    "build",
    "--strict",
    "--quiet",
    "--site-dir",
    siteDir,
  ]);
} finally {
  await rm(siteDir, { recursive: true, force: true });
}

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(full);
    } else if (entry.name.endsWith(".md")) {
      markdownFiles.push(full);
    }
  }
}
