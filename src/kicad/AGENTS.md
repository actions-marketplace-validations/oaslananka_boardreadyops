# AGENTS.md

## Responsibility

This subsystem wraps `kicad-cli`, detects KiCad installation paths, parses KiCad report files, and extracts minimal PCB/schematic data needed by rules.

## Interface Upward

- CLI wrapper: `src/kicad/cli.ts`
- Version detection: `src/kicad/version.ts`
- DRC/ERC parsers: `src/kicad/parsers/`
- PCB/schematic readers: `src/kicad/pcb.ts`, `src/kicad/schematic.ts`

## Rules

- Treat KiCad files as read-only.
- Subprocess output is size-limited and control characters are redacted before surfacing.
- Parsers should match KiCad 10 report shapes while tolerating minor field drift.
- Missing KiCad behavior is controlled by `requireKicad`; do not fail DRC/ERC when it is false.
