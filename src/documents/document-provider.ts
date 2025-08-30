import * as vscode from "vscode";
import { EXTENSION_SCHEMA, fileURI } from "../format";
import { CommandOptions, runGoCommand } from "../go/commands";
import path from "path";
import { AssemblyBlock } from "../assembly/info";

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
    const fs = fileURI(uri).fsPath;
    const packageDir = path.dirname(fs);
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
    const info = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        cancellable: true,
        title: "compiling go for assembly",
      },
      async (progress, token) => {
        progress.report({ message: "compiling..." });
        const result = await runGoCommand(
          ["build", "-gcflags=-S", packageDir],
          options,
          token
        );

        progress.report({ message: "parsing..." });
        const info = AssemblyBlock.parse(result.stderr);

        progress.report({ message: "done" });
        return info;
      }
    );

    return info.map(printAssemblyInfo(packageDir)).join("\n");
  }
}

function printAssemblyInfo(packageDir: string) {
  packageDir = packageDir.replaceAll("\\\\", "/").replaceAll("\\", "/");
  if (!packageDir.endsWith('/')) {
    packageDir += '/';
  }

  return function (asm: AssemblyBlock): string {
    const header = asm.header.replaceAll(' ', '\n#\t');

    return `# ${header}\n${asm.data.join("\n")}\n`.replaceAll(packageDir, "");
  };
}
