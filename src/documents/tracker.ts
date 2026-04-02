import { Uri, Webview, Disposable } from "vscode";
import { AssemblyView } from "../view/webview";
import { logger } from "../logger/logger";
import { GoEnvManager } from "../env";

export class DocumentTracker {
  private _openFiles: Map<Uri, AssemblyView>;
  private readonly envManager: GoEnvManager;

  constructor(envManager: GoEnvManager) {
    this._openFiles = new Map();
    this.envManager = envManager;
  }

  displayFile(uri: Uri) {
    logger.info("displaying file", { uri });

    const view = new AssemblyView(uri, this.envManager);
    this._openFiles.set(uri, view);

    // Subscribe onclosing
    let disposable: Disposable | undefined = undefined;
    disposable = view.onDidClose((e) => {
      this._openFiles.delete(uri);
      // unsubscripe
      disposable?.dispose();
      disposable = undefined;
      view.dispose();
    });
  }

  getPackageFilesUpdated(packageUri: Uri): [Uri, AssemblyView][] {
    const result: [Uri, AssemblyView][] = [];

    for (const entry of this._openFiles.entries()) {
      if (entry[0].fsPath.includes(packageUri.fsPath)) {
        result.push(entry);
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
    Promise.allSettled(updates);
  }
}
