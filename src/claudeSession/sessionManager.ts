import * as vscode from "vscode";
import {
  findAllProjectTranscriptDirs,
  findAllTranscripts,
  TranscriptFileInfo,
} from "./transcriptLocator";

const MANUAL_PRIMARY_KEY = "claudeSimpleStatsBar.manualPrimarySession";

/**
 * Tracks which transcript is "primary" when multiple Claude Code sessions run
 * concurrently in the same (possibly multi-root) workspace: auto-picks the
 * most recently modified one, unless the user has manually pinned a different
 * one via the "Switch Primary Session" command. The pin is stored in
 * `workspaceState` so it survives a VS Code restart.
 */
export class SessionManager {
  private manualPrimary?: string;
  /** Files seen on the previous call, used to detect a brand new session. Left `undefined` until the first call so a restart doesn't treat every pre-existing file as "new" and blow away a restored pin. */
  private knownFiles?: Set<string>;

  constructor(private readonly workspaceState?: vscode.Memento) {
    this.manualPrimary = workspaceState?.get<string>(MANUAL_PRIMARY_KEY);
  }

  listSessions(): TranscriptFileInfo[] {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const dirs = findAllProjectTranscriptDirs(folders.map((f) => f.uri.fsPath));
    return findAllTranscripts(dirs);
  }

  resolvePrimary(): string | undefined {
    const sessions = this.listSessions();
    this.clearPinOnNewSession(sessions);

    if (this.manualPrimary) {
      if (sessions.some((s) => s.file === this.manualPrimary)) {
        return this.manualPrimary;
      }
      this.manualPrimary = undefined;
      this.workspaceState?.update(MANUAL_PRIMARY_KEY, undefined);
    }

    return sessions[0]?.file;
  }

  /**
   * A transcript file that wasn't present last time means a new Claude Code
   * session just started. That should become primary immediately, overriding
   * any earlier manual pin — otherwise the status bar keeps reporting a
   * possibly long-idle pinned session while a fresh one is actually running.
   */
  private clearPinOnNewSession(sessions: TranscriptFileInfo[]): void {
    const currentFiles = new Set(sessions.map((s) => s.file));

    if (this.knownFiles && this.manualPrimary) {
      const hasNewFile = [...currentFiles].some((f) => !this.knownFiles!.has(f));
      if (hasNewFile) {
        this.manualPrimary = undefined;
        this.workspaceState?.update(MANUAL_PRIMARY_KEY, undefined);
      }
    }

    this.knownFiles = currentFiles;
  }

  setManualPrimary(file: string): void {
    this.manualPrimary = file;
    this.workspaceState?.update(MANUAL_PRIMARY_KEY, file);
  }
}
