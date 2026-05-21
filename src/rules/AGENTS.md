# AGENTS.md

## Responsibility

Rules turn project evidence into normalized findings. The registry is closed for v1 and lives in `_index.ts`.

## Interface Upward

- Rule metadata implements `RuleMetadata`.
- Rule execution implements `Rule.run(context)`.
- Built-in registration happens only in `registerBuiltInRules`.

## Add A Rule

- Add the implementation under the matching group directory.
- Add stable metadata with an id in `<group>.<rule>` form.
- Register the rule in `_index.ts`.
- Add unit tests under `tests/unit/rules/<group>/`.
- Add or update fixtures under `tests/fixtures/projects/`.
- Add schema coverage when `details` has a rule-specific shape.
- Run `corepack pnpm run docs` so generated rule docs stay current.

## Rules

- Findings must use `createFinding` for stable fingerprints.
- Do not propose edits to KiCad files; rules only report.
- Keep rule logic local to the rule group unless a shared helper removes real duplication.
