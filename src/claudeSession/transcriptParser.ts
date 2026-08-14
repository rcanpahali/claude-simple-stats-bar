import * as fs from "fs";

export interface UsageTotals {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** input + cache tokens attributed to the most recent assistant turn, used to estimate context-window usage. */
  lastTurnInputTokens: number;
}

function emptyTotals(): UsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    lastTurnInputTokens: 0,
  };
}

/**
 * Sums token usage across every assistant turn in a Claude Code transcript.
 * Each JSONL line is a loosely-typed session entry; assistant entries carry
 * a `message.usage` object shaped like the Anthropic Messages API response.
 * Lines that don't match (tool results, user turns, malformed JSON) are skipped.
 */
export function parseTranscript(filePath: string): UsageTotals {
  const totals = emptyTotals();

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return totals;
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

    if (typeof model === "string" && model.length > 0) {
      totals.model = model;
    }
  }

  return totals;
}
