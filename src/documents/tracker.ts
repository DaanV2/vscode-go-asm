import { Uri, Webview, Disposable } from "vscode";
import { AssemblyView } from "../view/webview";

export class DocumentTracker {
  private _openFiles: Map<Uri, AssemblyView>;

  constructor() {
    this._openFiles = new Map();
  }

  displayFile(uri: Uri) {
    const view = new AssemblyView(uri);
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
}
