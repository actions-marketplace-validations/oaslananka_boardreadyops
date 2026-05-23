# Governance

BoardReadyOps is currently maintained as a single-maintainer project. This file
defines how changes land, how decisions are recorded, and what repository
protections are expected before stable releases.

## Decision Making

- Linear team `BOARD` is the planning source of truth for roadmap and task
  priority.
- GitHub is used for code, branches, pull requests, and CI results.
- Architectural decisions are recorded as ADRs under `docs/architecture/adr/`.
- Public contract changes must update the matching docs, schemas, examples, and
  validation commands in the same pull request.
- Release automation is handled by release-please. Release-please pull requests
  are read-only for code agents unless the maintainer explicitly takes release
  action.

When a decision changes CLI behavior, Action inputs, report schemas, rule
semantics, security posture, or release mechanics, add or update an ADR instead
of relying only on a pull request comment.

## Maintainer Responsibilities

The maintainer is responsible for:

- Keeping the Linear BOARD queue current.
- Reviewing roadmap scope, breaking changes, and user-facing contracts.
- Maintaining CODEOWNERS, CI requirements, branch protection, release
  configuration, and package ownership.
- Triaging security reports and dependency alerts.
- Keeping generated docs, bundles, notices, and schemas in sync with source
  changes.

Automation can run validation and merge eligible changes, but the maintainer owns
policy decisions and external GitHub settings.

## Review Model

All pull requests must pass CI before merge. The repository uses automated review
signals from CI and configured review tools; human review is best-effort while
the project has a solo maintainer.

Best-effort review SLA:

- Security, release, and supply-chain changes: same business day when possible.
- Public CLI, Action, schema, or report contract changes: within two business
  days when possible.
- Documentation-only or test-only changes: as capacity allows after CI is green.

If a PR changes a public contract, the PR body must identify the contract and the
validation commands that prove compatibility or intentional breakage.

## CODEOWNERS

The repository has a root `CODEOWNERS` file that currently assigns all files to
`@oaslananka`. GitHub supports CODEOWNERS files in `.github/`, repository root,
or `docs/`; if multiple files exist, GitHub uses the first match in that order.

Policy:

- Keep exactly one active CODEOWNERS file unless the maintainer intentionally
  changes ownership layout.
- Include ownership for governance and repository settings files.
- Do not use CODEOWNERS as a substitute for CI or branch protection.

## Branch And Merge Policy

`main` is the integration branch. Contributors and agents should work from
short-lived branches and open pull requests back to `main`.

Required policy:

- No force-push to `main`.
- No deletion of `main`.
- No direct pushes to `main` except maintainer-approved emergency fixes.
- Squash merge is the normal merge method.
- Delete topic branches after merge.
- One Linear issue per pull request.
- Release, tag, and package-publish actions are maintainer-owned.

## Branch Protection

The expected `main` protection baseline is documented in
[docs/governance.md](docs/governance.md#branch-protection-baseline). Applying
branch protection is a repository settings operation owned by the maintainer or
`oaslananka-ops`; ordinary code agents should document and verify it, not bypass
the repository policy.

The helper script `scripts/setup-branch-protection.sh` encodes the intended
classic branch protection rule for `main`. Run it only from an authenticated
admin context:

```bash
scripts/setup-branch-protection.sh oaslananka/boardreadyops main
```

Verify current protection with:

```bash
gh api repos/oaslananka/boardreadyops/branches/main/protection
```

If GitHub returns `Branch not protected`, treat that as an operations follow-up:
the documentation and script may be correct while the repository setting still
needs to be applied by the maintainer.
