import {
  Disposable,
  TextEditorDecorationType,
  TextEditorRevealType,
  ThemeColor,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { getAsm } from "../assembly";
import { filename } from "../format";
import { GoEnvManager } from "../env";
import { processAssembly } from "./lineMaps";
import { createSourceMatchTarget } from "./sourceMatchTarget";
import { matchesSourceFile, SourceFileMatchTarget } from "./sourceMatch";
import { getShellHtml } from "./webviewHtml";

function findSourceEditor(srcFile: string, sourceFileUri: Uri) {
  const primaryEditor = window.visibleTextEditors.find(
    (e) => e.document.uri.toString() === sourceFileUri.toString(),
  );

  return window.visibleTextEditors.find(
    (e) =>
      e === primaryEditor ||
      matchesSourceFile(srcFile, createSourceMatchTarget(e.document.uri)),
  );
}

export class AssemblyView implements Disposable {
  readonly panel: WebviewPanel;
  readonly fileUri: Uri;
  readonly filename: string;
  private readonly envManager: GoEnvManager;
  private readonly sourceMatchTarget: SourceFileMatchTarget;

  private _sourceHighlight: TextEditorDecorationType;
  private _sourceToLines: Map<number, number[]> = new Map();
  private _disposables: Disposable[] = [];

  constructor(uri: Uri, envManager: GoEnvManager, extensionUri: Uri) {
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
      {
        enableScripts: true,
        localResourceRoots: [Uri.joinPath(extensionUri, "resources")],
      },
    );

    const sqlJsUri  = this.panel.webview.asWebviewUri(Uri.joinPath(extensionUri, "resources", "sql-wasm.js"));
    const sqlWasmUri = this.panel.webview.asWebviewUri(Uri.joinPath(extensionUri, "resources", "sql-wasm.wasm"));
    this.panel.webview.html = getShellHtml(this.filename, sqlJsUri.toString(), sqlWasmUri.toString());

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

  async update() {
    try {
      const asm = await getAsm(
        this.fileUri,
        this.envManager.getEnvVars(),
        this.envManager.getGcFlags(),
      );
      const { rows, sourceToLines } = processAssembly(asm, this.sourceMatchTarget);
      this._sourceToLines = sourceToLines;
      this.panel.webview.postMessage({ type: "rows", rows });
    } catch (err: any) {
      const errorText = `got an error:\n${JSON.stringify({ ...err }, undefined, 2)}`;
      const { rows } = processAssembly(errorText, this.sourceMatchTarget);
      this.panel.webview.postMessage({ type: "rows", rows });
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

  private _clearSourceHighlight() {
    window.visibleTextEditors.forEach((e) => {
      e.setDecorations(this._sourceHighlight, []);
    });
  }

  private _syncFromSource(sourceLine: number) {
    const asmLines = this._sourceToLines.get(sourceLine) ?? [];
    this.panel.webview.postMessage({
      type: "highlightLines",
      lines: asmLines,
    });
  }
}
