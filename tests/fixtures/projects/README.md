# Project fixture corpus

Every project fixture keeps its expectation beside the KiCad files in `expected-findings.json`.

- `expectedRules` and `expectedSeverities` align by index so each rule's severity stays stable.
- `expectPass` records the `fail-on: high` outcome for the fixture regression.
- `runRules` narrows the fixture to the behavior it exists to protect. An empty list validates project discovery and config loading only.
- `performanceBaselineMs` captures the current per-fixture baseline for future performance-budget work.
- `stalePaths` optionally marks output files that should stay older than their board after the fixture test normalizes Git checkout mtimes.

Adding a fixture means adding one project folder with the KiCad files, any fixture config, and its expectation file.
