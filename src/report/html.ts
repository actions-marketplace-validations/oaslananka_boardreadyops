import type { Finding, Severity } from "../core/findings.js";
import type { RunResult } from "../core/result.js";

const severities: Severity[] = ["critical", "high", "medium", "low", "info"];

export function formatHtml(result: RunResult): string {
  const projectRows = projectBreakdown(result);
  const ruleRows = ruleBreakdown(result.findings);
  const filter = filterOptions(result.findings);
  const visibleCount = `${result.findings.length} ${plural("finding", result.findings.length)}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BoardReadyOps Report</title>
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
    <h1>BoardReadyOps Report</h1>
    <p class="metadata">Generated ${escapeHtml(result.generatedAt)} by ${escapeHtml(result.tool.name)} ${escapeHtml(
      result.tool.version,
    )}. ${result.summary.failed ? "Threshold failed." : "Threshold passed."}</p>
  </header>
  <main>
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary by Severity</h2>
      <div class="summary-grid">
        ${summaryCards(result)}
      </div>
    </section>

    <section aria-labelledby="project-heading">
      <h2 id="project-heading">Per-project Breakdown</h2>
      <div class="breakdown-grid">
        ${projectRows.length > 0 ? projectRows.map(renderProjectPanel).join("\n        ") : emptyPanel("No projects were reported.")}
      </div>
    </section>

    <section aria-labelledby="rule-heading">
      <h2 id="rule-heading">Per-rule Grouping</h2>
      ${
        ruleRows.length > 0
          ? `<table>
        <caption>Findings grouped by rule</caption>
        <thead>
          <tr><th scope="col">Rule</th><th scope="col">Total</th><th scope="col">Severity counts</th></tr>
        </thead>
        <tbody>
          ${ruleRows.map(renderRuleRow).join("\n          ")}
        </tbody>
      </table>`
          : emptyPanel("No rules produced findings.")
      }
    </section>

    <section aria-labelledby="findings-heading">
      <h2 id="findings-heading">Findings</h2>
      <section class="filter-bar" aria-label="Filter findings">
        <label>Severity
          <select id="severity-filter" data-filter="severity">
            <option value="">All severities</option>
            ${filter.severities.map((severity) => `<option value="${attr(severity)}">${escapeHtml(severity)}</option>`).join("\n            ")}
          </select>
        </label>
        <label>Rule
          <select id="rule-filter" data-filter="rule">
            <option value="">All rules</option>
            ${filter.rules.map((rule) => `<option value="${attr(rule)}">${escapeHtml(rule)}</option>`).join("\n            ")}
          </select>
        </label>
        <label>Project
          <select id="project-filter" data-filter="project">
            <option value="">All projects</option>
            ${filter.projects.map((project) => `<option value="${attr(project)}">${escapeHtml(project)}</option>`).join("\n            ")}
          </select>
        </label>
        <output class="count" id="visible-count" aria-live="polite">${escapeHtml(visibleCount)}</output>
      </section>
      ${
        result.findings.length > 0
          ? `<table id="findings-table">
        <caption>Filterable finding list</caption>
        <thead>
          <tr><th scope="col">Severity</th><th scope="col">Rule</th><th scope="col">Project</th><th scope="col">Finding</th></tr>
        </thead>
        <tbody>
          ${result.findings.map(renderFindingRow).join("\n          ")}
        </tbody>
      </table>`
          : emptyPanel("No findings.")
      }
    </section>
  </main>
  <script>
    "use strict";
    const filters = Array.from(document.querySelectorAll("[data-filter]"));
    const rows = Array.from(document.querySelectorAll("#findings-table tbody tr"));
    const counter = document.getElementById("visible-count");
    const plural = (count) => count === 1 ? "finding" : "findings";
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

function summaryCards(result: RunResult): string {
  const metrics = [
    { label: "Total", count: result.summary.total },
    ...severities.map((severity) => ({ label: severity, count: result.summary[severity] })),
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

function renderProjectPanel(project: Breakdown): string {
  return `<article class="panel">
          <h3><code>${escapeHtml(project.label)}</code></h3>
          <p><strong>${project.total}</strong> ${escapeHtml(plural("finding", project.total))}</p>
          <p class="muted">${severityCounts(project)}</p>
        </article>`;
}

function renderRuleRow(rule: Breakdown): string {
  return `<tr>
            <td data-label="Rule"><code>${escapeHtml(rule.label)}</code></td>
            <td data-label="Total">${rule.total}</td>
            <td data-label="Severity counts">${severityCounts(rule)}</td>
          </tr>`;
}

function renderFindingRow(finding: Finding): string {
  const project = finding.project ?? "Unassigned";
  return `<tr data-severity="${attr(finding.severity)}" data-rule="${attr(finding.ruleId)}" data-project="${attr(project)}">
            <td data-label="Severity"><span class="badge severity-${attr(finding.severity)}">${escapeHtml(finding.severity)}</span></td>
            <td data-label="Rule"><code>${escapeHtml(finding.ruleId)}</code></td>
            <td data-label="Project"><code>${escapeHtml(project)}</code></td>
            <td data-label="Finding">
              ${escapeHtml(finding.message)}
              <details>
                <summary>Details</summary>
                <div class="detail-grid">
                  <section>
                    <h3>Resource</h3>
                    <p><code>${escapeHtml(finding.resource.path)}</code> <span class="muted">(${escapeHtml(finding.resource.kind)})</span></p>
                    ${locationHtml(finding)}
                  </section>
                  ${detailsHtml(finding)}
                  ${fixHtml(finding)}
                  ${referencesHtml(finding)}
                </div>
              </details>
            </td>
          </tr>`;
}

function locationHtml(finding: Finding): string {
  const values: string[] = [];
  if (finding.location?.region) {
    values.push(`lines ${finding.location.region.startLine}-${finding.location.region.endLine}`);
  } else if (finding.location?.line) {
    values.push(`line ${finding.location.line}`);
  }
  if (finding.location?.column) {
    values.push(`column ${finding.location.column}`);
  }
  if (finding.location?.boardCoordinates) {
    const coordinates = finding.location.boardCoordinates;
    values.push(
      `${coordinates.layer ?? "board"} (${formatNumber(coordinates.x)}${coordinates.units}, ${formatNumber(
        coordinates.y,
      )}${coordinates.units})`,
    );
  }
  return values.length > 0 ? `<p>${escapeHtml(values.join(", "))}</p>` : '<p class="muted">No location provided.</p>';
}

function detailsHtml(finding: Finding): string {
  if (!finding.details && !finding.confidence) {
    return "";
  }
  const detail = JSON.stringify(finding.details ?? {}, null, 2);
  return `<section>
                    <h3>Context</h3>
                    ${finding.confidence ? `<p>Confidence: ${escapeHtml(finding.confidence)}</p>` : ""}
                    ${finding.details ? `<pre><code>${escapeHtml(detail)}</code></pre>` : ""}
                  </section>`;
}

function fixHtml(finding: Finding): string {
  if (!finding.fix) {
    return '<section><h3>Fix</h3><p class="muted">No fix suggestion provided.</p></section>';
  }
  const steps =
    finding.fix.steps && finding.fix.steps.length > 0
      ? `<ol>${finding.fix.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
      : "";
  return `<section>
                    <h3>Fix</h3>
                    <p>${escapeHtml(finding.fix.description)}</p>
                    ${steps}
                  </section>`;
}

function referencesHtml(finding: Finding): string {
  const references = [...(finding.references ?? []), ...(finding.fix?.references ?? [])];
  if (references.length === 0) {
    return '<section><h3>References</h3><p class="muted">No references provided.</p></section>';
  }
  return `<section>
                    <h3>References</h3>
                    <ul>${references
                      .map((reference) => `<li><a href="${attr(reference)}">${escapeHtml(reference)}</a></li>`)
                      .join("")}</ul>
                  </section>`;
}

function filterOptions(findings: Finding[]): { severities: Severity[]; rules: string[]; projects: string[] } {
  return {
    severities: severities.filter((severity) => findings.some((finding) => finding.severity === severity)),
    rules: uniqueSorted(findings.map((finding) => finding.ruleId)),
    projects: uniqueSorted(findings.map((finding) => finding.project ?? "Unassigned")),
  };
}

function severityCounts(row: Breakdown): string {
  return (
    severities
      .filter((severity) => row.counts[severity] > 0)
      .map((severity) => `${row.counts[severity]} ${severity}`)
      .join(", ") || "0 findings"
  );
}

function emptyPanel(message: string): string {
  return `<div class="panel empty">${escapeHtml(message)}</div>`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
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
