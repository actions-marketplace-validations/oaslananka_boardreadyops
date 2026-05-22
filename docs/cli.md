# CLI

`boardreadyops run [path]` runs the full pipeline. `boardreadyops check [path]` is the concise preflight form for local and CI use. `boardreadyops check <rule-id> [path]` runs one rule. `doctor`, `schema`, and `init` support setup and automation.

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
