# SARIF

SARIF output uses version 2.1.0 and includes stable fingerprints for Code Scanning deduplication.

The emitter is implemented in `src/report/sarif.ts` so the CLI and Action can ship one deterministic bundle. The build specification listed `sarif@^0.0.3`, but the npm registry does not publish that package name as of May 18, 2026, so BoardReadyOps keeps the SARIF writer local and validates the generated document shape in the report test suite.
