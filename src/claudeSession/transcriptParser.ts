import * as fs from "fs";
import { resolveContextWindowTokens } from "./contextWindow";

export interface UsageTotals {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** input + cache tokens attributed to the most recent assistant turn, used to estimate context-window usage. */
  lastTurnInputTokens: number;
  /** Context window size actually used for this transcript: the configured override, or auto-detected from `model`. */
  contextWindowTokens: number;
  /** Number of likely compaction events detected in this transcript (heuristic — see parseTranscript). */
  compactionCount: number;
  /** ISO timestamp of the most recent likely compaction event, if any. */
  lastCompactionTimestamp?: string;
}

/** Token usage for a single assistant turn, with the timestamp it actually happened at (not when it was observed). */
export interface TranscriptTurn {
  timestamp?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

function emptyTotals(contextWindowTokens: number): UsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    lastTurnInputTokens: 0,
    contextWindowTokens,
    compactionCount: 0,
  };
}

/**
 * Claude Code transcripts carry no explicit compaction marker (verified against
 * real on-disk transcripts, including multi-thousand-line sessions — no
 * `isCompactSummary`, no `type: "summary"` entry). This heuristically infers a
 * compaction from a sharp drop in per-turn effective context tokens: a turn
 * using at least 10% of the context window followed by a turn using less than
 * 40% of that. False negatives/positives are possible; treat as best-effort.
 */
const COMPACTION_DROP_RATIO = 0.4;
const COMPACTION_MIN_WINDOW_FRACTION = 0.1;

/**
 * Sums token usage across every assistant turn in a Claude Code transcript, and
 * returns the per-turn breakdown alongside it. Each JSONL line is a loosely-typed
 * session entry; assistant entries carry a `message.usage` object shaped like the
 * Anthropic Messages API response. Lines that don't match (tool results, user
 * turns, malformed JSON) are skipped.
 */
export function parseTranscriptWithTurns(
  filePath: string,
  contextWindowOverride?: number
): { totals: UsageTotals; turns: TranscriptTurn[] } {
  const totals = emptyTotals(resolveContextWindowTokens(undefined, contextWindowOverride));
  const turns: TranscriptTurn[] = [];

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { totals, turns };
  }

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;

    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const usage = (entry as any)?.message?.usage;
    const model = (entry as any)?.message?.model;
    if (!usage || typeof usage !== "object") continue;

    const input = Number(usage.input_tokens) || 0;
    const output = Number(usage.output_tokens) || 0;
    const cacheCreate = Number(usage.cache_creation_input_tokens) || 0;
    const cacheRead = Number(usage.cache_read_input_tokens) || 0;

    totals.inputTokens += input;
    totals.outputTokens += output;
    totals.cacheCreationTokens += cacheCreate;
    totals.cacheReadTokens += cacheRead;
    totals.lastTurnInputTokens = input + cacheCreate + cacheRead;

    const timestamp = (entry as any)?.timestamp;
    const turnModel = typeof model === "string" && model.length > 0 ? model : undefined;
    if (turnModel) totals.model = turnModel;

    turns.push({
      timestamp: typeof timestamp === "string" ? timestamp : undefined,
      model: turnModel,
      inputTokens: input,
      outputTokens: output,
      cacheCreationTokens: cacheCreate,
      cacheReadTokens: cacheRead,
    });
  }

  totals.contextWindowTokens = resolveContextWindowTokens(totals.model, contextWindowOverride);

  const minPriorTokens = totals.contextWindowTokens * COMPACTION_MIN_WINDOW_FRACTION;
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1].inputTokens + turns[i - 1].cacheCreationTokens + turns[i - 1].cacheReadTokens;
    const curr = turns[i].inputTokens + turns[i].cacheCreationTokens + turns[i].cacheReadTokens;
    if (prev >= minPriorTokens && curr < prev * COMPACTION_DROP_RATIO) {
      totals.compactionCount++;
      totals.lastCompactionTimestamp = turns[i].timestamp;
    }
  }

  return { totals, turns };
}

/** Convenience wrapper for callers that only need the cumulative totals, not the per-turn breakdown. */
export function parseTranscript(filePath: string, contextWindowOverride?: number): UsageTotals {
  return parseTranscriptWithTurns(filePath, contextWindowOverride).totals;
}
