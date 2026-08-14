# Changelog

Notable changes to this extension, by version. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Rewrote the README for the Marketplace listing and moved version history into this changelog.
- Updated the extension icon.
- Context-usage indicator now shows a 6-segment fill bar and a `CALM`/`MED`/`WARN`/`CRIT` severity tag next to the model icon, replacing the icon-only escalation (calm <50%, medium 50–69%, warning 70–89%, critical ≥90%).

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
