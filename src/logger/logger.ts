import * as vscode from "vscode";

export const logger: vscode.LogOutputChannel =
  vscode.window.createOutputChannel("Go Asm Preview", { log: true });
