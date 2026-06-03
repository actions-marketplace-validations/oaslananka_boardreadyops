# CLI

`boardreadyops run [path]` runs the full pipeline. `boardreadyops check [path]` is the concise preflight form for local and CI use. `boardreadyops check <rule-id> [path]` runs one rule. `boardreadyops fix [path]` plans and applies safe automated fixes. `boardreadyops sbom [path]` emits a CycloneDX hardware SBOM from the captured fabrication BOM. `boardreadyops explain <rule-id> [path]` prints rule-specific diagnostics when that rule exposes an explainer. `doctor`, `schema`, and `init` support setup and automation.

Use `--project <path>` with `run` or `check` to restrict a workspace scan to one project directory or `.kicad_pro` file. Use `--concurrency <count>` to cap concurrent project execution when a workspace contains multiple boards.

The paths in these examples are placeholders for a real KiCad project in the
current workspace. The same command forms were smoke-tested with repository
fixtures during the BOARD-57 copy-paste audit.

```bash
boardreadyops run . --project hardware/mainboard
boardreadyops check manufacturing.outputs-present . --project hardware/mainboard
boardreadyops run . --concurrency 2
```

Use `boardreadyops run --gate release` to select a configured gate from `boardreadyops.yml`. A selected gate enforces its configured threshold and named requirements for local release checks; GitHub Action runs auto-detect `pull_request`, `main`, or `release` when the Action `gate` input is empty.

Use `--format json` with `run` or `check` when another tool should consume diagnostics from stdout. The JSON contract is described in [reports/json.md](reports/json.md) and validated by `schemas/findings.schema.json`. Human logs and annotations are written to stderr, so stdout remains parseable JSON even when the command exits nonzero for findings, configuration, or required-environment failures.

## Hardware SBOM

`boardreadyops sbom [path]` writes a CycloneDX 1.7 hardware SBOM to `build/hbom.json` by default. Use `--output -` when another process should read the JSON from stdout.

```bash
boardreadyops sbom .
boardreadyops sbom . --output build/hbom.json
boardreadyops sbom . --bom production-bom.csv --variant production
boardreadyops sbom . --output -
```

The command accepts `--config`, `--project`, `--bom`, and `--variant` to match the same project and BOM selection used by `run`. `--format cyclonedx` is the implemented format. `--format spdx` is reserved for a future release and exits with code `2`.

## Fix

`boardreadyops fix [path]` prints a diff for safe automated changes before it writes anything. By default it refuses to apply changes in a dirty Git workspace; use `--allow-dirty` only when the local edits are intentional and already reviewed.

```sh
boardreadyops fix .
boardreadyops fix . --dry-run
boardreadyops fix . --rule bom.missing-mpn
boardreadyops fix . --interactive
boardreadyops fix . --commit
boardreadyops fix . --drc-report build/kicad-drc.json --dry-run
```

Automated fixes cover inferable BOM MPN values, release changelog scaffolding, release revision normalization, missing PCB revision metadata, and missing fabrication notes. `bom.dnp-consistency` findings are surfaced but not applied automatically. KiCad DRC JSON diagnostics that include a suggested fix, or clearance wording that can be converted into a human review suggestion, are printed under `DRC suggested fixes` and do not mutate board files.

Use `fix.allow` in `boardreadyops.yml` to restrict which safe fix categories may be applied. `--rule` narrows a single invocation further.

## Logging

`run` and `check` emit command lifecycle logs through the shared logger. The default is text output at `info` level on stderr. Use JSON Lines when another tool ingests logs:

```bash
boardreadyops run . --log-format json --log-level debug --log-file build/boardreadyops.jsonl
```

Supported levels are `debug`, `info`, `warn`, `error`, `critical`, and `silent`. `--quiet` maps to `silent` unless `--log-level` or `BOARDREADY_LOG_LEVEL` is set; `--verbose` maps to `debug`. The equivalent environment variables are `BOARDREADY_LOG_LEVEL`, `BOARDREADY_LOG_FORMAT`, `BOARDREADY_LOG_FILE`, `BOARDREADY_LOG_FILE_MAX_BYTES`, and `BOARDREADY_LOG_FILE_RETENTION`.

Log records include stable fields such as `ts`, `level`, `event`, `session_id`, `rule`, and `latency_ms`. JSON log records redact secret-shaped values, replace the project root with `<project>`, and omit error stacks unless debug logging is enabled. File logs rotate by size with bounded retention:

```bash
boardreadyops check . \
  --log-file build/boardreadyops.log \
  --log-file-max-bytes 1048576 \
  --log-file-retention 3
```

## Locale

Human-facing CLI output uses English by default and can be switched to Turkish with `BOARDREADY_LOCALE=tr`. When `BOARDREADY_LOCALE` is unset, the CLI checks `LANG` and uses Turkish for values such as `tr_TR.UTF-8`; unsupported locale values fall back to English.

Linux and macOS shells can set the locale for one command:

```sh
BOARDREADY_LOCALE=tr boardreadyops doctor
BOARDREADY_LOCALE=tr boardreadyops run . --markdown -
```

Windows 11 PowerShell uses `$env:` assignment:

```powershell
$env:BOARDREADY_LOCALE = "tr"
boardreadyops doctor
boardreadyops run . --markdown -
Remove-Item Env:\BOARDREADY_LOCALE
```

The locale setting affects status lines, configuration and environment error prefixes, doctor text output, and Markdown/HTML report labels produced by the CLI. JSON, SARIF, JUnit, rule IDs, and finding messages remain locale-independent for automation and stable references.

## Doctor

`boardreadyops doctor` diagnoses the current environment and repository before a full pipeline run. Its checks cover the Node and npm runtime, KiCad CLI availability, configured adapter credentials, repository discovery and manufacturing outputs, suppression state, and the conventional `.github/workflows/boardreadyops.yml` or `.github/workflows/boardreadyops.yaml` workflow. Runtime support follows the [support matrix](support-matrix.md).

```sh
boardreadyops doctor
boardreadyops doctor --check repository
boardreadyops doctor --format json
boardreadyops schema doctor
```

`--check` accepts `runtime`, `kicad`, `adapters`, `repository`, `suppressions`, or `action`; unknown check names return exit code `2`. `--format` accepts only `text` and `json`, and unknown formats also return exit code `2`.

The JSON form returns structured check items with `pass`, `warn`, `fail`, or `info` severities plus deduplicated recommendations. `boardreadyops schema doctor` prints the JSON Schema for consumers that ingest the report.

## Baselines

Baseline commands operate on the configured baseline file, or `.boardreadyops-baseline.json` when the config does not override it.

The bracketed arguments below are syntax placeholders. Replace `[path]` and
`[--config <path>]` with a repository path and config flag, or omit them to use
the defaults.

```sh
boardreadyops baseline capture [path] [--config <path>]
boardreadyops baseline diff [path] [--config <path>]
boardreadyops baseline show [path] [--config <path>]
boardreadyops baseline prune [path] [--config <path>]
boardreadyops baseline clear [path] [--config <path>]
```

`capture` writes the current finding fingerprints. `diff` reports added, removed, and unchanged findings. `prune` removes entries that no longer match the current run. Each subcommand accepts an optional repository path and the same `--config <path>` lookup used by `run`, so non-default config files resolve the matching baseline file.
