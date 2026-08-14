import { UsageTotals } from "./transcriptParser";

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion?: number;
  cacheReadPerMillion?: number;
}

/**
 * No rates ship by default: Anthropic pricing changes over time and baking
 * in numbers here would go stale silently. Configure real rates via the
 * `claudeStatusline.pricing` setting; until then cost shows as "n/a".
 */
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
