export interface CycloneDxPackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface PnpmImporterDependency {
  specifier?: string;
  version?: string;
}

export interface PnpmLockfile {
  importers?: {
    "."?: {
      dependencies?: Record<string, PnpmImporterDependency | string>;
      devDependencies?: Record<string, PnpmImporterDependency | string>;
      optionalDependencies?: Record<string, PnpmImporterDependency | string>;
    };
  };
  packages?: Record<
    string,
    {
      resolution?: {
        integrity?: string;
      };
    }
  >;
  snapshots?: Record<
    string,
    {
      dependencies?: Record<string, PnpmImporterDependency | string>;
      optionalDependencies?: Record<string, PnpmImporterDependency | string>;
    }
  >;
}

export interface CycloneDxComponent {
  type: "application" | "library";
  group?: string;
  name: string;
  version: string;
  scope?: "required" | "optional";
  purl: string;
  "bom-ref": string;
}

export interface CycloneDxBom {
  bomFormat: "CycloneDX";
  specVersion: "1.6";
  serialNumber: string;
  version: 1;
  metadata: {
    timestamp: string;
    tools: {
      components: Array<{
        type: "application";
        name: string;
        version: string;
      }>;
    };
    component: CycloneDxComponent;
  };
  components: CycloneDxComponent[];
  dependencies: Array<{
    ref: string;
    dependsOn: string[];
  }>;
}

export function main(root?: string): Promise<void>;

export function createCycloneDxBom(input: {
  packageJson: CycloneDxPackageJson;
  lockfile: PnpmLockfile;
  timestamp: string;
  serialNumber: string;
}): CycloneDxBom;
