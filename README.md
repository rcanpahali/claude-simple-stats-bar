# Claude Simple Stats Bar (VS Code)

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/rcanpahali.claude-simple-stats-bar)](https://marketplace.visualstudio.com/items?itemName=rcanpahali.claude-simple-stats-bar)
[![Open VSX Version](https://img.shields.io/open-vsx/v/rcanpahali/claude-simple-stats-bar)](https://open-vsx.org/extension/rcanpahali/claude-simple-stats-bar)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/github/license/rcanpahali/claude-simple-stats-bar)](LICENSE)

[![Sponsor](https://img.shields.io/github/sponsors/rcanpahali?logo=githubsponsors&label=Sponsor)](https://github.com/sponsors/rcanpahali)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/rcanpahali)

Live Claude Code session stats — model, tokens, context left, cost — in the VS Code status bar.

![Status bar showing the Claude segment at the right edge of the window](docs/images/statusbar-hero.png)

## Features

- A status bar segment shows your model, total tokens, context used, and estimated cost. It updates live as you chat.
- Hover the segment for a full token breakdown and the transcript path.
- Click the segment for a session panel listing every session in the workspace, a 7-day spend chart, and spend by model.
- Pricing and poll interval are both configurable.

## Requirements

- VS Code 1.90 or newer.
- The Claude Code CLI, writing transcripts locally under `~/.claude/projects/`. This extension has no other data source.

## Claude segment

![Anatomy of the Claude segment: model, total tokens, context used, estimated cost, and the four severity-tag states](docs/images/statusbar-anatomy.png)

- **Model** — the active model name, led by a dashboard icon.
- **Total tokens** — input + output + cache for the whole session.
- **Context used** — the icon/tag/bar from Features above, based on the *last turn only*, not a running total. Answers "will my next message fit," not "how much have I used overall."
- **Estimated cost** — built-in pricing for the current Sonnet/Opus/Haiku/Fable lineup; override via `claudeSimpleStatsBar.pricing` (see [Cost estimates](#cost-estimates)).

Hover the segment for a per-category token breakdown and the transcript path:

![Tooltip shown when hovering over the Claude segment, with a per-category token breakdown and the transcript path](docs/images/statusbar-hover.png)

## Session panel

Click the segment, or run **Claude Simple Stats Bar: Open Session Panel**:

![Session panel showing sessions in this workspace with last-active/ended timestamps, a "Show more sessions" link, an Extension Settings button, a compaction note, a 7-day spend chart, and spend by model](docs/images/panel-anatomy.png)

1. **Sessions in this workspace** — every transcript found here, with the primary one marked. Each row shows a timestamp to tell sessions apart: `last active <time>` for a still-running session, or a scaled `ended <time>` for one that's finished. Only the 6 most recent show by default — click **Show more sessions** to reveal the rest. Running more than one session at once? Use **Make primary**, or the **Switch Primary Session** command, to pick a different one — the pick persists across VS Code restarts.
2. **Last 7 days** — a spend chart and per-model breakdown, stored locally and pruned past 7 days.
3. **Compaction** — a heuristic count of likely compaction events.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `claudeSimpleStatsBar.pollIntervalMs` | `2000` | How often to re-check the transcript file, alongside the file watcher. |
| `claudeSimpleStatsBar.contextWindowTokens` | `0` | Override the context window size used for context % and compaction detection. `0` auto-detects from the model (1,000,000 for Sonnet/Opus/Fable, 200,000 for Haiku 4.5). |
| `claudeSimpleStatsBar.showContextBar` | `true` | Show the 6-segment fill bar next to the context-usage tag. Turn off to keep just the icon, tag, and percentage. |
| `claudeSimpleStatsBar.pricing` | `{}` | Per-model USD rates per 1M tokens; overrides or extends the built-in defaults. See [Cost estimates](#cost-estimates). |

## Commands

| Command | What it does |
|---|---|
| `Claude Simple Stats Bar: Refresh` | Force a re-read of the current transcript. |
| `Claude Simple Stats Bar: Open Session Panel` | Open the webview panel (also bound to clicking the Claude segment). |
| `Claude Simple Stats Bar: Switch Primary Session` | Pick which concurrent session in this workspace is tracked as primary. |

## Where the data comes from

There's no public API for Claude Code session telemetry. This extension reads the same `.jsonl` transcript files Claude Code already writes to disk, under `~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl`. It scans every folder in a (possibly multi-root) workspace for a matching directory and picks the most recently modified file as primary, re-parsing it on file changes plus a periodic poll as a fallback.

## Cost estimates

Built-in USD rates ship for the current Sonnet/Opus/Haiku/Fable lineup (as of 2026-08), so cost shows without any setup. Anthropic's pricing changes over time — verify current rates before relying on this for anything beyond a rough estimate. Override a model's rate, or add one that isn't built in, via `claudeSimpleStatsBar.pricing`:

```json
{
  "claudeSimpleStatsBar.pricing": {
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

## Install

Search for **Claude Simple Stats Bar** in the VS Code Extensions view, or install from the [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=rcanpahali.claude-simple-stats-bar).

**Or build it from source:**

```bash
git clone https://github.com/rcanpahali/claude-simple-stats-bar.git
cd claude-simple-stats-bar
npm install
npm run compile
npx @vscode/vsce package
code --install-extension claude-simple-stats-bar-0.4.0.vsix
```

Then reload the window (`Cmd+Shift+P` → "Developer: Reload Window"). After code changes, repeat the last two commands to update it.

Or press `F5` from a clone to compile and open an Extension Development Host window with it loaded, without installing anything.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
