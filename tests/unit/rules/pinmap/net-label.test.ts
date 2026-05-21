import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { writeFixture } from "../helpers.js";

describe("pinmap.net-label", () => {
  it("flags pinmap nets without matching schematic global labels", async () => {
    const root = await writeFixture({
      "pin.kicad_pro": "{}",
      "pin.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "pin.kicad_sch": '(kicad_sch (global_label "PRESENT"))',
      "pins.yml":
        "version: 1\npins:\n  - designator: U1\n    pin: '1'\n    net: PRESENT\n  - designator: U1\n    pin: '2'\n    net: ABSENT\n",
      "boardreadyops.yml": "version: 1\nprojects:\n  - path: .\n    pinmap: pins.yml\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["pinmap.net-label"], failOn: "never" });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      ruleId: "pinmap.net-label",
      severity: "medium",
      message: "Pinmap net ABSENT has no matching schematic net label.",
      resource: { kind: "pinmap", path: "pins.yml" },
      location: { line: 1 },
      details: { net: "ABSENT", entry: { designator: "U1", pin: "2", net: "ABSENT" } },
    });
  });

  it("does not duplicate missing-net findings when pinmap.verify also runs", async () => {
    const root = await writeFixture({
      "pin.kicad_pro": "{}",
      "pin.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "pin.kicad_sch": '(kicad_sch (global_label "PRESENT"))',
      "pins.yml": "version: 1\npins:\n  - designator: U1\n    pin: '2'\n    net: ABSENT\n",
      "boardreadyops.yml": "version: 1\nprojects:\n  - path: .\n    pinmap: pins.yml\nfail-on: never\n",
    });

    const result = await runPipeline({
      path: root,
      rules: ["pinmap.verify", "pinmap.net-label"],
      failOn: "never",
    });

    expect(result.findings.map((finding) => finding.ruleId)).toEqual(["pinmap.verify"]);
  });

  it("does not flag pinmap nets present as schematic global labels", async () => {
    const root = await writeFixture({
      "pin.kicad_pro": "{}",
      "pin.kicad_pcb": '(kicad_pcb (title_block (rev "v1.0")))',
      "pin.kicad_sch": '(kicad_sch (global_label "PRESENT"))',
      "pins.yml": "version: 1\npins:\n  - designator: U1\n    pin: '1'\n    net: PRESENT\n",
      "boardreadyops.yml": "version: 1\nprojects:\n  - path: .\n    pinmap: pins.yml\nfail-on: never\n",
    });

    const result = await runPipeline({ path: root, rules: ["pinmap.net-label"], failOn: "never" });

    expect(result.findings).toEqual([]);
  });
});
