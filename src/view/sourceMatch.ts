import path from "path";

export interface SourceFileMatchTarget {
  absolute: string;
  relative?: string;
  basename: string;
}

export function normalizePathForCompare(file: string): string {
  return file
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

export function matchesSourceFile(
  sourceFile: string,
  target: SourceFileMatchTarget,
): boolean {
  const source = normalizePathForCompare(sourceFile);
  if (!source) {
    return false;
  }

  if (source === target.absolute || target.absolute.endsWith("/" + source)) {
    return true;
  }

  if (
    target.relative &&
    (source === target.relative ||
      source.endsWith("/" + target.relative) ||
      target.relative.endsWith("/" + source))
  ) {
    return true;
  }

  return path.posix.basename(source) === target.basename;
}
