# Markdown

Markdown output is suitable for job summaries and PR comments.

When Markdown is emitted by the CLI, section titles and table labels honor `BOARDREADY_LOCALE` or `LANG`. Use `BOARDREADY_LOCALE=tr` for Turkish labels:

```sh
BOARDREADY_LOCALE=tr boardreadyops run . --markdown -
```

Finding messages, rule IDs, resource paths, and machine-readable JSON/SARIF/JUnit reports remain English and stable for automation.
