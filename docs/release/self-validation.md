# Self-Validation Gate

BOARD-61 verifies that BoardReadyOps can run against the BoardReadyOps repository itself before the project is treated as complete.

## Command

The local gate builds the committed CLI bundle and runs the tool against the repository root with a non-blocking threshold so every finding is recorded:

```sh
corepack pnpm run build
rm -rf reports/self-validation
mkdir -p reports/self-validation
node dist/cli/index.cjs check . \
  --fail-on never \
  --json reports/self-validation/findings.json \
  --sarif reports/self-validation/findings.sarif.json \
  --markdown reports/self-validation/report.md \
  --no-annotations \
  --log-level silent
```

The GitHub workflow `self-validation` runs the same gate on `ubuntu-24.04` with Node 24 and KiCad 10.0, then uploads the generated report files as the `boardreadyops-self-validation` artifact.

## Local Evidence

Last local run:

| Field | Value |
| --- | --- |
| Git ref | `5667f1b5ce14dbd8888fd3e919109abc76655f51` |
| Branch | `codex/BOARD-61-self-validation-gate` |
| Node | `v24.15.0` |
| pnpm | `11.1.3` |
| KiCad CLI | `10.0.3` |
| Exit code | `0` |

Generated local artifacts:

| Artifact | Size |
| --- | ---: |
| `reports/self-validation/findings.json` | 680,915 bytes |
| `reports/self-validation/findings.sarif.json` | 937,465 bytes |
| `reports/self-validation/report.md` | 4,854 bytes |

## Finding Summary

The local run produced 545 findings:

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 314 |
| Medium | 223 |
| Low | 8 |
| Info | 0 |

Rule distribution:

| Rule | Severity | Count |
| --- | --- | ---: |
| `bom.dnp-consistency` | medium | 2 |
| `bom.footprint-mismatch` | medium | 1 |
| `bom.single-source` | medium | 54 |
| `design.board-outline` | high | 22 |
| `design.copper-balance` | low | 6 |
| `drc.footprint_filters_mismatch` | high | 9 |
| `drc.footprint_type_mismatch` | high | 9 |
| `drc.invalid_outline` | high | 18 |
| `drc.kicad` | high | 8 |
| `drc.lib_footprint_issues` | medium | 29 |
| `drc.missing_courtyard` | high | 9 |
| `drc.silk_edge_clearance` | medium | 15 |
| `drc.track_not_centered_on_via` | high | 9 |
| `drc.tuning_profile_track_geometries` | high | 9 |
| `erc.footprint_filter` | high | 43 |
| `erc.footprint_link_issues` | medium | 30 |
| `erc.four_way_junction` | high | 43 |
| `erc.kicad` | high | 5 |
| `erc.label_dangling` | high | 30 |
| `erc.simulation_model_issue` | high | 43 |
| `erc.single_global_label` | high | 43 |
| `manifest.project-discovery` | high | 12 |
| `manufacturing.fab-notes` | medium | 54 |
| `manufacturing.jobset-outputs` | medium | 1 |
| `manufacturing.layer-stackup` | medium | 2 |
| `release.changelog-present` | medium | 35 |
| `release.revision-set` | high | 2 |
| `release.version-format` | low | 2 |

## Remaining Finding Rationale

All 545 findings are associated with projects under `tests/fixtures/projects/`. The repository intentionally contains passing, incomplete, malformed, and violation-heavy KiCad fixtures so rules can be regression-tested against realistic inputs.

The manifest-level findings that point at `.` or `CHANGELOG.md` still carry a `project` value under `tests/fixtures/projects/`; they are fixture-context release and manufacturing checks, not findings against the BoardReadyOps source package itself.

Do not treat this self-validation run as a fabrication approval of the fixture boards. It proves that the shipped CLI can discover the repository's KiCad fixtures, run the rule pipeline with KiCad 10, emit JSON/SARIF/Markdown reports, and preserve expected findings for test evidence.
