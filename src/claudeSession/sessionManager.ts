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
    if (this.manualPrimary) {
      if (sessions.some((s) => s.file === this.manualPrimary)) {
        return this.manualPrimary;
      }
      this.manualPrimary = undefined;
      this.workspaceState?.update(MANUAL_PRIMARY_KEY, undefined);
    }

    return sessions[0]?.file;
  }

  setManualPrimary(file: string): void {
    this.manualPrimary = file;
    this.workspaceState?.update(MANUAL_PRIMARY_KEY, file);
  }
}
