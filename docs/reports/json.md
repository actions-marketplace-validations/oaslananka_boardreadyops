# JSON

The JSON report contains `schemaVersion`, `tool`, `summary`, `projects`, `findings`, `fabrication`, and `generatedAt`.

Findings emitted for a KiCad project include `project`, the owning `.kicad_pro` path relative to the workspace root. Consumers can group findings by that field without inferring ownership from a PCB, schematic, BOM, or manifest resource path.

Fabrication snapshots keep BOM source paths so pull request diffs can distinguish the same reference designator across configured projects.
