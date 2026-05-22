# CLI

`boardreadyops run [path]` runs the full pipeline. `boardreadyops check [path]` is the concise preflight form for local and CI use. `boardreadyops check <rule-id> [path]` runs one rule. `doctor`, `schema`, and `init` support setup and automation.

Use `boardreadyops run --gate release` to select a configured gate from `boardreadyops.yml`. A selected gate enforces its configured threshold and named requirements for local release checks; GitHub Action runs auto-detect `pull_request`, `main`, or `release` when the Action `gate` input is empty.

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
