import type { AssemblyBlock } from "./info";

/**
 * Returns true if the block belongs to the user's own module.
 *
 * In Go assembly output the header symbol names follow the pattern:
 *   `"".FunctionName STEXT ...`        – the package being directly compiled
 *   `<importPath>.FunctionName STEXT ...` – fully-qualified for all other pkgs
 *
 * We keep a block when its header starts with:
 *   - `"".`            — the directly-compiled package
 *   - `<moduleName>.`  — top-level package of the module
 *   - `<moduleName>/`  — any sub-package of the module (including user's own internal/)
 *
 * Everything else (runtime, stdlib, third-party deps) is excluded.
 */
export function isUserModuleBlock(
  block: AssemblyBlock,
  moduleName: string,
): boolean {
  const header = block.header;
  return (
    header.startsWith(`"".`) ||
    header.startsWith(`${moduleName}.`) ||
    header.startsWith(`${moduleName}/`)
  );
}

export function filterToUserModule(
  blocks: AssemblyBlock[],
  moduleName: string,
): AssemblyBlock[] {
  return blocks.filter((b) => isUserModuleBlock(b, moduleName));
}
