import * as fs from "fs";
import * as path from "path";
import { UsageTotals } from "./transcriptParser";

export interface DailyModelTotals {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

interface FileWatermark {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface HistoryStore {
  /** Last-seen cumulative usage per transcript file, used to compute per-refresh deltas. */
  fileWatermarks: Record<string, FileWatermark>;
  /** daily[YYYY-MM-DD][model] = totals accrued that day. */
  daily: Record<string, Record<string, DailyModelTotals>>;
}

const HISTORY_FILE_NAME = "history.json";
export const HISTORY_RETENTION_DAYS = 7;

function emptyStore(): HistoryStore {
  return { fileWatermarks: {}, daily: {} };
}

function emptyWatermark(): FileWatermark {
  return { cost: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
}

function emptyDailyTotals(): DailyModelTotals {
  return { cost: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
}

function historyFilePath(storageDir: string): string {
  return path.join(storageDir, HISTORY_FILE_NAME);
}

export function loadHistory(storageDir: string): HistoryStore {
  try {
    const raw = fs.readFileSync(historyFilePath(storageDir), "utf8");
    const parsed = JSON.parse(raw);
    return {
      fileWatermarks: parsed.fileWatermarks ?? {},
      daily: parsed.daily ?? {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveHistory(storageDir: string, store: HistoryStore): void {
  try {
    fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(historyFilePath(storageDir), JSON.stringify(store));
  } catch {
    // Best effort — history is a nice-to-have, not core functionality.
  }
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Records the delta between this file's last-seen usage and its current usage, attributed to `dateStr`. */
export function recordUsage(
  store: HistoryStore,
  filePath: string,
  usage: UsageTotals,
  cost: number | undefined,
  dateStr: string
): void {
  const prev = store.fileWatermarks[filePath] ?? emptyWatermark();

  const deltaCost = Math.max(0, (cost ?? prev.cost) - prev.cost);
  const deltaInput = Math.max(0, usage.inputTokens - prev.inputTokens);
  const deltaOutput = Math.max(0, usage.outputTokens - prev.outputTokens);
  const deltaCacheCreate = Math.max(0, usage.cacheCreationTokens - prev.cacheCreationTokens);
  const deltaCacheRead = Math.max(0, usage.cacheReadTokens - prev.cacheReadTokens);

  store.fileWatermarks[filePath] = {
    cost: cost ?? prev.cost,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    cacheReadTokens: usage.cacheReadTokens,
  };

  const noChange =
    deltaCost === 0 && deltaInput === 0 && deltaOutput === 0 && deltaCacheCreate === 0 && deltaCacheRead === 0;
  if (noChange) return;

  const model = usage.model ?? "unknown";
  const day = (store.daily[dateStr] ??= {});
  const bucket = (day[model] ??= emptyDailyTotals());
  bucket.cost += deltaCost;
  bucket.inputTokens += deltaInput;
  bucket.outputTokens += deltaOutput;
  bucket.cacheCreationTokens += deltaCacheCreate;
  bucket.cacheReadTokens += deltaCacheRead;
}

export function pruneOldDays(
  store: HistoryStore,
  todayStr: string,
  retentionDays: number = HISTORY_RETENTION_DAYS
): void {
  const cutoff = new Date(todayStr);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  for (const dateKey of Object.keys(store.daily)) {
    if (new Date(dateKey) < cutoff) {
      delete store.daily[dateKey];
    }
  }
}
