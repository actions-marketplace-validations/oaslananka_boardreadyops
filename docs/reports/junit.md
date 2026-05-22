# JUnit Reports

The JUnit report emitter converts findings into test cases for CI systems that consume XML test reports. Findings with `info` severity are emitted as successful test cases; all other severities are emitted as `<failure>` elements.

Failure element bodies are XML-escaped JSON. They preserve the finding `details` fields at the top level and include a `fix` property when remediation metadata is available, so downstream integrations can parse diagnostics and remediation from the same body.

JUnit XML is an internal report formatter used by tests and downstream integrations that call the report module directly. The supported CLI and GitHub Action output files are JSON, SARIF, and Markdown. The JSON report remains the canonical machine format.
