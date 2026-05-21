# Tooling

This repository uses the minimum local tooling needed for the v1 contract:

- Biome for formatting and linting.
- TypeScript 6 for strict type checking.
- Vitest and V8 coverage for tests and thresholds.
- esbuild for committed Action and CLI bundles.
- MkDocs Material for documentation.
- actionlint, yamllint, zizmor, Gitleaks, Trivy, and OpenSSF Scorecard in local or CI verification.
- release-please for release pull request management through the pinned GitHub Action.

The project pins pnpm through `packageManager` and keeps pnpm build-script policy in `pnpm-workspace.yaml`. SBOM generation is implemented locally in `scripts/generate-sbom.mjs` so the release gate does not inherit deprecated transitive packages from external SBOM CLIs.

The SARIF emitter is implemented in `src/report/sarif.ts` because the package name from the contract was not available from the npm registry during implementation. The JSON shape is covered by report tests.
