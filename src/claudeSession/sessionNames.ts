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

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Label for a session still running under a live CLI process — see loadSessionNames. */
export function activeSessionLabel(name: string, mtimeMs: number): string {
  return `${name} · last active ${formatTime(new Date(mtimeMs))}`;
}

/**
 * Label for a session with no live/derived name (its CLI process has already
 * exited, so no friendly name was ever recoverable — see loadSessionNames).
 * Scales with how long ago it ended: a clock time today, "yesterday" plus a
 * clock time, or a full date (with weekday, and year if not this year).
 */
export function fallbackSessionLabel(sessionId: string, mtimeMs: number): string {
  const ended = new Date(mtimeMs);
  const now = new Date();
  const id = shortSessionId(sessionId);

  if (isSameCalendarDay(ended, now)) {
    return `${id} · ended at ${formatTime(ended)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(ended, yesterday)) {
    return `${id} · ended yesterday at ${formatTime(ended)}`;
  }

  const monthDay = ended.toLocaleDateString([], { month: "long", day: "numeric" });
  const weekday = ended.toLocaleDateString([], { weekday: "short" });
  const dateLabel =
    ended.getFullYear() === now.getFullYear()
      ? `${monthDay}, ${weekday}`
      : `${monthDay}, ${ended.getFullYear()}, ${weekday}`;

  return `${id} · ended on ${dateLabel}`;
}
