import * as vscode from "vscode";
import { EXTENSION_SCHEMA } from "../format";
import { CommandOptions, runGoCommand } from "../go/commands";
import path from "path";

export class AssemblyDocumentProvider
  implements vscode.TextDocumentContentProvider
{
  public eventEmitter: vscode.EventEmitter<vscode.Uri>;

  constructor() {
    this.eventEmitter = new vscode.EventEmitter();
  }

  /** @inheritdoc */
  get onDidChange(): vscode.Event<vscode.Uri> {
    return this.eventEmitter.event;
  }

  /** @inheritdoc */
  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
    if (uri.scheme !== EXTENSION_SCHEMA) {
      throw new Error("wrong schema: " + uri.scheme);
    }

    const options: CommandOptions = {};
    const fs = uri.fsPath;
    const dir = path.dirname(fs);
    const ws = vscode.workspace.getWorkspaceFolder(uri);
    if (ws) {
      options.cwd = ws.uri.fsPath;
    } else if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders?.length > 0
    ) {
      options.cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    // go build -gcflags="-S" ./package/subpackage
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        cancellable: true,
        title: "compiling go for assembly",
      },
      async (progress, token) => {
        progress.report({ message: "compiling..." });

        return await runGoCommand(
          ["build", "-gcflags=-S -S", dir],
          options,
          token
        );
      }
    );

    return result.stderr;
  }
}
