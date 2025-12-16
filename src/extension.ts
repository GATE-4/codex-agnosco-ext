import * as vscode from "vscode";

class CodexAgnoscoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codexAgnosco.sidebarView";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getInitialHtml();
  }

  public updateContent(content: string) {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(content);
    }
  }

  private _getInitialHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codex Agnosco</title>
        <style>
            body {
                padding: 10px;
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
            }
            .placeholder {
                color: var(--vscode-descriptionForeground);
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="placeholder">Select code and run "Explain in Sidebar" to see analysis here.</div>
    </body>
    </html>`;
  }

  private _getHtmlForWebview(content: string): string {
    const escapedContent = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codex Agnosco</title>
        <style>
            body {
                padding: 10px;
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                line-height: 1.6;
            }
            .content {
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            h2 {
                color: var(--vscode-textLink-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 5px;
            }
        </style>
    </head>
    <body>
        <h2>Code Analysis</h2>
        <div class="content">${escapedContent}</div>
    </body>
    </html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new CodexAgnoscoViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CodexAgnoscoViewProvider.viewType,
      provider
    )
  );

  let newTab = vscode.commands.registerCommand(
    "codexAgnosco.explainNewTab",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const lineNumber = editor.selection.active.line;

      console.log(`FilePath: ${filePath}`);
      console.log(`Linenumber: ${lineNumber}`);

      try {
        const response = await fetch("http://localhost:5242/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath, lineNumber }),
        });

        const result: any = await response.json();
        showResultInEditor("Codex-Agnosco: " + result.explanation);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
      }
    }
  );

  let sideBar = vscode.commands.registerCommand(
    "codexAgnosco.explainSideBar",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const filePath = editor.document.uri.fsPath;
      const lineNumber = editor.selection.active.line;

      console.log(`FilePath: ${filePath}`);
      console.log(`Linenumber: ${lineNumber}`);

      await vscode.commands.executeCommand("codexAgnosco.sidebarView.focus");

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing code...",
            cancellable: false,
          },
          async () => {
            const response = await fetch("http://localhost:5242/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filePath, lineNumber }),
            });

            const result: any = await response.json();
            provider.updateContent(result.explanation);
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
      }
    }
  );

  context.subscriptions.push(newTab);
  context.subscriptions.push(sideBar);
}

export async function showResultInEditor(result: string) {
  const doc = await vscode.workspace.openTextDocument({
    content: result,
    language: "csharp",
  });
  await vscode.window.showTextDocument(doc, {
    preview: false,
  });
}
