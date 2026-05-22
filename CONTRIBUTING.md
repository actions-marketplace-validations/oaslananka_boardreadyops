# Contributing

Use a Node.js runtime listed in the [support matrix](docs/support-matrix.md) and the pnpm version pinned by
`packageManager`.

```bash
corepack pnpm install --frozen-lockfile
task verify
```

Source changes that affect the Action must regenerate committed bundles:

```bash
task build
task verify:dist
```

Commits use Conventional Commits with scopes listed in `commitlint.config.cjs`.
