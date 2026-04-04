import { Uri, workspace } from "vscode";
import { normalizePathForCompare, SourceFileMatchTarget } from "./sourceMatch";

export function createSourceMatchTarget(fileUri: Uri): SourceFileMatchTarget {
  const absolute = normalizePathForCompare(fileUri.path);
  const basename = normalizePathForCompare(fileUri.path.split("/").pop() ?? "");
  const ws = workspace.getWorkspaceFolder(fileUri);
  const relative = ws
    ? normalizePathForCompare(
        fileUri.path.substring(ws.uri.path.length).replace(/^\//, ""),
      )
    : undefined;

  return {
    absolute,
    relative: relative && relative.length > 0 ? relative : undefined,
    basename,
  };
}
