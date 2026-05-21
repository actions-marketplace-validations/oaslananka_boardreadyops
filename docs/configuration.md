# Configuration

The primary configuration file is `boardreadyops.yml`. The loader also accepts `.boardreadyops.yml` and `boardreadyops.yaml` for repository conventions that already use those forms.

```yaml
version: 1
mode: warn
projects:
  - path: .
rules:
  bom.missing-mpn:
    enabled: true
fail-on: high
```
