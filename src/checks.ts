import { executeCommand } from "./commands/commands";
import * as vscode from "vscode";
import { logger } from "./logger/logger";

const GO_INSTALL_URL = "https://go.dev/dl/";
const GOPLS_INSTALL_COMMAND = "go install golang.org/x/tools/gopls@latest";

/**
 * Checks whether a required tool (go or gopls) is present on the PATH and working.
 * Returns false if the tool is missing or exits with a non-zero code.
 */
async function isToolAvailable(command: "go" | "gopls"): Promise<boolean> {
  try {
    const result = await executeCommand(command, ["version"]);
    return (result.code ?? 0) === 0;
  } catch {
    return false;
  }
}

/**
 * Checks that all required tools (go, gopls) are available before activating the extension.
 * Shows actionable error messages with installation instructions when a tool is missing.
 * @returns true if all required tools are available, false otherwise
 */
export async function canRun(): Promise<boolean> {
  logger.info("performing checks to see if extension can run");

  const goAvailable = await isToolAvailable("go");
  if (!goAvailable) {
    logger.error("go is not available on PATH");
    void vscode.window
      .showErrorMessage(
        `GO ASM Preview requires Go to be installed and available on PATH. Visit ${GO_INSTALL_URL} to install it.`,
        "Open Download Page"
      )
      .then((selection) => {
        if (selection === "Open Download Page") {
          void vscode.env.openExternal(vscode.Uri.parse(GO_INSTALL_URL));
        }
      });
    return false;
  }

  const goplsAvailable = await isToolAvailable("gopls");
  if (!goplsAvailable) {
    logger.error("gopls is not available on PATH");
    void vscode.window
      .showErrorMessage(
        `GO ASM Preview requires gopls. Install it by running: ${GOPLS_INSTALL_COMMAND}`,
        "Copy Install Command"
      )
      .then((selection) => {
        if (selection === "Copy Install Command") {
          void vscode.env.clipboard.writeText(GOPLS_INSTALL_COMMAND).then(() => {
            void vscode.window.showInformationMessage(
              `Copied to clipboard: ${GOPLS_INSTALL_COMMAND}`
            );
          });
        }
      });
    return false;
  }

  return true;
}