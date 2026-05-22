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
    sha: "9210bcaea20bdc99f8cd26c6c4b62cbf4ad7983e",
    version: "v1.0.2",
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

## Inputs

| Name | Default | Description |
| --- | --- | --- |
${rows}

## Outputs

| Name | Description |
| --- | --- |
${outputs}
`;
await mkdir("docs", { recursive: true });
await writeFile("docs/action.md", content, "utf8");
