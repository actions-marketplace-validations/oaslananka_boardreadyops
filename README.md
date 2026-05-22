# BoardReadyOps

CI preflight for production-ready PCBs.

BoardReadyOps checks KiCad hardware repositories for production readiness before fabrication. It runs locally as a CLI and in CI as a GitHub Action, producing JSON, SARIF, Markdown, JUnit, and workflow annotation output.

[![CI](https://github.com/oaslananka/boardreadyops/actions/workflows/ci.yml/badge.svg)](https://github.com/oaslananka/boardreadyops/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/boardreadyops)](https://www.npmjs.com/package/boardreadyops)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/oaslananka/boardreadyops/badge)](https://scorecard.dev/viewer/?uri=github.com/oaslananka/boardreadyops)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm i -g boardreadyops
```

### Install Via Script

Linux and macOS release binaries can be installed with the checksum-verifying shell installer:

```bash
curl -fsSL https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.sh | sh
```

Windows x64 release binaries can be installed with PowerShell:

```powershell
irm https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.ps1 | iex
```

The installers download the release asset plus `SHA256SUMS` before placing `boardreadyops` on the local command path. A Homebrew formula template for the same binary assets lives at `Formula/boardreadyops.rb`; update its release checksums from `SHA256SUMS` when publishing it through a tap.

## Quick Start

```bash
boardreadyops --help
boardreadyops check .
```

`npx boardreadyops --help` also works when npm can resolve the package.

## GitHub Action

```yaml
name: BoardReadyOps

on:
  pull_request:
  push:
    branches: [main]

jobs:
  boardreadyops:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: oaslananka/boardreadyops@9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e # v1.0.2
        with:
          config: boardreadyops.yml
          mode: enforce
          fail-on: high
```

SARIF upload requires `security-events: write`. Pull request comments require `pull-requests: write`.

## CLI

```bash
boardreadyops run --json build/findings.json --sarif build/findings.sarif.json .
boardreadyops check .
boardreadyops check manufacturing.jobset-outputs .
boardreadyops doctor
boardreadyops schema config
```

The npm package exposes the `boardreadyops` binary from the committed CLI bundle in `dist/cli/index.cjs`.

## Configuration

Create `boardreadyops.yml`:

```yaml
version: 1
mode: warn
projects:
  - path: .
    pinmap: firmware/pins.yml
    bom: bom/board.csv
    variants:
      - name: production
        bom: bom/prod.csv
rules:
  bom.missing-mpn:
    enabled: true
    severity: high
    ignore-refs: ["TP*", "FID*"]
  bom.variant-consistency:
    enabled: true
  manufacturing.jobset-outputs:
    enabled: true
  manufacturing.outputs-present:
    enabled: true
    required: [gerber, drill, position, pdf]
fail-on: high
report:
  sarif: build/boardreadyops.sarif.json
  json: build/boardreadyops.findings.json
  markdown: build/boardreadyops.report.md
```

The config schema is committed at `schemas/config.schema.json`.

## Supported Checks

- KiCad DRC and ERC report normalization.
- BOM completeness, lifecycle, DNP consistency, variant consistency, and footprint mismatch checks.
- Pinmap format, collision, unmapped pin, and net label checks.
- Manufacturing output, drill coverage, fab note, panel sanity, layer stackup, and jobset checks.
- Design outline and copper balance checks.
- Release revision, version format, tag, and changelog checks.

## Local Development

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run lint
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
corepack pnpm run verify:dist
corepack pnpm run docs
```

The repository intentionally versions `dist/action/index.cjs` and `dist/cli/index.cjs` so the GitHub Action and npm package can run without a consumer build step.

## Links

- Repository: <https://github.com/oaslananka/boardreadyops>
- Issues: <https://github.com/oaslananka/boardreadyops/issues>
- Security advisories: <https://github.com/oaslananka/boardreadyops/security/advisories/new>

## License

MIT.
