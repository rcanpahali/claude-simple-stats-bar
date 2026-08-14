# CLAUDE.md

Instructions for Claude Code when working in this repo.

## Prototype before implementing visual changes

Any visual change to the status bar item or its tooltip — bar style, icons, severity tiers, spacing, colors — gets prototyped before it gets implemented:

1. Update the HTML prototype under `prototypes/` (currently `prototypes/rule-ticks.html`, which covers both the status bar and tooltip previews as tabs sharing one slider) to show the change.
2. Get explicit sign-off on the prototype from whoever asked for it.
3. Only then implement it in `src/claudeSession/claudeStatusBar.ts`.

Don't skip straight to step 3 from a description of the change, even a precise one — the point is seeing and reacting to the actual rendered result first.

This does not apply to non-visual changes (bug fixes, refactors, new settings, parsing logic, etc.) — only to anything that changes what the status bar or tooltip look like.

Prototypes stay in the repo (`prototypes/`, excluded from the packaged VSIX via `.vscodeignore`), not published as external links.
