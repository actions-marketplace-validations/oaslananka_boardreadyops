import { definePlugin } from "@boardreadyops/plugin-sdk";

export default definePlugin({
  name: "boardreadyops-plugin-custom-rule",
  version: "1.0.0",
  rules: [
    {
      meta: {
        id: "plugin.hello-world",
        title: "Plugin hello world",
        description: "Demonstrates a third-party rule plugin.",
        rationale: "Plugin authors need a minimal rule that can be loaded and executed end-to-end.",
        defaultSeverity: "info",
        appliesTo: ["project"],
        configKeys: [],
        kicadVersions: ["9", "10", "future"],
        tags: ["plugin", "example"],
      },
      async run(context) {
        return [
          {
            ruleId: "plugin.hello-world",
            severity: "info",
            message: "Hello from a BoardReadyOps plugin.",
            project: context.projects[0]?.projectFile,
            resource: {
              path: context.projects[0]?.projectFile ?? ".",
              kind: "project",
            },
            confidence: "definite",
          },
        ];
      },
    },
  ],
});
