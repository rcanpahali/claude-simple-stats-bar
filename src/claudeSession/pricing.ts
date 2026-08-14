import { UsageTotals } from "./transcriptParser";

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion?: number;
  cacheReadPerMillion?: number;
}

/**
 * Default USD rates per 1,000,000 tokens for the current Claude model lineup
 * (as of 2026-08). Anthropic pricing changes over time, so this table is a
 * convenience default, not a guarantee — `claudeStatusline.pricing` entries
 * override a matching model id here, and new/renamed models can be added
 * the same way.
 */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-5": {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  "claude-opus-5": {
    inputPerMillion: 5,
    outputPerMillion: 25,
    cacheWritePerMillion: 6.25,
    cacheReadPerMillion: 0.5,
  },
  "claude-haiku-4-5": {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheWritePerMillion: 1.25,
    cacheReadPerMillion: 0.1,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheWritePerMillion: 1.25,
    cacheReadPerMillion: 0.1,
  },
  "claude-fable-5": {
    inputPerMillion: 10,
    outputPerMillion: 50,
    cacheWritePerMillion: 12.5,
    cacheReadPerMillion: 1,
  },
};

/** Merges user-configured rates on top of the shipped defaults; user entries win on a matching model id. */
export function resolvePricing(
  userPricing: Record<string, ModelPricing>
): Record<string, ModelPricing> {
  return { ...DEFAULT_PRICING, ...userPricing };
}

export function estimateCostUsd(
  usage: UsageTotals,
  pricing: Record<string, ModelPricing>
): number | undefined {
  if (!usage.model) return undefined;

  const rates = pricing[usage.model];
  if (!rates) return undefined;

  const inputCost = (usage.inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * rates.outputPerMillion;
  const cacheWriteCost = rates.cacheWritePerMillion
    ? (usage.cacheCreationTokens / 1_000_000) * rates.cacheWritePerMillion
    : 0;
  const cacheReadCost = rates.cacheReadPerMillion
    ? (usage.cacheReadTokens / 1_000_000) * rates.cacheReadPerMillion
    : 0;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}
