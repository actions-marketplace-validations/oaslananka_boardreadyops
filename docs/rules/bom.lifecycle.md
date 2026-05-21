---
id: bom.lifecycle
severity-default: medium
applies-to:
  - bom
config-keys:
  - rules.bom.lifecycle.enabled
  - rules.bom.lifecycle.db
---

# bom.lifecycle

## What It Checks

Checks BOM lifecycle columns or a local lifecycle database for EOL, NRND, preview, and discontinued markers.

## When It Fires

Fires when a component lifecycle status carries release or sourcing risk.

## Configuration Example

```yaml
version: 1
rules:
  bom.lifecycle:
    enabled: true
    severity: medium
```

## JSON Finding Details Shape

```text
{ reference, mpn, lifecycle }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
