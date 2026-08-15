import * as vscode from "vscode";
import { UsageTotals } from "./transcriptParser";
import { HistoryStore } from "./history";

export interface PanelSessionInfo {
  file: string;
  /** Friendly session name from the running CLI process, or the transcript's session id if none was found. */
  name: string;
  usage: UsageTotals;
  cost: number | undefined;
  isPrimary: boolean;
}

/** How many sessions show by default before the rest collapse behind "Show more". */
const VISIBLE_SESSION_LIMIT = 6;

/** Floating webview panel opened from the status bar: session breakdown, compaction status, 7-day spend chart. */
export class ClaudeSessionPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  /**
   * `update()` replaces the webview's entire HTML (on a 2s poll by default), which
   * would reset any in-page toggle state — so the "show more" expansion is tracked
   * here instead of relying on the webview's own DOM/JS state surviving re-renders.
   */
  private sessionListExpanded = false;

  constructor(private readonly onSwitchPrimary: (file: string) => void) {}

  get isVisible(): boolean {
    return !!this.panel;
  }

  reveal(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "claudeSimpleStatsBarPanel",
      "Claude Session",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === "switchPrimary" && typeof message.file === "string") {
        this.onSwitchPrimary(message.file);
      } else if (message?.type === "openSettings") {
        vscode.commands.executeCommand("workbench.action.openSettings", "@ext:rcanpahali.claude-simple-stats-bar");
      } else if (message?.type === "toggleSessionList" && typeof message.expanded === "boolean") {
        this.sessionListExpanded = message.expanded;
      }
    });
  }

  update(sessions: PanelSessionInfo[], history: HistoryStore): void {
    if (!this.panel) return;
    this.panel.webview.html = renderHtml(sessions, history, this.sessionListExpanded);
  }

  dispose(): void {
    this.panel?.dispose();
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function renderSessionRow(s: PanelSessionInfo, extra: boolean): string {
  const total =
    s.usage.inputTokens + s.usage.outputTokens + s.usage.cacheCreationTokens + s.usage.cacheReadTokens;
  const costLabel = s.cost === undefined ? "n/a" : `$${s.cost.toFixed(3)}`;

  return `
    <li class="session${s.isPrimary ? " primary" : ""}${extra ? " extra" : ""}">
      <span class="dot">${s.isPrimary ? "●" : "○"}</span>
      <span class="name" title="${esc(s.file)}">${esc(s.name)}</span>
      <span class="model">${esc(s.usage.model ?? "unknown")}</span>
      <span class="tokens">${formatTokenCount(total)} tok</span>
      <span class="cost">${costLabel}</span>
      ${s.isPrimary ? "" : `<button class="switch" data-file="${esc(s.file)}">Make primary</button>`}
    </li>`;
}

function renderCompaction(primary: PanelSessionInfo | undefined): string {
  if (!primary) return "";
  const count = primary.usage.compactionCount;
  if (count === 0) {
    return `<p class="compaction">No compaction detected this session (heuristic, best-effort).</p>`;
  }
  const when = primary.usage.lastCompactionTimestamp
    ? new Date(primary.usage.lastCompactionTimestamp).toLocaleString()
    : "unknown time";
  return `<p class="compaction">Compacted ~${count}x this session (heuristic) &middot; last around ${esc(when)}</p>`;
}

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

function renderChart(history: HistoryStore): string {
  const days = lastNDates(7);
  const dayTotals = days.map((day) => {
    const perModel = history.daily[day] ?? {};
    return Object.values(perModel).reduce((sum, b) => sum + b.cost, 0);
  });

  const maxTotal = Math.max(0.01, ...dayTotals);
  const barWidth = 36;
  const gap = 12;
  const chartHeight = 100;
  const labelPadding = 16; // headroom so the tallest bar's value label never clips off the top

  const bars = days
    .map((day, i) => {
      const total = dayTotals[i];
      const h = Math.max(1, Math.round((total / maxTotal) * chartHeight));
      const x = i * (barWidth + gap);
      const barTopY = labelPadding + (chartHeight - h);
      const label = day.slice(5);
      return `
        <rect x="${x}" y="${barTopY}" width="${barWidth}" height="${h}" class="bar" />
        <text x="${x + barWidth / 2}" y="${labelPadding + chartHeight + 14}" class="bar-label" text-anchor="middle">${label}</text>
        <text x="${x + barWidth / 2}" y="${barTopY - 4}" class="bar-value" text-anchor="middle">$${total.toFixed(2)}</text>`;
    })
    .join("");

  const svgWidth = days.length * (barWidth + gap);
  return `<svg width="${svgWidth}" height="${labelPadding + chartHeight + 24}" class="chart">${bars}</svg>`;
}

function renderModelBreakdown(history: HistoryStore): string {
  const totals: Record<string, number> = {};
  for (const day of Object.keys(history.daily)) {
    for (const [model, bucket] of Object.entries(history.daily[day])) {
      totals[model] = (totals[model] ?? 0) + bucket.cost;
    }
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "<p>No spend recorded yet for this workspace.</p>";

  return `<ul class="model-breakdown">${entries
    .map(
      ([model, cost]) =>
        `<li><span class="model">${esc(model)}</span><span class="cost">$${cost.toFixed(3)}</span></li>`
    )
    .join("")}</ul>`;
}

function renderHtml(sessions: PanelSessionInfo[], history: HistoryStore, sessionListExpanded: boolean): string {
  const primary = sessions.find((s) => s.isPrimary);
  const rows = sessions
    .map((s, i) => renderSessionRow(s, i >= VISIBLE_SESSION_LIMIT))
    .join("");
  const extraCount = Math.max(0, sessions.length - VISIBLE_SESSION_LIMIT);
  const moreLabel = `Show ${extraCount} more session${extraCount === 1 ? "" : "s"}`;
  const showMoreButton =
    extraCount > 0
      ? `<button class="show-more" id="showMoreBtn" data-more-label="${esc(moreLabel)}">${
          sessionListExpanded ? "Show fewer sessions" : moreLabel
        }</button>`
      : "";

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 16px; }
  .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .toolbar h1 { font-size: 1.3em; margin: 0; font-weight: 700; }
  button.settings { background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-button-border, #5a5a5a); padding: 3px 10px; border-radius: 3px; cursor: pointer; font-size: 0.85em; }
  button.settings:hover { background: var(--vscode-toolbar-hoverBackground, #2a2d2e); }
  h2 { font-size: 1.1em; margin-top: 24px; margin-bottom: 8px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li.session { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--vscode-widget-border, #444); }
  li.session .name { flex: 1; font-weight: 600; }
  li.session.primary .name { color: var(--vscode-charts-green, #4ec9b0); }
  li.session .model, li.session .tokens { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
  li.session .cost { font-variant-numeric: tabular-nums; min-width: 60px; text-align: right; }
  button.switch { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.85em; }
  button.switch:hover { background: var(--vscode-button-hoverBackground); }
  ul.sessions li.session.extra { display: none; }
  ul.sessions.expanded li.session.extra { display: flex; }
  button.show-more { background: transparent; color: var(--vscode-textLink-foreground, #3794ff); border: none; padding: 7px 0 0; cursor: pointer; font-size: 0.85em; display: block; }
  button.show-more:hover { text-decoration: underline; }
  .compaction { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
  .chart .bar { fill: var(--vscode-charts-blue, #3794ff); }
  .chart .bar-label, .chart .bar-value { fill: var(--vscode-descriptionForeground); font-size: 10px; }
  ul.model-breakdown li { display: flex; justify-content: space-between; padding: 3px 0; }
</style>
</head>
<body>
  <div class="toolbar">
    <h1>Usage Summary</h1>
    <button class="settings" id="openSettings">&#9881; Extension Settings</button>
  </div>
  <h2>Sessions (this workspace)</h2>
  <ul class="sessions${sessionListExpanded ? " expanded" : ""}" id="sessionList">${rows || "<li>No Claude Code session transcripts found for this workspace.</li>"}</ul>
  ${showMoreButton}
  ${renderCompaction(primary)}

  <h2>Last 7 days</h2>
  ${renderChart(history)}

  <h2>Spend by model (7 days)</h2>
  ${renderModelBreakdown(history)}

  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button.switch").forEach((btn) => {
      btn.addEventListener("click", () => {
        vscode.postMessage({ type: "switchPrimary", file: btn.getAttribute("data-file") });
      });
    });
    document.getElementById("openSettings").addEventListener("click", () => {
      vscode.postMessage({ type: "openSettings" });
    });
    const sessionList = document.getElementById("sessionList");
    const showMoreBtn = document.getElementById("showMoreBtn");
    if (showMoreBtn) {
      const moreLabel = showMoreBtn.getAttribute("data-more-label");
      showMoreBtn.addEventListener("click", () => {
        const expanded = sessionList.classList.toggle("expanded");
        showMoreBtn.textContent = expanded ? "Show fewer sessions" : moreLabel;
        vscode.postMessage({ type: "toggleSessionList", expanded });
      });
    }
  </script>
</body>
</html>`;
}
