// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { EXTENSION_SCHEMA, goASMURI } from "./format";
import { AssemblyDocumentProvider } from "./documents/document-provider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const documentProvider = new AssemblyDocumentProvider();

  context.subscriptions.push(
    // Providers
    vscode.workspace.registerTextDocumentContentProvider(
      EXTENSION_SCHEMA,
      documentProvider
    ),
    // Commands
    vscode.commands.registerCommand("daanv2-go-asm.show-assembly", async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (uri === undefined) {
        vscode.window.showErrorMessage(
          "Show Go assembly only works on an opened document"
        );
        return;
      }

      const doc = await vscode.workspace.openTextDocument(goASMURI(uri), {});
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, true);
    }),
    // Events
    vscode.workspace.onDidSaveTextDocument((e) =>
      documentProvider.eventEmitter.fire(goASMURI(e.uri))
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
