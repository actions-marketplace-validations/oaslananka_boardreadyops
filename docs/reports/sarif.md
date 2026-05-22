# SARIF

SARIF output uses version 2.1.0 and includes stable fingerprints for Code Scanning deduplication.

The emitter is implemented in `src/report/sarif.ts` so the CLI and Action can ship one deterministic bundle. The build specification listed `sarif@^0.0.3`, but the npm registry does not publish that package name as of May 18, 2026, so BoardReadyOps keeps the SARIF writer local and validates the generated document shape in the report test suite.

Each finding is emitted as a SARIF result with:

- `physicalLocation.artifactLocation.uri` set to the finding resource path.
- `physicalLocation.region` set from `location.region`, or from positive `location.line` / `location.column` values, falling back to line 1 and column 1 for file-only or invalid zero-valued findings.
- `logicalLocations` when board coordinates are available, using the board layer, coordinate pair, and units so Code Scanning can show PCB context alongside file context.
- `properties.severity`, `properties.resourceKind`, and, when present, `properties.project` and `properties.confidence`.
- Rule `help.text` and `help.markdown` from the finding fix description and steps when a fix suggestion is present.

The GitHub Action smoke workflow uploads a no-finding SARIF file from the safe fixture to GitHub Code Scanning on trusted same-repository runs. Fork pull requests skip the upload job so untrusted code does not receive a token with `security-events: write`.
