import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diffFabrication } from "../../src/core/diff/fabrication.js";
import { runPipeline } from "../../src/core/pipeline.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("fabrication diff integration", () => {
  it("compares base and head BOM artifacts from pipeline snapshots", async () => {
    const base = await workspaceFromFixture("bom-single-source");
    const head = await workspaceFromFixture("bom-single-source");
    await fs.appendFile(
      path.join(head, "bom.csv"),
      "\nC45,100nF,Capacitor_SMD:C_0402,Generic,C0402-100N,LCSC,Active,false\n",
      "utf8",
    );

    const previous = await runPipeline({ path: base, failOn: "never" });
    const current = await runPipeline({ path: head, failOn: "never" });
    const diff = diffFabrication(previous.fabrication, current.fabrication, previous.findings, current.findings);

    expect(diff.bom.rows).toContainEqual({
      reference: "C45",
      previous: "",
      current: "C0402-100N Capacitor_SMD:C_0402",
      status: "added",
    });
  });
});

async function workspaceFromFixture(fixture: string): Promise<string> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-diff-"));
  await fs.rm(workspace, { recursive: true, force: true });
  await fs.cp(path.join(fixtureRoot, fixture), workspace, { recursive: true });
  return workspace;
}
