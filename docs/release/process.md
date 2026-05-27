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

If `binary-build` creates the GitHub Release with the workflow `GITHUB_TOKEN`,
GitHub will not fire the `release: published` workflow event. Manually dispatch
`publish-npm` from `main` with the `tag` input set to the published release tag:

```bash
gh workflow run publish-npm.yml -f tag=v1.0.0 -f prerelease=false
```

The workflow checks out the tag with full history, verifies the tag version
matches `package.json` and is reachable from `origin/main`, publishes the
package with npm provenance, and then updates floating release tags for stable
releases. The automatic `release: published` path remains stricter: the tag
must point at the current `origin/main` HEAD.

If npm publishing succeeds but the floating release tag job fails, rerun the
workflow after confirming the `vMAJOR` and `vMAJOR.MINOR` floating tags resolve
to the release commit. The publish job is idempotent for already-published
versions. For manual dispatches, floating-tag repair uses the workflow and
script from the selected `main` ref, so fixes to the retry path do not require
retagging the released commit. Binary and container release workflows trigger
only on full semver tags like `v1.1.0`; floating tags such as `v1` and `v1.1`
must not create separate release artifacts.

If the semver tag is already published but the container image needs to be
repaired with the current container packaging from `main`, manually dispatch the
container workflow with an explicit version and publish flag:

```bash
gh workflow run container-build.yml --ref main -f version=1.1.0 -f publish=true
```

This path builds the current container definition around the already-published
npm package version, then publishes `ghcr.io/oaslananka/boardreadyops-full:vX.Y.Z`.
For stable versions it also updates the `vX` and `latest` image aliases.

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
