import { describe, expect, it } from "vitest";

import { createCycloneDxBom } from "../../../scripts/generate-sbom.mjs";

describe("generate-sbom", () => {
  it("creates CycloneDX components from resolved direct pnpm dependencies", () => {
    const bom = createCycloneDxBom({
      packageJson: {
        name: "@example/hardware-review",
        version: "2.3.4",
        dependencies: {
          foo: "^1.0.0",
        },
        devDependencies: {
          "@scope/bar": "^2.0.0",
        },
      },
      lockfile: {
        importers: {
          ".": {
            dependencies: {
              foo: {
                specifier: "^1.0.0",
                version: "1.2.3",
              },
            },
            devDependencies: {
              "@scope/bar": {
                specifier: "^2.0.0",
                version: "2.0.0(peer@1.0.0)",
              },
            },
          },
        },
      },
      timestamp: "2026-05-19T16:00:00.000Z",
      serialNumber: "urn:uuid:00000000-0000-4000-8000-000000000000",
    });

    expect(bom).toMatchObject({
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      metadata: {
        timestamp: "2026-05-19T16:00:00.000Z",
        component: {
          type: "application",
          group: "example",
          name: "hardware-review",
          version: "2.3.4",
          "bom-ref": "pkg:npm/%40example/hardware-review@2.3.4",
        },
      },
    });
    expect(bom.components).toEqual([
      {
        type: "library",
        name: "foo",
        version: "1.2.3",
        scope: "required",
        purl: "pkg:npm/foo@1.2.3",
        "bom-ref": "pkg:npm/foo@1.2.3",
      },
      {
        type: "library",
        group: "scope",
        name: "bar",
        version: "2.0.0",
        scope: "optional",
        purl: "pkg:npm/%40scope/bar@2.0.0",
        "bom-ref": "pkg:npm/%40scope/bar@2.0.0",
      },
    ]);
    expect(bom.dependencies).toContainEqual({
      ref: "pkg:npm/%40example/hardware-review@2.3.4",
      dependsOn: ["pkg:npm/foo@1.2.3", "pkg:npm/%40scope/bar@2.0.0"],
    });
  });

  it("includes transitive pnpm lockfile packages and dependency edges", () => {
    const bom = createCycloneDxBom({
      packageJson: {
        name: "hardware-review",
        version: "1.0.0",
      },
      lockfile: {
        importers: {
          ".": {
            dependencies: {
              foo: {
                specifier: "^1.0.0",
                version: "1.0.0",
              },
            },
          },
        },
        packages: {
          "foo@1.0.0": {
            resolution: {
              integrity: "sha512-foo",
            },
          },
          "bar@2.0.0": {
            resolution: {
              integrity: "sha512-bar",
            },
          },
          "baz@3.0.0": {
            resolution: {
              integrity: "sha512-baz",
            },
          },
        },
        snapshots: {
          "foo@1.0.0": {
            dependencies: {
              bar: "2.0.0",
            },
          },
          "bar@2.0.0": {
            dependencies: {
              baz: "3.0.0",
            },
          },
          "baz@3.0.0": {},
        },
      },
      timestamp: "2026-05-19T16:00:00.000Z",
      serialNumber: "urn:uuid:00000000-0000-4000-8000-000000000000",
    });

    expect(bom.components.map((component) => component["bom-ref"])).toEqual([
      "pkg:npm/foo@1.0.0",
      "pkg:npm/bar@2.0.0",
      "pkg:npm/baz@3.0.0",
    ]);
    expect(bom.dependencies).toContainEqual({
      ref: "pkg:npm/hardware-review@1.0.0",
      dependsOn: ["pkg:npm/foo@1.0.0"],
    });
    expect(bom.dependencies).toContainEqual({
      ref: "pkg:npm/foo@1.0.0",
      dependsOn: ["pkg:npm/bar@2.0.0"],
    });
    expect(bom.dependencies).toContainEqual({
      ref: "pkg:npm/bar@2.0.0",
      dependsOn: ["pkg:npm/baz@3.0.0"],
    });
  });

  it("resolves dependency edges from peer-qualified snapshot keys", () => {
    const bom = createCycloneDxBom({
      packageJson: {
        name: "hardware-review",
        version: "1.0.0",
      },
      lockfile: {
        importers: {
          ".": {
            dependencies: {
              cosmiconfig: {
                specifier: "^9.0.0",
                version: "9.0.1(typescript@6.0.3)",
              },
            },
          },
        },
        packages: {
          "cosmiconfig@9.0.1": {
            resolution: {
              integrity: "sha512-cosmiconfig",
            },
          },
          "typescript@6.0.3": {
            resolution: {
              integrity: "sha512-typescript",
            },
          },
        },
        snapshots: {
          "cosmiconfig@9.0.1(typescript@6.0.3)": {
            dependencies: {
              typescript: "6.0.3",
            },
          },
          "typescript@6.0.3": {},
        },
      },
      timestamp: "2026-05-19T16:00:00.000Z",
      serialNumber: "urn:uuid:00000000-0000-4000-8000-000000000000",
    });

    expect(bom.dependencies).toContainEqual({
      ref: "pkg:npm/cosmiconfig@9.0.1",
      dependsOn: ["pkg:npm/typescript@6.0.3"],
    });
  });
});
