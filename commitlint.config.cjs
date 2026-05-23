module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "cli",
        "action",
        "mcp",
        "rules",
        "bom",
        "pinmap",
        "mfg",
        "release",
        "report",
        "kicad",
        "core",
        "adapters",
        "vendors",
        "docs",
        "ci",
        "deps",
      ],
    ],
  },
};
