# AGENTS.md

## Responsibility

BOM modules load and normalize CSV, TSV, and KiCad-exported rows into canonical BOM records used by BOM rules.

## Interface Upward

- Loader: `loadBom`
- Normalizer: `normalizeBomRows`
- Types: `BomRow`

## Rules

- Header normalization is data parsing, not rule logic.
- DNP, MPN, supplier, lifecycle, and footprint columns should preserve source values in `details` when a rule reports them.
- Keep parsing tolerant of missing optional columns and strict about malformed row structures that would hide a finding.
