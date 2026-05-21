---
id: erc.kicad
severity-default: high
applies-to:
  - schematic
config-keys:
  - rules.erc.kicad.enabled
  - rules.erc.severity-overrides
---

# erc.kicad

## What It Checks

Runs KiCad schematic ERC and normalizes KiCad diagnostics into BoardReadyOps findings.

## When It Fires

Fires for every KiCad ERC diagnostic in the JSON report.

## Configuration Example

```yaml
version: 1
rules:
  erc.kicad:
    enabled: true
    severity: high
```

## JSON Finding Details Shape

```text
{ source: 'kicad-cli', diagnostic: <KiCad diagnostic object> }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
