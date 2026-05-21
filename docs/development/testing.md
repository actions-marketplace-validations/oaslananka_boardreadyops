# Testing

Use unit tests for rule behavior, integration tests for fixture projects, action tests for input/output behavior, property tests for invariants, snapshot tests for report stability, and benchmarks for throughput.

## Property Tests

Property tests live under `tests/property/` and use `fast-check`. Add them when a helper should hold an invariant across many inputs, such as fingerprint determinism, sorting idempotency, summary counts, config validation, or report JSON parseability.

Run them with:

```bash
corepack pnpm run test:property
```

## Snapshot Tests

Snapshot tests live under `tests/snapshot/` and are limited to stable report formats. Update snapshots only when the formatted contract intentionally changes:

```bash
corepack pnpm run test:snapshot -- -u
```

## Mutation Tests

Mutation tests use Stryker with the Vitest runner. They measure whether tests detect source mutations in core, rules, BOM, pinmap, and report modules.

Run them with:

```bash
corepack pnpm run mutation
```

## Benchmarks

Benchmarks live under `tests/benchmark/`. They track pipeline and formatter throughput for common fixtures.

Run them with:

```bash
corepack pnpm run benchmark
```
