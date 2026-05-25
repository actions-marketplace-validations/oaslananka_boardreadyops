# Install

## npm

```bash
npm i -g boardreadyops
boardreadyops --help
boardreadyops doctor
```

The current public npm package is `boardreadyops@1.0.2`. It installs and runs
on Node.js 24. Current repository support for Node.js 22 is not present in that
published package metadata yet; use the next release that includes the updated
support matrix when Node.js 22 is required.

For one-off use from a clean consumer directory:

```bash
npx -y boardreadyops@1.0.2 --help
```

## Binary Installers

The shell and PowerShell installers require a GitHub Release that contains the
platform binary asset and `SHA256SUMS`.

```bash
curl -fsSL https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/oaslananka/boardreadyops/main/install.ps1 | iex
```

The public `v1.0.2` release has no binary assets, so these installer commands
are not supported for that tag and currently return 404. Track the release asset
follow-up in
[BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew).

## Homebrew

`Formula/boardreadyops.rb` is a template for a tap formula. It contains
fail-closed checksum placeholders until a release publishes binary assets and
`SHA256SUMS`. Do not publish or use the formula for `v1.0.2`; track checksum
publication in
[BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew).

## Verification Status

The full clean-consumer verification matrix for npm, GitHub Action, binary
installers, Homebrew, GHCR, KiCad plugin packaging, and docs quickstart lives in
[Release Channel Verification](release/channel-verification.md).
