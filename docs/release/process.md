# Release Process

Release Please manages routine version bumps and release PRs. Manual stable releases are allowed only from a clean, verified `main` branch. Publishing uses npm provenance and GitHub OIDC.

Release Please reads `release-please-config.json` and
`.release-please-manifest.json`. The manifest package uses standard semver tags
such as `v1.2.0`; component-prefixed tags are disabled so GitHub Release notes,
floating tags, binary assets, and npm publishing all point at the same release
identity. Release notes must come from real changelog changes, not placeholder
sentences.

`corepack pnpm run docs` regenerates compatibility docs, rule docs, Action
input docs, plugin SDK API docs, and the release history page before building
MkDocs. `corepack pnpm run gc` reruns the same generated-doc steps and fails if
`docs/reference/plugin-sdk/`, `docs/release/history.md`, or other generated docs
are stale.

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

Docs Python dependencies are pinned in `docs/requirements.txt`. CI, docs,
accessibility, and release workflows must install from that file instead of
repeating inline `mkdocs`, `mkdocs-material`, or `mike` versions. Changes to
the docs toolchain lifecycle are governed by
[ADR-0007](../architecture/adr/0007-docs-toolchain-lifecycle.md).

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

`publish-npm` has two entry points:

- `release: published` for releases created outside the repository's
  `GITHUB_TOKEN` automation path.
- `workflow_dispatch` for backfills and recovery.

GitHub does not create most follow-on workflow runs from events caused by a
workflow's repository `GITHUB_TOKEN`; only `workflow_dispatch` and
`repository_dispatch` are exceptions. After `release-please` creates a release,
the release workflow explicitly starts `publish-npm` with `workflow_dispatch`,
passes the new release tag, and enables floating release tag updates. This keeps
npm publishing deterministic without using `workflow_run` for privileged release
work.

If the automatic path did not run or a previous workflow fix needs to publish an
already-created release tag, manually dispatch `publish-npm` from `main` with
the `tag` input set to the published release tag:

```bash
gh workflow run publish-npm.yml -f tag=v1.0.0 -f prerelease=false
```

The workflow checks out the release tag with full history, verifies the tag
version matches `package.json`, and publishes the package with npm provenance.
The automatic `release: published` path remains stricter: the tag must point at
the current `origin/main` HEAD, pass the full local verification chain, and then
update floating release tags for stable releases. Manual and release-please
dispatches allow the tag to be an ancestor of `origin/main` so already-created
releases can be backfilled after workflow-only fixes. Those historical backfills
validate the immutable package snapshot without rebuilding committed `dist/`
bundles, because the selected release tag may predate the current
reproducible-build workflow fixes.

Manual historical backfills do not move `vMAJOR` or `vMAJOR.MINOR` floating
release tags unless `update_floating_tags=true` is passed explicitly. GitHub
rejects default `GITHUB_TOKEN` ref updates when the target commit contains
workflow-file changes and the token lacks workflow-file write permission. If a
historical release also needs floating Action tags repaired, run
`scripts/update-floating-tags.sh <tag>` with maintainer credentials that can
update workflow-containing refs. The publish job is idempotent for
already-published versions. Binary and container release workflows trigger only
on full semver tags like `v1.1.0`; floating tags such as `v1` and `v1.1` must not
create separate release artifacts.

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
