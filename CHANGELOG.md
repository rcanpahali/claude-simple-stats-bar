# Changelog

Notable changes to this extension, by version. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.3] - 2026-08-17

### Changed

- Updated `claude-sonnet-5` default pricing to $2/$10 per million input/output tokens (from $3/$15).

### Fixed

- The "Last 7 days" chart and "Spend by model" breakdown in the session panel now attribute each turn's cost to the calendar day it actually happened on (read from the transcript's own per-turn timestamp), instead of the day the extension first observed it. Previously, any transcript predating the extension's tracking of it — a fresh install, or a workspace whose history file had gone missing — had its entire lifetime spend dumped onto "today," while the days that spend actually happened on showed $0.00. Existing `history.json` files from before this fix are discarded once and rebuilt from transcripts on next launch.

## [0.4.2] - 2026-08-16

### Changed

- `claudeSimpleStatsBar.showContextBar` now defaults to `false`, so the context-usage segment shows just the icon, tag, and percentage out of the box. Turn it on to bring the 6-segment fill bar back.

## [0.4.1] - 2026-08-15

### Added

- Badge row in the README: Marketplace and Open VSX version, supported VS Code engine, license, GitHub Sponsors, and Buy Me a Coffee.

## [0.4.0] - 2026-08-15

### Added

- `claudeSimpleStatsBar.showContextBar` setting to hide the 6-segment fill bar while keeping the severity icon, tag, and percentage.
- "Extension Settings" button in the session panel, opening the Settings UI filtered to this extension.

### Changed

- Renamed all command and setting ids from `claudeStatusline.*` to `claudeSimpleStatsBar.*` to match the extension's display name, superseding the 0.3.0 decision to leave them unchanged — update any existing `settings.json`/`keybindings.json` entries.
- Rewrote the README for the Marketplace listing and moved version history into this changelog.
- Updated the extension icon.
- Context-usage indicator now shows a 6-segment fill bar and a `CALM`/`MED`/`WARN`/`CRIT` severity tag, replacing the icon-only escalation (calm <50%, medium 50–69%, warning 70–89%, critical ≥90%). The severity icon sits next to the tag; the segment's leading icon is now always `$(dashboard)`.
- Hover tooltip's "Context used" line now shows just the percentage (e.g. `~58%`) instead of repeating the status bar's severity tag and fill bar — that escalation is status-bar-only. Its Model line also now uses the same `$(dashboard)` icon as the status bar, replacing a mismatched one.
- `claudeSimpleStatsBar.contextWindowTokens` now defaults to `0`, which auto-detects the context window from the transcript's model (1,000,000 for Sonnet/Opus/Fable, 200,000 for Haiku 4.5) instead of always assuming 1,000,000; set it to a nonzero value to override.
- "Switch Primary Session" (and the panel's "Make primary") now persists the pinned session in workspace state, surviving a VS Code restart.
- Trimmed settings descriptions for brevity.
- Session panel rows now show a timestamp next to the name to distinguish concurrent or same-named sessions: `last active <time>` for sessions with a live CLI process, and a scaled `ended <time>` for those without one — a clock time today, "yesterday" plus a clock time, or a full date with weekday (and year, if not this year).

### Removed

- `claudeSimpleStatsBar.sessionFile` setting — pinning a session is now handled entirely by "Switch Primary Session" / "Make primary", which persists across restarts.
- `claudeSimpleStatsBar.enabled` setting — disabling just the Claude segment while keeping this extension's editor-stats segment is no longer possible; disable the whole extension from the Extensions list instead.

## [0.3.0] - 2026-08-14

### Added

- Multi-session tracking: every Claude Code transcript found in the workspace is detected, with a switchable "primary" session.
- Session panel (`Claude Simple Stats Bar: Open Session Panel`) showing sessions in the workspace, 7-day spend history, and per-model spend.
- `Claude Simple Stats Bar: Switch Primary Session` command.
- Compaction detection heuristic, surfaced in the session panel.
- `claudeStatusline.pricing` setting for configuring or overriding per-model cost rates.

### Changed

- Renamed the extension from "Claude Statusline" to "Claude Simple Stats Bar" (command and setting ids are unchanged, so existing `settings.json` entries keep working).

## [0.2.0] - 2026-08-14

### Added

- Initial release: status bar item showing model, total tokens, context-window usage %, and estimated cost for the active Claude Code session.
- Auto-detection of the current workspace's transcript under `~/.claude/projects/`.
- `claudeStatusline.enabled`, `claudeStatusline.pollIntervalMs`, `claudeStatusline.contextWindowTokens`, and `claudeStatusline.sessionFile` settings.
- `Claude Simple Stats Bar: Refresh` command.
