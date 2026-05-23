import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findI18nProblems } from "../../../scripts/check-i18n.mjs";

describe("check-i18n", () => {
  it("reports missing locale entries and unknown t() call keys", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-i18n-check-"));
    await fs.mkdir(path.join(root, "src", "i18n"), { recursive: true });
    await fs.writeFile(
      path.join(root, "src", "i18n", "en.ts"),
      'export const en = { "known.key": "Known", "missing.in.tr": "Missing" } as const;\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "src", "i18n", "tr.ts"),
      'export const tr = { "known.key": "Bilinen" } as const;\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "src", "example.ts"),
      'import { t } from "./i18n/t.js";\nt("known.key");\nt("unknown.key");\n',
      "utf8",
    );

    await expect(findI18nProblems(root, { sourceGlobs: ["src/**/*.ts"] })).resolves.toEqual([
      'src/i18n/tr.ts: missing key "missing.in.tr"',
      'src/example.ts:3: unknown i18n key "unknown.key"',
    ]);
  });
});
