import { extractLineInfo } from "../view/lineMaps";
import { AssemblyBlock } from "./info";

export interface SourceRef {
  srcFile: string;
  srcLine: number;
}

export class AssemblyContainer {
  lineToSource: Map<number, SourceRef> = new Map();
  sourceToLines: Map<number, number[]> = new Map();
  /** Raw assembly blocks */
  blocks: Array<AssemblyBlock> = [];
  /** constant info */
  constants: Array<AssemblyBlock> = [];
  private _lineOffset = 0;

  constructor() {}

  addBlock(block: AssemblyBlock) {
    if (block.header.startsWith("SWDARFCONST")) {
      this.constants.push(block);
    }
    // Functions
    else if (block.header.includes("STEXT")) {
      this.blocks.push(block);
      extractLineInfo(block.data, this.lineToSource, this.sourceToLines, this._lineOffset);
      this._lineOffset += block.data.length;
    }
  }

  /** Rebuild line maps from an ordered block list (e.g. after prioritization).
   *  sourceFilter is called with the asm source file string; only matching lines
   *  are added to sourceToLines (used for cursor-sync from source → asm). */
  rebuildMaps(orderedBlocks: AssemblyBlock[], sourceFilter?: (file: string) => boolean) {
    this.lineToSource.clear();
    this.sourceToLines.clear();
    let offset = 0;
    for (const block of orderedBlocks) {
      extractLineInfo(block.data, this.lineToSource, this.sourceToLines, offset, sourceFilter);
      offset += block.data.length;
    }
  }

  clear() {
    this.lineToSource.clear();
    this.sourceToLines.clear();
    this.blocks = [];
    this._lineOffset = 0;
  }
}
