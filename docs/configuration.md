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
```

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
