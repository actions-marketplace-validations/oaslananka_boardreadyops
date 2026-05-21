import { describe, expect, it } from "vitest";
import { runPipeline } from "../../../../src/core/pipeline.js";
import { copyFixture, emptyFailingKicadCli, expectRule, fakeKicadCli } from "../helpers.js";

describe("erc.kicad", () => {
  it("normalizes KiCad ERC diagnostics into stable findings", async () => {
    const fixture = await copyFixture("safe-basic", true);
    const cli = await fakeKicadCli(fixture);
    const result = await runPipeline({ path: fixture, kicadCli: cli, rules: ["erc.kicad"], failOn: "never" });
    const findings = expectRule(result, "erc.unconnected_pin", 1);
    expect(findings[0]?.resource.kind).toBe("schematic");
    expect(findings[0]?.severity).toBe("medium");
  });

  it("applies KiCad ERC severity overrides and reports command failures without diagnostics", async () => {
    const fixture = await copyFixture("safe-basic", true);
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(
        `${fixture}/boardreadyops.yml`,
        "version: 1\nrules:\n  erc:\n    severity-overrides:\n      unconnected_pin: low\n",
        "utf8",
      ),
    );
    const cli = await fakeKicadCli(fixture);
    const overridden = await runPipeline({ path: fixture, kicadCli: cli, rules: ["erc.kicad"], failOn: "never" });
    expect(overridden.findings.find((finding) => finding.ruleId === "erc.unconnected_pin")?.severity).toBe("low");

    const emptyCli = await emptyFailingKicadCli(fixture);
    const failed = await runPipeline({ path: fixture, kicadCli: emptyCli, rules: ["erc.kicad"], failOn: "never" });
    expectRule(failed, "erc.kicad", 1);
  });
});
