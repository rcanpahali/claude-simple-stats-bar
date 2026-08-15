import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * The Claude Code CLI registers each running process under
 * ~/.claude/sessions/<pid>.json with its transcript `sessionId` and a
 * friendly derived `name` (e.g. "claude-simple-stats-bar-af"). This is
 * how the CLI itself labels concurrent sessions in the same workspace,
 * so it's a better identifier than the raw transcript UUID. Undocumented
 * on-disk layout, best-effort: sessions that have already ended won't
 * have an entry here.
 */
export function loadSessionNames(): Map<string, string> {
  const names = new Map<string, string>();
  const dir = path.join(os.homedir(), ".claude", "sessions");

  let entries: string[];
  try {
    entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
  } catch {
    return names;
  }

  for (const entry of entries) {
    try {
      const raw = fs.readFileSync(path.join(dir, entry), "utf8");
      const data = JSON.parse(raw);
      if (typeof data?.sessionId === "string" && typeof data?.name === "string") {
        names.set(data.sessionId, data.name);
      }
    } catch {
      continue;
    }
  }

  return names;
}

/** First 8 chars of a session id — just enough to disambiguate rows without the full UUID's width. */
export function shortSessionId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

/**
 * Label for a session with no live/derived name (its CLI process has already
 * exited, so no friendly name was ever recoverable — see loadSessionNames).
 */
export function fallbackSessionLabel(sessionId: string, mtimeMs: number): string {
  const time = new Date(mtimeMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${shortSessionId(sessionId)} · ${time}`;
}
