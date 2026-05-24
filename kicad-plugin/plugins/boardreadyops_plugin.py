import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile
import traceback

try:
    import pcbnew
except ImportError:
    pcbnew = None

try:
    import wx
except ImportError:
    wx = None

PLUGIN_NAME = "BoardReadyOps"
PLUGIN_CATEGORY = "External Tools"
PLUGIN_DESCRIPTION = "Run BoardReadyOps fabrication checks."
BOARDREADYOPS_TIMEOUT_SECONDS = 300


class _HeadlessActionPlugin:
    def defaults(self):
        return None

    def register(self):
        return None


ActionPluginBase = pcbnew.ActionPlugin if pcbnew is not None else _HeadlessActionPlugin


class BoardReadyOpsPlugin(ActionPluginBase):
    def defaults(self):
        self.name = PLUGIN_NAME
        self.category = PLUGIN_CATEGORY
        self.description = PLUGIN_DESCRIPTION
        self.show_toolbar_button = True
        self.icon_file_name = str(plugin_root() / "resources" / "icon.png")

    def Run(self):
        try:
            project_file = find_current_project_file()
            if project_file is None:
                show_error_dialog("No active KiCad project could be found for the current board.")
                return

            report = run_boardreadyops(project_file)
            show_results_dialog(report)
        except Exception as error:
            details = "".join(traceback.format_exception_only(type(error), error)).strip()
            show_error_dialog(f"BoardReadyOps failed to run.\n\n{details}")


def plugin_root():
    return Path(__file__).resolve().parents[1]


def find_current_project_file(board=None):
    if pcbnew is None and board is None:
        return None

    active_board = board if board is not None else pcbnew.GetBoard()
    if active_board is None or not hasattr(active_board, "GetFileName"):
        return None

    board_filename = active_board.GetFileName()
    if not board_filename:
        return None

    board_path = Path(board_filename)
    project_with_matching_stem = board_path.with_suffix(".kicad_pro")
    if project_with_matching_stem.exists():
        return project_with_matching_stem

    project_files = sorted(board_path.parent.glob("*.kicad_pro"))
    if len(project_files) == 1:
        return project_files[0]

    return None


def build_boardreadyops_command(project_file, executable=None, json_target="-"):
    project_path = Path(project_file)
    executable_value = executable or os.environ.get("BOARDREADYOPS_BIN") or "boardreadyops"
    return [
        *_executable_tokens(executable_value),
        "run",
        str(project_path.parent),
        "--project",
        str(project_path),
        "--json",
        str(json_target),
        "--sarif",
        "",
        "--markdown",
        "",
        "--fail-on",
        "never",
        "--no-annotations",
        "--log-level",
        "silent",
    ]


def run_boardreadyops(project_file):
    with tempfile.TemporaryDirectory(prefix="boardreadyops-") as temp_dir:
        json_report = Path(temp_dir) / "findings.json"
        command = build_boardreadyops_command(project_file, json_target=json_report)
        completed = subprocess.run(
            command,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            timeout=BOARDREADYOPS_TIMEOUT_SECONDS,
        )

        if completed.returncode != 0:
            stderr = completed.stderr.strip() or f"command exited with status {completed.returncode}"
            raise RuntimeError(stderr)

        try:
            output = json_report.read_text(encoding="utf-8")
        except OSError as error:
            stderr = completed.stderr.strip() or "no report emitted"
            raise RuntimeError(stderr) from error

        if not output.strip():
            stderr = completed.stderr.strip() or "no report emitted"
            raise RuntimeError(stderr)

        try:
            return parse_boardreadyops_json(output)
        except ValueError as error:
            stderr = completed.stderr.strip()
            if stderr:
                raise RuntimeError(f"{error}\n\n{stderr}") from error
            raise


def parse_boardreadyops_json(output):
    try:
        report = json.loads(output)
    except json.JSONDecodeError as error:
        raise ValueError(f"BoardReadyOps did not return JSON: {error}") from error

    if not isinstance(report, dict):
        raise ValueError("BoardReadyOps JSON report must be an object.")
    findings = report.get("findings")
    if not isinstance(findings, list):
        raise ValueError("BoardReadyOps JSON report is missing a findings array.")
    return report


def format_results_dialog_text(report):
    findings = report.get("findings", [])
    renderable_findings = [finding for finding in findings if isinstance(finding, dict)]
    summary = report.get("summary") or {}
    total = summary.get("total") if summary.get("total") is not None else len(renderable_findings)

    if total == 0 or not renderable_findings:
        return "BoardReadyOps found no fabrication readiness findings for the active project."

    lines = [f"BoardReadyOps findings: {total} total", ""]
    for index, finding in enumerate(renderable_findings, start=1):
        severity = str(finding.get("severity") or "info").upper()
        rule_id = finding.get("ruleId") or "unknown-rule"
        message = finding.get("message") or "No finding message provided."
        lines.append(f"{index}. [{severity}] {rule_id}")
        lines.append(f"   {message}")

        resource = finding.get("resource")
        if isinstance(resource, dict) and resource.get("path"):
            lines.append(f"   Resource: {resource['path']}")

        coordinates = _format_board_coordinates(finding.get("location"))
        if coordinates:
            lines.append(f"   Board: {coordinates}")

        fix = finding.get("fix")
        if isinstance(fix, dict):
            description = fix.get("description")
            if description:
                lines.append(f"   Fix: {description}")
            steps = [step for step in fix.get("steps", []) or [] if step]
            for step in steps:
                lines.append(f"     - {step}")
            references = [reference for reference in fix.get("references", []) or [] if reference]
            if references:
                lines.append("   References:")
                for reference in references:
                    lines.append(f"     - {reference}")

        lines.append("")

    return "\n".join(lines).rstrip()


def show_results_dialog(report):
    title = "BoardReadyOps Findings"
    message = format_results_dialog_text(report)
    style = _dialog_style(wx.ICON_INFORMATION if wx is not None else 0)
    show_dialog(title, message, style)


def show_error_dialog(message):
    style = _dialog_style(wx.ICON_WARNING if wx is not None else 0)
    show_dialog("BoardReadyOps", message, style)


def show_dialog(title, message, style):
    if wx is not None and hasattr(wx, "MessageDialog"):
        dialog = wx.MessageDialog(None, message, title, style)
        try:
            dialog.ShowModal()
        finally:
            dialog.Destroy()
        return

    if pcbnew is not None and hasattr(pcbnew, "wxLogMessage"):
        pcbnew.wxLogMessage(f"{title}: {message}")
        return

    print(f"{title}: {message}")


def _dialog_style(icon_style):
    if wx is None:
        return icon_style
    return wx.OK | icon_style


def _format_board_coordinates(location):
    if not isinstance(location, dict):
        return None

    coordinates = location.get("boardCoordinates")
    if not isinstance(coordinates, dict):
        return None

    units = coordinates.get("units") or ""
    x_value = coordinates.get("x")
    y_value = coordinates.get("y")
    layer = coordinates.get("layer")
    parts = []
    if x_value is not None:
        parts.append(f"x={x_value} {units}".rstrip())
    if y_value is not None:
        parts.append(f"y={y_value} {units}".rstrip())
    if layer:
        parts.append(f"layer={layer}")
    return ", ".join(parts) if parts else None


def _executable_tokens(executable):
    if isinstance(executable, (list, tuple)):
        return [str(token) for token in executable]
    value = str(executable).strip()
    if not value:
        return []
    tokens = shlex.split(value, posix=not _contains_windows_path(value))
    return [_strip_matching_quotes(token) for token in tokens]


def _contains_windows_path(value):
    return re.search(r"(^|[\s\"'])(?:[A-Za-z]:[\\/]|\\\\[^\\/\s\"']+)", value) is not None


def _strip_matching_quotes(value):
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


if pcbnew is not None:
    BoardReadyOpsPlugin().register()
