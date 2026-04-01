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
import { filename } from "../format";
import { getAsm } from "../assembly";
import path from "path";

interface SourceRef {
  srcFile: string;
  srcLine: number; // 1-based
}

/** Parse ASM text and build bidirectional line maps. */
function buildLineMaps(asmText: string, srcFilename: string) {
  const lines = asmText.split("\n");
  const lineToSource = new Map<number, SourceRef>();
  // srcLine (1-based) → array of 0-based asm line indices
  const sourceToLines = new Map<number, number[]>();

  lines.forEach((line, idx) => {
    const match = line.match(/\(([^)]+\.go):(\d+)\)/);
    if (match) {
      const file = match[1];
      const srcLine = parseInt(match[2], 10);
      lineToSource.set(idx, { srcFile: file, srcLine });

      const isCurrentFile =
        file === srcFilename || file.endsWith("/" + srcFilename);
      if (isCurrentFile) {
        const existing = sourceToLines.get(srcLine) ?? [];
        existing.push(idx);
        sourceToLines.set(srcLine, existing);
      }
    }
  });

  return { lineToSource, sourceToLines };
}

export class AssemblyView implements Disposable {
  readonly panel: WebviewPanel;
  readonly fileUri: Uri;
  readonly filename: string;

  private _sourceHighlight: TextEditorDecorationType;
  private _sourceToLines: Map<number, number[]> = new Map();
  private _disposables: Disposable[] = [];

  constructor(uri: Uri) {
    this.fileUri = uri;
    this.filename = filename(uri);

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
    this.panel.webview.html = getHtml("loading...", "", new Map());

    // Handle messages from the webview (ASM hover → source highlight)
    this._disposables.push(
      this.panel.webview.onDidReceiveMessage((msg: unknown) => {
        this._handleWebviewMessage(msg);
      }),
    );

    // Handle cursor changes in source editor (source → ASM highlight)
    this._disposables.push(
      window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor.document.uri.fsPath === this.fileUri.fsPath) {
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
      const asm = await getAsm(this.fileUri);
      const { lineToSource, sourceToLines } = buildLineMaps(asm, this.filename);
      this._sourceToLines = sourceToLines;
      this.panel.webview.html = getHtml(asm, this.filename, lineToSource);
    } catch (err: any) {
      this.panel.webview.html = getHtml(
        `got an error: ${JSON.stringify({ ...err }, undefined, 2)}`,
        this.filename,
        new Map(),
      );
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
    const editor = window.visibleTextEditors.find(
      (e) =>
        e.document.uri.fsPath === this.fileUri.fsPath ||
        path.basename(e.document.uri.fsPath) === srcFile,
    );
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightLine(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(0x[0-9a-f]+)/g, '<span class="addr">$1</span>')
    .replace(
      /\b(AX|AL|BX|CX|DX|SI|DI|R[0-9]+|SP|SB|BP)\b/g,
      '<span class="reg">$1</span>',
    )
    .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
    .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
    .replace(/(#.*$|\/\/.*$)/, '<span class="comment">$1</span>');
}

function getHtml(asm: string, filename: string, lineToSource: Map<number, SourceRef>) {
  const processedLines =  asm.split("\n").map((line, idx) => createAssemblyLine(line, idx, lineToSource));

  return renderHtml(filename, processedLines);
}

function createAssemblyLine(line: string, idx: number, lineToSource: Map<number, SourceRef>): string {
    const srcRef = lineToSource.get(idx);
    const dataAttrs = srcRef
      ? ` data-src-file="${escapeHtml(srcRef.srcFile)}" data-src-line="${srcRef.srcLine}" data-asm-line="${idx}"`
      : ` data-asm-line="${idx}"`;

    const styledLine = escapeHtml(line)
      .replace(/(0x[0-9a-f]+)/g, '<span class="addr">$1</span>')
      .replace(
        /\b(AX|AL|BX|CX|DX|SI|DI|R[0-9]+|SP|SB|BP)\b/g,
        '<span class="reg">$1</span>'
      )
      .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
      .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
      .replace(/(#.*$|\/\/.*$)/gm, '<span class="comment">$1</span>');

    return `<span class="line"${dataAttrs}>${styledLine}</span>`;
}

function renderHtml(filename: string, asmLines: string[]): string {
  return `
<html>
<head>
<style>
  body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 0; margin: 0; }
  .addr { color: #808080; }
  .op { color: #569cd6; }
  .reg { color: #dcdcaa; }
  .comment { color: #6a9955; font-style: italic; }
  .src { background: #333; color: #c586c0; padding: 2px 4px; border-radius: 3px; }
  .line { white-space: pre; min-height: 1em; padding: 0 10px; }
  .line:hover { background-color: #2a2a2a; }
  .line.match { background-color: #1e3a1e; }
  .line.no-match { display: none; }
  .search-bar {
    position: sticky;
    top: 0;
    background: #252526;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #3c3c3c;
    z-index: 10;
    flex-wrap: wrap;
  }
  .search-bar input[type="text"] {
    background: #3c3c3c;
    color: #d4d4d4;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 4px 8px;
    font-family: monospace;
    font-size: 13px;
    width: 280px;
    outline: none;
    box-sizing: border-box;
  }
  .search-bar input[type="text"]:focus { border-color: #007acc; }
  .search-bar label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    color: #ccc;
    font-size: 13px;
    user-select: none;
  }
  #matchCount { color: #888; font-size: 12px; }
  h3 { margin: 6px 0 2px 0; padding: 0 10px; }
  #asm { padding: 4px 0 10px 0; }
</style>
</head>
<body>
<div class="search-bar">
  <input type="text" id="searchInput" placeholder="Search (opcode, register, comment\u2026)" autocomplete="off" spellcheck="false" />
  <label><input type="checkbox" id="filterMode" /> Filter lines</label>
  <span id="matchCount"></span>
</div>
<h3>Go Assembly: ${escapeHtml(filename)}</h3>
<div id="asm">${asmLines.join("")}</div>
<script>
  (function () {
    const searchInput = document.getElementById('searchInput');
    const filterMode = document.getElementById('filterMode');
    const matchCountEl = document.getElementById('matchCount');
    const lines = document.querySelectorAll('.line');

    function applySearch() {
      const query = searchInput.value.toLowerCase();
      const isFilter = filterMode.checked;
      let count = 0;

      lines.forEach(function (line) {
        const text = line.textContent.toLowerCase();
        const matches = !query || text.includes(query);

        line.classList.toggle('match', matches && query.length > 0);
        line.classList.toggle('no-match', isFilter && !matches && query.length > 0);

        if (matches && query.length > 0) { count++; }
      });

      matchCountEl.textContent = query
        ? count + ' match' + (count !== 1 ? 'es' : '')
        : '';
    }

    searchInput.addEventListener('input', applySearch);
    filterMode.addEventListener('change', applySearch);
  }());
</script>
</body>
</html>
`;
}
