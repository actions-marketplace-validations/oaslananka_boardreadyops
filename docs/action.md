# GitHub Action

```yaml
name: BoardReadyOps

on:
  pull_request:
  push:
    branches: [main]

jobs:
  boardreadyops:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: oaslananka/boardreadyops@v1
        with:
          config: boardreadyops.yml
```

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `path` | `.` | Directory to scan. |
| `project` | `` | Explicit .kicad_pro path. If omitted, all discovered projects are scanned. |
| `config` | `boardreadyops.yml` | Path to boardreadyops.yml. |
| `mode` | `warn` | warn or enforce |
| `require-kicad` | `false` | Fail when kicad-cli is not available. |
| `kicad-cli` | `` | Explicit kicad-cli path. |
| `bom` | `auto` | BOM source path or "auto". |
| `pinmap` | `` | Pinmap file path. Empty disables pinmap rules. |
| `variant` | `` | KiCad variant name used by variant-aware BoardReadyOps rules. |
| `sarif` | `boardreadyops.sarif.json` | Output SARIF path. Empty disables. |
| `json` | `boardreadyops.findings.json` | Output JSON findings path. Empty disables. |
| `markdown` | `boardreadyops.report.md` | Output Markdown report path. Empty disables. |
| `upload-sarif` | `true` | Upload SARIF to GitHub Code Scanning. |
| `upload-artifacts` | `true` | Upload reports as workflow artifacts. |
| `comment-pr` | `true` | Post a sticky Markdown comment on pull requests. |
| `artifact-name` | `boardreadyops` | Workflow artifact name. |
| `fail-on` | `high` | Severity threshold above which the action exits non-zero. One of critical, high, medium, low, never. |
| `annotations` | `true` | Emit ::error/::warning workflow annotations. |

## Outputs

| Name | Description |
| --- | --- |
| `findings` | Total finding count. |
| `critical` | Count of critical findings. |
| `high` | Count of high findings. |
| `medium` | Count of medium findings. |
| `low` | Count of low findings. |
| `sarif-path` | SARIF output path if produced. |
| `json-path` | JSON output path if produced. |
| `markdown-path` | Markdown output path if produced. |
