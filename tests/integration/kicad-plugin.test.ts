import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runProcess } from "../../src/util/process.js";

const repoRoot = process.cwd();
const pluginRoot = path.join(repoRoot, "kicad-plugin");
const metadataPath = path.join(pluginRoot, "metadata.json");
const pluginPath = path.join(pluginRoot, "plugins", "boardreadyops_plugin.py");
const iconPath = path.join(pluginRoot, "resources", "icon.png");

interface PackageManifest {
  version: string;
  license?: string;
  files?: string[];
}

interface PluginMetadata {
  $schema?: string;
  identifier?: string;
  name?: string;
  description?: string;
  type?: string;
  license?: string;
  resources?: Record<string, string>;
  versions?: Array<{
    version?: string;
    status?: string;
    runtime?: string;
    kicad_version?: string;
  }>;
}

interface HeadlessImportResult {
  defaultName: string;
  defaultCategory: string;
  defaultDescription: string;
  registeredCount: number;
  command: string[];
  dialogText: string;
}

interface RobustnessResult {
  emptyOutputError: string;
  timeoutSeconds: number;
  isolatedReportCommand: string[];
  windowsCommand: string[];
  uncCommand: string[];
  malformedDialogText: string;
}

describe("KiCad PCM plugin", () => {
  it("ships PCM metadata versioned with the CLI", async () => {
    expect(await fileExists(metadataPath), "metadata.json should exist at the PCM package root").toBe(true);
    expect(await fileExists(pluginPath), "plugin source should live directly under plugins/").toBe(true);
    expect(await fileExists(iconPath), "PCM icon should be bundled under resources/").toBe(true);

    const manifest = await readJson<PackageManifest>(path.join(repoRoot, "package.json"));
    const metadata = await readJson<PluginMetadata>(metadataPath);

    expect(metadata.$schema).toBe("https://go.kicad.org/pcm/schemas/v2");
    expect(metadata.identifier).toBe("com.github.oaslananka.boardreadyops");
    expect(metadata.name).toBe("BoardReadyOps");
    expect(metadata.type).toBe("plugin");
    expect(metadata.license).toBe(manifest.license ?? "MIT");
    expect(metadata.description).toBe("Run BoardReadyOps fabrication checks.");
    expect(metadata.resources).toMatchObject({
      documentation: "https://github.com/oaslananka/boardreadyops/blob/main/docs/kicad-plugin.md",
      repository: "https://github.com/oaslananka/boardreadyops",
    });
    expect(metadata.versions?.[0]).toMatchObject({
      version: manifest.version,
      status: "development",
      runtime: "swig",
      kicad_version: "9.0",
    });
    expect(manifest.files).toContain("kicad-plugin");
  });

  it("imports headlessly, registers the ActionPlugin, and renders findings guidance", async () => {
    expect(await fileExists(pluginPath), "plugin source should exist before the import smoke test").toBe(true);
    const python = await findPython();
    if (python === undefined) {
      throw new Error("python3 or python is required for the KiCad plugin import smoke test");
    }

    const projectFile = path.join(os.tmpdir(), "boardreadyops-plugin", "demo.kicad_pro");
    const result = await runProcess(python, ["-c", headlessImportScript, pluginPath, projectFile], {
      cwd: repoRoot,
      timeoutMs: 10_000,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 64 * 1024,
    });

    expect(result.code, result.stderr || result.error).toBe(0);
    const output = JSON.parse(result.stdout) as HeadlessImportResult;

    expect(output.defaultName).toBe("BoardReadyOps");
    expect(output.defaultCategory).toBe("External Tools");
    expect(output.defaultDescription).toBe("Run BoardReadyOps fabrication checks.");
    expect(output.registeredCount).toBe(1);
    expect(output.command).toEqual([
      "boardreadyops",
      "run",
      path.dirname(projectFile),
      "--project",
      projectFile,
      "--json",
      "-",
      "--sarif",
      "",
      "--markdown",
      "",
      "--fail-on",
      "never",
      "--no-annotations",
      "--log-level",
      "silent",
    ]);
    expect(output.dialogText).toContain("[HIGH] drc.clearance");
    expect(output.dialogText).toContain("Tighten minimum clearance.");
    expect(output.dialogText).toContain("x=12.5 mm");
    expect(output.dialogText).toContain("https://docs.example.test/clearance");
  });

  it("handles CLI and malformed report edge cases defensively", async () => {
    expect(await fileExists(pluginPath), "plugin source should exist before the robustness smoke test").toBe(true);
    const python = await findPython();
    if (python === undefined) {
      throw new Error("python3 or python is required for the KiCad plugin robustness smoke test");
    }

    const projectFile = path.join(os.tmpdir(), "boardreadyops-plugin", "demo.kicad_pro");
    const result = await runProcess(python, ["-c", robustnessScript, pluginPath, projectFile], {
      cwd: repoRoot,
      timeoutMs: 10_000,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 64 * 1024,
    });

    expect(result.code, result.stderr || result.error).toBe(0);
    const output = JSON.parse(result.stdout) as RobustnessResult;

    expect(output.emptyOutputError).toBe("no report emitted");
    expect(output.timeoutSeconds).toBeGreaterThan(0);
    expect(output.isolatedReportCommand).toContain("--sarif");
    expect(output.isolatedReportCommand).toContain("--markdown");
    expect(output.isolatedReportCommand).toContain("");
    expect(output.isolatedReportCommand[output.isolatedReportCommand.indexOf("--json") + 1]).not.toBe("-");
    expect(output.windowsCommand.slice(0, 2)).toEqual(["node", "C:\\tools\\boardreadyops\\dist\\cli\\index.cjs"]);
    expect(output.uncCommand[0]).toBe("\\\\server\\share\\boardreadyops.exe");
    expect(output.malformedDialogText).toContain("[INFO] unknown-rule");
    expect(output.malformedDialogText).toContain("No finding message provided.");
    expect(output.malformedDialogText).not.toContain("References:");
    expect(output.malformedDialogText).not.toContain("None");
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function findPython(): Promise<string | undefined> {
  for (const command of ["python3", "python"]) {
    const result = await runProcess(command, ["--version"], { cwd: repoRoot, timeoutMs: 5_000 });
    if (result.code === 0) {
      return command;
    }
  }
  return undefined;
}

const headlessImportScript = `
import importlib.util
import json
import pathlib
import sys
import types

plugin_path = pathlib.Path(sys.argv[1])
project_file = pathlib.Path(sys.argv[2])

class ActionPlugin:
    registered = []

    def register(self):
        ActionPlugin.registered.append(self)

pcbnew = types.ModuleType("pcbnew")
pcbnew.ActionPlugin = ActionPlugin
sys.modules["pcbnew"] = pcbnew

wx = types.ModuleType("wx")
wx.OK = 1
wx.ICON_INFORMATION = 2
wx.ICON_WARNING = 4
wx.ID_OK = 1

class MessageDialog:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def ShowModal(self):
        return wx.ID_OK

    def Destroy(self):
        return None

wx.MessageDialog = MessageDialog
sys.modules["wx"] = wx

spec = importlib.util.spec_from_file_location("boardreadyops_plugin", plugin_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

plugin = module.BoardReadyOpsPlugin()
plugin.defaults()
command = module.build_boardreadyops_command(project_file, executable="boardreadyops")
dialog_text = module.format_results_dialog_text({
    "summary": {
        "total": 1,
        "critical": 0,
        "high": 1,
        "medium": 0,
        "low": 0,
        "info": 0,
    },
    "findings": [
        {
            "ruleId": "drc.clearance",
            "severity": "high",
            "message": "Clearance is too tight.",
            "resource": {"path": "demo.kicad_pcb", "kind": "pcb"},
            "location": {
                "boardCoordinates": {
                    "x": 12.5,
                    "y": 7.25,
                    "layer": "F.Cu",
                    "units": "mm",
                }
            },
            "fix": {
                "description": "Tighten minimum clearance.",
                "steps": ["Open Board Setup.", "Increase the clearance."],
                "references": ["https://docs.example.test/clearance"],
            },
            "fingerprint": "abc123",
        }
    ],
})

print(json.dumps({
    "defaultName": plugin.name,
    "defaultCategory": plugin.category,
    "defaultDescription": plugin.description,
    "registeredCount": len(ActionPlugin.registered),
    "command": command,
    "dialogText": dialog_text,
}))
`;

const robustnessScript = `
import importlib.util
import json
import pathlib
import subprocess
import sys
import types

plugin_path = pathlib.Path(sys.argv[1])
project_file = pathlib.Path(sys.argv[2])

class ActionPlugin:
    def register(self):
        return None

pcbnew = types.ModuleType("pcbnew")
pcbnew.ActionPlugin = ActionPlugin
sys.modules["pcbnew"] = pcbnew

wx = types.ModuleType("wx")
wx.OK = 1
wx.ICON_INFORMATION = 2
wx.ICON_WARNING = 4
sys.modules["wx"] = wx

spec = importlib.util.spec_from_file_location("boardreadyops_plugin", plugin_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Completed:
    def __init__(self, returncode, stdout, stderr):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

captured = {}

def empty_output_run(*args, **kwargs):
    return Completed(0, "", "no report emitted")

module.subprocess.run = empty_output_run
try:
    module.run_boardreadyops(project_file)
    empty_output_error = ""
except RuntimeError as error:
    empty_output_error = str(error)

def valid_output_run(*args, **kwargs):
    command = list(args[0])
    captured["command"] = command
    captured["timeout"] = kwargs.get("timeout")
    json_target = pathlib.Path(command[command.index("--json") + 1])
    if str(json_target) != "-":
        json_target.write_text(json.dumps({"summary": {"total": 0}, "findings": []}), encoding="utf-8")
    return Completed(0, "# configured Markdown report on stdout", "")

module.subprocess.run = valid_output_run
module.run_boardreadyops(project_file)

windows_command = module.build_boardreadyops_command(
    project_file,
    executable="node C:\\\\tools\\\\boardreadyops\\\\dist\\\\cli\\\\index.cjs",
)
unc_command = module.build_boardreadyops_command(
    project_file,
    executable="\\\\\\\\server\\\\share\\\\boardreadyops.exe",
)
malformed_dialog_text = module.format_results_dialog_text({
    "summary": None,
    "findings": [
        None,
        {
            "ruleId": None,
            "severity": None,
            "message": None,
            "resource": {"path": None},
            "location": {"boardCoordinates": {"x": 1.0, "y": None, "units": None}},
            "fix": {"description": None, "steps": [None, "Open Board Setup."], "references": [None]},
        },
    ],
})

print(json.dumps({
    "emptyOutputError": empty_output_error,
    "timeoutSeconds": captured["timeout"],
    "isolatedReportCommand": captured["command"],
    "windowsCommand": windows_command,
    "uncCommand": unc_command,
    "malformedDialogText": malformed_dialog_text,
}))
`;
