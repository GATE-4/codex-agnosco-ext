import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "codexAgnosco.explainFunction",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const filePath = editor.document.uri.fsPath;
      const lineNumber = editor.selection.active.line;

      console.log(`FilePath: ${filePath}`);
      console.log(`Linenumber: ${lineNumber}`);

      const response = await fetch("http://localhost:5242/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, lineNumber }),
      });

      const result: any = await response.json();
      showResultInEditor("Codex-Agnosco: " + result.explanation);
    }
  );

  context.subscriptions.push(disposable);
}

export async function showResultInEditor(result: string) {
  const doc = await vscode.workspace.openTextDocument({
    content: result,
    language: "csharp", // optional: enables syntax highlighting for code
  });
  await vscode.window.showTextDocument(doc, {
    preview: false, // keeps it open when you open another file
  });
}

