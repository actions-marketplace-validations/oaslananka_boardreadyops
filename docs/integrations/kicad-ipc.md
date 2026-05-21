# KiCad IPC API

BoardReadyOps detects whether `kicad-cli api-server` support is available in KiCad 10 or later.

The current integration is intentionally limited to capability detection. Rules continue to read project files and `kicad-cli` JSON reports directly, which keeps local and CI runs deterministic.
