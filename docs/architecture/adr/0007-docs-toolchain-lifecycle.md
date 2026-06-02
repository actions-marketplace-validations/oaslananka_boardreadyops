# ADR-0007 - Documentation Toolchain Lifecycle

**Status:** Accepted
**Date:** 2026-06-02

## Context

BoardReadyOps currently builds documentation with MkDocs, Material for MkDocs,
and mike. The docs are source-controlled Markdown under `docs/`, configured by
`mkdocs.yml`, and built in CI, docs publishing, accessibility, and release
workflows.

Material for MkDocs 9.7.0 moved the project into maintenance mode. The 9.7.6
changelog identifies that release as the last feature release. The maintainers
commit to critical fixes and security updates for a limited maintenance window,
while shifting new development to Zensical. The MkDocs 2.0 compatibility note
also states that Material for MkDocs depends heavily on MkDocs 1.x behavior and
is not compatible with MkDocs 2.0 without significant changes.

This makes the docs stack a lifecycle risk for a hardware review tool whose
documentation needs to remain buildable during release and action validation.

## Decision

Short term, BoardReadyOps keeps MkDocs Material pinned and makes the Python docs
toolchain visible to Renovate through `docs/requirements.txt`. Every workflow
that installs docs dependencies must install from that file instead of repeating
inline versions.

Medium term, BoardReadyOps will run a migration spike before November 2026. The
preferred path is:

1. Re-check Zensical maturity and MkDocs compatibility by 2026-08-31.
2. If Zensical is stable enough for this repository's Markdown, mike-style
   versioning, accessibility checks, and strict builds, migrate to Zensical.
3. If Zensical is still not stable enough, migrate to VitePress because it is a
   mature documentation SSG, stays close to Markdown authoring, and aligns with
   the user's existing KiCad Studio documentation stack.
4. Keep Docusaurus and Starlight as fallback options if the spike finds that
   BoardReadyOps needs React/MDX depth or Astro/Starlight accessibility defaults
   more than compatibility with current MkDocs content.

The migration must preserve these repo contracts:

- `pnpm run docs` builds the docs locally.
- `pnpm run test:a11y` validates the generated site.
- Release verification builds docs from the tagged source.
- Navigation, rule docs, report docs, and generated Action input docs remain
  source-controlled and reproducible.

## Alternatives Considered

| Option | Pros | Cons | Fit for this project |
| --- | --- | --- | --- |
| Stay on MkDocs Material until EOL | No immediate content migration; current CI already passes. | Lifecycle risk after the maintenance window; MkDocs 2.0 incompatibility remains. | Medium short term, low after EOL |
| Zensical | Built by the Material for MkDocs team; intended migration path; Python package workflow remains familiar. | Currently alpha; feature parity and mike-style versioning need verification. | High if stable by the spike date |
| VitePress | Mature Markdown-first SSG; aligns with the user's KiCad Studio docs stack; fits existing Node toolchain. | Requires porting `mkdocs.yml`, navigation, theme behavior, and versioning. | High fallback |
| Docusaurus | Mature React/MDX documentation platform with rich ecosystem. | More application framework overhead than this repo currently needs. | Medium |
| Starlight | Astro-based, accessible-by-default docs framework with Markdown/MDX support. | Adds Astro conventions and a new frontend stack; versioning parity needs design. | Medium |

## Consequences

- Docs dependency drift is tracked in a single file, and workflows stop carrying
  hidden inline Python dependency pins.
- Renovate can report MkDocs, Material for MkDocs, and mike drift through the
  requirements datasource.
- The repository has an explicit migration decision point before the Material
  maintenance window ends.
- Future docs migration work should link to this ADR and include a content
  compatibility audit before replacing `mkdocs.yml`.

## Sources Checked

- Material for MkDocs changelog, accessed 2026-06-02:
  `https://squidfunk.github.io/mkdocs-material/changelog/`
- Material for MkDocs MkDocs 2.0 compatibility note, accessed 2026-06-02:
  `https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/`
- Zensical documentation, accessed 2026-06-02:
  `https://zensical.org/docs/get-started/`
- VitePress guide, accessed 2026-06-02:
  `https://vitepress.dev/guide/what-is-vitepress`
- Docusaurus documentation, accessed 2026-06-02:
  `https://docusaurus.io/docs/installation`
- Starlight documentation, accessed 2026-06-02:
  `https://starlight.astro.build/`
