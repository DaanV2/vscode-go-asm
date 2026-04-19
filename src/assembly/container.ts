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

  constructor() {}

  addBlock(block: AssemblyBlock) {
    if (block.header.startsWith("SWDARFCONST")) {
      this.constants.push(block);
    }
    // Functions
    else if (block.header.includes("STEXT")) {
      this.blocks.push(block);
      extractLineInfo(block.data, this.lineToSource, this.sourceToLines);
    }
  }

  clear() {
    this.lineToSource.clear();
    this.sourceToLines.clear();
    this.blocks = [];
  }
}
