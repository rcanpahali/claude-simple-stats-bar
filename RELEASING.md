# Releasing

1. Commit everything you don't want in the release commit. `release-it` sweeps the whole working tree — modified *and* new files — into it. Also check every change has a changeset in `.changeset/` (one `.md` per change).
2. `gh auth status` — must be logged in.
3. `npm run release`

That's it. `release-it` bumps the version + CHANGELOG from the changesets, commits, tags, pushes, and creates the GitHub Release. The Release triggers `.github/workflows/publish.yml`, which packages the `.vsix` and publishes to the VS Code Marketplace and Open VSX.
