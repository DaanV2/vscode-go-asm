import { ProgressLocation, Uri, window, workspace } from "vscode";
import { CommandOptions, executeCommand } from "../commands/commands";
import { goFSPath, packageUri } from "../format";
import { getFunctions } from "../go/dependencies";
import { AssemblyBlock } from "./info";

export async function getAsm(goUri: Uri): Promise<string> {
  const options: CommandOptions = {};
  const packageDir = goFSPath(packageUri(goUri));
  const ws = workspace.getWorkspaceFolder(goUri);
  if (ws) {
    options.cwd = ws.uri.fsPath;
  } else if (
    workspace.workspaceFolders &&
    workspace.workspaceFolders?.length > 0
  ) {
    options.cwd = workspace.workspaceFolders[0].uri.fsPath;
  }

  // go build -gcflags="-S" ./package/subpackage
  const popts = {
    location: ProgressLocation.Window,
    cancellable: true,
    title: "compiling go for assembly",
  };
  const info = await window.withProgress(popts, async (progress, token) => {
    // Compiling package code
    progress.report({ message: "compiling..." });
    const result = await executeCommand(
      "go",
      ["build", "-gcflags=-S", packageDir],
      options,
      token
    );

    if ((result.code ?? 0) > 0) {
      return [
        {
          header: "Whoops!",
          data: ["Error compiling code", JSON.stringify(result, undefined, 2)],
        },
      ];
    }

    // Parsing the assembly output
    progress.report({ message: "parsing..." });
    let info = AssemblyBlock.parse(result.stderr);

    // Filter only the function from the file
    progress.report({ message: "filtering..." });
    const funcs = await getFunctions(goUri);
    info = info.filter((i) => {
      for (const f of funcs) {
        if (i.header.includes(f)) {
          return true;
        }
      }

      return false;
    });

    // Done
    progress.report({ message: "done" });
    return info;
  });

  return info.map(printAssemblyInfo(packageDir, options.cwd)).join("\n");
}

function printAssemblyInfo(packageDir: string, cwd: string | undefined) {
  packageDir = goFSPath(packageDir);
  if (!packageDir.endsWith("/")) {
    packageDir += "/";
  }
  if (cwd) {
    cwd = goFSPath(cwd);
  }

  return function (asm: AssemblyBlock): string {
    const header = asm.header.replaceAll(" ", "\n#\t");

    let lines = asm.data.map((e) => e.replaceAll(packageDir, ""));

    if (cwd) {
      lines = lines.map((e) => e.replaceAll(cwd, "."));
    }

    return `# ${header}\n${lines.join("\n")}\n`;
  };
}
