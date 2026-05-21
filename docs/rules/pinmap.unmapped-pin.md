---
id: pinmap.unmapped-pin
severity-default: medium
applies-to:
  - pinmap
  - schematic
config-keys:
  - rules.pinmap.unmapped-pin.enabled
  - rules.pinmap.unmapped-pin.severity
---

# pinmap.unmapped-pin

## What It Checks

Checks connected schematic pins against pinmap entries.

## When It Fires

Fires when a connected schematic pin has no matching pinmap entry.

## Configuration Example

```yaml
version: 1
rules:
  pinmap.unmapped-pin:
    enabled: true
    severity: medium
```

## JSON Finding Details Shape

```text
{ designator, pin, net }
```

## Report Context

Use this finding to decide whether the design package is ready for review, fabrication, or release. BoardReadyOps reports the condition and leaves design edits to the owning workflow.
