import * as fs from "fs";
import * as vscode from "vscode";
import { findLatestTranscript, findProjectTranscriptDir } from "./transcriptLocator";
import { parseTranscript, UsageTotals } from "./transcriptParser";
import { estimateCostUsd, ModelPricing } from "./pricing";

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export class ClaudeSessionStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private watcher?: fs.FSWatcher;
  private pollTimer?: ReturnType<typeof setInterval>;
  private currentFile?: string;
  private lastUsage?: UsageTotals;

  private contextWindowTokens = 200_000;
  private pollIntervalMs = 2000;
  private pricing: Record<string, ModelPricing> = {};

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -1000
    );
    this.item.command = "claudeStatusline.showSessionDetails";
    this.reloadConfig();
  }

  reloadConfig(): void {
    const cfg = vscode.workspace.getConfiguration("claudeStatusline");
    this.contextWindowTokens = cfg.get<number>("contextWindowTokens", 200_000);
    this.pricing = cfg.get<Record<string, ModelPricing>>("pricing", {});

    const newPollIntervalMs = cfg.get<number>("pollIntervalMs", 2000);
    if (newPollIntervalMs !== this.pollIntervalMs || !this.pollTimer) {
      this.pollIntervalMs = newPollIntervalMs;
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => this.refresh(), this.pollIntervalMs);
    }

    if (!cfg.get<boolean>("enabled", true)) {
      this.item.hide();
      return;
    }
    this.item.show();

    const configuredFile = cfg.get<string>("sessionFile", "").trim();
    if (configuredFile) {
      this.trackFile(configuredFile);
    } else {
      this.autoDetect();
    }
  }

  private autoDetect(): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    const dir = findProjectTranscriptDir(folders[0].uri.fsPath);
    if (!dir) return;

    const latest = findLatestTranscript(dir);
    if (latest) this.trackFile(latest);
  }

  private trackFile(file: string): void {
    if (this.currentFile === file) return;

    this.watcher?.close();
    this.currentFile = file;
    try {
      this.watcher = fs.watch(file, () => this.refresh());
    } catch {
      // Best effort — the poll timer still covers updates if watching fails.
    }
    this.refresh();
  }

  refresh(): void {
    if (!this.currentFile || !fs.existsSync(this.currentFile)) {
      this.autoDetect();
    }
    if (!this.currentFile) {
      this.item.text = "$(hubot) no session";
      this.item.tooltip = "No Claude Code session transcript found for this workspace.";
      return;
    }

    const usage = parseTranscript(this.currentFile);
    this.lastUsage = usage;

    const totalTokens =
      usage.inputTokens +
      usage.outputTokens +
      usage.cacheCreationTokens +
      usage.cacheReadTokens;

    const contextPct =
      this.contextWindowTokens > 0
        ? Math.min(
            100,
            Math.round((usage.lastTurnInputTokens / this.contextWindowTokens) * 100)
          )
        : 0;

    const cost = estimateCostUsd(usage, this.pricing);
    const costLabel = cost === undefined ? "n/a" : `$${cost.toFixed(3)}`;
    const statusIcon =
      contextPct >= 90 ? "$(flame)" : contextPct >= 70 ? "$(warning)" : "$(hubot)";

    this.item.text =
      `${statusIcon} ${usage.model ?? "claude"} · ` +
      `$(pulse) ${formatTokenCount(totalTokens)} tok · ` +
      `$(dashboard) ${contextPct}% ctx · ` +
      `$(credit-card) ${costLabel}`;
    this.item.tooltip = this.buildTooltip(usage, contextPct, costLabel);
  }

  private buildTooltip(
    usage: UsageTotals,
    contextPct: number,
    costLabel: string
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;
    md.appendMarkdown("**$(hubot) Claude Code Session**\n\n");
    md.appendMarkdown(`- $(symbol-misc) Model: ${usage.model ?? "unknown"}\n`);
    md.appendMarkdown(`- $(arrow-down) Input tokens: ${usage.inputTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(arrow-up) Output tokens: ${usage.outputTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(save) Cache write: ${usage.cacheCreationTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(history) Cache read: ${usage.cacheReadTokens.toLocaleString()}\n`);
    md.appendMarkdown(`- $(dashboard) Context used (last turn): ~${contextPct}%\n`);
    md.appendMarkdown(`- $(credit-card) Estimated cost: ${costLabel}\n`);
    md.appendMarkdown(`\nTranscript: \`${this.currentFile}\`\n`);
    if (costLabel === "n/a") {
      md.appendMarkdown("\n_Set `claudeStatusline.pricing` to enable cost estimates._");
    }
    return md;
  }

  showDetails(): void {
    if (!this.lastUsage) {
      vscode.window.showInformationMessage("No Claude Code session data available yet.");
      return;
    }
    const u = this.lastUsage;
    vscode.window.showInformationMessage(
      `Model: ${u.model ?? "unknown"} — in: ${u.inputTokens.toLocaleString()}, ` +
        `out: ${u.outputTokens.toLocaleString()}, cache write: ${u.cacheCreationTokens.toLocaleString()}, ` +
        `cache read: ${u.cacheReadTokens.toLocaleString()}`
    );
  }

  dispose(): void {
    this.watcher?.close();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.item.dispose();
  }
}
