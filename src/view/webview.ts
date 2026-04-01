import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { filename } from "../format";
import { getAsm } from "../assembly";

export class AssemblyView implements Disposable {
  readonly panel: WebviewPanel;
  readonly fileUri: Uri;
  readonly filename: string;

  constructor(uri: Uri) {
    this.fileUri = uri;
    this.filename = filename(uri);

    this.panel = window.createWebviewPanel(
      "goAsmViewer",
      "Go Assembly View: " + this.filename,
      ViewColumn.Beside,
      { enableScripts: true }
    );
    this.panel.webview.html = getHtml("loading...", "");

    // Queue update next if something got here first
    setImmediate(this.update.bind(this));
  }

  dispose() {
    return this.panel.dispose();
  }

  get onDidClose() {
    return this.panel.onDidDispose;
  }

  async update() {
    try {
      const asm = await getAsm(this.fileUri);
      this.panel.webview.html = getHtml(asm, this.filename);
    } catch (err: any) {
      this.panel.webview.html = getHtml(
        `got an error: ${JSON.stringify({ ...err }, undefined, 2)}`,
        this.filename
      );
    }
  }
}

function highlightLine(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(0x[0-9a-f]+)/g, '<span class="addr">$1</span>')
    .replace(
      /\b(AX|AL|BX|CX|DX|SI|DI|R[0-9]+|SP|SB|BP)\b/g,
      '<span class="reg">$1</span>'
    )
    .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
    .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
    .replace(/(#.*$|\/\/.*$)/, '<span class="comment">$1</span>');
}

function getHtml(asm: string, filename: string) {
  const asmLines = asm
    .split("\n")
    .map((line) => `<div class="line">${highlightLine(line)}</div>`)
    .join("");

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
<h3>Go Assembly: ${filename}</h3>
<div id="asm">${asmLines}</div>
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
