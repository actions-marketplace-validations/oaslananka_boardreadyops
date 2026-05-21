---
id: manufacturing.outputs-present
severity-default: high
applies-to:
  - manifest
  - pcb
config-keys:
  - rules.manufacturing.outputs-present.required
---

# manufacturing.outputs-present

## What It Checks

Checks configured fabrication outputs and freshness against PCB source mtimes.

## When It Fires

Fires when a required output is missing or older than the PCB.

## Configuration Example

```yaml
version: 1
rules:
  manufacturing.outputs-present:
    enabled: true
    severity: high
```

## JSON Finding Details Shape

```text
{ required }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
