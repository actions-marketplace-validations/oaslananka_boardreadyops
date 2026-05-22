# Debugging

Run `boardreadyops doctor` to inspect runtime, KiCad, repository, adapter, suppression, and workflow diagnostics before a full pipeline run. Use `boardreadyops doctor --format json` for structured output and `boardreadyops doctor --check <name>` to isolate one diagnostic section. The workflow diagnostic reads `.github/workflows/boardreadyops.yml` or `.github/workflows/boardreadyops.yaml` as YAML, so comments are ignored and unreadable workflow files are reported as warnings.
