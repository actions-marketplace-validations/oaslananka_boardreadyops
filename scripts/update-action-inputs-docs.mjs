import { mkdir, readFile, writeFile } from "node:fs/promises";
import yaml from "js-yaml";

const action = yaml.load(await readFile("action.yml", "utf8"));
const rows = Object.entries(action.inputs ?? {})
  .map(([name, input]) => `| \`${name}\` | \`${input.default ?? ""}\` | ${input.description ?? ""} |`)
  .join("\n");
const outputs = Object.entries(action.outputs ?? {})
  .map(([name, output]) => `| \`${name}\` | ${output.description ?? ""} |`)
  .join("\n");
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
      - uses: actions/checkout@v6
      - uses: oaslananka/boardreadyops@v1
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
