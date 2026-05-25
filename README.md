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

The current public package is `boardreadyops@1.0.2` on npm. That release is
verified for the npm CLI and root GitHub Action paths. Binary installers,
Homebrew, and the full GHCR container are tracked separately because the public
`v1.0.2` GitHub Release does not contain binary assets, `SHA256SUMS`, or an
anonymous-pullable container image. See
[release channel verification](docs/release/channel-verification.md) for the
tested artifact list and failure matrix.

## Runtime Support

BoardReadyOps supports Node.js 22 and 24. Node.js 24 is the recommended Active
LTS runtime; Node.js 22 remains supported for Maintenance LTS users. Node.js 26
Current is tracked but not supported in `engines.node` or CI until it reaches
LTS and dependency validation is added.

KiCad CLI compatibility is CI-tested on KiCad 9.0 and 10.0, with 10.0 as the
recommended stable line. The machine-readable policy and generated support
table live in [docs/support-matrix.md](docs/support-matrix.md).

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
`boardreadyops` on the local command path. The public `v1.0.2` release currently
has no binary assets, so these installers return 404 for that tag. A Homebrew
formula template for the same binary assets lives at `Formula/boardreadyops.rb`;
it must be filled with release checksums from `SHA256SUMS` before publishing it
through a tap.

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
      - uses: oaslananka/boardreadyops@9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e # v1.0.2
        with:
          config: boardreadyops.yml
          mode: enforce
          fail-on: high
```

SARIF upload requires `security-events: write`. Pull request comments require `pull-requests: write`.

Use the full container action when a workflow should carry KiCad CLI inside the
BoardReadyOps runtime instead of installing KiCad separately:

```yaml
      # Replace this placeholder with the release commit SHA that backs v1.
      - uses: oaslananka/boardreadyops/apps/container@0123456789abcdef0123456789abcdef01234567 # v1
        with:
          config: boardreadyops.yml
          require-kicad: "true"
          mode: enforce
```

The same image can run as a CLI:

```bash
docker run --rm ghcr.io/oaslananka/boardreadyops-full:v1 --help
```

The public `ghcr.io/oaslananka/boardreadyops-full:v1` image must be considered
unavailable until anonymous `docker manifest inspect` succeeds and the digest is
recorded in the release verification matrix.

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
