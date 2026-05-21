---
id: pinmap.net-label
severity-default: medium
applies-to:
  - pinmap
  - schematic
config-keys:
  - rules.pinmap.net-label.enabled
  - pinmap
  - projects.pinmap
---

# pinmap.net-label

## What It Checks

Checks pinmap net names against schematic global, local, and hierarchical labels.

## When It Fires

Fires when a pinmap net has no matching schematic label.

## Configuration Example

```yaml
version: 1
rules:
  pinmap.net-label:
    enabled: true
    severity: medium
```

## JSON Finding Details Shape

```text
{ net, entry }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
