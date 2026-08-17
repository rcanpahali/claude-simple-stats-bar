import * as fs from "fs";
import * as path from "path";
import { TranscriptTurn } from "./transcriptParser";
import { estimateCostUsd, ModelPricing } from "./pricing";

export interface DailyModelTotals {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

interface FileWatermark {
  /** Number of turns already attributed to `daily`, so re-parsing a growing transcript only records the new ones. */
  turnsRecorded: number;
}

export interface HistoryStore {
  /** Per-transcript-file watermark, used to only attribute newly-appeared turns on each refresh. */
  fileWatermarks: Record<string, FileWatermark>;
  /** daily[YYYY-MM-DD][model] = totals accrued that day. */
  daily: Record<string, Record<string, DailyModelTotals>>;
}

const HISTORY_FILE_NAME = "history.json";
export const HISTORY_RETENTION_DAYS = 7;

/**
 * Bumped whenever the on-disk shape changes in a way older code can't read.
 * v2 switched from cumulative usage watermarks to a per-turn-count watermark
 * (see `recordTranscriptUsage`) — a v1 store gets discarded rather than
 * misread, since its `daily` totals were already misattributed by the bug
 * that made v2 necessary (whole-file deltas dumped onto the day they were
 * first observed, not the days they actually happened).
 */
const HISTORY_SCHEMA_VERSION = 2;

function emptyStore(): HistoryStore {
  return { fileWatermarks: {}, daily: {} };
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
    if (parsed.version !== HISTORY_SCHEMA_VERSION) return emptyStore();
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
    fs.writeFileSync(historyFilePath(storageDir), JSON.stringify({ version: HISTORY_SCHEMA_VERSION, ...store }));
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

/**
 * Attributes each new turn (since the last-seen turn count for this file) to the
 * calendar day it actually happened on, per its own timestamp — not the day it
 * was first observed. This lets a transcript from several days ago (e.g. one the
 * extension only just started watching) backfill its real days instead of
 * dumping its whole history onto today.
 */
export function recordTranscriptUsage(
  store: HistoryStore,
  filePath: string,
  turns: TranscriptTurn[],
  pricing: Record<string, ModelPricing>,
  fallbackDateStr: string
): void {
  const prevCount = store.fileWatermarks[filePath]?.turnsRecorded ?? 0;
  if (turns.length <= prevCount) return;

  for (const turn of turns.slice(prevCount)) {
    const model = turn.model ?? "unknown";
    const dateStr = turn.timestamp ? formatLocalDate(new Date(turn.timestamp)) : fallbackDateStr;
    const cost = estimateCostUsd(turn, pricing) ?? 0;

    const day = (store.daily[dateStr] ??= {});
    const bucket = (day[model] ??= emptyDailyTotals());
    bucket.cost += cost;
    bucket.inputTokens += turn.inputTokens;
    bucket.outputTokens += turn.outputTokens;
    bucket.cacheCreationTokens += turn.cacheCreationTokens;
    bucket.cacheReadTokens += turn.cacheReadTokens;
  }

  store.fileWatermarks[filePath] = { turnsRecorded: turns.length };
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
