---
name: update-pricing
description: Refresh DEFAULT_PRICING in src/claudeSession/pricing.ts against Anthropic's current published rates.
disable-model-invocation: true
---

# Update pricing

Reconciles `DEFAULT_PRICING` in [src/claudeSession/pricing.ts](../../../src/claudeSession/pricing.ts) against Anthropic's currently published API rates, so the extension's cost estimates don't quietly drift out of date.

## Steps

1. Read `DEFAULT_PRICING` to get the current list of model ids and their `inputPerMillion` / `outputPerMillion` / `cacheWritePerMillion` / `cacheReadPerMillion` rates.
2. Fetch `https://platform.claude.com/docs/en/about-claude/pricing` (the canonical, non-redirecting pricing doc — `docs.claude.com/...pricing` and `anthropic.com/pricing` just redirect to it or to a plans page without per-model rates) and read off the same four rates — input, output, 5-minute prompt-cache write, prompt-cache read — per million tokens, for every current-generation model listed.
3. Reconcile, model by model:
   - Rate differs from what's in the table → update it.
   - Current-generation model (same generation as what's already in the table — e.g. the latest Sonnet/Opus/Haiku/Fable) missing from the table → add it, matching the existing entry shape.
   - Model in the table that the fetched page no longer lists, or lists as retired/deprecated → leave it as-is (older transcripts still reference it); don't delete it.
   - Skip preview/limited-availability models (e.g. anything flagged "limited availability") and older, superseded generations already marked retired/deprecated on the page — this table is scoped to the current lineup Claude Code sessions actually run on, not Anthropic's full historical catalog.
4. Edit the table in place, preserving its formatting and the `ModelPricing` interface, and update the "as of yyyy-mm" month in the file's top comment to the current month.
5. Add a `### Changed` bullet under `[Unreleased]` in [CHANGELOG.md](../../../CHANGELOG.md) — one short line per changed model, old rate → new rate, no rationale or source link.
6. Run `npm run compile` to confirm the file still typechecks.

Done when every model id in the table has been checked against this run's fetched source — report a per-model old-→-new diff (or "unchanged") rather than just the final numbers, so the change is reviewable before committing.
