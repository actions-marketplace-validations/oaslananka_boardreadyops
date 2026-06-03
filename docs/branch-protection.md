# Branch Protection

Rulesets are stored as code in `.github/rulesets/main.json`.

Apply:

```bash
gh api -X POST /repos/oaslananka/boardreadyops/rulesets --input .github/rulesets/main.json
```

Update existing:

```bash
gh api /repos/oaslananka/boardreadyops/rulesets
gh api -X PUT /repos/oaslananka/boardreadyops/rulesets/<id> --input .github/rulesets/main.json
```

Required status checks:

- `ci / lint`
- `ci / typecheck`
- `ci / test-unit (ubuntu-24.04, Node 22)`
- `ci / test-unit (ubuntu-24.04, Node 24)`
