# Threat Model

BoardReadyOps reads local design, BOM, pinmap, and manufacturing files. It writes report artifacts. It does not edit KiCad files, does not use vendor accounts, and does not require persistent service credentials.

Trust boundaries:

- Repository files are untrusted input.
- `kicad-cli` is an external executable and is invoked with bounded process output.
- GitHub token permissions are limited to artifact upload, SARIF upload, and PR comments when enabled.
