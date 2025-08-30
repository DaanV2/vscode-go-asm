import * as vscode from "vscode";
import { EXTENSION_SCHEMA } from "./constants";

export function goASMURI(uri: vscode.Uri): vscode.Uri {
  return uri.with({ scheme: EXTENSION_SCHEMA });
}
