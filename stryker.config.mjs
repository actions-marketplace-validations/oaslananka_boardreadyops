/** @type {import("@stryker-mutator/core").PartialStrykerOptions} */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "vitest.config.ts",
  },
  testFiles: ["tests/unit/**/*.test.ts", "tests/property/**/*.test.ts", "tests/snapshot/**/*.test.ts"],
  mutate: [
    "src/kicad/jobset.ts",
    "src/kicad/variants.ts",
    "src/rules/bom/lifecycle.ts",
    "src/rules/bom/variant-consistency.ts",
    "src/rules/design/**/*.ts",
    "src/rules/manufacturing/jobset-outputs.ts",
    "src/rules/manufacturing/layer-stackup.ts",
    "src/rules/pinmap/net-label.ts",
    "src/rules/pinmap/shared.ts",
    "src/rules/release/version-format.ts",
    "!src/**/*.d.ts",
    "!src/**/types.ts",
    "!src/generated/**",
  ],
  thresholds: {
    high: 80,
    low: 70,
    break: 60,
  },
  reporters: ["html", "clear-text", "json"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/report.json",
  },
  coverageAnalysis: "perTest",
  ignoreStatic: true,
  timeoutMS: 10000,
  concurrency: 4,
};
