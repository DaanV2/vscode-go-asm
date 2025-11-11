// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { canRun } from "./checks";
import { DocumentTracker } from "./documents";
import { packageUri } from "./format";
import { logger } from "./logger/logger";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  canRun().then(() => {
    context.subscriptions.push(...init());
  });
}

function init() {
  logger.info("initializing Go Asm Preview");
  const documentTracker = new DocumentTracker();

  return [
    // Commands
    vscode.commands.registerCommand("daanv2-go-asm.show-assembly", async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      logger.info("show assembly", { uri });

      if (uri === undefined) {
        vscode.window.showErrorMessage(
          "Show Go assembly only works on an opened document"
        );
        return;
      }
      documentTracker.displayFile(uri);
    }),
    // Events
    vscode.workspace.onDidSaveTextDocument((e) => {
      if (!e.uri.fsPath.endsWith(".go")) {
        return;
      }
      logger.info("show assembly", { event: e });

      // Check if the package has been updated and requires a new compile
      const goPackage = packageUri(e.uri);
      const files = documentTracker.getPackageFilesUpdated(goPackage);
      files.forEach(([_uri, panel]) => panel.update());
    }),
  ];
}

// This method is called when your extension is deactivated
export function deactivate() {}
