module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["cli", "action", "rules", "bom", "pinmap", "mfg", "release", "report", "kicad", "core", "docs", "ci", "deps"],
    ],
  },
};
