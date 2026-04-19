import { Uri } from "vscode";

export function goFSPath(uri: Uri | string): string {
  const fs = typeof uri !== "string" ? uri.fsPath : uri;

  return fs.replaceAll("\\\\", "//").replaceAll("\\", "/");
}

/**
 * Replaces absolute Go source file paths embedded in an assembly line
 * (e.g. `(f:/workspace/pkg/foo.go:9)`) with paths relative to the
 * workspace directory.  Falls back to the basename when the path does
 * not share the workspace prefix.
 */
export function relativizeAsmLine(line: string, workspaceDir: string): string {
  const normalizedWs = goFSPath(workspaceDir);
  const prefix = normalizedWs.endsWith("/") ? normalizedWs : normalizedWs + "/";

  return line.replace(/\(([^)]+\.go):(\d+)\)/g, (_match, filePath: string, lineNum: string) => {
    const normalized = goFSPath(filePath);
    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
      return `(${normalized.slice(prefix.length)}:${lineNum})`;
    }
    // Fall back to just the filename when the workspace prefix doesn't match.
    const basename = normalized.split("/").pop() ?? normalized;
    return `(${basename}:${lineNum})`;
  });
}

/**
 * If given a file, returns the path to the package
 * @param uri
 */
export function packageUri(uri: Uri): Uri {
  return Uri.joinPath(uri, "..");
}

export function filename(uri: Uri): string {
  return uri.path.split("/").pop() ?? "";
}
