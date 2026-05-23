# OpenSSF Scorecard

BoardReadyOps runs an OpenSSF Scorecard baseline weekly. The baseline uses the
Scorecard CLI check selection that is enforceable for stable releases and
without human-review gating:

- `Binary-Artifacts`
- `Dangerous-Workflow`
- `Dependency-Update-Tool`
- `Fuzzing`
- `License`
- `Pinned-Dependencies`
- `SAST`
- `Security-Policy`
- `Token-Permissions`
- `Vulnerabilities`

The workflow fails when the baseline aggregate score is below `9.0`.
Branch protection is verified separately with `scripts/setup-branch-protection.sh`
and the repository branch protection API because the default workflow token cannot
read classic branch protection rules in Scorecard.

## Notes For Enforced Checks

- `Binary-Artifacts`: this check remains enforced. Current Scorecard runs score
  it as passing because the committed `dist/action/index.cjs` and
  `dist/cli/index.cjs` files are generated JavaScript bundles, not binary
  artifacts. ADR-0002 records why the action bundles are committed, and
  `task verify:dist` prevents bundle drift.
- `Fuzzing`: this check remains enforced because current Scorecard runs score it
  as passing. BoardReadyOps does not claim an OSS-Fuzz or ClusterFuzz
  registration. If Scorecard behavior changes and this
  probe no longer passes, the workflow should fail until the repository either
  adds a recognized fuzzing integration or records a deliberate exception in an
  ADR.

## Deferred Full-Scan Checks

- `Branch-Protection`: verified by `scripts/setup-branch-protection.sh` and the
  repository branch protection API outside Scorecard because the default
  workflow token cannot read classic branch protection rules.
- `Packaging`: npm publication is triggered from clean `main` when a release tag and GitHub Release are published.
- `Signed-Releases`: npm provenance and GitHub artifact attestations are handled by the release workflows.
- `CII-Best-Practices`: external self-certification is not completed by the build agent. The badge can be added after the operator completes the questionnaire.
- `Code-Review`: the expected branch protection baseline requires pull requests, but the repository uses bot-only review and zero required human approvals by policy.
- `Contributors`: the repository starts with a single maintainer.
- `Maintained`: GitHub reports newly created repositories as young for the first 90 days.

## Required Follow-Up

After each stable release, rerun the full default Scorecard scan and review the omitted checks. High-severity findings from the enforced baseline are blocking defects.
