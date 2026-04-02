/**
 * Parse the stdout of `gopls symbols` and return the names of all Function and
 * Method symbols found in the output.
 *
 * Example input:
 *   HashPassword Function 10:6-10:18
 *   ComparePassword Function 15:6-15:21
 *   RSAKey Struct 11:6-11:12
 *   (*RSAKey).ID Method 16:18-16:20
 *   GenerateRSAKeys Function 28:6-28:21
 *
 * For methods the raw name (e.g. `(*RSAKey).ID`) as well as the stripped
 * variant (`RSAKey.ID`) are both pushed so that the assembly-header matching
 * in `getAsm` works regardless of how the compiler emits the symbol.
 */
export function parseFunctionSymbols(stdout: string): string[] {
  const funcs = stdout
    .split("\n")
    .map((l) => {
      let index = l.indexOf(" Function ");
      if (index < 0) {
        index = l.indexOf(" Method ");
      }

      return index > -1 ? l.slice(0, index).trim() : undefined;
    })
    .filter((l): l is string => l !== undefined);

  const result: string[] = [];
  for (const f of funcs) {
    result.push(f);
    const n = f.replaceAll(/[\(\)\*]/gim, "");
    if (n !== f) {
      result.push(n);
    }
  }

  return result;
}
