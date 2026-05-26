import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/index.js";

vi.mock("../../src/kicad/paths.js", () => ({
  defaultKicadCliCandidates: () => ["kicad-cli"],
}));

const doctorChecks = ["runtime", "kicad", "adapters", "repository", "suppressions", "action"] as const;
const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("doctor snapshots", () => {
  it("formats stable JSON for every check", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-doctor-snapshot-"));
    await fs.cp(path.join(fixtureRoot, "safe-basic"), temp, { recursive: true });
    const previousPath = process.env.PATH;
    const previousNexarClientId = process.env.NEXAR_CLIENT_ID;
    const previousNexarClientSecret = process.env.NEXAR_CLIENT_SECRET;
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(temp);
    process.env.PATH = "";
    delete process.env.NEXAR_CLIENT_ID;
    delete process.env.NEXAR_CLIENT_SECRET;
    try {
      const reports: Record<string, unknown> = {};
      for (const check of doctorChecks) {
        const streams = captureStreams();
        expect(await runCli(["doctor", "--check", check, "--format", "json"], streams)).toBe(0);
        reports[check] = normalizeReport(JSON.parse(streams.stdoutText()));
      }

      expect(reports).toMatchSnapshot();
    } finally {
      cwd.mockRestore();
      restoreEnv("PATH", previousPath);
      restoreEnv("NEXAR_CLIENT_ID", previousNexarClientId);
      restoreEnv("NEXAR_CLIENT_SECRET", previousNexarClientSecret);
    }
  });
});

function normalizeReport(report: {
  tool: { version: string };
  checks: Array<{ items: SnapshotDoctorItem[] }>;
  recommendations: string[];
}) {
  return {
    ...report,
    tool: { ...report.tool, version: "<version>" },
    checks: report.checks.map((check) => ({
      ...check,
      items: check.items.map(normalizeItem),
    })),
    recommendations: report.recommendations.filter(
      (recommendation) => recommendation !== "Install a supported Node.js 24 runtime.",
    ),
  };
}

interface SnapshotDoctorItem {
  severity: string;
  message: string;
  recommendation?: string | undefined;
}

function normalizeItem(entry: SnapshotDoctorItem): SnapshotDoctorItem {
  if (entry.message.startsWith("Node: ")) {
    return {
      severity: "<node-runtime>",
      message: entry.message.replace(/^Node: v[^\s]+/, "Node: <version>"),
    };
  }
  return {
    ...entry,
    message: entry.message.replace(/^boardreadyops: v.+$/, "boardreadyops: v<version>"),
  };
}

function captureStreams() {
  let stdout = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      },
    },
    stderr: {
      write() {
        return true;
      },
    },
    stdoutText() {
      return stdout;
    },
  } as unknown as {
    stdout: NodeJS.WritableStream;
    stderr: NodeJS.WritableStream;
    stdoutText(): string;
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
