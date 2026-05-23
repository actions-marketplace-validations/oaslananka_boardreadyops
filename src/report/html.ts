import type { Finding, Severity } from "../core/findings.js";
import type { RunResult } from "../core/result.js";
import { type Locale, t } from "../i18n/t.js";

const severities: Severity[] = ["critical", "high", "medium", "low", "info"];

export function formatHtml(result: RunResult, locale: Locale = "en"): string {
  const labels = htmlLabels(locale);
  const projectRows = projectBreakdown(result);
  const ruleRows = ruleBreakdown(result.findings);
  const filter = filterOptions(result.findings, locale);
  const visibleCount = t("report.finding.count", { count: result.findings.length }, locale);
  const lang = locale === "tr" ? "tr" : "en";
  const pluralScript =
    locale === "en"
      ? 'const plural = (count) => count === 1 ? "finding" : "findings";'
      : `const singularFinding = ${JSON.stringify(t("report.finding.word", {}, locale))};
    const pluralFinding = ${JSON.stringify(t("report.finding.word.plural", {}, locale))};
    const plural = (count) => count === 1 ? singularFinding : pluralFinding;`;
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(labels.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --background: #f7f9fb;
      --surface: #ffffff;
      --text: #1b2430;
      --muted: #566477;
      --border: #cfd7e2;
      --accent: #0b5cad;
      --critical: #b42318;
      --high: #b54708;
      --medium: #7a5c00;
      --low: #0f766e;
      --info: #175cd3;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    a {
      color: var(--accent);
    }

    header,
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
    }

    header {
      padding: 32px 0 16px;
    }

    h1,
    h2,
    h3 {
      margin: 0;
      line-height: 1.2;
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      margin: 32px 0 12px;
      font-size: 1.35rem;
    }

    h3 {
      margin: 16px 0 8px;
      font-size: 1rem;
    }

    .metadata {
      margin: 8px 0 0;
      color: var(--muted);
    }

    .summary-grid,
    .breakdown-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .metric,
    .panel {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      padding: 14px;
    }

    .metric strong {
      display: block;
      font-size: 1.8rem;
    }

    .metric span,
    .empty,
    .muted {
      color: var(--muted);
    }

    .filter-bar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      align-items: end;
      margin: 24px 0 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.96);
      padding: 12px;
      box-shadow: 0 6px 16px rgba(20, 31, 46, 0.08);
    }

    label {
      display: grid;
      gap: 4px;
      font-weight: 700;
    }

    select {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      color: var(--text);
      padding: 8px;
      font: inherit;
    }

    .count {
      align-self: center;
      color: var(--muted);
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      background: var(--surface);
    }

    caption {
      padding: 10px 0;
      text-align: left;
      font-weight: 700;
    }

    th,
    td {
      border-top: 1px solid var(--border);
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }

    thead th {
      border-top: 0;
      background: #eef3f8;
    }

    code {
      overflow-wrap: anywhere;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }

    .badge {
      display: inline-block;
      min-width: 72px;
      border-radius: 999px;
      padding: 2px 9px;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 800;
      text-align: center;
    }

    .severity-critical {
      background: var(--critical);
    }

    .severity-high {
      background: var(--high);
    }

    .severity-medium {
      background: var(--medium);
    }

    .severity-low {
      background: var(--low);
    }

    .severity-info {
      background: var(--info);
    }

    details {
      margin-top: 8px;
    }

    summary {
      cursor: pointer;
      font-weight: 700;
    }

    .detail-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: 10px;
    }

    ol,
    ul {
      margin: 6px 0 0;
      padding-left: 22px;
    }

    pre {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #f2f5f8;
      padding: 10px;
    }

    @media (max-width: 760px) {
      header,
      main {
        width: min(100% - 20px, 1180px);
      }

      table,
      thead,
      tbody,
      th,
      td,
      tr {
        display: block;
      }

      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      tr {
        border-top: 1px solid var(--border);
      }

      td {
        border-top: 0;
      }

      td::before {
        display: block;
        color: var(--muted);
        content: attr(data-label);
        font-size: 0.82rem;
        font-weight: 700;
      }
    }

    @media print {
      body {
        background: #ffffff;
      }

      .filter-bar {
        position: static;
        box-shadow: none;
      }

      select,
      script {
        display: none;
      }

      a {
        color: #000000;
        text-decoration: underline;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(labels.title)}</h1>
    <p class="metadata">${escapeHtml(
      t(
        "report.generatedMetadata",
        {
          date: result.generatedAt,
          tool: result.tool.name,
          version: result.tool.version,
          threshold: result.summary.failed ? labels.thresholdFailed : labels.thresholdPassed,
        },
        locale,
      ),
    )}</p>
  </header>
  <main>
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading">${escapeHtml(labels.summaryBySeverity)}</h2>
      <div class="summary-grid">
        ${summaryCards(result, locale)}
      </div>
    </section>

    <section aria-labelledby="project-heading">
      <h2 id="project-heading">${escapeHtml(labels.perProjectBreakdown)}</h2>
      <div class="breakdown-grid">
        ${projectRows.length > 0 ? projectRows.map((row) => renderProjectPanel(row, locale)).join("\n        ") : emptyPanel(labels.noProjects)}
      </div>
    </section>

    <section aria-labelledby="rule-heading">
      <h2 id="rule-heading">${escapeHtml(labels.perRuleGrouping)}</h2>
      ${
        ruleRows.length > 0
          ? `<table>
        <caption>${escapeHtml(labels.groupedByRule)}</caption>
        <thead>
          <tr><th scope="col">${escapeHtml(labels.rule)}</th><th scope="col">${escapeHtml(
            labels.total,
          )}</th><th scope="col">${escapeHtml(labels.severityCounts)}</th></tr>
        </thead>
        <tbody>
          ${ruleRows.map((row) => renderRuleRow(row, locale)).join("\n          ")}
        </tbody>
      </table>`
          : emptyPanel(labels.noRules)
      }
    </section>

    <section aria-labelledby="findings-heading">
      <h2 id="findings-heading">${escapeHtml(labels.findings)}</h2>
      <section class="filter-bar" aria-label="${attr(labels.filterFindings)}">
        <label>${escapeHtml(labels.severity)}
          <select id="severity-filter" data-filter="severity">
            <option value="">${escapeHtml(labels.allSeverities)}</option>
            ${filter.severities.map((severity) => `<option value="${attr(severity)}">${escapeHtml(severityLabel(severity, locale))}</option>`).join("\n            ")}
          </select>
        </label>
        <label>${escapeHtml(labels.rule)}
          <select id="rule-filter" data-filter="rule">
            <option value="">${escapeHtml(labels.allRules)}</option>
            ${filter.rules.map((rule) => `<option value="${attr(rule)}">${escapeHtml(rule)}</option>`).join("\n            ")}
          </select>
        </label>
        <label>${escapeHtml(labels.project)}
          <select id="project-filter" data-filter="project">
            <option value="">${escapeHtml(labels.allProjects)}</option>
            ${filter.projects.map((project) => `<option value="${attr(project)}">${escapeHtml(project)}</option>`).join("\n            ")}
          </select>
        </label>
        <output class="count" id="visible-count" aria-live="polite">${escapeHtml(visibleCount)}</output>
      </section>
      ${
        result.findings.length > 0
          ? `<table id="findings-table">
        <caption>${escapeHtml(labels.filterableFindingList)}</caption>
        <thead>
          <tr><th scope="col">${escapeHtml(labels.severity)}</th><th scope="col">${escapeHtml(
            labels.rule,
          )}</th><th scope="col">${escapeHtml(labels.project)}</th><th scope="col">${escapeHtml(
            labels.finding,
          )}</th></tr>
        </thead>
        <tbody>
          ${result.findings.map((finding) => renderFindingRow(finding, locale)).join("\n          ")}
        </tbody>
      </table>`
          : emptyPanel(labels.noFindings)
      }
    </section>
  </main>
  <script>
    "use strict";
    const filters = Array.from(document.querySelectorAll("[data-filter]"));
    const rows = Array.from(document.querySelectorAll("#findings-table tbody tr"));
    const counter = document.getElementById("visible-count");
    ${pluralScript}
    const applyFilters = () => {
      const active = Object.fromEntries(filters.map((filter) => [filter.dataset.filter, filter.value]));
      let visible = 0;
      for (const row of rows) {
        const matched = (!active.severity || row.dataset.severity === active.severity)
          && (!active.rule || row.dataset.rule === active.rule)
          && (!active.project || row.dataset.project === active.project);
        row.hidden = !matched;
        if (matched) {
          visible += 1;
        }
      }
      if (counter) {
        counter.value = visible + " " + plural(visible);
        counter.textContent = counter.value;
      }
    };
    for (const filter of filters) {
      filter.addEventListener("change", applyFilters);
    }
  </script>
</body>
</html>
`;
  return `${html.replace(/[ \t]+$/gm, "").trimEnd()}\n`;
}

function summaryCards(result: RunResult, locale: Locale): string {
  const metrics = [
    { label: t("report.total", {}, locale), count: result.summary.total },
    ...severities.map((severity) => ({ label: severityLabel(severity, locale), count: result.summary[severity] })),
  ];
  return metrics
    .map(
      (metric) => `<article class="metric">
          <strong>${metric.count}</strong>
          <span>${escapeHtml(metric.label)}</span>
        </article>`,
    )
    .join("\n        ");
}

interface Breakdown {
  label: string;
  total: number;
  counts: Record<Severity, number>;
}

function projectBreakdown(result: RunResult): Breakdown[] {
  const projects = new Map<string, Breakdown>();
  for (const project of result.projects) {
    projects.set(project.projectFile, emptyBreakdown(project.projectFile));
  }
  for (const finding of result.findings) {
    const label = finding.project ?? "Unassigned";
    const entry = projects.get(label) ?? emptyBreakdown(label);
    entry.total += 1;
    entry.counts[finding.severity] += 1;
    projects.set(label, entry);
  }
  return [...projects.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function ruleBreakdown(findings: Finding[]): Breakdown[] {
  const rules = new Map<string, Breakdown>();
  for (const finding of findings) {
    const entry = rules.get(finding.ruleId) ?? emptyBreakdown(finding.ruleId);
    entry.total += 1;
    entry.counts[finding.severity] += 1;
    rules.set(finding.ruleId, entry);
  }
  return [...rules.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function emptyBreakdown(label: string): Breakdown {
  return {
    label,
    total: 0,
    counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  };
}

function renderProjectPanel(project: Breakdown, locale: Locale): string {
  return `<article class="panel">
          <h3><code>${escapeHtml(project.label)}</code></h3>
          <p><strong>${project.total}</strong> ${escapeHtml(findingWord(project.total, locale))}</p>
          <p class="muted">${severityCounts(project, locale)}</p>
        </article>`;
}

function renderRuleRow(rule: Breakdown, locale: Locale): string {
  const labels = htmlLabels(locale);
  return `<tr>
            <td data-label="${attr(labels.rule)}"><code>${escapeHtml(rule.label)}</code></td>
            <td data-label="${attr(labels.total)}">${rule.total}</td>
            <td data-label="${attr(labels.severityCounts)}">${severityCounts(rule, locale)}</td>
          </tr>`;
}

function renderFindingRow(finding: Finding, locale: Locale): string {
  const labels = htmlLabels(locale);
  const project = finding.project ?? t("report.unassigned", {}, locale);
  return `<tr data-severity="${attr(finding.severity)}" data-rule="${attr(finding.ruleId)}" data-project="${attr(project)}">
            <td data-label="${attr(labels.severity)}"><span class="badge severity-${attr(finding.severity)}">${escapeHtml(severityLabel(finding.severity, locale))}</span></td>
            <td data-label="${attr(labels.rule)}"><code>${escapeHtml(finding.ruleId)}</code></td>
            <td data-label="${attr(labels.project)}"><code>${escapeHtml(project)}</code></td>
            <td data-label="${attr(labels.finding)}">
              ${escapeHtml(finding.message)}
              <details>
                <summary>${escapeHtml(labels.details)}</summary>
                <div class="detail-grid">
                  <section>
                    <h3>${escapeHtml(labels.resource)}</h3>
                    <p><code>${escapeHtml(finding.resource.path)}</code> <span class="muted">(${escapeHtml(finding.resource.kind)})</span></p>
                    ${locationHtml(finding, locale)}
                  </section>
                  ${detailsHtml(finding, locale)}
                  ${fixHtml(finding, locale)}
                  ${referencesHtml(finding, locale)}
                </div>
              </details>
            </td>
          </tr>`;
}

function locationHtml(finding: Finding, locale: Locale): string {
  const values: string[] = [];
  if (finding.location?.region) {
    values.push(
      t(
        "report.location.lines",
        {
          startLine: finding.location.region.startLine,
          endLine: finding.location.region.endLine,
        },
        locale,
      ),
    );
  } else if (finding.location?.line) {
    values.push(t("report.location.line", { line: finding.location.line }, locale));
  }
  if (finding.location?.column) {
    values.push(t("report.location.column", { column: finding.location.column }, locale));
  }
  if (finding.location?.boardCoordinates) {
    const coordinates = finding.location.boardCoordinates;
    values.push(
      `${coordinates.layer ?? t("report.location.board", {}, locale)} (${formatNumber(coordinates.x)}${coordinates.units}, ${formatNumber(
        coordinates.y,
      )}${coordinates.units})`,
    );
  }
  return values.length > 0
    ? `<p>${escapeHtml(values.join(", "))}</p>`
    : `<p class="muted">${escapeHtml(t("report.noLocation", {}, locale))}</p>`;
}

function detailsHtml(finding: Finding, locale: Locale): string {
  if (!finding.details && !finding.confidence) {
    return "";
  }
  const detail = JSON.stringify(finding.details ?? {}, null, 2);
  return `<section>
                    <h3>${escapeHtml(t("report.context", {}, locale))}</h3>
                    ${finding.confidence ? `<p>${escapeHtml(t("report.confidence", {}, locale))}: ${escapeHtml(finding.confidence)}</p>` : ""}
                    ${finding.details ? `<pre><code>${escapeHtml(detail)}</code></pre>` : ""}
                  </section>`;
}

function fixHtml(finding: Finding, locale: Locale): string {
  if (!finding.fix) {
    return `<section><h3>${escapeHtml(t("report.fix", {}, locale))}</h3><p class="muted">${escapeHtml(
      t("report.noFix", {}, locale),
    )}</p></section>`;
  }
  const steps =
    finding.fix.steps && finding.fix.steps.length > 0
      ? `<ol>${finding.fix.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
      : "";
  return `<section>
                    <h3>${escapeHtml(t("report.fix", {}, locale))}</h3>
                    <p>${escapeHtml(finding.fix.description)}</p>
                    ${steps}
                  </section>`;
}

function referencesHtml(finding: Finding, locale: Locale): string {
  const references = [...(finding.references ?? []), ...(finding.fix?.references ?? [])];
  if (references.length === 0) {
    return `<section><h3>${escapeHtml(t("report.references", {}, locale))}</h3><p class="muted">${escapeHtml(
      t("report.noReferences", {}, locale),
    )}</p></section>`;
  }
  return `<section>
                    <h3>${escapeHtml(t("report.references", {}, locale))}</h3>
                    <ul>${references
                      .map((reference) => `<li><a href="${attr(reference)}">${escapeHtml(reference)}</a></li>`)
                      .join("")}</ul>
                  </section>`;
}

function filterOptions(
  findings: Finding[],
  locale: Locale,
): { severities: Severity[]; rules: string[]; projects: string[] } {
  return {
    severities: severities.filter((severity) => findings.some((finding) => finding.severity === severity)),
    rules: uniqueSorted(findings.map((finding) => finding.ruleId)),
    projects: uniqueSorted(findings.map((finding) => finding.project ?? t("report.unassigned", {}, locale))),
  };
}

function severityCounts(row: Breakdown, locale: Locale): string {
  return (
    severities
      .filter((severity) => row.counts[severity] > 0)
      .map((severity) => `${row.counts[severity]} ${severityLabel(severity, locale)}`)
      .join(", ") || t("report.finding.count", { count: 0 }, locale)
  );
}

function emptyPanel(message: string): string {
  return `<div class="panel empty">${escapeHtml(message)}</div>`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function formatNumber(value: number): string {
  return Object.is(value, -0)
    ? "0"
    : Number.isInteger(value)
      ? value.toString()
      : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function attr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function findingWord(count: number, locale: Locale): string {
  return count === 1 ? t("report.finding.word", {}, locale) : t("report.finding.word.plural", {}, locale);
}

function severityLabel(severity: Severity, locale: Locale): string {
  if (locale === "en") {
    return severity;
  }
  switch (severity) {
    case "critical":
      return t("severity.critical", {}, locale);
    case "high":
      return t("severity.high", {}, locale);
    case "medium":
      return t("severity.medium", {}, locale);
    case "low":
      return t("severity.low", {}, locale);
    case "info":
      return t("severity.info", {}, locale);
  }
}

function htmlLabels(locale: Locale) {
  return {
    allProjects: t("report.allProjects", {}, locale),
    allRules: t("report.allRules", {}, locale),
    allSeverities: t("report.allSeverities", {}, locale),
    details: t("report.details", {}, locale),
    filterFindings: t("report.filterFindings", {}, locale),
    filterableFindingList: t("report.filterableFindingList", {}, locale),
    finding: t("report.finding", {}, locale),
    findings: t("report.findings", {}, locale),
    groupedByRule: t("report.groupedByRule", {}, locale),
    noFindings: t("report.noFindings", {}, locale),
    noProjects: t("report.noProjects", {}, locale),
    noRules: t("report.noRules", {}, locale),
    perProjectBreakdown: t("report.perProjectBreakdown", {}, locale),
    perRuleGrouping: t("report.perRuleGrouping", {}, locale),
    project: t("report.project", {}, locale),
    resource: t("report.resource", {}, locale),
    rule: t("report.rule", {}, locale),
    severity: t("report.severity", {}, locale),
    severityCounts: t("report.severityCounts", {}, locale),
    summaryBySeverity: t("report.summaryBySeverity", {}, locale),
    thresholdFailed: t("report.threshold.failed", {}, locale),
    thresholdPassed: t("report.threshold.passed", {}, locale),
    title: t("report.title", {}, locale),
    total: t("report.total", {}, locale),
  };
}
