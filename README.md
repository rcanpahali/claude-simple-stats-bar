# Claude Statusline (VS Code)

Inspired by [Claude Code's statusline](https://gist.github.com/AKCodez/ffb420ba6a7662b5c3dda2edce7783de) —
a live info bar rendered in the terminal. This is the VS Code equivalent:
two segments pinned to the far right edge of the status bar.

This is exactly what they look like, right now, in this repo:

```
📄 extension.ts · 📍 Ln 42, Col 7 · 🔢 210 lines      🤖 claude-sonnet-5 · ⚡ 2.4M tok · 📊 38% ctx · 💳 $0.842
```

What you're editing, and what your Claude Code session is costing you — both live, both anchored at the edge of the window.

## What it shows

**Editor segment** — updates on every cursor move and edit:

- 📄 `$(file-code)` the active file, relative to the workspace root
- 📍 `$(location)` cursor position (line, column)
- 🔢 `$(list-ordered)` total line count

**Claude Code segment** — updates on every transcript change:

- 🤖 `$(hubot)` model id (swaps to 🔥 `$(flame)` at ≥90% context used, ⚠️ `$(warning)` at ≥70%)
- ⚡ `$(pulse)` total tokens for the session (input + output + cache)
- 📊 `$(dashboard)` estimated context-window usage, based on the last turn
- 💳 `$(credit-card)` estimated cost — `n/a` until you configure pricing (see below)

Click the Claude segment for a one-line summary in a notification. Hover
either segment for the full breakdown.

## Position

Both segments live on the **right** side of the status bar, past everything
else VS Code or other extensions add — editor stats first, the Claude
session badge at the very outer edge. That's deliberate: `createStatusBarItem`
priority controls left/right ordering, so both use very low (negative)
priorities to guarantee they land past the built-in line/column, encoding,
and language-mode indicators rather than competing with them for space.

## Where the session data comes from

There is no public API for Claude Code session telemetry. This extension
reads the same local transcript files Claude Code already writes to disk:

```
~/.claude/projects/<workspace-path-with-slashes-replaced-by-dashes>/<session-id>.jsonl
```

It auto-detects the most recently modified `.jsonl` file for your first
workspace folder, then re-parses it on file changes plus a periodic poll as
a fallback. This is reverse-engineered from observed behavior, not a
documented contract — if Claude Code changes its storage format, update
`src/claudeSession/transcriptLocator.ts` and
`src/claudeSession/transcriptParser.ts` to match.

Auto-detection picks the wrong file if you run multiple concurrent sessions
in the same workspace. Pin one explicitly with `claudeStatusline.sessionFile`
when that happens.

## Cost estimates

No pricing ships by default — Anthropic's rates change over time, and baking
numbers in here would go stale silently. Cost reads `n/a` until you set
`claudeStatusline.pricing`:

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

Verify current pricing before entering it — this extension doesn't fetch or
validate rates for you.

## Settings

- `claudeStatusline.enabled` (default `true`) — show or hide the Claude session segment.
- `claudeStatusline.pollIntervalMs` (default `2000`) — fallback poll interval, alongside the file watcher.
- `claudeStatusline.contextWindowTokens` (default `200000`) — context window size used to estimate context-usage %.
- `claudeStatusline.sessionFile` (default `""`) — pin a specific transcript path; leave empty to auto-detect.
- `claudeStatusline.pricing` (default `{}`) — per-model USD rates per 1M tokens, used for cost estimates.

## Install

**Try it first, without installing anything permanently:**

1. Open this folder in VS Code.
2. Press `F5` (Run → Start Debugging). This compiles the extension and opens
   an Extension Development Host window with it loaded.
3. Open any folder in that new window — the segments appear bottom-right.

**Install it into your real VS Code:**

```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension vscode-claude-statusline-0.2.0.vsix
```

Then reload the window (`Cmd+Shift+P` → "Developer: Reload Window"). After
code changes, repeat the last two commands to update it.

## Development

```bash
npm install
npm run compile   # or: npm run watch
```

## Commands

- `Claude Statusline: Refresh` — force a re-read of the current transcript.
- `Claude Statusline: Show Session Details` — one-line summary in a notification.
