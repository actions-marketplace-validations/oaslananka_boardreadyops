# Governance

This page summarizes the repository governance policy for contributors and
agents. The root
[GOVERNANCE.md](https://github.com/oaslananka/boardreadyops/blob/main/GOVERNANCE.md)
is the maintainer-facing policy file.

## Source Of Truth

- Linear team `BOARD` owns roadmap priority and task state.
- GitHub owns branches, pull requests, code review metadata, and CI evidence.
- ADRs under `docs/architecture/adr/` own architectural decisions.
- Release-please owns release pull request generation; code agents must not merge
  release-please pull requests unless the maintainer explicitly changes scope.

## Pull Request Requirements

Every pull request must:

- Address exactly one Linear issue.
- Use a branch named `codex/BOARD-<id>-<short-slug>` for Codex agent work.
- Fill in `.github/pull_request_template.md`.
- Link the Linear issue.
- List validation commands and results.
- Keep generated docs, bundles, notices, and schemas in sync with source changes.
- Pass required CI before merge.

## Review And Ownership

`CODEOWNERS` assigns the repository to `@oaslananka`. GitHub requests code owner
review only when repository settings require it, but CODEOWNERS still documents
ownership and helps GitHub identify responsible maintainers.

The project currently uses a solo-maintainer policy:

- CI is mandatory for every pull request.
- Human review is best-effort.
- Public contract changes need explicit validation in the PR body.
- Security, release, and supply-chain changes should receive maintainer review
  before merge even when automation is green.

## Branch Protection Baseline

`main` should be protected before stable releases. The expected baseline is:

- Require pull requests before merge.
- Require status checks before merge.
- Require branches to be up to date before merge.
- Require linear history.
- Disallow force pushes.
- Disallow branch deletion.
- Apply restrictions to administrators.
- Use squash merge as the normal merge path.
- Delete topic branches after merge.

The expected required checks are:

- `ci / lint`
- `ci / typecheck`
- `ci / test-unit (ubuntu-latest, Node 22)`
- `ci / test-unit (ubuntu-latest, Node 24)`
- `ci / test-unit (windows-2025-vs2026, Node 22)`
- `ci / test-unit (windows-2025-vs2026, Node 24)`
- `ci / test-unit (macos-latest, Node 22)`
- `ci / test-unit (macos-latest, Node 24)`
- `ci / test-int (KiCad 9.0, Node 22)`
- `ci / test-int (KiCad 10.0, Node 24)`
- `ci / cross-platform-paths (ubuntu-latest)`
- `ci / cross-platform-paths (macos-latest)`
- `ci / cross-platform-paths (windows-latest)`
- `ci / test-action`
- `ci / accessibility`
- `ci / build`
- `ci / verify-dist`
- `ci / coverage-gate`
- `ci / mutation`
- `ci / security`
- `CodeQL`
- `gitleaks`
- `zizmor`
- `security / dependency-review`
- `security / codeql`
- `security / osv`
- `security / gitleaks`
- `security / sbom`

`security / scorecard advisory` is intentionally advisory because it may be
skipped on pull requests. The push-only `docs`, `benchmark`, `OpenSSF Scorecard`,
and `release-please` workflows are monitored on `main` after merge, but they are
not pull request required checks.

## Applying And Verifying Protection

Branch protection is a GitHub repository settings operation owned by the
maintainer or `oaslananka-ops`. The repository contains a helper script for the
intended classic branch protection rule:

```bash
scripts/setup-branch-protection.sh oaslananka/boardreadyops main
```

Verify the live setting with:

```bash
gh api repos/oaslananka/boardreadyops/branches/main/protection
```

If GitHub returns `Branch not protected`, the repository setting has not yet been
applied even if the documentation and helper script are present.

## External Settings

The repository code cannot fully represent these GitHub settings:

- Branch protection and rulesets.
- Required status-check selection.
- Repository merge method toggles.
- GitHub Pages deployment settings.
- Package and release permissions.

Changes to those settings should be recorded in Linear and, when relevant,
mirrored in docs or scripts so contributors can verify expected behavior.
