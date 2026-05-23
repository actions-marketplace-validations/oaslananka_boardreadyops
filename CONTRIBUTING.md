# Contributing

Use a Node.js runtime listed in the [support matrix](docs/support-matrix.md) and the pnpm version pinned by
`packageManager`.

```bash
corepack pnpm install --frozen-lockfile
task verify
```

Accessibility checks are part of the verification contract. HTML report changes must keep the axe-core report test
passing, and documentation changes must keep the MkDocs pa11y smoke test passing. The target and documented
exceptions are in [docs/accessibility.md](docs/accessibility.md).

Source changes that affect the Action must regenerate committed bundles:

```bash
task build
task verify:dist
```

Commits use Conventional Commits with scopes listed in `commitlint.config.cjs`.
