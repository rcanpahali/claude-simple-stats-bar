---
name: prepare-release
description: Bump the extension version, roll CHANGELOG's Unreleased section, and build a .vsix for manual upload to the Marketplace.
disable-model-invocation: true
---

# Release a .vsix

Bumps the version, rolls [CHANGELOG.md](../../../CHANGELOG.md)'s `[Unreleased]` section into a dated release, and runs `npm run package` to produce a `.vsix` the user can drag-and-drop onto the [VS Code Marketplace](https://marketplace.visualstudio.com/manage) or [Open VSX](https://open-vsx.org/) upload page. It does not commit, tag, push, or publish via the `Publish Extension` GitHub Actions workflow — those stay explicit, separate steps.

## Steps

1. Read `version` from [package.json](../../../package.json) and the `## [Unreleased]` section of [CHANGELOG.md](../../../CHANGELOG.md).
2. If `[Unreleased]` has no entries under it, stop and tell the user there's nothing to release — don't invent changelog content or bump the version anyway.
3. Pick the next version:
   - Default to a patch bump (`x.y.Z+1`).
   - Only bump minor or major, or use a specific version, if the user said so when invoking this skill.
4. Update `version` in `package.json` to the new version.
5. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [x.y.z] - <today's date>` (today's date as `YYYY-MM-DD`), keeping its entries exactly as they are. Don't add a fresh empty `## [Unreleased]` header back above it — one gets added the next time a change needs it.
6. Run `npm run package` (removes any stale `.vsix`, runs `tsc`, then `vsce package`) and confirm it succeeds.
7. Report: the old → new version, and the path to the resulting `claude-simple-stats-bar-x.y.z.vsix` in the repo root, ready to upload. Note that `package.json` and `CHANGELOG.md` now have uncommitted changes — ask before committing, per the repo's normal git etiquette.
