// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { canRun } from "./checks";
import { DocumentTracker } from "./documents";
import { GoEnvManager } from "./env";
import { packageUri } from "./format";
import { logger } from "./logger/logger";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  void canRun().then((ok) => {
    if (ok) {
      context.subscriptions.push(...init(context));
    }
  });
}

function init(context: vscode.ExtensionContext) {
  logger.info("initializing Go Asm Preview");
  const envManager = new GoEnvManager(context);
  const documentTracker = new DocumentTracker(envManager);

  return [
    envManager,
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
    vscode.commands.registerCommand(
      "daanv2-go-asm.select-goarch",
      () => envManager.selectGoArch()
    ),
    vscode.commands.registerCommand(
      "daanv2-go-asm.select-goos",
      () => envManager.selectGoOS()
    ),
    vscode.commands.registerCommand(
      "daanv2-go-asm.select-goenv",
      () => envManager.selectGoEnv()
    ),
    vscode.commands.registerCommand(
      "daanv2-go-asm.toggle-optimizations",
      async () => {
        await envManager.toggleOptimizations();
        // Refresh all open assembly views
        documentTracker.updateAll();
      }
    ),
    vscode.commands.registerCommand(
      "daanv2-go-asm.toggle-external-filter",
      async () => {
        await envManager.toggleExternalFilter();
        // Refresh all open assembly views
        documentTracker.updateAll();
      }
    ),
    // Events
    vscode.workspace.onDidSaveTextDocument((e) => {
      if (!e.uri.path.endsWith(".go")) {
        return;
      }
      logger.info("file saved, checking for assembly updates", { event: e });

      // Check if the package has been updated and requires a new compile
      const goPackage = packageUri(e.uri);
      const files = documentTracker.getPackageFilesUpdated(goPackage);
      files.forEach(([_uri, panel]) => panel.update());
    }),
  ];
}

// This method is called when your extension is deactivated
export function deactivate() {}
