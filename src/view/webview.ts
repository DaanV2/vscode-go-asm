import path from "path";
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
  private readonly envManager: GoEnvManager;

  private _sourceHighlight: TextEditorDecorationType;
  private _sourceToLines: Map<number, number[]> = new Map();
  private _disposables: Disposable[] = [];

  constructor(uri: Uri, envManager: GoEnvManager) {
    this.fileUri = uri;
    this.filename = filename(uri);
    this.envManager = envManager;

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
      const asm = await getAsm(
        this.fileUri,
        this.envManager.getEnvVars(),
        this.envManager.getGcFlags()
      );
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

interface RenderBlock {
  header: string;
  lines: string[];
}

function getHtml(asm: string, filename: string, lineToSource: Map<number, SourceRef>) {
  const rawLines = asm.split("\n");

  // Group lines into collapsible blocks. Each block starts with a "# " line
  // (as produced by printAssemblyInfo); "#\t" lines are metadata continuations.
  const blocks: RenderBlock[] = [];
  let currentBlock: RenderBlock | null = null;

  rawLines.forEach((line, idx) => {
    if (/^# /.test(line)) {
      // New block header (e.g. "# \"main.Foo\"")
      currentBlock = { header: line.slice(2).trim(), lines: [] };
      blocks.push(currentBlock);
    } else if (line.startsWith("#")) {
      // Metadata continuation lines (e.g. "#\tSTEXT nosplit") – skip
    } else if (currentBlock) {
      currentBlock.lines.push(createAssemblyLine(line, idx, lineToSource));
    }
  });

  const validBlocks = blocks.filter((b) => b.lines.length > 0);

  if (validBlocks.length > 0) {
    return renderHtml(filename, validBlocks);
  }

  // Fallback for error / "loading…" messages – render all lines flat
  const processedLines = rawLines.map((line, idx) => createAssemblyLine(line, idx, lineToSource));
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
      '<span class="reg">$1</span>',
    )
    .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
    .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
    .replace(/(#.*$|\/\/.*$)/gm, '<span class="comment">$1</span>');

  return `<span class="line"${dataAttrs}>${styledLine}</span>`;
}

function renderHtml(filename: string, content: RenderBlock[] | string[]): string {
  // Determine if we received blocks or flat lines
  const isBlocks = content.length > 0 && typeof content[0] === "object" && content[0] !== null && "header" in content[0];

  let bodyContent: string;
  let funcJumpHtml = "";
  if (isBlocks) {
    const blocks = content as RenderBlock[];
    funcJumpHtml =
      `<select id="funcJump" class="func-jump" title="Jump to function">` +
      `<option value="">Jump to function\u2026</option>` +
      blocks.map((block, i) => `<option value="asm-block-${i}">${escapeHtml(block.header)}</option>`).join("") +
      `</select>`;
    bodyContent = blocks
      .map(
        (block, i) => `
<details class="asm-block" open id="asm-block-${i}">
  <summary class="asm-block-header">${escapeHtml(block.header)}</summary>
  <div class="asm-block-body">${block.lines.join("")}</div>
</details>`,
      )
      .join("\n");
  } else {
    bodyContent = (content as string[]).join("");
  }

  return `
<html>
<head>
<style>
  body { font-family: var(--vscode-editor-font-family, monospace); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 10px; }
  .addr { color: var(--vscode-editorLineNumber-foreground); }
  .op { color: var(--vscode-symbolIcon-keywordColor); }
  .reg { color: var(--vscode-symbolIcon-variableColor); }
  .comment { color: var(--vscode-descriptionForeground); font-style: italic; }
  .src { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 4px; border-radius: 3px; }
  .line { white-space: pre; min-height: 1em; padding: 0 10px; display: block; }
  .line:hover { background-color: var(--vscode-editor-hoverHighlightBackground); }
  .line.asm-highlighted { background-color: var(--vscode-editor-findMatchHighlightBackground); border-left: 2px solid var(--vscode-editorLineNumber-activeForeground); }
  .line.match { background-color: var(--vscode-editor-findMatchHighlightBackground); }
  .line.no-match { display: none; }
  .asm-block { border: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border)); border-radius: 4px; margin: 6px 0; }
  .asm-block-header {
    cursor: pointer;
    padding: 4px 10px;
    font-weight: bold;
    background: var(--vscode-sideBarSectionHeader-background, var(--vscode-editor-background));
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-editor-foreground));
    border-radius: 4px;
    list-style: none;
    user-select: none;
  }
  .asm-block-header::before { content: "\\25BC\\00A0"; font-size: 10px; opacity: 0.7; }
  details.asm-block:not([open]) .asm-block-header::before { content: "\\25B6\\00A0"; }
  .asm-block-header:hover { background: var(--vscode-list-hoverBackground); }
  .asm-block-body { padding: 4px 0; }
  .search-bar {
    position: sticky;
    top: 0;
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border));
    z-index: 10;
    flex-wrap: wrap;
  }
  .search-bar input[type="text"] {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px;
    padding: 4px 8px;
    font-family: monospace;
    font-size: 13px;
    width: 280px;
    outline: none;
    box-sizing: border-box;
  }
  .search-bar input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
  .search-bar label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    color: var(--vscode-foreground);
    font-size: 13px;
    user-select: none;
  }
  #matchCount { color: var(--vscode-descriptionForeground); font-size: 12px; }
  .func-jump {
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px;
    padding: 4px 8px;
    font-family: monospace;
    font-size: 13px;
    max-width: 300px;
    outline: none;
    cursor: pointer;
  }
  .func-jump:focus { border-color: var(--vscode-focusBorder); }
  h3 { margin: 6px 0 2px 0; padding: 0 10px; }
  #asm { padding: 4px 0 10px 0; }
</style>
</head>
<body>
<div class="search-bar">
  <input type="text" id="searchInput" placeholder="Search (opcode, register, comment\u2026)" autocomplete="off" spellcheck="false" />
  <label><input type="checkbox" id="filterMode" /> Filter lines</label>
  <span id="matchCount"></span>
  ${funcJumpHtml}
</div>
<h3>Go Assembly: ${escapeHtml(filename)}</h3>
<div id="asm">${bodyContent}</div>
<script>
  (function () {
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const filterMode = document.getElementById('filterMode');
    const matchCountEl = document.getElementById('matchCount');
    const lines = document.querySelectorAll('.line');

    // Search / filter
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

      // Auto-expand blocks that have matching lines; collapse blocks with no matches
      document.querySelectorAll('.asm-block').forEach(function (block) {
        if (!query) { return; }
        const hasMatch = block.querySelector('.line.match') !== null;
        if (hasMatch) { block.setAttribute('open', ''); }
        else { block.removeAttribute('open'); }
      });

      matchCountEl.textContent = query
        ? count + ' match' + (count !== 1 ? 'es' : '')
        : '';
    }

    searchInput.addEventListener('input', applySearch);
    filterMode.addEventListener('change', applySearch);

    // Jump-to-function dropdown
    const funcJump = document.getElementById('funcJump');
    if (funcJump) {
      funcJump.addEventListener('change', function () {
        const id = funcJump.value;
        if (!id) { return; }
        const block = document.getElementById(id);
        if (block) {
          block.setAttribute('open', '');
          block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        funcJump.value = '';
      });
    }

    // Hover over ASM line → highlight source
    lines.forEach(function (line) {
      const srcFile = line.getAttribute('data-src-file');
      const srcLine = line.getAttribute('data-src-line');
      if (!srcFile || !srcLine) { return; }
      line.addEventListener('mouseenter', function () {
        vscode.postMessage({ type: 'hover', srcFile: srcFile, srcLine: parseInt(srcLine, 10) });
      });
      line.addEventListener('mouseleave', function () {
        vscode.postMessage({ type: 'hoverEnd' });
      });
    });

    // Incoming highlight from extension (source cursor → highlight ASM lines)
    window.addEventListener('message', function (event) {
      const msg = event.data;
      if (!msg || msg.type !== 'highlightLines') { return; }
      const toHighlight = new Set(msg.lines);
      lines.forEach(function (line) {
        const idx = line.getAttribute('data-asm-line');
        line.classList.toggle('asm-highlighted', idx !== null && toHighlight.has(parseInt(idx, 10)));
      });
      // Auto-expand blocks that contain highlighted lines
      document.querySelectorAll('.asm-block').forEach(function (block) {
        if (block.querySelector('.line.asm-highlighted') !== null) {
          block.setAttribute('open', '');
        }
      });
      // Scroll first highlighted line into view
      if (msg.lines && msg.lines.length > 0) {
        const first = document.querySelector('.line.asm-highlighted');
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }());
</script>
</body>
</html>
`;
}
