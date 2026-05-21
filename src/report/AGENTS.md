# AGENTS.md

## Responsibility

Report modules render `RunResult` into JSON, SARIF, Markdown, workflow annotations, and optional JUnit.

## Interface Upward

- JSON: `formatJson`
- SARIF: `formatSarif`
- Markdown: `formatMarkdown`
- Annotations: `emitAnnotations`

## Rules

- Report modules are pure formatters except for annotation emission.
- SARIF output must stay valid SARIF 2.1.0 with stable partial fingerprints.
- Markdown uses Mustache templates in `src/report/templates/`; do not add inline replacement templates.
- Template tests cover empty and populated findings.
