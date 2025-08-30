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
 * Executes a Go subcommand and captures its output.
 * @param args Array of arguments for the Go command (e.g., ['build', '-gcflags="-S"', './package/subpackage'])
 * @param options Optional working directory or environment variables
 * @param token Optional CancellationToken to allow stopping the process
 * @returns Promise resolving to { stdout, stderr }
 */
export async function runGoCommand(
  args: string[],
  options?: CommandOptions,
  token?: CancellationToken
): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    console.debug("executing command: go " + args.join(" "), options);

    const goProcess = spawn("go", args, {
      shell: false,
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
    });

    let stdout = "";
    let stderr = "";

    goProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    goProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    goProcess.on("error", (err) => {
      console.error(
        "problem with go command: go " + args.join(" "),
        options,
        err
      );
      reject(err);
    });

    goProcess.on("close", (code) => {
      console.debug("command done: go " + args.join(" "));
      resolve({ stdout, stderr, code });
    });

    // Handle cancellation
    if (token) {
      token.onCancellationRequested(() => {
        goProcess.kill();
        reject(new Error("Go command cancelled"));
      });
    }
  });
}

// Example usage:
// const { stdout, stderr } = await runGoCommand(['build', '-gcflags=-S', './mechanus/screens']);
