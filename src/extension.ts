import * as vscode from "vscode";
import { createEditorStatusBarItem, updateEditorStatusBarItem } from "./editorStatusBar";
import { ClaudeSessionStatusBar } from "./claudeSession/claudeStatusBar";

export function activate(context: vscode.ExtensionContext): void {
  const editorItem = createEditorStatusBarItem();
  context.subscriptions.push(editorItem);

  const refreshEditorItem = () => updateEditorStatusBarItem(editorItem);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refreshEditorItem),
    vscode.window.onDidChangeTextEditorSelection(refreshEditorItem),
    vscode.workspace.onDidChangeTextDocument(refreshEditorItem)
  );
  refreshEditorItem();

  const claudeBar = new ClaudeSessionStatusBar();
  context.subscriptions.push(claudeBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("claudeStatusline.refresh", () => claudeBar.refresh()),
    vscode.commands.registerCommand("claudeStatusline.showSessionDetails", () =>
      claudeBar.showDetails()
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("claudeStatusline")) {
        claudeBar.reloadConfig();
      }
    })
  );
}

export function deactivate(): void {}
