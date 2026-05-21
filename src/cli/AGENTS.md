# AGENTS.md

## Responsibility

This subsystem exposes the local `boardreadyops` command. It owns command routing, option parsing, terminal output, and exit-code mapping.

## Interface Upward

- Entry point: `src/cli/index.ts`
- Commands live under `src/cli/commands/`
- TTY formatting lives in `src/cli/output.ts`

## Rules

- CLI options must map to `PipelineOptions` without changing core behavior.
- Exit codes are part of the public contract: findings threshold `1`, usage or config `2`, environment `3`, unexpected internal error `4`.
- Output paths accepting `-` write to stdout and must not also write the same content to disk.
- Add or change a command with unit or integration coverage and matching docs in `docs/cli.md`.
