import { SourceFileMatchTarget, matchesSourceFile } from "./sourceMatch";

export interface SourceRef {
  srcFile: string;
  srcLine: number;
}

/** A single assembly line with its resolved metadata, ready for the webview DB. */
export interface AssemblyRow {
  asmLine: number;
  text: string;
  blockHeader: string | null;
  srcFile: string | null;
  srcLine: number | null;
  isCurrentSource: boolean;
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

function extractSourceRef(
  line: string,
  idx: number,
  sourceMatchTarget: SourceFileMatchTarget,
  sourceToLines: Map<number, number[]>,
): { srcFile: string | null; srcLine: number | null; isCurrentSource: boolean } {
  const match = line.match(/\(([^)]+\.go):(\d+)\)/);
  if (!match) {
    return { srcFile: null, srcLine: null, isCurrentSource: false };
  }
  const srcFile = match[1];
  const srcLine = parseInt(match[2], 10);
  const isCurrentSource = matchesSourceFile(srcFile, sourceMatchTarget);
  if (isCurrentSource) {
    addSourceLineMapping(sourceToLines, srcLine, idx);
  }
  return { srcFile, srcLine, isCurrentSource };
}

/**
 * Single-pass assembly processor. Replaces the separate `buildLineMaps` +
 * HTML-line-generation passes with one loop that builds both the
 * `sourceToLines` cursor-sync map and the structured `AssemblyRow[]` data
 * sent to the webview's sql.js database.
 */
export function processAssembly(
  asmText: string,
  sourceMatchTarget: SourceFileMatchTarget,
): { rows: AssemblyRow[]; sourceToLines: Map<number, number[]> } {
  const lines = asmText.split("\n");
  const sourceToLines = new Map<number, number[]>();
  const rows: AssemblyRow[] = [];
  let currentBlockHeader: string | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (/^# /.test(line)) {
      currentBlockHeader = line.slice(2).trim();
      continue;
    }
    // Skip comment lines and lines before the first block header
    if (line.startsWith("#") || currentBlockHeader === null) {
      continue;
    }

    const { srcFile, srcLine, isCurrentSource } = extractSourceRef(
      line, idx, sourceMatchTarget, sourceToLines,
    );
    rows.push({ asmLine: idx, text: line, blockHeader: currentBlockHeader, srcFile, srcLine, isCurrentSource });
  }

  // Fallback: if no block structure was found, emit every line without grouping
  if (rows.length === 0) {
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const { srcFile, srcLine, isCurrentSource } = extractSourceRef(
        line, idx, sourceMatchTarget, sourceToLines,
      );
      rows.push({ asmLine: idx, text: line, blockHeader: null, srcFile, srcLine, isCurrentSource });
    }
  }

  return { rows, sourceToLines };
}

/** @deprecated Use `processAssembly` for a single-pass approach. Kept for tests. */
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
