# Security Policy

Report vulnerabilities through GitHub Security Advisories for `oaslananka/boardreadyops`:

<https://github.com/oaslananka/boardreadyops/security/advisories/new>

BoardReadyOps is read-only against KiCad design files. It does not require vendor credentials and does not call external supplier APIs in v1.

Never commit credentials, private keys, cookies, or token-bearing environment files. The CI configuration includes secret scanning and dependency audit gates.

## KiCad CLI Execution

BoardReadyOps invokes `kicad-cli` without a shell, bounds stdout and stderr collection, redacts control characters from subprocess output, and removes temporary report directories after DRC/ERC execution.

KiCad 10 variant names are passed as arguments, not interpolated into shell commands. Jobset support reads `.kicad_jobs` files and reports missing outputs; it does not modify KiCad project files.
