# Markdown

Markdown output is suitable for job summaries and PR comments.

When Markdown is emitted by the CLI, section titles and table labels honor `BOARDREADY_LOCALE` or `LANG`. Use `BOARDREADY_LOCALE=tr` for Turkish labels:

Linux and macOS:

```sh
BOARDREADY_LOCALE=tr boardreadyops run . --markdown -
```

Windows 11 PowerShell:

```powershell
$env:BOARDREADY_LOCALE = "tr"
boardreadyops run . --markdown -
Remove-Item Env:\BOARDREADY_LOCALE
```

Finding messages, rule IDs, resource paths, and machine-readable JSON/SARIF/JUnit reports remain English and stable for automation.
