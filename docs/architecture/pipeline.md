# Pipeline

Discovery produces project contexts for every KiCad project under the workspace root unless an explicit project filter is present. The pipeline applies matching project-local config overrides and executes each project context through a bounded worker pool before combining normalized findings. Report emitters transform the same result object into JSON, SARIF, Markdown, annotations, or JUnit.
