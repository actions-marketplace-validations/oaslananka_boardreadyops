# Install

## npm

```bash
npm i -g boardreadyops
boardreadyops --help
boardreadyops doctor
```

The current public npm package is `boardreadyops@1.1.0`. It declares Node.js 22
and 24 support, provides `boardreadyops doctor --format json`, accepts HTML and
JUnit report outputs in `boardreadyops.yml`, and ships the current docs,
schemas, Action metadata, and `kicad-plugin/` package contents.

For one-off use from a clean consumer directory:

```bash
npx -y boardreadyops@1.1.0 --help
```

## Binary Installers

The shell and PowerShell installers require a GitHub Release that contains the
platform binary asset and `SHA256SUMS`. The `v1.1.0` release contains the Linux,
macOS, and Windows binary matrix plus checksums.

```bash
curl -fsSL https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.ps1 | iex
```

Pin a specific release during validation with `BOARDREADYOPS_VERSION`, for
example `BOARDREADYOPS_VERSION=1.1.0`. Homebrew checksum publication and the
remaining installer OS matrix evidence are tracked in
[BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew).

## Homebrew

`Formula/boardreadyops.rb` is a template for a tap formula. It contains
fail-closed checksum placeholders until a release publishes binary assets and
`SHA256SUMS` are wired into the formula. Do not publish or use the formula until
real release checksums replace the placeholders; track checksum publication in
[BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew).

## Verification Status

The full clean-consumer verification matrix for npm, GitHub Action, binary
installers, Homebrew, GHCR, KiCad plugin packaging, and docs quickstart lives in
[Release Channel Verification](release/channel-verification.md).
