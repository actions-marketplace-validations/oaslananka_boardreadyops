# AGENTS.md

## Responsibility

Core owns config loading, discovery, project context, findings, rule registration, logging, results, and pipeline orchestration.

## Interface Upward

- Main entry point: `runPipeline`
- Project discovery: `discoverProjects`
- Rule registry: `registerRule`, `listRules`
- Finding helpers: `createFinding`, `summarizeFindings`, `sortFindings`

## Rules

- Core must stay deterministic. Sort externally visible findings and rule lists.
- Config validation errors include JSON pointers where Ajv provides them.
- Multi-project execution uses bounded concurrency through `mapLimit`.
- Core may register built-in rules through `src/rules/_index.ts`; rule modules must not register themselves at import time.
