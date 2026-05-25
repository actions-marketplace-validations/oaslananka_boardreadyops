# Release Channel Verification

This page records clean-consumer verification evidence for the public
BoardReadyOps consumption channels. It is intentionally separate from the normal
release process so every unsupported public channel has a concrete follow-up
issue before completion is claimed.

## Audit Target

| Field | Value |
| --- | --- |
| Audit date | 2026-05-25 |
| Public release | `v1.0.2` |
| Release URL | <https://github.com/oaslananka/boardreadyops/releases/tag/v1.0.2> |
| Release tag commit | `9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e` |
| npm package | `boardreadyops@1.0.2` |
| npm tarball | `https://registry.npmjs.org/boardreadyops/-/boardreadyops-1.0.2.tgz` |
| npm integrity | `sha512-RVh0xOUWT0dO9ST0sN8NtUXPc62YsInz1ANL4kE1f/EG79vX4pf/sDGn9uMgXr1A7zL5oBFDA++rQQVAs98JuA==` |
| npm shasum | `b3c2c05c62994d528f76b88808b413ddd681d2ea` |
| npm engines for public package | `>=24 <25` |
| Local audit host | Linux x64, Node.js `v24.15.0`, npm `11.14.1`, Docker `29.5.2`, PowerShell available through `pwsh` |

## Pass/Fail Matrix

| Channel | Result | Evidence | Follow-up |
| --- | --- | --- | --- |
| npm global install and CLI execution | Pass | `npm install --global --prefix <tmp> boardreadyops@1.0.2`; `boardreadyops --version` returned `1.0.2`; `boardreadyops --help` listed `run`, `check`, `doctor`, `schema`, `init`. | None |
| npm one-off execution | Pass | From a clean non-repository directory, `npx -y boardreadyops@1.0.2 --help` exited `0`. Running from this repository without leaving the package root can resolve the local workspace package instead, so release smoke tests must use a separate consumer directory. | None |
| npm clean consumer reports | Pass | A temporary consumer directory with a minimal KiCad-shaped project ran `boardreadyops check . --fail-on never`; JSON, SARIF, and Markdown reports were written. Findings JSON validated against `schemas/findings.schema.json` with Ajv 2020-12, SARIF reported version `2.1.0`, and Markdown contained the BoardReadyOps report header. | None |
| Root GitHub Action bundle | Pass with terminal transcript | Downloaded the public tag archive for commit `9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e` and executed `dist/action/index.cjs` against a separate temporary consumer workspace with write operations disabled. With `INPUT_FAIL-ON=never`, the action exited `0`, wrote `findings`, severity counts, `sarif-path`, `json-path`, and `markdown-path` outputs, and generated report files. | None |
| GitHub Action remote sample workflow | Not executed in this audit | No separate sample repository was available in scope, and `act` was not installed on the host. The root action was still smoke-tested from the public tag archive without cloning the repository. | [BOARD-64](https://linear.app/oaslananka/issue/BOARD-64/completion-follow-up-make-ghcr-container-image-anonymously-pullable) for the container workflow; remote sample workflow evidence should be attached before completion. |
| GHCR full container image | Fail | `docker manifest inspect ghcr.io/oaslananka/boardreadyops-full:v1` returned `denied`, so anonymous consumers cannot pull the documented image. | [BOARD-64](https://linear.app/oaslananka/issue/BOARD-64/completion-follow-up-make-ghcr-container-image-anonymously-pullable) |
| Linux/macOS `install.sh` | Fail for `v1.0.2` | `BOARDREADYOPS_VERSION=1.0.2 sh ./install.sh` failed with HTTP 404 because the release has no binary asset or `SHA256SUMS`. | [BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew) |
| Windows `install.ps1` | Fail for `v1.0.2` | `BOARDREADYOPS_VERSION=1.0.2 ./install.ps1` under PowerShell failed with HTTP 404 because the release has no `boardreadyops-win-x64.exe` asset or `SHA256SUMS`. A real Windows 11 host still needs final confirmation after assets exist. | [BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew) |
| Homebrew formula | Fail for `v1.0.2` | `Formula/boardreadyops.rb` contains fail-closed `0000...` checksum placeholders and points at missing release assets. `brew` was not available on the Linux audit host. | [BOARD-63](https://linear.app/oaslananka/issue/BOARD-63/completion-follow-up-publish-binary-release-assets-and-homebrew) |
| KiCad plugin packaging and load path | Partial | A clean archive created from `HEAD:kicad-plugin` contained `metadata.json`, plugin Python files, and resources with PCM schema `https://go.kicad.org/pcm/schemas/v2`, identifier `com.github.oaslananka.boardreadyops`, version `1.0.2`, and no `__pycache__`. The public `boardreadyops@1.0.2` npm tarball and public `v1.0.2` tag archive contain no `kicad-plugin/` entries, and no PCM publication was verified. | [BOARD-65](https://linear.app/oaslananka/issue/BOARD-65/completion-follow-up-publish-package-parity-release-for-docs-node-22) |
| Documentation quickstart | Partial | `npm i -g boardreadyops`, `boardreadyops --help`, and `boardreadyops init` succeeded in a clean directory. Plain `boardreadyops check .` exits non-zero when no KiCad project is present; docs now use `boardreadyops check . --fail-on never` for the first smoke run and tell users to run inside a KiCad project. | [BOARD-57](https://linear.app/oaslananka/issue/BOARD-57/completion-gate-documentation-site-and-readme-must-be-copy-paste) continues the full copy-paste audit. |
| Public package parity with current docs | Fail for `v1.0.2` | Public npm metadata reports Node `>=24 <25`; `boardreadyops doctor --format json` fails with `unknown option '--format'`; `report.html` in config fails with `Configuration error: /report: must NOT have additional properties`; the public tarball lacks `kicad-plugin/`. | [BOARD-65](https://linear.app/oaslananka/issue/BOARD-65/completion-follow-up-publish-package-parity-release-for-docs-node-22) |

## Tested Release Artifact List

| Artifact | Status |
| --- | --- |
| `boardreadyops@1.0.2` npm package | Present and CLI-smoke-tested |
| `oaslananka/boardreadyops@9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e` root action | Present and local action-smoke-tested from public tag archive |
| GitHub Release `v1.0.2` assets | Empty asset list |
| `boardreadyops-linux-x64` | Missing from `v1.0.2` |
| `boardreadyops-linux-arm64` | Missing from `v1.0.2` |
| `boardreadyops-macos-x64` | Missing from `v1.0.2` |
| `boardreadyops-macos-arm64` | Missing from `v1.0.2` |
| `boardreadyops-win-x64.exe` | Missing from `v1.0.2` |
| `SHA256SUMS` | Missing from `v1.0.2` |
| `ghcr.io/oaslananka/boardreadyops-full:v1` | Anonymous manifest request denied |
| `Formula/boardreadyops.rb` | Template only; checksum placeholders |
| `kicad-plugin/` public package artifact | Present on `main`, absent from public `v1.0.2` npm tarball and tag archive |

## Terminal Transcript Summary

```text
$ npm view boardreadyops@1.0.2 version dist.integrity dist.tarball dist.shasum engines bin --json
version: 1.0.2
engines.node: >=24 <25
bin.boardreadyops: dist/cli/index.cjs
integrity: sha512-RVh0xOUWT0dO9ST0sN8NtUXPc62YsInz1ANL4kE1f/EG79vX4pf/sDGn9uMgXr1A7zL5oBFDA++rQQVAs98JuA==
```

```text
$ boardreadyops check . --fail-on never
check_exit=0
generated: build/boardreadyops.findings.json, build/boardreadyops.sarif.json, build/boardreadyops.report.md
validate_exit=0
{"findings":3,"failed":false,"sarifVersion":"2.1.0","markdownBytes":495}
```

```text
$ docker manifest inspect ghcr.io/oaslananka/boardreadyops-full:v1
Get "https://ghcr.io/v2/oaslananka/boardreadyops-full/manifests/v1": denied
```

```text
$ BOARDREADYOPS_VERSION=1.0.2 sh ./install.sh
curl: (22) The requested URL returned error: 404
```

```text
$ BOARDREADYOPS_VERSION=1.0.2 ./install.ps1
Response status code does not indicate success: 404 (Not Found).
```

## Completion Rule

Do not claim all public release channels are complete until BOARD-63, BOARD-64,
and BOARD-65 are resolved or explicitly deferred by a maintainer. Until then,
the verified public channels are npm CLI and the root Node GitHub Action only.
