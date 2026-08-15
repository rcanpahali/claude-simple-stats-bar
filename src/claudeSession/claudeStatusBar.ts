import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseTranscript, UsageTotals } from "./transcriptParser";
import { estimateCostUsd, ModelPricing, resolvePricing } from "./pricing";
import { SessionManager } from "./sessionManager";
import { ClaudeSessionPanel, PanelSessionInfo } from "./panel";
import { activeSessionLabel, fallbackSessionLabel, loadSessionNames, shortSessionId } from "./sessionNames";
import { formatLocalDate, HistoryStore, loadHistory, pruneOldDays, recordUsage, saveHistory } from "./history";

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

const CONTEXT_BAR_WIDTH = 6;

function formatContextBar(pct: number, width = CONTEXT_BAR_WIDTH): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return "▮".repeat(filled) + "▯".repeat(width - filled);
}

interface ContextSeverity {
  icon: string;
  tag: string;
}

function contextSeverity(pct: number): ContextSeverity {
  if (pct >= 90) return { icon: "$(flame)", tag: "CRIT" };
  if (pct >= 70) return { icon: "$(warning)", tag: "WARN" };
  if (pct >= 50) return { icon: "$(graph-line)", tag: "MED" };
  return { icon: "$(hubot)", tag: "CALM" };
}

export class ClaudeSessionStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly sessionManager: SessionManager;
  private readonly panel: ClaudeSessionPanel;
  private readonly historyStorageDir?: string;
  private readonly historyStore: HistoryStore;

  private watcher?: fs.FSWatcher;
  private pollTimer?: ReturnType<typeof setInterval>;
  private currentFile?: string;
  private lastUsage?: UsageTotals;

  /** 0 means "auto-detect from the model" — see `contextWindow.ts`. */
  private contextWindowTokens = 0;
  private pollIntervalMs = 2000;
  private pricing: Record<string, ModelPricing> = {};
  private showContextBar = true;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -1000
    );
    this.item.command = "claudeSimpleStatsBar.openPanel";

    this.sessionManager = new SessionManager(context.workspaceState);
    this.panel = new ClaudeSessionPanel((file) => {
      this.sessionManager.setManualPrimary(file);
      this.refresh();
    });

    this.historyStorageDir = context.storageUri?.fsPath;
    this.historyStore = this.historyStorageDir
      ? loadHistory(this.historyStorageDir)
      : { fileWatermarks: {}, daily: {} };

    this.reloadConfig();
  }

  reloadConfig(): void {
    const cfg = vscode.workspace.getConfiguration("claudeSimpleStatsBar");
    this.contextWindowTokens = cfg.get<number>("contextWindowTokens", 0);
    this.pricing = resolvePricing(cfg.get<Record<string, ModelPricing>>("pricing", {}));
    this.showContextBar = cfg.get<boolean>("showContextBar", true);

    const newPollIntervalMs = cfg.get<number>("pollIntervalMs", 2000);
    if (newPollIntervalMs !== this.pollIntervalMs || !this.pollTimer) {
      this.pollIntervalMs = newPollIntervalMs;
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => this.refresh(), this.pollIntervalMs);
    }

    this.item.show();
    this.refresh();
  }

  private ensureWatching(file: string): void {
    if (this.currentFile === file) return;

    this.watcher?.close();
    this.currentFile = file;
    try {
      this.watcher = fs.watch(file, () => this.refresh());
    } catch {
      // Best effort — the poll timer still covers updates if watching fails.
    }
  }

  refresh(): void {
    const primary = this.sessionManager.resolvePrimary();

    if (!primary) {
      this.watcher?.close();
      this.watcher = undefined;
      this.currentFile = undefined;
      this.lastUsage = undefined;
      this.item.text = "$(hubot) no session";
      this.item.tooltip = "No Claude Code session transcript found for this workspace.";
      if (this.panel.isVisible) this.panel.update([], this.historyStore);
      return;
    }

    this.ensureWatching(primary);

    const usage = parseTranscript(primary, this.contextWindowTokens);
    this.lastUsage = usage;

    const totalTokens =
      usage.inputTokens +
      usage.outputTokens +
      usage.cacheCreationTokens +
      usage.cacheReadTokens;

    const contextPct = Math.min(
      100,
      Math.round((usage.lastTurnInputTokens / usage.contextWindowTokens) * 100)
    );

    const cost = estimateCostUsd(usage, this.pricing);
    const costLabel = cost === undefined ? "n/a" : `$${cost.toFixed(3)}`;
    const severity = contextSeverity(contextPct);
    const contextSegment = this.showContextBar
      ? `${severity.tag} ${formatContextBar(contextPct)}  ${contextPct}% ctx`
      : `${severity.tag}  ${contextPct}% ctx`;

    this.item.text =
      `$(dashboard) ${usage.model ?? "claude"} · ` +
      `$(pulse) ${formatTokenCount(totalTokens)} tok · ` +
      `${severity.icon} ${contextSegment} · ` +
      `$(credit-card) ${costLabel}`;
    this.item.tooltip = this.buildTooltip(usage, contextPct, costLabel);

    this.updateSessionsAndHistory(primary);
  }

  private updateSessionsAndHistory(primaryFile: string): void {
    const sessions = this.sessionManager.listSessions();
    const today = formatLocalDate(new Date());
    const sessionNames = loadSessionNames();
    const panelSessions: PanelSessionInfo[] = [];

    for (const s of sessions) {
      const usage =
        s.file === primaryFile && this.lastUsage
          ? this.lastUsage
          : parseTranscript(s.file, this.contextWindowTokens);
      const cost = estimateCostUsd(usage, this.pricing);
      const sessionId = path.basename(s.file, ".jsonl");
      const liveName = sessionNames.get(sessionId);
      const name = liveName ? activeSessionLabel(liveName, s.mtimeMs) : fallbackSessionLabel(sessionId, s.mtimeMs);
      panelSessions.push({ file: s.file, name, usage, cost, isPrimary: s.file === primaryFile });

      if (this.historyStorageDir) {
        recordUsage(this.historyStore, s.file, usage, cost, today);
      }
    }

    if (this.historyStorageDir) {
      pruneOldDays(this.historyStore, today);
      saveHistory(this.historyStorageDir, this.historyStore);
    }

    if (this.panel.isVisible) {
      this.panel.update(panelSessions, this.historyStore);
    }
  }

  private buildTooltip(
    usage: UsageTotals,
    contextPct: number,
    costLabel: string
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;
    md.appendMarkdown("**$(hubot) Claude Code Session**\n\n");
    md.appendMarkdown(`- $(dashboard) Model: ${usage.model ?? "unknown"}\n`);
    md.appendMarkdown(`- $(arrow-down) Input tokens: ${usage.inputTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(arrow-up) Output tokens: ${usage.outputTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(save) Cache write: ${usage.cacheCreationTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(history) Cache read: ${usage.cacheReadTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(graph-line) Context used (last turn): ~${contextPct}%\n`);
    if (usage.compactionCount > 0) {
      md.appendMarkdown(
        `- $(refresh) Compacted ~${usage.compactionCount}x this session (heuristic)\n`
      );
    }
    md.appendMarkdown(`- $(credit-card) Estimated cost: ${costLabel}\n`);
    md.appendMarkdown(`\nTranscript: \`${this.currentFile}\`\n`);
    if (costLabel === "n/a") {
      md.appendMarkdown(
        "\n_Unknown model — set `claudeSimpleStatsBar.pricing` to enable a cost estimate for it._"
      );
    }
    md.appendMarkdown(`\n\nClick for the full session panel (all sessions, 7-day history).`);
    return md;
  }

  openPanel(): void {
    this.panel.reveal();
    this.refresh();
  }

  async switchPrimarySession(): Promise<void> {
    const sessions = this.sessionManager.listSessions();
    if (sessions.length === 0) {
      vscode.window.showInformationMessage(
        "No Claude Code session transcripts found for this workspace."
      );
      return;
    }

    const sessionNames = loadSessionNames();
    const items = sessions.map((s) => {
      const sessionId = path.basename(s.file, ".jsonl");
      return {
        label: sessionNames.get(sessionId) ?? shortSessionId(sessionId),
        description: new Date(s.mtimeMs).toLocaleString(),
        file: s.file,
      };
    });

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: "Select the session to treat as primary",
    });
    if (!picked) return;

    this.sessionManager.setManualPrimary(picked.file);
    this.refresh();
  }

  dispose(): void {
    this.watcher?.close();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.panel.dispose();
    this.item.dispose();
  }
}
