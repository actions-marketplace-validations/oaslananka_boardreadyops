# Multi-project Workspaces

BoardReadyOps discovers every `.kicad_pro` under the workspace root by default. That allows a hardware monorepo to keep firmware, tooling, and multiple KiCad projects together while a single run reports project-attributed findings.

Built-in discovery skips generated and dependency folders such as `node_modules/`, `.git/`, `dist/`, and `coverage/`.

## Configure Project Overrides

Project entries match either a project directory or a `.kicad_pro` path. They layer project-local settings over the workspace config for that project only.

```yaml
version: 1
rules:
  manufacturing.outputs-present:
    required: [gerber, drill]
projects:
  - path: hardware/mainboard
    rules:
      manufacturing.outputs-present:
        severity: critical
  - path: hardware/prototype
    mode: warn
    bom: hardware/prototype/bom/prototype.csv
fail-on: high
```

The mainboard override does not affect prototype findings. BOM, pinmap, variant, mode, and rule settings stay scoped to the matched project context while global settings remain available as defaults.

## Filter One Project

Use `--project` when a local edit or CI job should check one board from a larger workspace.

```bash
boardreadyops run . --project hardware/mainboard
boardreadyops check manufacturing.outputs-present . --project hardware/mainboard
boardreadyops run . --project hardware/mainboard/mainboard.kicad_pro
```

Directory filters discover every `.kicad_pro` below that directory. File filters run exactly the referenced project path.

## Bound Concurrent Work

BoardReadyOps checks project contexts concurrently. The default worker count follows the available CPU parallelism; `--concurrency` caps it for shared CI runners or especially expensive KiCad-backed checks.

```bash
boardreadyops run . --concurrency 2
```

Report ordering remains deterministic after concurrent execution.

## Read Project Attribution

JSON findings identify their owning project directly:

```json
{
  "ruleId": "release.revision-set",
  "project": "hardware/mainboard/mainboard.kicad_pro",
  "resource": {
    "path": "hardware/mainboard/mainboard.kicad_pcb",
    "kind": "pcb"
  }
}
```

Use `project` rather than guessing ownership from `resource.path` when aggregating findings across a monorepo.
