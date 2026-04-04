import path from "path";
import { Uri, workspace } from "vscode";
import { normalizePathForCompare, SourceFileMatchTarget } from "./sourceMatch";

export function createSourceMatchTarget(fileUri: Uri): SourceFileMatchTarget {
  const absolute = normalizePathForCompare(fileUri.fsPath);
  const basename = normalizePathForCompare(path.basename(fileUri.fsPath));
  const ws = workspace.getWorkspaceFolder(fileUri);
  const relative = ws
    ? normalizePathForCompare(path.relative(ws.uri.fsPath, fileUri.fsPath))
    : undefined;

  return {
    absolute,
    relative: relative && relative.length > 0 ? relative : undefined,
    basename,
  };
}
