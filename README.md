# Claude Statusline (VS Code)

See what you're editing and what your Claude Code session is costing you — both live, both anchored at the edge of the window.

![Status bar showing the editor segment and the Claude segment](docs/images/statusbar-hero.png)

> The images in this README are hand-built diagrams that match the extension's real colors, layout, and text (not literal screen captures) — a couple of details may look slightly different on your machine, but the shapes and labels are accurate.

## What it does

Two things live at the far right of your status bar:

- **Editor segment** — the file you're in, your cursor position, and the line count. Updates as you type or move around.
- **Claude segment** — your current Claude Code session's model, token usage, context %, and estimated cost. Updates live as the transcript grows. **Click it** to open the full session panel.

## The Claude segment, explained

![Anatomy of the Claude segment: model, total tokens, context used, estimated cost, and the three warning-icon states](docs/images/statusbar-anatomy.png)

- **Model** — the 🤖 icon doubles as a context-usage warning light: it turns ⚠️ at ≥70% and 🔥 at ≥90%.
- **Total tokens** — input + output + cache for the whole session.
- **Context used** — based on the *last turn only*, not a running total — it answers "will my next message fit," not "how much have I used overall."
- **Estimated cost** — built-in pricing covers the current Sonnet/Opus/Haiku/Fable models out of the box; see [Cost estimates](#cost-estimates) to override it.

## Session panel

Click the Claude segment (or run **Claude Statusline: Open Session Panel**) to open a panel beside your editor:

![The session panel: sessions in this workspace, a make-primary button, a compaction note, a 7-day spend chart, and spend by model](docs/images/panel-anatomy.png)

- **Sessions in this workspace** — every Claude Code transcript found here, with the "primary" one (the one the status bar tracks) marked. Running more than one session at once? Use **Make primary** or the **Claude Statusline: Switch Primary Session** command to pick a different one.
- **Last 7 days** — a spend chart and per-model breakdown for this workspace, stored locally and auto-pruned past 7 days.
- **Compaction** — a heuristic count of likely compaction events for the primary session, since context % only reflects the last turn. Best-effort, not exact (see [details](#how-compaction-detection-works)).

## Install

**Try it without installing anything:**

1. Open this folder in VS Code.
2. Press `F5` (Run → Start Debugging) — this compiles the extension and opens an Extension Development Host window with it loaded.
3. Open any folder in that new window; the segments appear bottom-right.

**Install it into your real VS Code:**

```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension vscode-claude-statusline-0.3.0.vsix
```

Then reload the window (`Cmd+Shift+P` → "Developer: Reload Window"). After code changes, repeat the last two commands to update it.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `claudeStatusline.enabled` | `true` | Show or hide the Claude segment. |
| `claudeStatusline.pollIntervalMs` | `2000` | Fallback poll interval, alongside the file watcher. |
| `claudeStatusline.contextWindowTokens` | `1000000` | Context window size, used for context % and compaction detection. Lower this for a 200K-window model like Haiku 4.5. |
| `claudeStatusline.sessionFile` | `""` | Pin one exact transcript path — overrides auto-detection and the panel's primary-session picker. Leave empty to auto-detect. |
| `claudeStatusline.pricing` | `{}` | Per-model USD rates per 1M tokens; overrides or extends the built-in defaults (see [Cost estimates](#cost-estimates)). |

## Commands

| Command | What it does |
|---|---|
| `Claude Statusline: Refresh` | Force a re-read of the current transcript. |
| `Claude Statusline: Open Session Panel` | Open the webview panel (also bound to clicking the Claude segment). |
| `Claude Statusline: Switch Primary Session` | Pick which concurrent session in this workspace is tracked as primary. |

## Details

<details>
<summary><strong>Where the session data comes from</strong></summary>

There is no public API for Claude Code session telemetry. This extension reads the same local transcript files Claude Code already writes to disk:

```
~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl
```

It scans every folder in your (possibly multi-root) workspace for a matching transcript directory, then auto-picks the most recently modified `.jsonl` file across all of them as the "primary" session, re-parsing it on file changes plus a periodic poll as a fallback. This is reverse-engineered from observed behavior, not a documented contract — if Claude Code changes its storage format, update `src/claudeSession/transcriptLocator.ts` and `src/claudeSession/transcriptParser.ts` to match.

If multiple sessions are running concurrently in the workspace, auto-pick can grab the wrong one — use the session panel's "Make primary" button, the **Claude Statusline: Switch Primary Session** command, or pin an exact file with `claudeStatusline.sessionFile` (which always wins over both).
</details>

<details>
<summary><strong id="cost-estimates">Cost estimates</strong></summary>

Built-in default USD rates ship for the current model lineup (Sonnet, Opus, Haiku, Fable) as of 2026-08, so cost shows without any setup. Anthropic's rates change over time, so verify current pricing before relying on it for anything beyond a rough estimate. Override a model's rate, or add one for a model not in the defaults, via `claudeStatusline.pricing`:

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

Entries here override the shipped default for that model id; models with neither a default nor a configured entry show cost as `n/a`.
</details>

<details>
<summary><strong id="how-compaction-detection-works">How compaction detection works</strong></summary>

Claude Code transcripts carry no explicit compaction marker (verified against real on-disk transcripts, including multi-thousand-line sessions). This heuristically infers a compaction from a sharp drop in per-turn context tokens: a turn using at least 10% of the context window followed by a turn using less than 40% of that. False negatives and positives are both possible — treat the count as a rough signal, not a log.
</details>

<details>
<summary><strong>Status bar position</strong></summary>

Both segments live on the **right** side of the status bar, past everything else VS Code or other extensions add — editor stats first, the Claude session badge at the very outer edge. That's deliberate: `createStatusBarItem` priority controls left/right ordering, so both use very low (negative) priorities to guarantee they land past the built-in line/column, encoding, and language-mode indicators rather than competing with them for space.
</details>

## Development

```bash
npm install
npm run compile   # or: npm run watch
```
