import { executeCommand } from "../commands/commands";
import { logger } from "../logger/logger";

// Simple per-workspace-dir cache to avoid repeated `go list -m` calls.
const moduleNameCache = new Map<string, string>();

/**
 * Returns the Go module name for the given workspace directory by running
 * `go list -m`.  The result is cached for the lifetime of the extension
 * process so subsequent calls are free.
 *
 * Returns `undefined` if the command fails (e.g. not inside a Go module).
 */
export async function getModuleName(
  cwd: string,
): Promise<string | undefined> {
  const cached = moduleNameCache.get(cwd);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const result = await executeCommand("go", ["list", "-m"], { cwd });
    const name = result.stdout.trim();
    if (name) {
      moduleNameCache.set(cwd, name);
      logger.info("resolved module name", { cwd, moduleName: name });
      return name;
    }
  } catch (err) {
    logger.error("failed to resolve module name", { cwd }, err);
  }

  return undefined;
}

/** Clears the cached module name for a workspace (useful in tests). */
export function clearModuleNameCache(): void {
  moduleNameCache.clear();
}
