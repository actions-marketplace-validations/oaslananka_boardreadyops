import { mkdir, readFile, writeFile } from "node:fs/promises";
import yaml from "js-yaml";

const action = yaml.load(await readFile("action.yml", "utf8"));
const rows = Object.entries(action.inputs ?? {})
  .map(([name, input]) => `| \`${name}\` | \`${input.default ?? ""}\` | ${input.description ?? ""} |`)
  .join("\n");
const outputs = Object.entries(action.outputs ?? {})
  .map(([name, output]) => `| \`${name}\` | ${output.description ?? ""} |`)
  .join("\n");

const ACTION_EXAMPLE_STEPS = [
  {
    action: "actions/checkout",
    sha: "de0fac2e4500dabe0009e67214ff5f5447ce83dd",
    version: "v6.0.2",
  },
  {
    action: "oaslananka/boardreadyops",
    sha: "4efcd6d73e2e0de15a39c745b1a67e6c7a4f9ce0",
    version: "current action contract",
  },
];
const pinnedActionExample = ACTION_EXAMPLE_STEPS.map(
  ({ action, sha, version }) => `      - uses: ${action}@${sha} # ${version}`,
).join("\n");

const content = `# GitHub Action

\`\`\`yaml
name: BoardReadyOps

on:
  pull_request:
  push:
    branches: [main]

jobs:
  boardreadyops:
    runs-on: ubuntu-latest
    steps:
${pinnedActionExample}
        with:
          config: boardreadyops.yml
\`\`\`

This example pins the current main Action commit because the input table below
is generated from the repository's current \`action.yml\`. The public
\`v1.0.2\` tag remains smoke-tested in the release channel matrix but does not
include every current input.

## Inputs

| Name | Default | Description |
| --- | --- | --- |
${rows}

## Outputs

| Name | Description |
| --- | --- |
${outputs}

## Pull request comments

When \`comment-pr\` is enabled, the sticky pull request comment summarizes the current findings. If the Action can read a previous BoardReadyOps JSON artifact from the pull request head branch or base branch, the comment also includes a fabrication diff for BOM rows, manufacturing outputs, and newly added findings.

## Notifiers

The Action honors the repository \`notifiers\` configuration from \`boardreadyops.yml\`. Webhook URLs, Telegram bot tokens, and SMTP credentials must be supplied through workflow environment variables or secrets referenced by the configured \`webhookEnv\`, \`botTokenEnv\`, or \`smtpEnv\` names. Delivery is best-effort: missing credentials, severity filters, and notifier failures do not change the Action exit code. Action notifications include a link to the current workflow run when GitHub exposes the run metadata.
`;
await mkdir("docs", { recursive: true });
await writeFile("docs/action.md", content, "utf8");
