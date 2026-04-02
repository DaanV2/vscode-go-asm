import { spawn } from "child_process";
import { CancellationToken } from "vscode";
import { logger } from "../logger/logger";

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
    logger.info("executing command: " + infoCommand, options);

    const cprocess = spawn(command, args, {
      shell: false,
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    cprocess.stdout.on("data", (data: Buffer) => {
      stdoutChunks.push(data);
    });

    cprocess.stderr.on("data", (data: Buffer) => {
      stderrChunks.push(data);
    });

    cprocess.on("error", (err) => {
      logger.error("problem with command: " + infoCommand, options, err);
      reject(err);
    });

    cprocess.on("close", (code: number | null) => {
      logger.info("command done: " + infoCommand);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
        code,
      });
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
