---
id: bom.missing-mpn
severity-default: high
applies-to:
  - bom
config-keys:
  - rules.bom.missing-mpn.enabled
  - rules.bom.missing-mpn.ignore-refs
---

# bom.missing-mpn

## What It Checks

Checks normalized BOM rows for missing manufacturer part numbers.

## When It Fires

Fires when a populated BOM row has no MPN and the reference is not ignored.

## Configuration Example

```yaml
version: 1
rules:
  bom.missing-mpn:
    enabled: true
    severity: high
```

## JSON Finding Details Shape

```text
{ reference, value, footprint }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
