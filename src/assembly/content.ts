import { ProgressLocation, Uri, window, workspace } from "vscode";
import {
  CommandOptions,
  executeCommand,
  streamExecuteCommand,
} from "../commands/commands";
import { goFSPath, packageUri } from "../format";
import { getFunctions } from "../go/dependencies";
import { AssemblyBlock } from "./info";
import { prioritizeAssemblyBlocks } from "./order";
import { logger } from "../logger/logger";

export async function getAsm(
  goUri: Uri,
  env?: NodeJS.ProcessEnv,
  gcflags?: string,
): Promise<string> {
  logger.info("getting assembly", { uri: goUri.toString() });
  const options = commandsOptions(goUri, env);
  const cmmArgs = commandArgs(goUri, gcflags);

  const popts = {
    location: ProgressLocation.Window,
    cancellable: true,

    title: "compiling go for assembly",
  };
  const info = await window.withProgress(popts, async (progress, token) => {
    // Compiling package code
    progress.report({ message: "compiling..." });

    // go build -gcflags="-S" ./package/subpackage
    const result = await executeCommand("go", cmmArgs, options, token);

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

    // Keep package assembly available so the view can reveal other-file code.
    progress.report({ message: "filtering..." });
    const funcs = await getFunctions(goUri);
    info = prioritizeAssemblyBlocks(info, funcs);

    // Done
    progress.report({ message: "done" });
    return info;
  });

  const packageDir = goFSPath(packageUri(goUri));

  return info.map(printAssemblyInfo(packageDir, options.cwd)).join("\n");
}

export async function streamAsm(
  goUri: Uri,
  env: NodeJS.ProcessEnv | undefined,
  gcflags: string | undefined,
  asmCallback: (ab: AssemblyBlock) => void,
) {
  logger.info("getting assembly", { uri: goUri.toString() });
  const options = commandsOptions(goUri, env);
  const cmmArgs = commandArgs(goUri, gcflags);
  const handler = new goStreamHandler(asmCallback);

  const popts = {
    location: ProgressLocation.Window,
    cancellable: true,

    title: "compiling go for assembly",
  };

  return await window.withProgress(popts, async (progress, token) => {
    // Compiling package code
    progress.report({ message: "compiling and streaming result..." });

    // go build -gcflags="-S" ./package/subpackage
    const result = await streamExecuteCommand(
      "go",
      cmmArgs,
      options,
      token,
      undefined,
      handler.streamedStdErr.bind(handler),
    );

    if ((result.code ?? 0) > 0) {
      asmCallback({
        header: "Whoops!",
        data: ["Error compiling code", JSON.stringify(result, undefined, 2)],
      });
    }

    handler.finish();
  });
}

// commandsOptions determines the options for executing the go command, such as the working directory and environment variables.
function commandsOptions(goUri: Uri, env?: NodeJS.ProcessEnv): CommandOptions {
  const options: CommandOptions = { env };
  const ws = workspace.getWorkspaceFolder(goUri);
  if (ws) {
    options.cwd = ws.uri.fsPath;
  } else if (
    workspace.workspaceFolders &&
    workspace.workspaceFolders?.length > 0
  ) {
    options.cwd = workspace.workspaceFolders[0].uri.fsPath;
  }

  return options;
}

// commandArgs determines the arguments for the go command, such as the package directory and gcflags.
function commandArgs(goUri: Uri, gcflags?: string) {
  const packageDir = goFSPath(packageUri(goUri));

  return ["build", gcflags ?? "-gcflags=-S", packageDir];
}

class goStreamHandler {
  private _data: string;

  constructor(public asmCallback: (ab: AssemblyBlock) => void) {
    this._data = "";
  }

  streamedStdErr(data: Buffer) {
    this._data += data.toString();

    const offset = AssemblyBlock.isolate(this._data);
    if (offset >= 0) {
      const text = this._data.slice(0, offset);
      this._data = this._data.slice(offset);
      const blocks = AssemblyBlock.parse(text);
      blocks.forEach(this.asmCallback);
    }
  }

  finish() {}
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
