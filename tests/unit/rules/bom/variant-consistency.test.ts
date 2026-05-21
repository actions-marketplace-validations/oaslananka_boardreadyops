import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("bom.variant-consistency", () => {
  it("flags variant DNP overrides that still appear in the variant BOM", async () => {
    const root = await writeFixture({
      "variant.kicad_pro": JSON.stringify({ variants: [{ name: "production", dnpOverrides: ["R2"] }] }),
      "variant.kicad_sch": "(kicad_sch)",
      "variant.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "bom/prod.csv": "Reference,MPN,DNP\nR1,RES-1,\nR2,RES-2,\nR3,RES-3,yes\n",
      "boardreadyops.yml":
        "version: 1\nprojects:\n  - path: .\n    variants:\n      - name: production\n        bom: bom/prod.csv\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["bom.variant-consistency"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "bom.variant-consistency",
      severity: "high",
      message: "R2 is DNP in variant production but appears populated in its BOM.",
      resource: { kind: "bom", path: "bom/prod.csv" },
      location: { line: 3 },
      details: { variant: "production", reference: "R2" },
    });
  });

  it("skips configured variants that are absent from the KiCad project", async () => {
    const root = await writeFixture({
      "variant.kicad_pro": JSON.stringify({ variants: [{ name: "production", dnpOverrides: ["R2"] }] }),
      "variant.kicad_sch": "(kicad_sch)",
      "variant.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "bom/proto.csv": "Reference,MPN\nR2,RES-2\n",
      "boardreadyops.yml":
        "version: 1\nprojects:\n  - path: .\n    variants:\n      - name: prototype\n        bom: bom/proto.csv\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["bom.variant-consistency"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });

  it("limits checks to the selected active variant", async () => {
    const root = await writeFixture({
      "variant.kicad_pro": JSON.stringify({
        variants: [
          { name: "production", dnpOverrides: [] },
          { name: "prototype", dnpOverrides: ["R2"] },
        ],
      }),
      "variant.kicad_sch": "(kicad_sch)",
      "variant.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "bom/prod.csv": "Reference,MPN\nR1,RES-1\n",
      "bom/proto.csv": "Reference,MPN\nR2,RES-2\n",
      "boardreadyops.yml":
        "version: 1\nprojects:\n  - path: .\n    variants:\n      - name: production\n        bom: bom/prod.csv\n      - name: prototype\n        bom: bom/proto.csv\nfail-on: never\n",
    });

    const result = await runPipeline({
      path: root,
      rules: ["bom.variant-consistency"],
      variant: "production",
      failOn: "never",
    });

    expect(result.findings).toEqual([]);
  });

  it("matches configured project paths exactly", async () => {
    const root = await writeFixture({
      "board/board.kicad_pro": JSON.stringify({ variants: [{ name: "production", dnpOverrides: [] }] }),
      "board/board.kicad_sch": "(kicad_sch)",
      "board/board.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "board/prod.csv": "Reference,MPN\nR1,RES-1\n",
      "subboard/subboard.kicad_pro": JSON.stringify({ variants: [{ name: "production", dnpOverrides: ["R2"] }] }),
      "subboard/subboard.kicad_sch": "(kicad_sch)",
      "subboard/subboard.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "subboard/prod.csv": "Reference,MPN\nR2,RES-2\n",
      "boardreadyops.yml": `version: 1
projects:
  - path: board
    variants:
      - name: production
        bom: board/prod.csv
  - path: subboard
    variants:
      - name: production
        bom: subboard/prod.csv
fail-on: never
`,
    });

    const result = await runPipeline({
      path: root,
      project: "subboard",
      rules: ["bom.variant-consistency"],
      failOn: "never",
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "bom.variant-consistency",
      resource: { path: "subboard/prod.csv" },
      details: { variant: "production", reference: "R2" },
    });
  });

  it("uses the CLI BOM for a selected configured KiCad variant", async () => {
    const root = await writeFixture({
      "variant.kicad_pro": JSON.stringify({ variants: [{ name: "production", dnpOverrides: ["R2"] }] }),
      "variant.kicad_sch": "(kicad_sch)",
      "variant.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "bom/prod.csv": "Reference,MPN\nR2,RES-2\n",
      "boardreadyops.yml": "version: 1\nfail-on: never\n",
    });

    const result = await runPipeline({
      path: root,
      rules: ["bom.variant-consistency"],
      variant: "production",
      bom: "bom/prod.csv",
      failOn: "never",
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "bom.variant-consistency",
      resource: { path: "bom/prod.csv" },
      details: { variant: "production", reference: "R2" },
    });
  });
});
