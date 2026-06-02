import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  candidateChromeExecutables,
  collectHtmlFiles,
  formatPa11yFailures,
  pa11yOptions,
} from "../../../scripts/check-docs-a11y.mjs";

describe("check-docs-a11y", () => {
  it("collects generated HTML pages in stable order", async () => {
    const siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-docs-a11y-"));
    await fs.mkdir(path.join(siteDir, "reports", "html"), { recursive: true });
    await fs.mkdir(path.join(siteDir, "search"), { recursive: true });
    await fs.writeFile(path.join(siteDir, "reports", "html", "index.html"), "<!doctype html><title>HTML</title>");
    await fs.writeFile(path.join(siteDir, "index.html"), "<!doctype html><title>Home</title>");
    await fs.writeFile(path.join(siteDir, "search", "search_index.json"), "{}");

    await expect(collectHtmlFiles(siteDir)).resolves.toEqual([
      path.join(siteDir, "index.html"),
      path.join(siteDir, "reports", "html", "index.html"),
    ]);
  });

  it("formats pa11y failures with page-relative selectors", () => {
    const siteDir = path.join("tmp", "site");
    const page = path.join(siteDir, "reports", "html", "index.html");
    const output = formatPa11yFailures(siteDir, [
      {
        page,
        issues: [
          {
            code: "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
            context: "<a>Low contrast</a>",
            message: "This element has insufficient contrast.",
            selector: "main a",
            type: "error",
            typeCode: 1,
          },
        ],
      },
    ]);

    expect(output).toContain("reports/html/index.html");
    expect(output).toContain("main a");
    expect(output).toContain("This element has insufficient contrast.");
    expect(output).toContain("WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail");
  });

  it("uses WCAG 2 AA checks with axe and htmlcs runners", () => {
    expect(pa11yOptions).toMatchObject({
      includeNotices: false,
      includeWarnings: false,
      runners: ["axe", "htmlcs"],
      standard: "WCAG2AA",
    });
  });

  it("detects standard Windows browser install paths", () => {
    const candidates = candidateChromeExecutables({
      "ProgramFiles(x86)": "C:\\Program Files (x86)",
      CHROME_PATH: "D:\\Portable\\chrome.exe",
      LOCALAPPDATA: "C:\\Users\\Admin\\AppData\\Local",
      ProgramFiles: "C:\\Program Files",
    });

    expect(candidates).toContain("D:\\Portable\\chrome.exe");
    expect(candidates).toContain(path.join("C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"));
    expect(candidates).toContain(
      path.join("C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
    );
  });
});
