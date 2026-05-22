import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "raw-mustache",
      transform(code, id) {
        if (!id.endsWith(".mustache")) {
          return;
        }
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      },
    },
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/{core,rules,bom,pinmap,report,kicad}/**/*.ts", "src/action/inputs.ts"],
      exclude: [
        "src/report/templates/**",
        "src/**/types.ts",
        "src/core/context.ts",
        "src/core/result.ts",
        "src/core/errors.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
        "src/core/**": {
          lines: 97,
          branches: 93,
          functions: 97,
          statements: 97,
        },
        "src/rules/**": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/bom/**": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/pinmap/**": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/report/**": {
          lines: 95,
          branches: 90,
          functions: 95,
          statements: 95,
        },
        "src/kicad/**": {
          lines: 90,
          branches: 85,
          functions: 90,
          statements: 90,
        },
      },
    },
  },
});
