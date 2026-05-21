# AGENTS.md

## Responsibility

Utility modules provide small filesystem, path, process, string, glob, and async helpers used across higher layers.

## Interface Upward

- Keep helpers narrow and dependency-light.
- Utilities may be imported by any subsystem.

## Rules

- Utilities must not import from `core`, `rules`, `action`, `cli`, or report modules.
- Prefer Node standard library behavior unless a package is already part of the v1 contract.
- Add tests when a helper contains branching behavior.
