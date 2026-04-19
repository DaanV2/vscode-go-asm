import { Disposable, Uri } from "vscode";
import { GoEnvManager } from "../env";
import { logger } from "../logger/logger";
import { AssemblyView } from "../view/webview";

export class DocumentTracker {
  private _openFiles: Map<string, AssemblyView>;
  private readonly envManager: GoEnvManager;

  constructor(envManager: GoEnvManager) {
    this._openFiles = new Map();
    this.envManager = envManager;
  }

  displayFile(uri: Uri) {
    logger.info("displaying file", { uri });

    const key = uri.toString();
    const view = new AssemblyView(uri, this.envManager);
    this._openFiles.set(key, view);

    // Subscribe on closing
    let disposable: Disposable | undefined = undefined;
    disposable = view.onDidClose((_e) => {
      this._openFiles.delete(key);
      // unsubscribe
      disposable?.dispose();
      disposable = undefined;
      view.dispose();
    });
  }

  getPackageFilesUpdated(packageUri: Uri): [Uri, AssemblyView][] {
    const result: [Uri, AssemblyView][] = [];
    // packageUri is always a directory; add trailing slash to avoid matching sibling dirs
    // (e.g. "file:///workspace/pkg/" should not match "file:///workspace/pkg2/foo.go").
    const prefix = packageUri.toString();
    const prefixWithSlash = prefix.endsWith("/") ? prefix : prefix + "/";

    for (const [key, panel] of this._openFiles.entries()) {
      if (key.startsWith(prefixWithSlash)) {
        result.push([Uri.parse(key), panel]);
      }
    }

    return result;
  }

  updateAll(): void {
    const updates = Array.from(this._openFiles.values()).map((view) =>
      view.update().catch((err) => {
        logger.info("failed to update assembly view", { error: err });
      })
    );
    void Promise.allSettled(updates);
  }
}
