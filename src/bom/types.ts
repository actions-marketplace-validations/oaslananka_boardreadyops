export interface BomRow {
  reference: string;
  value?: string | undefined;
  footprint?: string | undefined;
  manufacturer?: string | undefined;
  mpn?: string | undefined;
  suppliers?: string[] | undefined;
  lifecycle?: string | undefined;
  dnp?: boolean | undefined;
  sourcePath: string;
  sourceKind: "bom" | "schematic";
  line?: number | undefined;
  raw?: Record<string, string> | undefined;
  groupedReferences?: string[] | undefined;
  quantity?: number | undefined;
}
