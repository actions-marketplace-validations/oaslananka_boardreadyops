# CLI

`boardreadyops run [path]` runs the full pipeline. `boardreadyops check [path]` is the concise preflight form for local and CI use. `boardreadyops check <rule-id> [path]` runs one rule. `boardreadyops explain <rule-id> [path]` prints rule-specific diagnostics when that rule exposes an explainer. `doctor`, `schema`, and `init` support setup and automation.

Use `--project <path>` with `run` or `check` to restrict a workspace scan to one project directory or `.kicad_pro` file. Use `--concurrency <count>` to cap concurrent project execution when a workspace contains multiple boards.

```bash
boardreadyops run . --project hardware/mainboard
boardreadyops check manufacturing.outputs-present . --project hardware/mainboard
boardreadyops run . --concurrency 2
```

Use `boardreadyops run --gate release` to select a configured gate from `boardreadyops.yml`. A selected gate enforces its configured threshold and named requirements for local release checks; GitHub Action runs auto-detect `pull_request`, `main`, or `release` when the Action `gate` input is empty.

## Locale

Human-facing CLI output uses English by default and can be switched to Turkish with `BOARDREADY_LOCALE=tr`. When `BOARDREADY_LOCALE` is unset, the CLI checks `LANG` and uses Turkish for values such as `tr_TR.UTF-8`; unsupported locale values fall back to English.

```sh
BOARDREADY_LOCALE=tr boardreadyops doctor
BOARDREADY_LOCALE=tr boardreadyops run . --markdown -
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

```sh
boardreadyops baseline capture [path] [--config <path>]
boardreadyops baseline diff [path] [--config <path>]
boardreadyops baseline show [path] [--config <path>]
boardreadyops baseline prune [path] [--config <path>]
boardreadyops baseline clear [path] [--config <path>]
```

`capture` writes the current finding fingerprints. `diff` reports added, removed, and unchanged findings. `prune` removes entries that no longer match the current run. Each subcommand accepts an optional repository path and the same `--config <path>` lookup used by `run`, so non-default config files resolve the matching baseline file.
