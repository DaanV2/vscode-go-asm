import { executeCommand } from "./commands/commands";
import * as vscode from "vscode";

/**
 *
 * @returns
 */
export async function canRun() {
  console.debug("performing checks to see if extension can run");

  try {
    const [gov, goplsv] = await Promise.all([
      executeCommand("go", ["version"]),
      executeCommand("gopls", ["version"]),
    ]);

    if ((gov.code ?? 0) > 0 || !gov.stdout.startsWith("go version ")) {
      vscode.window.showErrorMessage(
        "GO ASM Preview requires go to be installed and available for any application",
        "info: ",
        JSON.stringify(gov, undefined, 2)
      );
    }
    if ((goplsv.code ?? 0) > 0) {
      vscode.window.showErrorMessage(
        "GO ASM Preview requires gopls to be installed and available for any application",
        "info: ",
        JSON.stringify(goplsv, undefined, 2)
      );
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      "got an unexpected error during checking if the extension can run",
      JSON.stringify({ message: err.message, ...err }, undefined, 2)
    );
    return false;
  }
  return true;
}
