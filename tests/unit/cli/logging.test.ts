import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("CLI structured logging", () => {
  it("writes command and rule events as parseable JSONL", async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-log-"));
    await fs.rm(workspace, { recursive: true, force: true });
    await fs.cp(path.join(fixtureRoot, "safe-basic"), workspace, { recursive: true });
    const logFile = path.join(workspace, "logs", "boardreadyops.jsonl");
    const streams = memoryStreams();

    const code = await runCli(
      [
        "run",
        workspace,
        "--no-annotations",
        "--log-format",
        "json",
        "--log-level",
        "debug",
        "--log-file",
        logFile,
        "--log-file-max-bytes",
        "65536",
        "--log-file-retention",
        "1",
      ],
      streams,
    );

    expect(code, `${streams.stdoutText()}\n${streams.stderrText()}`).toBe(0);
    const entries = (await fs.readFile(logFile, "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    expect(entries.map((entry) => entry.event)).toContain("cli.command.start");
    expect(entries.map((entry) => entry.event)).toContain("cli.command.finish");
    expect(entries.map((entry) => entry.event)).toContain("pipeline.rule.start");
    expect(entries.map((entry) => entry.event)).toContain("pipeline.rule.finish");
    expect(entries.every((entry) => typeof entry.ts === "string" && entry.session_id)).toBe(true);
  });
});

function memoryStreams() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      },
    } as NodeJS.WritableStream,
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      },
    } as NodeJS.WritableStream,
    stdoutText: () => stdout,
    stderrText: () => stderr,
  };
}
