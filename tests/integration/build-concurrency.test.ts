import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, expect, it } from "vitest";

describe("build script", () => {
  it("keeps bundles valid when two local builds overlap", async () => {
    const first = spawn(process.execPath, ["scripts/build.mjs"], { stdio: "pipe" });
    const second = spawn(process.execPath, ["scripts/build.mjs"], { stdio: "pipe" });

    const [firstResult, secondResult] = await Promise.all([waitForExit(first), waitForExit(second)]);

    expect(firstResult, firstResult.output).toMatchObject({ code: 0, signal: null });
    expect(secondResult, secondResult.output).toMatchObject({ code: 0, signal: null });

    const actionCheck = spawn(process.execPath, ["-c", "dist/action/index.cjs"], { stdio: "pipe" });
    const cliCheck = spawn(process.execPath, ["-c", "dist/cli/index.cjs"], { stdio: "pipe" });
    const actionCheckResult = waitForExit(actionCheck);
    const cliCheckResult = waitForExit(cliCheck);

    await expect(actionCheckResult).resolves.toMatchObject({ code: 0, signal: null });
    await expect(cliCheckResult).resolves.toMatchObject({ code: 0, signal: null });
  }, 30_000);
});

async function waitForExit(
  child: ReturnType<typeof spawn>,
): Promise<{ code: number | null; signal: string | null; output: string }> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
  const [code, signal] = (await once(child, "exit")) as [number | null, string | null];

  return {
    code,
    signal,
    output: `${Buffer.concat(stdout).toString("utf8")}\n${Buffer.concat(stderr).toString("utf8")}`,
  };
}
