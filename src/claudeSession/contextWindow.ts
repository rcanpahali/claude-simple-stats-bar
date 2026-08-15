/**
 * Default context window sizes (in tokens) for the current Claude model lineup,
 * mirroring the id list in `pricing.ts`. Used to auto-detect the context-usage %
 * and compaction-heuristic scale from the transcript's model id, without requiring
 * `claudeSimpleStatsBar.contextWindowTokens` to be set by hand.
 */
export const DEFAULT_CONTEXT_WINDOW_TOKENS: Record<string, number> = {
  "claude-sonnet-5": 1_000_000,
  "claude-opus-5": 1_000_000,
  "claude-fable-5": 1_000_000,
  "claude-haiku-4-5": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
};

const FALLBACK_CONTEXT_WINDOW_TOKENS = 1_000_000;

/** A configured override always wins; otherwise falls back to the model's known default, then the fallback. */
export function resolveContextWindowTokens(model: string | undefined, override?: number): number {
  if (override) return override;
  if (model && DEFAULT_CONTEXT_WINDOW_TOKENS[model] !== undefined) {
    return DEFAULT_CONTEXT_WINDOW_TOKENS[model];
  }
  return FALLBACK_CONTEXT_WINDOW_TOKENS;
}
