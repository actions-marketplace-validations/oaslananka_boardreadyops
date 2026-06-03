# JSON

The findings report is the stable diagnostics contract for automation consumers. It is versioned with `schemaVersion: 1` and validated by `schemas/findings.schema.json`.

`boardreadyops run --format json` and `boardreadyops check --format json` write the report to stdout. Command lifecycle logs and annotations stay on stderr. The older `--json <path>` and `--json -` report targets are still supported.

The report contains `schemaVersion`, `tool`, `status`, `exitCode`, `summary`, `projects`, `findings`, `fabrication`, and `generatedAt`. `status` is `passed` when the CLI exit code is `0`; otherwise it is `failed`. Threshold failures still emit valid JSON before returning exit code `1`. Configuration and required-environment failures in JSON mode emit a valid report with diagnostics before returning their dedicated exit codes.

Findings emitted for a KiCad project include `project`, the owning `.kicad_pro` path relative to the workspace root. Consumers can group findings by that field without inferring ownership from a PCB, schematic, BOM, or manifest resource path.

Each finding includes stable `ruleId`, `severity`, `message`, `resource`, and `fingerprint` fields. Optional fields include `location`, `details`, `references`, `fix`, `confidence`, and `suppressed`. Severity values are `critical`, `high`, `medium`, `low`, and `info`.

Fabrication snapshots keep BOM source paths so pull request diffs can distinguish the same reference designator across configured projects.
