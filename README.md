# BoardReadyOps

CI preflight for production-ready PCBs.

BoardReadyOps checks KiCad hardware repositories for production readiness before fabrication. It runs locally as a CLI and in CI as a GitHub Action, producing JSON, SARIF, Markdown, HTML, JUnit, and workflow annotation output.

[![CI](https://github.com/oaslananka/boardreadyops/actions/workflows/ci.yml/badge.svg)](https://github.com/oaslananka/boardreadyops/actions/workflows/ci.yml)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-BoardReadyOps-blue?logo=github)](https://github.com/marketplace/actions/boardreadyops)
[![npm](https://img.shields.io/npm/v/boardreadyops)](https://www.npmjs.com/package/boardreadyops)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/oaslananka/boardreadyops/badge)](https://scorecard.dev/viewer/?uri=github.com/oaslananka/boardreadyops)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm i -g boardreadyops
```

The current public package is `boardreadyops@1.4.3` on npm. It is verified on
Node.js 22 and 24, includes the current CLI bundle, schemas, docs, Action
metadata, and matches the public `v1.4.3` tag archive.
The `v1.4.3` GitHub Release also contains the binary asset matrix and
`SHA256SUMS`; Homebrew checksum publication remains tracked in BOARD-63. See
[release channel verification](docs/release/channel-verification.md) for the
tested artifact list and remaining channel follow-ups.

## Runtime Support

BoardReadyOps supports Node.js 22 and 24. Node.js 24 is the recommended Active
LTS runtime; Node.js 22 remains supported for Maintenance LTS users. Node.js 26
Current is tracked but not supported in `engines.node` or CI until it reaches
LTS and dependency validation is added.

KiCad CLI compatibility is CI-tested on KiCad 10.0, with 10.0.3 as the latest
verified patch. KiCad 9.0 remains the minimum supported line but is upstream EOL
and no longer CI-tested. The machine-readable policy and generated support table
live in [docs/support-matrix.md](docs/support-matrix.md).

### Install Via Script

Linux and macOS release binaries are installed with the checksum-verifying shell
installer when the selected GitHub Release includes the matching binary asset
and `SHA256SUMS`:

```bash
curl -fsSL https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.sh | sh
```

Windows x64 release binaries use the same release asset and checksum flow:

```powershell
irm https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.ps1 | iex
```

The installers download the release asset plus `SHA256SUMS` before placing
`boardreadyops` on the local command path. Binary asset availability depends on
the release; check the [latest release](https://github.com/oaslananka/boardreadyops/releases/latest)
for the current asset matrix. A Homebrew
formula template for the same binary assets lives at `Formula/boardreadyops.rb`;
it must be filled with release checksums from `SHA256SUMS` before publishing it
through a tap. Treat the installer blocks above as post-BOARD-63 examples until
the release asset matrix lists binary files and checksums.

## Quick Start

```bash
boardreadyops --help
boardreadyops check . --fail-on never
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
      - uses: oaslananka/boardreadyops@fe889db0d437b6e0fd632f504b7c43ea2c6ba9c3 # v1.4.3
        with:
          config: boardreadyops.yml
          mode: enforce
          fail-on: high
```

SARIF upload requires `security-events: write`. Pull request comments require `pull-requests: write`.

Use the full container action when a workflow should carry KiCad CLI inside the
BoardReadyOps runtime instead of installing KiCad separately:

```yaml
      - uses: oaslananka/boardreadyops/apps/container@fe889db0d437b6e0fd632f504b7c43ea2c6ba9c3 # v1.4.3
        with:
          config: boardreadyops.yml
          require-kicad: "true"
          mode: enforce
```

The same image can run as a CLI:

```bash
docker run --rm ghcr.io/oaslananka/boardreadyops-full:v1 --help
```

The `v1` and `latest` container tags resolve to the most recent release
image. Check the [release channel verification](docs/release/channel-verification.md)
for the current digest and manifest list.

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
  html: build/boardreadyops.report.html
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

MIT. Third-party notices are generated in `NOTICE`. The full container image
redistributes KiCad under GPL terms and preserves the KiCad license text inside
the image.
