import { AssemblyBlock } from "./info";

export function prioritizeAssemblyBlocks(
  blocks: AssemblyBlock[],
  currentFileFunctions: string[],
): AssemblyBlock[] {
  return blocks
    .map((block, originalIndex) => ({
      block,
      originalIndex,
      currentFileIndex: currentFileFunctions.findIndex((name) =>
        block.header.includes(name),
      ),
    }))
    .sort((left, right) => {
      const leftIsCurrent = left.currentFileIndex !== -1;
      const rightIsCurrent = right.currentFileIndex !== -1;

      if (leftIsCurrent !== rightIsCurrent) {
        return leftIsCurrent ? -1 : 1;
      }

      if (
        leftIsCurrent &&
        rightIsCurrent &&
        left.currentFileIndex !== right.currentFileIndex
      ) {
        return left.currentFileIndex - right.currentFileIndex;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ block, currentFileIndex }) => ({
      ...block,
      sortIndex: currentFileIndex >= 0 ? currentFileIndex : undefined,
    }));
}