import type { FabricationSnapshot } from "../core/diff/fabrication.js";
import type { RunResult } from "../core/result.js";

interface CycloneDxOrganizationalEntity {
  name: string;
}

interface CycloneDxProperty {
  name: string;
  value: string;
}

interface CycloneDxExternalReference {
  type: "distribution" | "documentation" | "website";
  url: string;
}

interface CycloneDxHbomComponent {
  type: "device";
  name: string;
  version?: string | undefined;
  "bom-ref": string;
  manufacturer?: CycloneDxOrganizationalEntity | undefined;
  supplier?: CycloneDxOrganizationalEntity | undefined;
  purl?: string | undefined;
  externalReferences?: CycloneDxExternalReference[] | undefined;
  properties: CycloneDxProperty[];
}

export interface CycloneDxHbom {
  $schema: "https://cyclonedx.org/schema/bom-1.7.schema.json";
  bomFormat: "CycloneDX";
  specVersion: "1.7";
  version: 1;
  metadata: {
    timestamp: string;
    tools: {
      components: [
        {
          type: "application";
          name: "boardreadyops";
          version: string;
        },
      ];
    };
    component: {
      type: "device";
      name: string;
      "bom-ref": string;
    };
    properties: CycloneDxProperty[];
  };
  components: CycloneDxHbomComponent[];
  dependencies: Array<{
    ref: string;
    dependsOn: string[];
  }>;
}

type BomRow = FabricationSnapshot["bom"][number];

export function formatHbom(result: RunResult): string {
  return `${JSON.stringify(createHbom(result), null, 2)}\n`;
}

export function createHbom(result: RunResult): CycloneDxHbom {
  const rootRef = "boardreadyops:hardware";
  const components = result.fabrication.bom.map((row) => componentFromBomRow(row));
  return {
    $schema: "https://cyclonedx.org/schema/bom-1.7.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.7",
    version: 1,
    metadata: {
      timestamp: result.generatedAt,
      tools: {
        components: [
          {
            type: "application",
            name: result.tool.name,
            version: result.tool.version,
          },
        ],
      },
      component: {
        type: "device",
        name: hardwareName(result),
        "bom-ref": rootRef,
      },
      properties: [{ name: "boardreadyops:componentClass", value: "hardware" }],
    },
    components,
    dependencies: [
      {
        ref: rootRef,
        dependsOn: components.map((component) => component["bom-ref"]),
      },
    ],
  };
}

function componentFromBomRow(row: BomRow): CycloneDxHbomComponent {
  const component: CycloneDxHbomComponent = {
    type: "device",
    name: row.mpn ?? row.value ?? row.reference,
    "bom-ref": componentRef(row),
    properties: componentProperties(row),
  };
  if (row.value) {
    component.version = row.value;
  }
  if (row.manufacturer) {
    component.manufacturer = { name: row.manufacturer };
  }
  if (row.suppliers?.[0]) {
    component.supplier = { name: row.suppliers[0] };
  }
  const externalReferences = externalReferencesFromSuppliers(row.suppliers ?? []);
  if (externalReferences.length > 0) {
    component.externalReferences = externalReferences;
  }
  const purl = purlFromRow(row);
  if (purl) {
    component.purl = purl;
  }
  return component;
}

function componentProperties(row: BomRow): CycloneDxProperty[] {
  return [
    { name: "kicad:reference", value: row.reference },
    property("kicad:footprint", row.footprint),
    property("kicad:dnp", String(Boolean(row.dnp))),
    property("boardreadyops:mpn", row.mpn),
    property("boardreadyops:sourcePath", row.sourcePath),
    property("boardreadyops:lifecycle", row.lifecycle),
    property("boardreadyops:quantity", row.quantity === undefined ? undefined : String(row.quantity)),
    ...(row.suppliers ?? []).map((supplier) => property("boardreadyops:supplier", supplier)),
  ].filter((entry): entry is CycloneDxProperty => Boolean(entry));
}

function property(name: string, value: string | undefined): CycloneDxProperty | undefined {
  return value ? { name, value } : undefined;
}

function hardwareName(result: RunResult): string {
  if (result.projects.length === 1) {
    return stripProjectExtension(result.projects[0]?.projectFile ?? "hardware");
  }
  return "boardreadyops-hardware-workspace";
}

function stripProjectExtension(projectFile: string): string {
  return projectFile.replace(/\.kicad_pro$/i, "");
}

function componentRef(row: BomRow): string {
  return ["boardreadyops:component", sanitizeRef(row.sourcePath ?? "bom"), sanitizeRef(row.reference)].join(":");
}

function sanitizeRef(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replaceAll("/", ".");
}

function externalReferencesFromSuppliers(suppliers: string[]): CycloneDxExternalReference[] {
  return suppliers
    .filter((supplier) => /^https?:\/\//i.test(supplier))
    .map((url) => ({
      type: "distribution",
      url,
    }));
}

function purlFromRow(row: BomRow): string | undefined {
  if (!row.mpn || !row.manufacturer) {
    return undefined;
  }
  const namespace = encodeURIComponent(row.manufacturer);
  const name = encodeURIComponent(row.mpn);
  return `pkg:generic/${namespace}/${name}`;
}
