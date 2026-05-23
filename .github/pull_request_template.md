## Scope

Describe the change and its user-visible impact.

## Related Linear Issue

Link the Linear issue, for example `BOARD-41`.

## Validation

List every command run and mark pass/fail.

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run verify:dist`

Additional validation:

- [ ] Documentation generated or built, if docs changed.
- [ ] Bundles regenerated and verified, if CLI or Action source changed.
- [ ] Schemas and snapshots updated, if report contracts changed.
- [ ] Security/license checks run, if dependencies, workflows, or release logic changed.

## Checklist

- [ ] The PR is scoped to one Linear issue.
- [ ] Public behavior, docs, schemas, and examples are in sync.
- [ ] Generated files are committed or verified unchanged.
- [ ] No secrets, credentials, cookies, or token-bearing files are included.
- [ ] New or changed workflows use pinned actions and current supported runtimes.
- [ ] Branch protection or governance docs were updated if repository policy changed.

## Risk

Call out migration, compatibility, security, or release risks.
