# AGENTS.md

## Responsibility

This subsystem adapts the core pipeline to GitHub Actions. It parses `action.yml` inputs, writes outputs, uploads enabled artifacts, emits SARIF when trusted, and manages the sticky pull request comment.

## Interface Upward

- Entry point: `src/action/index.ts`
- Input parser: `readActionInputs`
- Output writer: `setActionOutputs`
- Trusted write helpers: `uploadArtifacts`, `uploadSarif`, `upsertPullRequestComment`

## Rules

- Keep fork pull request handling conservative. Trusted writes are skipped when the event repository differs from the base repository.
- Do not read secrets directly. Use `@actions/core` and GitHub context helpers.
- All new inputs must be added to `action.yml`, `src/action/inputs.ts`, generated action docs, and action tests.
- Action failures should surface as `core.setFailed` messages from the outermost boundary only.
