import * as vscode from "vscode";

export function createEditorStatusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -900
  );
  item.show();
  return item;
}

export function updateEditorStatusBarItem(item: vscode.StatusBarItem): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    item.text = "$(file) no file";
    item.tooltip = "No active editor";
    return;
  }

  const doc = editor.document;
  const pos = editor.selection.active;
  const fileName = doc.isUntitled
    ? "Untitled"
    : vscode.workspace.asRelativePath(doc.uri);

  item.text = `$(file-code) ${fileName} · $(location) Ln ${pos.line + 1}, Col ${
    pos.character + 1
  } · $(list-ordered) ${doc.lineCount} lines`;
  const tooltip = new vscode.MarkdownString(
    [
      `**$(file-code) ${fileName}**`,
      "",
      `$(location) Cursor: line ${pos.line + 1}, column ${pos.character + 1}`,
      `$(list-ordered) Total lines: ${doc.lineCount}`,
      `$(symbol-keyword) Language: ${doc.languageId}`,
    ].join("\n")
  );
  tooltip.supportThemeIcons = true;
  item.tooltip = tooltip;
}
