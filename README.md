# Claude Simple Stats Bar (VS Code)

Your Claude Code session's model, token usage, context left, and running cost — live in the VS Code status bar.

![Status bar showing the Claude segment at the right edge of the window](docs/images/statusbar-hero.png)

## What it does

Claude Simple Stats Bar adds a Claude segment to the far right of your status bar: current model, total tokens, context used, and estimated cost, all updating live as your session's transcript grows. Click it (or run **Claude Simple Stats Bar: Open Session Panel**) to open a full panel with your other sessions, recent spend, and compaction history.

It's built so you can see where a session stands — and what it's costing — without breaking flow to check a terminal or a dashboard.

## Claude segment, explained

![Anatomy of the Claude segment: model, total tokens, context used, estimated cost, and the three warning-icon states](docs/images/statusbar-anatomy.png)

- **Model** — the icon doubles as a context-usage warning light: it stays neutral below 70%, switches to a warning triangle at ≥70%, and a flame at ≥90%.
- **Total tokens** — input + output + cache for the whole session.
- **Context used** — based on the *last turn only*, not a running total — it answers "will my next message fit," not "how much have I used overall."
- **Estimated cost** — built-in pricing covers the current Sonnet/Opus/Haiku/Fable models out of the box; see [Cost estimates](#cost-estimates) to override it.

## Hover for details

Hover over the Claude segment for the full token breakdown — input, output, cache write, and cache read separately — plus the transcript path being tracked:

![Tooltip shown when hovering over the Claude segment, with a per-category token breakdown and the transcript path](docs/images/statusbar-hover.png)

## Session panel

Click the Claude segment (or run **Claude Simple Stats Bar: Open Session Panel**) to open a panel beside your editor:

![Session panel showing sessions in this workspace, a compaction note, a 7-day spend chart, and spend by model](docs/images/panel-anatomy.png)

1. **Sessions in this workspace** — every Claude Code transcript found here, with the "primary" one (the one the status bar tracks) marked. Running more than one session at once? Use **Make primary** or the **Claude Simple Stats Bar: Switch Primary Session** command to pick a different one.
2. **Last 7 days** — a spend chart and per-model breakdown for this workspace, stored locally and auto-pruned past 7 days.
3. **Compaction** — a heuristic count of likely compaction events for the primary session, since context % only reflects the last turn. Best-effort, not exact (see [details](#how-compaction-detection-works)).

## Settings

| Setting | Default | What it does |
|---|---|---|
| `claudeStatusline.enabled` | `true` | Show or hide the Claude segment. |
| `claudeStatusline.pollIntervalMs` | `2000` | How often to re-check the transcript file, alongside the file watcher. |
| `claudeStatusline.contextWindowTokens` | `1000000` | Context window size, used for context % and compaction detection. Lower this for a 200K-window model like Haiku 4.5. |
| `claudeStatusline.sessionFile` | `""` | Pin one exact transcript path — overrides auto-detection and the panel's primary-session picker. Leave empty to auto-detect. |
| `claudeStatusline.pricing` | `{}` | Per-model USD rates per 1M tokens; overrides or extends the built-in defaults (see [Cost estimates](#cost-estimates)). |

## Commands

| Command | What it does |
|---|---|
| `Claude Simple Stats Bar: Refresh` | Force a re-read of the current transcript. |
| `Claude Simple Stats Bar: Open Session Panel` | Open the webview panel (also bound to clicking the Claude segment). |
| `Claude Simple Stats Bar: Switch Primary Session` | Pick which concurrent session in this workspace is tracked as primary. |

## Install

**Try it without installing anything:**

1. Clone the repo and open the folder in VS Code: `git clone https://github.com/rcanpahali/vscode-claude-statusline.git`
2. Press `F5` — this compiles the extension and opens an Extension Development Host window with it loaded.
3. Open any folder in that new window; the Claude segment appears bottom-right.

**Install it into your real VS Code:**

```bash
git clone https://github.com/rcanpahali/vscode-claude-statusline.git
cd vscode-claude-statusline
npm install
npm run compile
npx @vscode/vsce package
code --install-extension vscode-claude-statusline-0.3.0.vsix
```

Then reload the window (`Cmd+Shift+P` → "Developer: Reload Window"). After code changes, repeat the last two commands to update it.

## Details

<details>
<summary><strong>Where the session data comes from</strong></summary>

There is no public API for Claude Code session telemetry. This extension reads the same local transcript files Claude Code already writes to disk:

```
~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl
```

It scans every folder in your (possibly multi-root) workspace for a matching transcript directory, then auto-picks the most recently modified `.jsonl` file across all of them as the "primary" session, re-parsing it on file changes plus a periodic poll as a fallback. This is reverse-engineered from observed behavior, not a documented contract — if Claude Code changes its storage format, update `src/claudeSession/transcriptLocator.ts` and `src/claudeSession/transcriptParser.ts` to match.

If multiple sessions are running concurrently in the workspace, auto-pick can grab the wrong one — use the session panel's "Make primary" button, the **Claude Simple Stats Bar: Switch Primary Session** command, or pin an exact file with `claudeStatusline.sessionFile` (which always wins over both).
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

The Claude segment lives on the **right** side of the status bar, past everything else VS Code or other extensions add. This is deliberate: `createStatusBarItem` priority controls left/right ordering, so it uses a very low (negative) priority to guarantee it lands past the built-in line/column, encoding, and language-mode indicators rather than competing with them for space.
</details>
