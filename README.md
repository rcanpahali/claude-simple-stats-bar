# Claude Simple Stats Bar (VS Code)

Live Claude Code session stats — model, tokens, context left, cost — in the VS Code status bar.

![Status bar showing the Claude segment at the right edge of the window](docs/images/statusbar-hero.png)

## Features

- Status bar segment with current model, total tokens, context used, and estimated cost, updating live as the transcript grows.
- Context usage shown as a `CALM`/`MED`/`WARN`/`CRIT` tag next to a matching icon (neutral below 50%, a small graph at ≥50%, a warning triangle at ≥70%, a flame at ≥90%), plus an optional 6-segment fill bar — turn the bar off with `claudeStatusline.showContextBar` and keep just the icon, tag, and percentage.
- Hover tooltip with the full token breakdown (input / output / cache write / cache read) and the transcript path being tracked.
- Session panel with every session in the workspace, a 7-day spend chart, per-model spend, and a compaction count.
- Multi-session support — auto-detects every Claude Code transcript in the workspace, with a switchable primary.
- Configurable per-model pricing, adjustable poll interval, and a pinnable transcript path.

## Requirements

- VS Code 1.90 or newer.
- The Claude Code CLI, writing transcripts locally under `~/.claude/projects/`. This extension has no other data source — see [Where the data comes from](#where-the-data-comes-from).

## Claude segment, explained

![Anatomy of the Claude segment: model, total tokens, context used, estimated cost, and the four severity-tag states](docs/images/statusbar-anatomy.png)

- **Model** — the active model name, led by a dashboard icon.
- **Total tokens** — input + output + cache for the whole session.
- **Context used** — a severity icon (neutral, small graph, warning, or flame; see Features above) next to the `CALM`/`MED`/`WARN`/`CRIT` tag and an optional fill bar, based on the *last turn only*, not a running total. Answers "will my next message fit," not "how much have I used overall."
- **Estimated cost** — built-in pricing for the current Sonnet/Opus/Haiku/Fable lineup; override via `claudeStatusline.pricing` (see [Cost estimates](#cost-estimates)).

Hover the segment for a per-category token breakdown and the transcript path:

![Tooltip shown when hovering over the Claude segment, with a per-category token breakdown and the transcript path](docs/images/statusbar-hover.png)

## Session panel

Click the segment, or run **Claude Simple Stats Bar: Open Session Panel**:

![Session panel showing sessions in this workspace, a compaction note, a 7-day spend chart, and spend by model](docs/images/panel-anatomy.png)

1. **Sessions in this workspace** — every transcript found here, with the primary one marked. Running more than one session at once? Use **Make primary**, or the **Switch Primary Session** command, to pick a different one.
2. **Last 7 days** — a spend chart and per-model breakdown, stored locally and pruned past 7 days.
3. **Compaction** — a heuristic count of likely compaction events. See [Known limitations](#known-limitations).

## Settings

| Setting | Default | What it does |
|---|---|---|
| `claudeStatusline.enabled` | `true` | Show or hide the Claude segment. |
| `claudeStatusline.pollIntervalMs` | `2000` | How often to re-check the transcript file, alongside the file watcher. |
| `claudeStatusline.contextWindowTokens` | `1000000` | Context window size, used for context % and compaction detection. Lower this for a 200K-window model like Haiku 4.5. |
| `claudeStatusline.showContextBar` | `true` | Show the 6-segment fill bar next to the context-usage tag. Turn off to keep just the icon, tag, and percentage. |
| `claudeStatusline.sessionFile` | `""` | Pin one exact transcript path — overrides auto-detection and the panel's primary-session picker. |
| `claudeStatusline.pricing` | `{}` | Per-model USD rates per 1M tokens; overrides or extends the built-in defaults. See [Cost estimates](#cost-estimates). |

## Commands

| Command | What it does |
|---|---|
| `Claude Simple Stats Bar: Refresh` | Force a re-read of the current transcript. |
| `Claude Simple Stats Bar: Open Session Panel` | Open the webview panel (also bound to clicking the Claude segment). |
| `Claude Simple Stats Bar: Switch Primary Session` | Pick which concurrent session in this workspace is tracked as primary. |

## Where the data comes from

There's no public API for Claude Code session telemetry. This extension reads the same `.jsonl` transcript files Claude Code already writes to disk, under `~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl`. It scans every folder in a (possibly multi-root) workspace for a matching directory and picks the most recently modified file as primary, re-parsing it on file changes plus a periodic poll as a fallback.

This is reverse-engineered from observed transcript files, not a documented format. If Claude Code changes it, `src/claudeSession/transcriptLocator.ts` and `src/claudeSession/transcriptParser.ts` are where to look.

## Cost estimates

Built-in USD rates ship for the current Sonnet/Opus/Haiku/Fable lineup (as of 2026-08), so cost shows without any setup. Anthropic's pricing changes over time — verify current rates before relying on this for anything beyond a rough estimate. Override a model's rate, or add one that isn't built in, via `claudeStatusline.pricing`:

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

Models with neither a built-in default nor a configured entry show cost as `n/a`.

## Known limitations

- **Compaction count is a heuristic.** Transcripts carry no explicit compaction marker, so this infers one from a sharp drop in per-turn context tokens: a turn using at least 10% of the context window followed by one using less than 40%. False positives and negatives are both possible.
- **Multi-session auto-pick can grab the wrong transcript** if several sessions are running in the same workspace at once. Use the panel's **Make primary**, the **Switch Primary Session** command, or `claudeStatusline.sessionFile` to pin the one you want.
- **The Claude segment always sits on the far right** of the status bar, past everything VS Code or other extensions add. It uses a deliberately low priority so it doesn't compete with the built-in line/column, encoding, and language-mode indicators for space.

## Install

Not on the Marketplace yet. To run it locally:

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
