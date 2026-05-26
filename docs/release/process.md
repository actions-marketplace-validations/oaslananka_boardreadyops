# Release Process

Release Please manages routine version bumps and release PRs. Manual stable releases are allowed only from a clean, verified `main` branch. Publishing uses npm provenance and GitHub OIDC.

## Local Pre-Release Gate

Run these commands on the exact commit that will be tagged:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm outdated --json || true
corepack pnpm audit --audit-level moderate
ALLOW_MAJOR_RELEASE=true task verify
task test:int
pre-commit run --all-files
actionlint .github/workflows/*.yml
yamllint .github/workflows/ .github/actions/ action.yml action.yaml
gitleaks detect --source . --redact --verbose
```

`corepack pnpm outdated --json` is informational manual review output, not a hard release gate. pnpm exits non-zero when any package is outdated; review expected differences manually. Do not run this line under `set -e` or fail CI solely on its exit code.

Before tagging, inspect each external workflow action metadata and confirm no JavaScript action runs on `node12`, `node16`, or `node20`. Prefer Node24 actions, composite actions, Docker actions, or directly installed official CLIs.

## Tag And GitHub Release

For a stable release:

```bash
git status --short
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

Replace `v1.0.0` with the target semver tag. Do not retag a version that was
already published. The `binary-build` workflow owns GitHub Release creation for
tag pushes: it builds every supported binary, generates `SHA256SUMS`, uploads
the SBOM, and verifies the release asset list before the release is considered
complete. If the workflow publishes a broken artifact, bump the next patch
version and document the incident before re-releasing.

If a tag already exists but the release assets need to be attached after a
workflow fix, manually run `binary-build` from `main` with the `release-tag`
input set to that tag. The workflow checks out the tag before building, so the
tag must contain the binary build scripts.

## Remote Verification

After creating the GitHub Release:

```bash
gh run watch --exit-status
gh release view v1.0.0 --json tagName,isPrerelease,assets,url
npm view boardreadyops version dist.integrity --json
```

The release is complete only when all release workflows conclude successfully,
the GitHub Release contains all five binary assets plus `SHA256SUMS`, the
checksums match those assets, and the npm registry shows the published package
version.

## Failure Handling

If any workflow fails:

1. Fetch the failed logs with `gh run view <run-id> --log-failed`.
2. Reproduce the failed command locally when possible.
3. Apply the smallest fix on a branch, run the full local pre-release gate, merge it, and tag a new patch version if the failed release already reached the registry.
