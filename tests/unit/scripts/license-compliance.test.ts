import { describe, expect, it } from "vitest";
import { renderNotice } from "../../../scripts/build-notice.mjs";
import { findLicensePolicyViolations } from "../../../scripts/check-licenses.mjs";

describe("license compliance scripts", () => {
  it("renders a deterministic NOTICE from pnpm license output", () => {
    const notice = renderNotice({
      "MIT OR Apache-2.0": [
        {
          name: "dual",
          versions: ["2.0.0", "1.0.0"],
          license: "MIT OR Apache-2.0",
          homepage: "https://example.test/dual",
          description: "Dual licensed package",
        },
      ],
      "Apache-2.0": [
        {
          name: "@scope/tool",
          versions: ["3.0.0"],
          license: "Apache-2.0",
          homepage: "https://example.test/tool",
          description: "Tooling",
        },
      ],
    });

    expect(notice).toContain("# BoardReadyOps Third-Party Notices");
    expect(notice).toContain("Generated from `pnpm licenses list --json`.");
    expect(notice).toContain("## Apache-2.0");
    expect(notice).toContain("- `@scope/tool@3.0.0`");
    expect(notice).toContain("## MIT OR Apache-2.0");
    expect(notice).toContain("- `dual@1.0.0`, `dual@2.0.0`");
    expect(notice).toContain("Container image redistributes KiCad under GPL terms.");
    expect(notice).toMatch(/[^\n]\n$/);
  });

  it("allows only the approved license policy for distributed dependencies", () => {
    expect(
      findLicensePolicyViolations({
        "(Apache-2.0 AND BSD-3-Clause)": [{ name: "combined", versions: ["1.0.0"] }],
        "(MIT OR GPL-2.0)": [{ name: "dual-choice", versions: ["1.0.0"] }],
        "GPL-3.0-or-later": [{ name: "copyleft-runtime", versions: ["1.0.0"] }],
        Unknown: [{ name: "mystery", versions: ["0.0.1"] }],
      }),
    ).toEqual([
      {
        license: "GPL-3.0-or-later",
        packages: ["copyleft-runtime@1.0.0"],
      },
      {
        license: "Unknown",
        packages: ["mystery@0.0.1"],
      },
    ]);
  });
});
