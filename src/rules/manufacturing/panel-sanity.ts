import { configFor, configuredSeverity, finding, rule, shouldRun } from "../helpers.js";

export const panelSanityRule = rule(
  {
    id: "manufacturing.panel-sanity",
    title: "Panelization output is missing",
    defaultSeverity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.manufacturing.panel-sanity.panelized"],
  },
  async (context) => {
    if (!shouldRun(context, "manufacturing.panel-sanity")) {
      return [];
    }
    const config = configFor(context, "manufacturing.panel-sanity");
    if (config.panelized !== true) {
      return [];
    }
    return [
      finding(context, {
        ruleId: "manufacturing.panel-sanity",
        severity: configuredSeverity(context, "manufacturing.panel-sanity", "medium"),
        message: "Panelization is configured but no panel output was declared.",
        path: ".",
        kind: "manifest",
      }),
    ];
  },
);
