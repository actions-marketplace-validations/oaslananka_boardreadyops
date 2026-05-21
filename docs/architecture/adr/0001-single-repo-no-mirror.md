# ADR 0001: Single Repository Source

## Status

Accepted.

## Context

BoardReadyOps is published from one GitHub repository: `oaslananka/boardreadyops`.
The package name is `boardreadyops`, and the GitHub Action reference is
`oaslananka/boardreadyops@v1`.

## Decision

The project has one source repository only. Release automation, badges,
documentation links, issue references, and package metadata all point to
`oaslananka/boardreadyops`.

No secondary synchronized repository, organization account, or alternate
publishing account is used for v1. The repository identity is intentionally
personal-account scoped.

## Consequences

- CI, release notes, package metadata, and docs have one canonical GitHub slug.
- Branch protection and release automation are configured against the same
  repository identity.
- Migration from heritage code ports features only; it does not preserve old
  repository topology or branding.
