import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearRulesForTests, listRules } from "../../../src/core/rule-registry.js";
import { registerBuiltInRules, resetBuiltInRuleRegistrationForTests } from "../../../src/rules/_index.js";

const supportedKiCadVersions = new Set(["9", "10", "future"]);

describe("built-in rule metadata", () => {
  beforeEach(resetRuleRegistry);
  afterEach(resetRuleRegistry);

  it("keeps every registered rule complete for docs and automation", () => {
    registerBuiltInRules();

    const rules = listRules();
    expect(rules.length).toBeGreaterThan(0);

    for (const { meta } of rules) {
      expect(meta.description, `${meta.id} description`).toEqual(expect.any(String));
      expect(meta.description.trim(), `${meta.id} description`).not.toBe("");
      expect(meta.rationale, `${meta.id} rationale`).toEqual(expect.any(String));
      expect(meta.rationale.trim(), `${meta.id} rationale`).not.toBe("");
      expect(meta.appliesTo.length, `${meta.id} appliesTo`).toBeGreaterThan(0);
      expect(meta.configKeys.length, `${meta.id} configKeys`).toBeGreaterThan(0);

      expect(meta.kicadVersions, `${meta.id} kicadVersions`).toEqual(expect.any(Array));
      expect(meta.kicadVersions.length, `${meta.id} kicadVersions`).toBeGreaterThan(0);
      expect(
        meta.kicadVersions.every((version) => supportedKiCadVersions.has(version)),
        `${meta.id} kicadVersions`,
      ).toBe(true);

      expect(meta.tags, `${meta.id} tags`).toEqual(expect.any(Array));
      expect(meta.tags.length, `${meta.id} tags`).toBeGreaterThan(0);
      expect(
        meta.tags.every((tag) => tag.trim().length > 0),
        `${meta.id} tags`,
      ).toBe(true);
    }
  });
});

function resetRuleRegistry(): void {
  clearRulesForTests();
  resetBuiltInRuleRegistrationForTests();
}
