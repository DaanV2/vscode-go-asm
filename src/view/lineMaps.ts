export interface SourceRef {
  srcFile: string;
  srcLine: number;
}

function addSourceLineMapping(
  sourceToLines: Map<number, number[]>,
  srcLine: number,
  asmLine: number,
) {
  const existing = sourceToLines.get(srcLine) ?? [];
  existing.push(asmLine);
  sourceToLines.set(srcLine, existing);
}

export function buildLineMaps(asmText: string) {
  const lines = asmText.split("\n");
  const lineToSource = new Map<number, SourceRef>();
  const sourceToLines = new Map<number, number[]>();

  extractLineInfo(lines, lineToSource, sourceToLines);

  return { lineToSource, sourceToLines };
}

export function extractLineInfo(
  lines: string[],
  lineToSource: Map<number, SourceRef>,
  sourceToLines: Map<number, number[]>,
  offset: number = 0,
  sourceFilter?: (file: string) => boolean,
) {
  lines.forEach((line, idx) => {
    const match = line.match(/\(([^)]+\.go):(\d+)\)/);
    if (!match) {
      return;
    }

    const file = match[1];
    const srcLine = parseInt(match[2], 10);
    const absIdx = idx + offset;
    lineToSource.set(absIdx, { srcFile: file, srcLine });

    if (!sourceFilter || sourceFilter(file)) {
      addSourceLineMapping(sourceToLines, srcLine, absIdx);
    }
  });
}
