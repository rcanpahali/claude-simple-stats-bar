import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Claude Code stores per-workspace session transcripts under
 * ~/.claude/projects/<slug>/<session-id>.jsonl, where <slug> is the
 * workspace's absolute path with path separators replaced by "-".
 * This mirrors observed on-disk layout, not a documented public API,
 * so treat it as best-effort and expect it to need updates if Claude
 * Code changes its storage format.
 */
function encodeWorkspacePath(workspacePath: string): string {
  return workspacePath.replace(/[\\/]/g, "-");
}

export function findProjectTranscriptDir(
  workspacePath: string
): string | undefined {
  const slug = encodeWorkspacePath(workspacePath);
  const dir = path.join(os.homedir(), ".claude", "projects", slug);
  return fs.existsSync(dir) ? dir : undefined;
}

/** Resolves transcript directories for every folder in a (possibly multi-root) workspace. */
export function findAllProjectTranscriptDirs(
  workspacePaths: readonly string[]
): string[] {
  const dirs = new Set<string>();
  for (const workspacePath of workspacePaths) {
    const dir = findProjectTranscriptDir(workspacePath);
    if (dir) dirs.add(dir);
  }
  return [...dirs];
}

export function findLatestTranscript(dir: string): string | undefined {
  const files = findAllTranscripts([dir]);
  return files[0]?.file;
}

export interface TranscriptFileInfo {
  file: string;
  mtimeMs: number;
}

/** Lists every .jsonl transcript across the given directories, most recently modified first. */
export function findAllTranscripts(dirs: readonly string[]): TranscriptFileInfo[] {
  const results: TranscriptFileInfo[] = [];

  for (const dir of dirs) {
    let names: string[];
    try {
      names = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
        .map((entry) => entry.name);
    } catch {
      continue;
    }

    for (const name of names) {
      const full = path.join(dir, name);
      try {
        const mtimeMs = fs.statSync(full).mtimeMs;
        results.push({ file: full, mtimeMs });
      } catch {
        continue;
      }
    }
  }

  return results.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
