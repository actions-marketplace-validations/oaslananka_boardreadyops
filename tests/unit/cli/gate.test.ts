import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("cli gates", () => {
  it("passes selected gates through the run command", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-gate-unit-"));
    await fs.cp(path.join(fixtureRoot, "bom-missing-mpn"), temp, { recursive: true });
    await fs.appendFile(
      path.join(temp, "boardreadyops.yml"),
      `
gates:
  release:
    fail-on: critical
`,
      "utf8",
    );

    expect(await runCli(["run", temp, "--gate", "release", "--no-annotations"], memoryStreams())).toBe(0);
  });

  it("fails unknown explicit gates even when fail-on is never", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-unknown-gate-"));
    await fs.cp(path.join(fixtureRoot, "safe-basic"), temp, { recursive: true });
    const streams = captureStreams();

    expect(
      await runCli(
        ["run", temp, "--gate", "release", "--fail-on", "never", "--rule", "release.revision-set", "--no-annotations"],
        streams,
      ),
    ).toBe(1);
    expect(streams.stdoutText()).toContain("Gate &quot;release&quot; not found in configuration.");
  });
});

function memoryStreams() {
  return {
    stdout: {
      write() {
        return true;
      },
    },
    stderr: {
      write() {
        return true;
      },
    },
  } as unknown as { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream };
}

function captureStreams() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      },
    },
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      },
    },
    stdoutText() {
      return stdout;
    },
    stderrText() {
      return stderr;
    },
  } as unknown as {
    stdout: NodeJS.WritableStream;
    stderr: NodeJS.WritableStream;
    stdoutText(): string;
    stderrText(): string;
  };
}
