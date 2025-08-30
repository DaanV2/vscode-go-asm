import * as vscode from "vscode";
import { EXTENSION_SCHEMA } from "./constants";

export function goASMURI(uri: vscode.Uri): vscode.Uri {
  return uri.with({ scheme: EXTENSION_SCHEMA, path: uri.path + ".asm" });
}

/**
 * transforms the given uri, that is generated from @see goASMURI and converts it back to a file
 * @param uri
 */
export function fileURI(uri: vscode.Uri): vscode.Uri {
  let p = uri.path;
  if (p.endsWith(".go.asm")) {
    p = p.slice(0, p.length - 3);
  }

  return uri.with({ scheme: "file", path: p });
}
