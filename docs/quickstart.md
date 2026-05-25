# Quickstart

```bash
npm i -g boardreadyops
boardreadyops --help
boardreadyops init
boardreadyops check . --fail-on never
```

Run the first scan inside a KiCad project directory. `--fail-on never` keeps the
initial smoke run non-blocking while still writing JSON, SARIF, and Markdown
reports. Remove it, or set `fail-on: high` in `boardreadyops.yml`, when the
repository is ready to enforce fabrication findings in CI.
