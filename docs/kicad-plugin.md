# KiCad Plugin

BoardReadyOps ships a KiCad Plugin and Content Manager (PCM) package under
`kicad-plugin/`. The plugin runs the local `boardreadyops` CLI from the PCB
editor, reads the JSON report, and shows a findings dialog with severity badges,
board coordinates when findings include them, fix steps, and reference links.

The PCM package exists in the repository on `main`. It is not present in the
public `boardreadyops@1.0.2` npm tarball or the `v1.0.2` GitHub tag archive, and
it has not been published through KiCad PCM. Track public package parity in
[BOARD-65](https://linear.app/oaslananka/issue/BOARD-65/completion-follow-up-publish-package-parity-release-for-docs-node-22).

The package follows KiCad PCM schema v2:

```text
kicad-plugin/
  metadata.json
  plugins/
    __init__.py
    boardreadyops_plugin.py
  resources/
    icon.png
```

## Runtime Requirements

- KiCad 9 or later with PCB editor Python plugin support.
- The `boardreadyops` CLI on `PATH`, or `BOARDREADYOPS_BIN` pointing to the
  executable command.
- The active board should have a matching `.kicad_pro` file next to the
  `.kicad_pcb` file. If the board stem does not match, the plugin uses the only
  `.kicad_pro` file in the board directory.

KiCad currently exposes `pcbnew.ActionPlugin` through the SWIG Python bindings.
Those bindings are deprecated by KiCad in favor of the IPC API, but BOARD-43
requires an editor ActionPlugin. The plugin keeps the SWIG layer thin and
continues to run BoardReadyOps through the stable CLI boundary. Future KiCad IPC
work should move editor integration behind the IPC API when KiCad provides an
equivalent packaged editor entry point.

## Command

When invoked from KiCad, the plugin executes the process shape below. The
angle-bracket values are runtime paths supplied by KiCad and the plugin, not
literal shell text.

```sh
boardreadyops run <project-directory> --project <active.kicad_pro> --json <temporary-json-report> --sarif "" --markdown "" --fail-on never --no-annotations --log-level silent
```

The JSON target is a temporary file owned by the plugin. This keeps the dialog
parser isolated from any configured report formats that write to stdout.

Set `BOARDREADYOPS_BIN` when the command is not already available on `PATH`:

Linux and macOS:

```sh
export BOARDREADYOPS_BIN="node /absolute/path/to/boardreadyops/dist/cli/index.cjs"
```

Windows 11 PowerShell:

```powershell
$env:BOARDREADYOPS_BIN = "node C:\tools\boardreadyops\dist\cli\index.cjs"
```

On Windows, unquoted drive paths are preserved, so commands such as
`node C:\tools\boardreadyops\dist\cli\index.cjs` are accepted. The plugin
waits up to 300 seconds for the CLI process before surfacing a timeout error in
the KiCad dialog.

## Manual Smoke Test

1. Build the CLI bundle:

   ```sh
   corepack pnpm run build
   ```

2. Point the plugin at the local CLI bundle:

   ```sh
   export BOARDREADYOPS_BIN="node $PWD/dist/cli/index.cjs"
   ```

   On Windows 11 PowerShell, use:

   ```powershell
   $env:BOARDREADYOPS_BIN = "node $PWD\dist\cli\index.cjs"
   ```

3. Create a PCM archive from the package root:

   ```sh
   cd kicad-plugin
   zip -r ../boardreadyops-kicad-plugin.zip metadata.json plugins resources -x "*/__pycache__/*"
   cd ..
   ```

4. Install the archive through KiCad's Plugin and Content Manager, or unpack it
   into a KiCad third-party plugin directory for local testing.

5. Open a `.kicad_pcb` file in the KiCad PCB editor.

6. Run `BoardReadyOps` from the external plugins menu.

7. Confirm the dialog lists the same findings as the equivalent CLI command.
   Replace the angle-bracket values with the active project paths:

   ```sh
   boardreadyops run <project-directory> --project <active.kicad_pro> --json - --sarif "" --markdown "" --fail-on never --no-annotations --log-level silent
   ```

8. For a fixture with board-coordinate findings, confirm the dialog includes the
   coordinate line, for example `x=12.5 mm, y=7.25 mm, layer=F.Cu`.

Marker placement on the PCB is intentionally not automatic in this version.
Coordinate-backed findings are rendered in the dialog without mutating the board
file or depending on KiCad SWIG marker APIs that vary across major versions.

## PCM Submission Checklist

The repository package is PCM-publishable, but this change does not submit or
publish it. Before submitting to the KiCad PCM repository, produce a release
archive and fill the release-specific version fields required by the repository,
including `download_url`, `download_sha256`, `download_size`, and
`install_size`.
