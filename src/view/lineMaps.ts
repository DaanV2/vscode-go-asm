import { SourceFileMatchTarget, matchesSourceFile } from "./sourceMatch";

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

export function buildLineMaps(
  asmText: string,
  sourceMatchTarget: SourceFileMatchTarget,
) {
  const lines = asmText.split("\n");
  const lineToSource = new Map<number, SourceRef>();
  const sourceToLines = new Map<number, number[]>();

  lines.forEach((line, idx) => {
    const match = line.match(/\(([^)]+\.go):(\d+)\)/);
    if (!match) {
      return;
    }

    const file = match[1];
    const srcLine = parseInt(match[2], 10);
    lineToSource.set(idx, { srcFile: file, srcLine });

    if (matchesSourceFile(file, sourceMatchTarget)) {
      addSourceLineMapping(sourceToLines, srcLine, idx);
    }
  });

  return { lineToSource, sourceToLines };
}
