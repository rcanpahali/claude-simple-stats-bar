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

export function findLatestTranscript(dir: string): string | undefined {
  let names: string[];
  try {
    names = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => entry.name);
  } catch {
    return undefined;
  }

  let latest: { file: string; mtimeMs: number } | undefined;
  for (const name of names) {
    const full = path.join(dir, name);
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(full).mtimeMs;
    } catch {
      continue;
    }
    if (!latest || mtimeMs > latest.mtimeMs) {
      latest = { file: full, mtimeMs };
    }
  }
  return latest?.file;
}
