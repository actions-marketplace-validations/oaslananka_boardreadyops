# ADR 0002: Bundled Dist Strategy

The GitHub Action entrypoint is committed under `dist/action/index.cjs`. The CLI bundle is committed under `dist/cli/index.cjs`. CI verifies regenerated bundles are unchanged.
