import * as vscode from "vscode";
import {
  findAllProjectTranscriptDirs,
  findAllTranscripts,
  TranscriptFileInfo,
} from "./transcriptLocator";

/**
 * Tracks which transcript is "primary" when multiple Claude Code sessions run
 * concurrently in the same (possibly multi-root) workspace: auto-picks the
 * most recently modified one, unless the user has manually pinned a different
 * one via the "Switch Primary Session" command.
 */
export class SessionManager {
  private manualPrimary?: string;

  listSessions(): TranscriptFileInfo[] {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const dirs = findAllProjectTranscriptDirs(folders.map((f) => f.uri.fsPath));
    return findAllTranscripts(dirs);
  }

  /** `pinnedFile` (the `claudeStatusline.sessionFile` setting) always wins when set. */
  resolvePrimary(pinnedFile: string | undefined): string | undefined {
    if (pinnedFile) return pinnedFile;

    const sessions = this.listSessions();
    if (this.manualPrimary) {
      if (sessions.some((s) => s.file === this.manualPrimary)) {
        return this.manualPrimary;
      }
      this.manualPrimary = undefined;
    }

    return sessions[0]?.file;
  }

  setManualPrimary(file: string): void {
    this.manualPrimary = file;
  }
}
