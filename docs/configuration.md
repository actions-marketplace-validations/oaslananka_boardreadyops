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
fail-on: high
```

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
