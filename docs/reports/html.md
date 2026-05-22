# HTML Reports

The HTML report emitter writes a standalone browser file for sharing BoardReadyOps results outside CI log views. It has no external assets or network dependencies: CSS and filtering JavaScript are embedded in the generated file.

Enable it from `boardreadyops.yml`:

```yaml
version: 1
report:
  html: build/boardreadyops.report.html
```

The report contains:

- Summary counts by severity.
- Per-project finding totals.
- Per-rule finding totals.
- A filterable findings table with severity, rule, and project filters.
- Expandable finding details with message, resource, location, fix steps, context, and references.

The generated markup is intended to be readable in browsers, valid under `html-validate:recommended`, usable with assistive technology, and printable with a simplified stylesheet.
