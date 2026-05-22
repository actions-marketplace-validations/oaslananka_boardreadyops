# Configuration

The primary configuration file is `boardreadyops.yml`. The loader also accepts `.boardreadyops.yml` and `boardreadyops.yaml` for repository conventions that already use those forms.

```yaml
version: 1
mode: warn
projects:
  - path: .
rules:
  bom.missing-mpn:
    enabled: true
  manufacturing.outputs-present:
    required: [gerber, drill, position, bom]
    patterns:
      gerber: ["**/release/**/*.gbr"]
fail-on: high
report:
  json: build/boardreadyops.findings.json
  sarif: build/boardreadyops.sarif.json
  markdown: build/boardreadyops.report.md
  html: build/boardreadyops.report.html
```

`projects` entries add project-local settings for a discovered KiCad project. They do not narrow discovery: BoardReadyOps checks every `.kicad_pro` under the workspace unless the CLI receives `--project`.

Project entries may override `mode`, rule settings, BOMs, pinmaps, and variants for the matching project directory or `.kicad_pro` file.

```yaml
version: 1
projects:
  - path: hardware/mainboard
    rules:
      manufacturing.outputs-present:
        severity: critical
  - path: hardware/prototype
    mode: warn
    bom: hardware/prototype/bom.csv
```

See [Multi-project Workspaces](multi-project.md) for filtering, concurrency, and report attribution examples.

Use `gates` when event-specific enforcement needs stricter requirements than the repository default:

```yaml
version: 1
fail-on: high
gates:
  pull_request:
    fail-on: critical
    require: []
  main:
    fail-on: high
    require: [clean-drc, clean-erc]
  release:
    fail-on: medium
    require: [clean-drc, clean-erc, gerber, drill, position, bom, changelog, tagged-release, no-eol-components]
```

Selecting a configured gate runs in enforce mode and uses that gate's `fail-on` threshold. A selected gate must exist in the config. Its required checks keep their backing rules enabled and selected even when the base rule config or CLI rule filters would skip them.

Gate manufacturing output requirements feed the existing `manufacturing.outputs-present` rule so missing `gerber`, `drill`, `position`, and `bom` outputs surface as findings before the gate requirement fails.

## Reports

Use the `report` block to write deterministic artifacts under the repository root. `json`, `sarif`, `markdown`, `html`, and `junit` accept relative paths; setting a key to `false` disables that configured report.

```yaml
version: 1
report:
  json: build/boardreadyops.findings.json
  sarif: build/boardreadyops.sarif.json
  markdown: build/boardreadyops.report.md
  html: build/boardreadyops.report.html
  junit: build/boardreadyops.junit.xml
```

HTML reports are standalone files with embedded CSS and filtering JavaScript, so they can be shared without publishing additional assets.

## Suppressions

Use scoped suppressions for intentional findings. A suppression must name the rule and a reason. Optional matchers narrow it to a project path, designator reference, or stable finding fingerprint. Expired suppressions no longer change the run result.

```yaml
version: 1
suppressions:
  - rule: manufacturing.outputs-present
    project: hardware/prototype
    reason: Prototype fab outputs are not published.
    expires: 2026-10-01
  - rule: bom.lifecycle
    refs: [U3]
    reason: Replacement is scheduled for the next board spin.
  - rule: bom.eol-detection
    fingerprint: 9a0d60335af2f2904487cfd351470858e083064dcd833bbff3a6a641c5924887
    reason: Approved component exception.
```

Suppressed findings stay in JSON reports with `suppressed: true`. They remain auditable, but `fail-on` only counts unsuppressed findings.

## Baselines

A baseline lets CI fail only on new findings while an existing board is being cleaned up.

```yaml
version: 1
baseline:
  file: .boardreadyops-baseline.json
  mode: new-only
```

`mode: new-only` marks findings already present in the baseline as suppressed for thresholding. `mode: all` keeps the baseline file available for CLI diff and prune operations without changing pipeline failure behavior.
