# AGENTS.md

## Responsibility

Pinmap modules load YAML, JSON, and CSV pinmap files into a normalized pinmap model for pinmap rules.

## Interface Upward

- Loader: `loadPinmap`
- Resolvers: `src/pinmap/resolvers/`
- Types: `PinmapEntry`

## Rules

- Format detection should be extension-based and deterministic.
- Duplicate detection belongs in rules, not loaders, so reports can include normalized finding metadata.
- Loader errors should identify the pinmap resource path whenever possible.
