import { describe, expect, it } from "vitest";
import { resolveLocale, t } from "../../src/i18n/t.js";

describe("i18n catalog", () => {
  it("resolves the locale from BOARDREADY_LOCALE before LANG", () => {
    expect(resolveLocale({ BOARDREADY_LOCALE: "tr", LANG: "en_US.UTF-8" })).toBe("tr");
    expect(resolveLocale({ LANG: "tr_TR.UTF-8" })).toBe("tr");
    expect(resolveLocale({ BOARDREADY_LOCALE: "__PSEUDO__" })).toBe("__PSEUDO__");
    expect(resolveLocale({ BOARDREADY_LOCALE: "de", LANG: "de_DE.UTF-8" })).toBe("en");
  });

  it("translates known keys and interpolates parameters", () => {
    expect(t("cli.init.created", {}, "tr")).toBe("boardreadyops.yml oluşturuldu");
    expect(t("doctor.runtime.node", { version: "v22.0.0", majors: "22, 24" }, "tr")).toBe(
      "Node: v22.0.0 (desteklenen ana sürümler: 22, 24)",
    );
    expect(t("report.finding.count", { count: 2 }, "en")).toBe("2 findings");
  });

  it("provides a pseudo locale for hard-coded string smoke tests", () => {
    expect(t("report.findings", {}, "__PSEUDO__")).toBe("[[Findings]]");
    expect(t("report.finding.count", { count: 1 }, "__PSEUDO__")).toBe("[[1 finding]]");
  });
});
