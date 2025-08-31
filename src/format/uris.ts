import path from "path";
import { Uri } from "vscode";

export function goFSPath(uri: Uri | string): string {
  const fs = typeof uri !== "string" ? uri.fsPath : uri;

  return fs.replaceAll("\\\\", "//").replaceAll("\\", "/");
}

/**
 * If given a file, returns the path to the package
 * @param uri
 */
export function packageUri(uri: Uri): Uri {
  return Uri.joinPath(uri, "..");
}

export function filename(uri: Uri): string {
  return path.basename(uri.fsPath);
}
