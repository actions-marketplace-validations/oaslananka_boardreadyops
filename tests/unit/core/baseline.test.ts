import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { BaselineFile } from "../../../src/core/baseline.js";
import {
  applyBaseline,
  createBaseline,
  diffBaseline,
  readBaseline,
  resolveBaselinePath,
  writeBaseline,
} from "../../../src/core/baseline.js";
import type { Finding } from "../../../src/core/findings.js";

describe("finding baselines", () => {
  it("diffs added, removed, and unchanged findings by fingerprint", () => {
    const baseline: BaselineFile = {
      version: 1,
      capturedAt: "2026-05-21T10:00:00.000Z",
      capturedBy: "boardreadyops/1.0.2",
      findings: [
        { fingerprint: "unchanged", ruleId: "bom.lifecycle", message: "unchanged", suppressedUntil: null },
        { fingerprint: "removed", ruleId: "bom.lifecycle", message: "removed", suppressedUntil: null },
      ],
    };

    const diff = diffBaseline([finding("unchanged", "unchanged"), finding("added", "added")], baseline);

    expect(diff.added.map((entry) => entry.fingerprint)).toEqual(["added"]);
    expect(diff.removed.map((entry) => entry.fingerprint)).toEqual(["removed"]);
    expect(diff.unchanged.map((entry) => entry.fingerprint)).toEqual(["unchanged"]);
  });

  it("creates, stores, loads, applies, and resolves baseline files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-unit-"));
    const baseline = createBaseline([finding("known", "known")], new Date("2026-05-21T10:00:00.000Z"));
    const defaultFile = resolveBaselinePath(root);
    const customFile = resolveBaselinePath(root, { file: "audit/current.json" });

    expect(baseline).toMatchObject({
      version: 1,
      capturedAt: "2026-05-21T10:00:00.000Z",
      findings: [{ fingerprint: "known", ruleId: "bom.lifecycle", message: "known", suppressedUntil: null }],
    });
    expect(defaultFile).toBe(path.join(root, ".boardreadyops-baseline.json"));
    expect(customFile).toBe(path.join(root, "audit/current.json"));
    expect(await readBaseline(defaultFile)).toBeUndefined();

    await writeBaseline(customFile, baseline);
    await expect(readBaseline(customFile)).resolves.toEqual(baseline);
    expect(
      applyBaseline([finding("known", "known"), finding("new", "new")], baseline, "new-only").map((entry) => ({
        fingerprint: entry.fingerprint,
        suppressed: entry.suppressed,
      })),
    ).toEqual([
      { fingerprint: "known", suppressed: true },
      { fingerprint: "new", suppressed: undefined },
    ]);
    expect(applyBaseline([finding("known", "known")], baseline, "all").map((entry) => entry.suppressed)).toEqual([
      undefined,
    ]);

    await fs.writeFile(defaultFile, JSON.stringify({ version: 2, findings: {} }));
    await expect(readBaseline(defaultFile)).rejects.toThrow("Invalid baseline file");
  });

  it("rejects null baseline files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-null-"));
    const file = resolveBaselinePath(root);

    await fs.writeFile(file, "null");

    await expect(readBaseline(file)).rejects.toThrow("Invalid baseline file");
  });

  it("normalizes malformed JSON parse failures to invalid baseline errors", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-json-"));
    const file = resolveBaselinePath(root);

    await fs.writeFile(file, "{not-json");

    await expect(readBaseline(file)).rejects.toThrow(`Invalid baseline file: ${file}`);
  });

  it("rejects malformed baseline finding entries", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-entry-"));
    const file = resolveBaselinePath(root);

    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        capturedAt: "2026-05-21T10:00:00.000Z",
        capturedBy: "boardreadyops/1.0.2",
        findings: [null],
      }),
    );

    await expect(readBaseline(file)).rejects.toThrow("Invalid baseline file");
  });
});

function finding(fingerprint: string, message: string): Finding {
  return {
    ruleId: "bom.lifecycle",
    severity: "high",
    message,
    resource: { path: "bom.csv", kind: "bom" },
    fingerprint,
  };
}
