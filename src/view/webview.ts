import {
  Disposable,
  TextEditor,
  TextEditorDecorationType,
  TextEditorRevealType,
  ThemeColor,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { streamAsm } from "../assembly";
import { AssemblyContainer } from "../assembly/container";
import { prioritizeAssemblyBlocks } from "../assembly/order";
import { GoEnvManager } from "../env";
import { filename } from "../format";
import { getFunctions } from "../go/dependencies";
import { matchesSourceFile, SourceFileMatchTarget } from "./sourceMatch";
import { createSourceMatchTarget } from "./sourceMatchTarget";
import { getShellHtml, getAsmContentHtml } from "./webviewHtml";

/**
 * Finds the best matching source editor for the given source file.
 * @param srcFile The source file path extracted from the assembly metadata, e.g. "src/foo/bar.go".
 * @param sourceFileUri The URI of the source file for the currently displayed assembly, used for exact matching. This is needed because the srcFile can be a relative path and may not be unique across the workspace. The editor with an exact URI match will be prioritized over others that only match by filename or suffix.
 * @returns The best matching TextEditor, or undefined if no match is found.
 */
function findSourceEditor(
  srcFile: string,
  sourceFileUri: Uri,
): TextEditor | undefined {
  const primaryEditor = window.visibleTextEditors.find(
    (e) => e.document.uri.toString() === sourceFileUri.toString(),
  );

  return window.visibleTextEditors.find(
    (e) =>
      e === primaryEditor ||
      matchesSourceFile(srcFile, createSourceMatchTarget(e.document.uri)),
  );
}

/**
 * A controller for a single assembly view panel.
 * Responsible for rendering the assembly, handling interactions, and syncing highlights
 * between the assembly and source code.
 */
export class AssemblyView implements Disposable {
  readonly panel: WebviewPanel;
  readonly fileUri: Uri;
  readonly filename: string;
  private readonly envManager: GoEnvManager;
  private readonly sourceMatchTarget: SourceFileMatchTarget;

  private _sourceHighlight: TextEditorDecorationType;
  private _disposables: Disposable[] = [];
  private _asmContainer = new AssemblyContainer();
  private _updateGeneration = 0;

  constructor(uri: Uri, envManager: GoEnvManager) {
    this.fileUri = uri;
    this.filename = filename(uri);
    this.envManager = envManager;
    this.sourceMatchTarget = createSourceMatchTarget(uri);

    this._sourceHighlight = window.createTextEditorDecorationType({
      backgroundColor: new ThemeColor("editor.findMatchHighlightBackground"),
      isWholeLine: true,
    });

    this.panel = window.createWebviewPanel(
      "goAsmViewer",
      "Go Assembly View: " + this.filename,
      ViewColumn.Beside,
      { enableScripts: true },
    );
    // Set the shell once — all subsequent assembly updates go through postMessage
    this.panel.webview.html = getShellHtml(this.filename);

    // Handle messages from the webview (ASM hover → source highlight)
    this._disposables.push(
      this.panel.webview.onDidReceiveMessage((msg: unknown) => {
        this._handleWebviewMessage(msg);
      }),
    );

    // Handle cursor changes in source editor (source → ASM highlight)
    this._disposables.push(
      window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor.document.uri.toString() === this.fileUri.toString()) {
          this._syncFromSource(e.textEditor.selection.active.line + 1);
        }
      }),
    );

    // Queue update next if something got here first
    setImmediate(this.update.bind(this));
  }

  dispose() {
    this._sourceHighlight.dispose();
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
    return this.panel.dispose();
  }

  get onDidClose() {
    return this.panel.onDidDispose;
  }

  /** Triggers an update of the assembly view, re-fetching and re-rendering the assembly. */
  async update() {
    const generation = ++this._updateGeneration;

    try {
      this._asmContainer.clear();

      await streamAsm(
        this.fileUri,
        this.envManager.getEnvVars(),
        this.envManager.getGcFlags(),
        (b) => {
          if (generation === this._updateGeneration) {
            this._asmContainer.addBlock(b);
          }
        },
      );

      if (generation !== this._updateGeneration) {
        return;
      }

      await this.updateView();
    } catch (err: unknown) {
      if (generation !== this._updateGeneration) {
        return;
      }
      const errDetail = err instanceof Error ? err.message : JSON.stringify(err, undefined, 2);
      void this.panel.webview.postMessage({ type: "updateStatus", message: `Error: ${errDetail}` });
    }
  }

  /** Renders the current assembly blocks in the webview.
   * Should be called after updating the assembly container with new blocks. */
  async updateView() {
    try {
      const funcs = await getFunctions(this.fileUri);
      const prioritized = prioritizeAssemblyBlocks(this._asmContainer.blocks, funcs);

      let b = prioritized;
      if (b.length > 1000) {
        b = b.slice(0, 1000);
      }
      this._asmContainer.rebuildMaps(b, (file) => matchesSourceFile(file, this.sourceMatchTarget));

      const html = getAsmContentHtml(b, this._asmContainer.lineToSource, this.sourceMatchTarget);
      void this.panel.webview.postMessage({ type: "updateAsm", html });
    } catch (err: unknown) {
      const errDetail = err instanceof Error ? err.message : JSON.stringify(err, undefined, 2);
      void this.panel.webview.postMessage({ type: "updateStatus", message: `Error: ${errDetail}` });
    }
  }

  private _handleWebviewMessage(msg: unknown) {
    if (!msg || typeof msg !== "object") {
      return;
    }
    const m = msg as Record<string, unknown>;
    if (m["type"] === "hover") {
      const srcFile = m["srcFile"];
      const srcLine = m["srcLine"];
      if (typeof srcFile === "string" && typeof srcLine === "number") {
        this._highlightSourceLine(srcFile, srcLine);
      }
    } else if (m["type"] === "hoverEnd") {
      this._clearSourceHighlight();
    }
  }

  // Highlights the given source line in the editor.
  // Called when hovering over an assembly line that maps to a source line.
  private _highlightSourceLine(srcFile: string, srcLine: number) {
    const editor = findSourceEditor(srcFile, this.fileUri);
    if (!editor) {
      return;
    }

    const lineIndex = srcLine - 1;
    if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
      return;
    }

    const range = editor.document.lineAt(lineIndex).range;
    editor.setDecorations(this._sourceHighlight, [range]);
    editor.revealRange(range, TextEditorRevealType.InCenterIfOutsideViewport);
  }

  // Clears any source line highlights in all visible editors.
  // Called when the hover ends in the assembly view.
  private _clearSourceHighlight() {
    window.visibleTextEditors.forEach((e) => {
      e.setDecorations(this._sourceHighlight, []);
    });
  }

  // Syncs the currently highlighted source line to the assembly view
  // causing the corresponding assembly lines to be highlighted.
  private _syncFromSource(sourceLine: number) {
    const asmLines = this._asmContainer.sourceToLines.get(sourceLine) ?? [];

    this.panel.webview.postMessage({
      type: "highlightLines",
      lines: asmLines,
    });
  }
}
