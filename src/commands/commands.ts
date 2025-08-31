import { spawn } from "child_process";
import { CancellationToken } from "vscode";

export interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Executes a command and captures its output.
 * @param args Array of arguments for the Go command (e.g., ['build', '-gcflags="-S"', './package/subpackage'])
 * @param options Optional working directory or environment variables
 * @param token Optional CancellationToken to allow stopping the process
 * @returns Promise resolving to { stdout, stderr }
 */
export async function executeCommand(
  command: "go" | "gopls",
  args: string[],
  options?: CommandOptions,
  token?: CancellationToken
): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    const infoCommand = command + " " + args.join(" ");
    console.debug("executing command: " + infoCommand, options);

    const cprocess = spawn(command, args, {
      shell: false,
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
    });

    let stdout = "";
    let stderr = "";

    cprocess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    cprocess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    cprocess.on("error", (err) => {
      console.error("problem with command: " + infoCommand, options, err);
      reject(err);
    });

    cprocess.on("close", (code) => {
      console.debug("command done: " + infoCommand);
      resolve({ stdout, stderr, code });
    });

    // Handle cancellation
    if (token) {
      token.onCancellationRequested(() => {
        cprocess.kill();
        reject(new Error("command cancelled"));
      });
    }
  });
}
