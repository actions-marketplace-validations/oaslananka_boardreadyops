# Writing Rules

Add a rule module, register it in `src/rules/_index.ts`, add unit coverage, add docs, and ensure the rule emits normalized findings.

## Variant-Aware Rules

KiCad 10 variants are available through project files and `projects[].variants` configuration. Use `parseVariants` from `src/kicad/variants.ts` when a rule must compare variant DNP overrides with BOM or schematic state.

CLI and Action callers can select an active KiCad variant with `--variant` or the `variant` action input. BoardReadyOps uses that value for variant-aware rules; KiCad 10 DRC and ERC do not expose a `--variant` option in `kicad-cli`.

## Jobset-Aware Rules

Use `parseJobset` from `src/kicad/jobset.ts` to read `.kicad_jobset` files. A jobset-aware manufacturing rule should skip cleanly when no jobset file is present and report missing enabled outputs with `resource.kind = "manifest"`.
