export interface SourceFileMatchTarget {
  absolute: string;
  relative?: string;
  basename: string;
}

export function normalizePathForCompare(file: string): string {
  return file
    .replace(/\\/g, "/")
    .replace(/^[a-z]:/i, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();
}

export function matchesSourceFile(
  sourceFile: string,
  target: SourceFileMatchTarget,
): boolean {
  const source = normalizePathForCompare(sourceFile);
  const absolute = normalizePathForCompare(target.absolute);
  const relative = target.relative
    ? normalizePathForCompare(target.relative)
    : undefined;
  const basename = normalizePathForCompare(target.basename);

  if (!source) {
    return false;
  }

  if (source === absolute || absolute.endsWith("/" + source)) {
    return true;
  }

  if (
    relative &&
    (source === relative ||
      source.endsWith("/" + relative) ||
      relative.endsWith("/" + source))
  ) {
    return true;
  }

  return (source.split("/").pop() ?? "") === basename;
}
