# GitHub Action Images

## Container Action

Use the full container action when CI must run KiCad checks without a separate
KiCad installation step. The container image includes KiCad CLI, Node.js, and
the published BoardReadyOps package.

```yaml
name: BoardReadyOps full

on:
  pull_request:

jobs:
  boardreadyops:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      # Replace this placeholder with the release commit SHA that backs v1.
      - uses: oaslananka/boardreadyops/apps/container@0123456789abcdef0123456789abcdef01234567 # v1
        with:
          config: boardreadyops.yml
          require-kicad: "true"
          mode: enforce
```

`apps/container/action.yml` mirrors the Node action inputs and outputs. The
container action overrides the image CLI entrypoint so GitHub Actions receives
the same report files, outputs, SARIF upload behavior, and pull request comment
behavior as the root action.

The default image entrypoint remains the CLI for direct use:

```bash
docker run --rm ghcr.io/oaslananka/boardreadyops-full:v1 --help
```

The image includes the unprivileged `boardreadyops` account at UID `10001` for
direct container runs that can provide writable mounts for that user. The
GitHub Docker action keeps the image default user so GitHub can mount and access
`GITHUB_WORKSPACE`.

Container image redistributes KiCad under GPL terms. The image preserves the
GPL text at `/usr/share/doc/boardreadyops/LICENSE-KICAD` and the KiCad package
notices under `/usr/share/doc/kicad/`; BoardReadyOps' Node code remains MIT
licensed and invokes KiCad as a separate CLI process.

Tagged container builds wait until the matching npm package version is visible,
then publish `linux/amd64` and `linux/arm64` images to GHCR. Stable release
tags update the matching major alias and `latest`; prerelease tags publish only
their exact tag. The release workflow signs the pushed digest with Cosign, scans
it with Trivy, emits a CycloneDX image SBOM artifact, and enables BuildKit
provenance and SBOM attestations.
