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
import { AssemblyBlock, streamAsm } from "../assembly";
import { AssemblyContainer } from "../assembly/container";
import { GoEnvManager } from "../env";
import { filename } from "../format";
import { matchesSourceFile, SourceFileMatchTarget } from "./sourceMatch";
import { createSourceMatchTarget } from "./sourceMatchTarget";
import { getHtml, getHtmlAssembly } from "./webviewHtml";

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
  private _disposables: Disposable[] = [];
  private _asmContainer = new AssemblyContainer();

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
    this.panel.webview.html = "loading...";
    getHtml("loading...", "", new Map(), this.sourceMatchTarget).then(
      (html) => {
        if (this.panel.webview.html === "loading...") {
          this.panel.webview.html = html;
        }
      },
    );

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
      this._asmContainer.clear();

      await streamAsm(
        this.fileUri,
        this.envManager.getEnvVars(),
        this.envManager.getGcFlags(),
        this._addBlock.bind(this),
      );

      await this.updateView();
    } catch (err: any) {
      this.panel.webview.html = await getHtml(
        `got an error: ${JSON.stringify({ ...err }, undefined, 2)}`,
        this.filename,
        new Map(),
        this.sourceMatchTarget,
      );
    }
  }

  async updateView() {
    try {
      let b = this._asmContainer.blocks;
      if (b.length > 1000) {
        b = b.slice(0, 1000);
      }

      this.panel.webview.html = await getHtmlAssembly(
        b,
        this.filename,
        this._asmContainer.lineToSource,
        this.sourceMatchTarget,
      );
    } catch (err: any) {
      this.panel.webview.html = await getHtml(
        `got an error: ${JSON.stringify({ ...err }, undefined, 2)}`,
        this.filename,
        new Map(),
        this.sourceMatchTarget,
      );
    }
  }

  private _addBlock(b: AssemblyBlock) {
    

    this._asmContainer.addBlock(b);
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
    const asmLines = this._asmContainer.sourceToLines.get(sourceLine) ?? [];

    this.panel.webview.postMessage({
      type: "highlightLines",
      lines: asmLines,
    });
  }
}
