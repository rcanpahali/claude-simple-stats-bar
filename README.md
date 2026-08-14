# Claude Statusline (VS Code)

See what edit, see what Claude Code session cost. Both live, both status bar edge.

![Status bar showing editor segment and Claude segment](docs/images/statusbar-hero.png)

## What it does

Two thing live status bar far right:

- **Editor segment** — file path (relative to workspace) + line count, one spot near Claude segment. Cursor position show too, but just mirror VS Code's own built-in Ln/Col indicator — not unique to this extension.
- **Claude segment** — model, token usage, context %, cost estimate for current session. Update live as transcript grow. Click open full session panel. *This part not already in VS Code.*

## Claude segment, explained

![Anatomy of Claude segment: model, total tokens, context used, estimated cost, three warning-icon states](docs/images/statusbar-anatomy.png)

- **Model** — 🤖 icon double as context-usage warning light: swap ⚠️ at ≥70%, 🔥 at ≥90%.
- **Total tokens** — input + output + cache, whole session.
- **Context used** — last turn only, not running total. Answer "next message fit?", not "total used?"
- **Estimated cost** — built-in pricing cover current Sonnet/Opus/Haiku/Fable models, no setup need. Override: see [Cost estimates](#cost-estimates).

## Session panel

Click Claude segment (or run **Claude Statusline: Open Session Panel**) — panel open beside editor:

![Session panel: sessions in workspace, make-primary button, compaction note, 7-day spend chart, spend by model](docs/images/panel-anatomy.png)

- **Sessions this workspace** — every transcript found, "primary" one (status bar tracks) marked. Multi session running? Use **Make primary** button or **Claude Statusline: Switch Primary Session** command, pick different one.
- **Last 7 days** — spend chart + per-model breakdown, this workspace. Store local, auto-prune past 7 days.
- **Compaction** — heuristic count, likely compaction events for primary session (context % only show last turn). Best-effort, not exact (see [details](#how-compaction-detection-works)).

## Install

**Try without install:**

1. Clone repo, open folder VS Code: `git clone https://github.com/rcanpahali/vscode-claude-statusline.git`
2. Press `F5` — compile extension, open Extension Development Host window with it loaded.
3. Open any folder new window; segments appear bottom-right.

**Install real VS Code:**

```bash
git clone https://github.com/rcanpahali/vscode-claude-statusline.git
cd vscode-claude-statusline
npm install
npm run compile
npx @vscode/vsce package
code --install-extension vscode-claude-statusline-0.3.0.vsix
```

Then reload window (`Cmd+Shift+P` → "Developer: Reload Window"). Code change? Repeat last two commands, update.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `claudeStatusline.enabled` | `true` | Show/hide Claude segment. |
| `claudeStatusline.pollIntervalMs` | `2000` | Fallback poll interval, alongside file watcher. |
| `claudeStatusline.contextWindowTokens` | `1000000` | Context window size — used for context % + compaction detect. Lower for 200K-window model like Haiku 4.5. |
| `claudeStatusline.sessionFile` | `""` | Pin exact transcript path — overrides auto-detect + panel picker. Empty = auto-detect. |
| `claudeStatusline.pricing` | `{}` | Per-model USD rate per 1M tokens; overrides/extends built-in defaults (see [Cost estimates](#cost-estimates)). |

## Commands

| Command | What it does |
|---|---|
| `Claude Statusline: Refresh` | Force re-read of current transcript. |
| `Claude Statusline: Open Session Panel` | Open webview panel (also bound to clicking Claude segment). |
| `Claude Statusline: Switch Primary Session` | Pick which concurrent session this workspace tracks as primary. |

## Details

<details>
<summary><strong>Where session data comes from</strong></summary>

No public API for Claude Code session telemetry. Extension reads same local transcript files Claude Code already writes to disk:

```
~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl
```

Scans every folder in your (possibly multi-root) workspace for matching transcript directory, auto-picks most recently modified `.jsonl` across all of them as "primary" session, re-parses on file changes plus periodic poll as fallback. Reverse-engineered from observed behavior, not documented contract — if Claude Code changes storage format, update `src/claudeSession/transcriptLocator.ts` and `src/claudeSession/transcriptParser.ts` to match.

Multiple sessions running concurrently in workspace? Auto-pick can grab wrong one — use session panel's "Make primary" button, **Claude Statusline: Switch Primary Session** command, or pin exact file with `claudeStatusline.sessionFile` (always wins over both).
</details>

<details>
<summary><strong id="cost-estimates">Cost estimates</strong></summary>

Built-in default USD rates ship for current model lineup (Sonnet, Opus, Haiku, Fable) as of 2026-08, so cost shows without setup. Anthropic's rates change over time — verify current pricing before relying on it beyond rough estimate. Override a model's rate, or add one not in defaults, via `claudeStatusline.pricing`:

```json
{
  "claudeStatusline.pricing": {
    "claude-sonnet-5": {
      "inputPerMillion": 3,
      "outputPerMillion": 15,
      "cacheWritePerMillion": 3.75,
      "cacheReadPerMillion": 0.3
    }
  }
}
```

Entries here override shipped default for that model id; models with neither default nor configured entry show cost as `n/a`.
</details>

<details>
<summary><strong id="how-compaction-detection-works">How compaction detection works</strong></summary>

Claude Code transcripts carry no explicit compaction marker (verified against real on-disk transcripts, including multi-thousand-line sessions). Heuristically infers compaction from sharp drop in per-turn context tokens: turn using at least 10% of context window, followed by turn using less than 40% of that. False negatives and positives both possible — treat count as rough signal, not log.
</details>

<details>
<summary><strong>Status bar position</strong></summary>

Both segments live **right** side of status bar, past everything else VS Code or other extensions add — editor stats first, Claude session badge at very outer edge. Deliberate: `createStatusBarItem` priority controls left/right ordering, so both use very low (negative) priorities to guarantee they land past built-in line/column, encoding, and language-mode indicators rather than competing with them for space.
</details>

## Development

```bash
npm install
npm run compile   # or: npm run watch
```
