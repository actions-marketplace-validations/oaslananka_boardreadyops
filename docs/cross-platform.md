# Cross-platform Paths

BoardReadyOps treats project paths as repository data, not shell text. The CLI
resolves repository, config, project, BOM, pinmap, and report paths before rule
execution and invokes `kicad-cli` with argument arrays instead of interpolated
shell commands.

## Supported Scenarios

The regression suite covers these path classes on the operating systems where
the underlying filesystem supports them:

- paths with spaces;
- paths containing `#`, `&`, `%`, and `+`;
- Unicode-capable project paths;
- config paths with mixed `/` and `\` separators;
- root-relative config paths when the CLI is invoked from a nested directory;
- symlinked repository roots;
- long nested paths over 260 characters when the OS and filesystem allow them.

Windows-specific UNC and long-path behavior is exercised in the dedicated
cross-platform CI path suite. Unsupported filesystem features are skipped only
when the OS rejects the fixture setup itself.

## Resolution Rules

- CLI path arguments are resolved relative to the invocation directory.
- Paths inside `boardreadyops.yml` are resolved relative to the selected
  repository root, not the invocation directory.
- Report paths from config are written under the repository root.
- Mixed separators in config paths are normalized so a portable config can be
  shared across Linux, macOS, and Windows.
- Findings use repository-relative POSIX-style paths in reports.

## KiCad CLI Calls

BoardReadyOps invokes `kicad-cli` without a shell for native executables. On
Windows, `.cmd` and `.bat` shims are routed through `cmd.exe` with argument
escaping so metacharacters such as `&`, `%`, and `+` remain path text rather than
control syntax.

Subprocess output is size-limited and control characters are redacted before
being surfaced. Default CLI configuration errors display paths relative to the
repository root when possible, avoiding absolute workspace prefixes in routine
output.

## CI Coverage

The `ci / cross-platform-paths` job runs
`tests/integration/cross-platform-paths.test.ts` on:

- `ubuntu-latest`;
- `macos-latest`;
- `windows-2025-vs2026`.

The broader unit and integration suites still run independently. The focused
path suite exists so regressions in filesystem normalization, project discovery,
KiCad argument passing, and root-relative config behavior fail quickly on every
supported operating system.
