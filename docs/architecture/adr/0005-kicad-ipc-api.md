# ADR-0005 — KiCad IPC API Detection

**Status:** Accepted
**Date:** 2026-05-18

## Context

KiCad 10 exposes an API server that can support deeper board inspection in later releases.

## Decision

BoardReadyOps includes a small IPC capability detector but does not make rule execution depend on the API server.

## Consequences

- Current CI remains compatible with file-based fixtures.
- Future rules can add IPC queries behind explicit guards.
- The CLI does not start or manage long-running KiCad API server processes.

## Alternatives Considered

- Require the API server for all KiCad 10 checks; rejected because it would make CI setup heavier.
- Omit IPC awareness entirely; rejected because support detection is a low-risk foundation for future analysis.
