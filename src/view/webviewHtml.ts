/**
 * Returns the one-time HTML shell for the assembly webview.
 *
 * The shell loads sql.js (SQLite compiled to WASM), creates an in-memory
 * database, and listens for `{ type: 'rows', rows: AssemblyRow[] }` messages
 * from the extension.  On each message it replaces the DB contents and
 * re-renders the DOM — no full page reload, no scroll-position loss.
 *
 * @param filename    Source filename shown in the heading.
 * @param sqlJsUri    Webview URI for `sql-wasm.js` (the sql.js JS wrapper).
 * @param sqlWasmUri  Webview URI for `sql-wasm.wasm` (the SQLite WASM binary).
 */
export function getShellHtml(
  filename: string,
  sqlJsUri: string,
  sqlWasmUri: string,
): string {
  const escapedFilename = escapeHtmlAttr(filename);
  // language=HTML
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-editor-font-family, monospace); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 10px; }
  .addr { color: var(--vscode-editorLineNumber-foreground); }
  .op { color: var(--vscode-symbolIcon-keywordForeground); }
  .reg { color: var(--vscode-symbolIcon-variableForeground); }
  .imm { color: var(--vscode-symbolIcon-numberForeground); }
  .comment { color: var(--vscode-descriptionForeground); font-style: italic; }
  .src { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 4px; border-radius: 3px; }
  .line { white-space: pre; min-height: 1em; padding: 0 10px; display: block; }
  .line:hover { background-color: var(--vscode-editor-hoverHighlightBackground); }
  .line.asm-highlighted { background-color: var(--vscode-editor-findMatchHighlightBackground); border-left: 2px solid var(--vscode-editorLineNumber-activeForeground); }
  .line.match { background-color: var(--vscode-editor-findMatchHighlightBackground); }
  .line.no-match { display: none; }
  .asm-block.no-visible-lines { display: none; }
  .asm-block { border: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border)); border-radius: 4px; margin: 6px 0; }
  .asm-block-header {
    cursor: pointer; padding: 4px 10px; font-weight: bold;
    background: var(--vscode-sideBarSectionHeader-background, var(--vscode-editor-background));
    color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-editor-foreground));
    border-radius: 4px; list-style: none; user-select: none;
  }
  .asm-block-header::before { content: "\\25BC\\00A0"; font-size: 10px; opacity: 0.7; }
  details.asm-block:not([open]) .asm-block-header::before { content: "\\25B6\\00A0"; }
  .asm-block-header:hover { background: var(--vscode-list-hoverBackground); }
  .asm-block-body { padding: 4px 0; }
  .search-bar {
    position: sticky; top: 0;
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    padding: 6px 10px; display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border));
    z-index: 10; flex-wrap: wrap;
  }
  .search-bar input[type="text"] {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px;
    padding: 4px 8px; font-family: monospace; font-size: 13px; width: 280px;
    outline: none; box-sizing: border-box;
  }
  .search-bar input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
  .search-bar label { display: flex; align-items: center; gap: 5px; cursor: pointer; color: var(--vscode-foreground); font-size: 13px; user-select: none; }
  #matchCount { color: var(--vscode-descriptionForeground); font-size: 12px; }
  h3 { margin: 6px 0 2px 0; padding: 0 10px; }
  #asm { padding: 4px 0 10px 0; }
  #loading { opacity: 0.6; padding: 0 10px; }
</style>
</head>
<body>
<div class="search-bar">
  <input type="text" id="searchInput" placeholder="Search (opcode, register, comment\u2026)" autocomplete="off" spellcheck="false" />
  <label><input type="checkbox" id="filterMode" /> Filter lines</label>
  <label><input type="checkbox" id="sourceOnly" checked /> Source file only</label>
  <span id="matchCount"></span>
</div>
<h3>Go Assembly: ${escapedFilename}</h3>
<div id="asm"><p id="loading">Loading assembly\u2026</p></div>
<script src="${sqlJsUri}"></script>
<script>
(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const searchInput = document.getElementById('searchInput');
  const filterMode  = document.getElementById('filterMode');
  const sourceOnly  = document.getElementById('sourceOnly');
  const matchCountEl = document.getElementById('matchCount');
  const asmContainer = document.getElementById('asm');

  let db = null;
  const msgQueue = [];

  // ── sql.js initialisation ────────────────────────────────────────────────
  initSqlJs({ locateFile: () => '${sqlWasmUri}' }).then(function (SQL) {
    db = new SQL.Database();
    db.run([
      'CREATE TABLE asm_lines (',
      '  asm_line         INTEGER PRIMARY KEY,',
      '  text             TEXT    NOT NULL,',
      '  block_header     TEXT,',
      '  src_file         TEXT,',
      '  src_line         INTEGER,',
      '  is_current_source INTEGER DEFAULT 0',
      ')'
    ].join(' '));
    // Drain any messages that arrived before the DB was ready
    msgQueue.splice(0).forEach(processMsg);
  }).catch(function (err) {
    asmContainer.innerHTML = '<p style="color:var(--vscode-errorForeground)">Failed to initialise sql.js: ' + escHtml(String(err)) + '</p>';
  });

  // ── message routing ──────────────────────────────────────────────────────
  window.addEventListener('message', function (event) {
    if (!db) { msgQueue.push(event.data); return; }
    processMsg(event.data);
  });

  function processMsg(msg) {
    if (!msg) { return; }
    if (msg.type === 'rows')           { loadRows(msg.rows); render(); }
    else if (msg.type === 'highlightLines') { highlightAsmLines(msg.lines); }
  }

  // ── DB helpers ───────────────────────────────────────────────────────────
  function loadRows(rows) {
    db.run('DELETE FROM asm_lines');
    if (!rows || !rows.length) { return; }
    var stmt = db.prepare('INSERT INTO asm_lines VALUES (?,?,?,?,?,?)');
    rows.forEach(function (r) {
      stmt.run([r.asmLine, r.text, r.blockHeader, r.srcFile, r.srcLine, r.isCurrentSource ? 1 : 0]);
    });
    stmt.free();
  }

  // ── rendering ────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function syntaxHL(s) {
    return s
      .replace(/(0x[0-9a-fA-F]+)/g,                                   '<span class="addr">$1</span>')
      .replace(/\\b(AX|AL|BX|BL|CX|CL|DX|DL|SI|DI|R[0-9]+|SP|SB|BP|FP|PC|TLS)\\b/g, '<span class="reg">$1</span>')
      .replace(/(\\$-?\\d+)/g,                                          '<span class="imm">$1</span>')
      .replace(/\\b([A-Z]{3,})\\b/g,                                    '<span class="op">$1</span>')
      .replace(/\\(([^)]+\\.go:\\d+)\\)/g,                              '<span class="src">($1)</span>')
      .replace(/(#.*$|\\/\\/.*$)/g,                                     '<span class="comment">$1</span>');
  }

  function makeLineHtml(row) {
    var esc   = escHtml(row.text);
    var styled = syntaxHL(esc);
    var attrs  = 'data-asm-line="' + row.asm_line + '"';
    if (row.src_file) { attrs += ' data-src-file="' + escHtml(row.src_file) + '"'; }
    if (row.src_line !== null && row.src_line !== undefined) { attrs += ' data-src-line="' + row.src_line + '"'; }
    attrs += ' data-is-current-source="' + (row.is_current_source ? 'true' : 'false') + '"';
    return '<span class="line" ' + attrs + '>' + styled + '</span>';
  }

  function render() {
    var result = db.exec(
      'SELECT asm_line, text, block_header, src_file, src_line, is_current_source ' +
      'FROM asm_lines ORDER BY asm_line'
    );
    if (!result.length) {
      asmContainer.innerHTML = '<p id="loading">No assembly data.</p>';
      return;
    }
    var cols    = result[0].columns;
    var rowObjs = result[0].values.map(function (v) {
      var o = {};
      cols.forEach(function (c, i) { o[c] = v[i]; });
      return o;
    });

    var hasBlocks = rowObjs.some(function (r) { return r.block_header !== null; });
    var html;

    if (hasBlocks) {
      // Group rows by block_header in insertion order
      var blockMap = [];
      var blockIdx = {};
      rowObjs.forEach(function (r) {
        var h = r.block_header || '';
        if (!(h in blockIdx)) { blockIdx[h] = blockMap.length; blockMap.push({ header: h, rows: [] }); }
        blockMap[blockIdx[h]].rows.push(r);
      });
      html = blockMap.map(function (blk) {
        return '<details class="asm-block" open>' +
          '<summary class="asm-block-header">' + escHtml(blk.header) + '</summary>' +
          '<div class="asm-block-body">' + blk.rows.map(makeLineHtml).join('') + '</div>' +
          '</details>';
      }).join('\\n');
    } else {
      html = rowObjs.map(makeLineHtml).join('');
    }

    asmContainer.innerHTML = html;
    attachHoverListeners();
    applySearch();
  }

  function attachHoverListeners() {
    asmContainer.querySelectorAll('.line[data-src-file]').forEach(function (line) {
      line.addEventListener('mouseenter', function () {
        vscode.postMessage({ type: 'hover', srcFile: line.dataset.srcFile, srcLine: parseInt(line.dataset.srcLine, 10) });
      });
      line.addEventListener('mouseleave', function () {
        vscode.postMessage({ type: 'hoverEnd' });
      });
    });
  }

  // ── search / filter ──────────────────────────────────────────────────────
  function applySearch() {
    var query      = searchInput.value.toLowerCase();
    var isFilter   = filterMode.checked;
    var isSrcOnly  = sourceOnly.checked;
    var count      = 0;

    asmContainer.querySelectorAll('.line').forEach(function (line) {
      var text        = line.textContent.toLowerCase();
      var matches     = !query || text.indexOf(query) !== -1;
      var isCurrent   = line.dataset.isCurrentSource === 'true';
      var hiddenByQ   = isFilter && query.length > 0 && !matches;
      var hiddenBySrc = isSrcOnly && !isCurrent;
      var hidden      = hiddenByQ || hiddenBySrc;

      line.classList.toggle('match',    matches && query.length > 0 && !hidden);
      line.classList.toggle('no-match', hidden);
      if (matches && query.length > 0 && !hidden) { count++; }
    });

    asmContainer.querySelectorAll('.asm-block').forEach(function (block) {
      var hasVisible = block.querySelector('.line:not(.no-match)') !== null;
      block.classList.toggle('no-visible-lines', !hasVisible);
      if (query) {
        var hasMatch = block.querySelector('.line.match:not(.no-match)') !== null;
        if (hasMatch) { block.setAttribute('open', ''); }
        else          { block.removeAttribute('open'); }
      }
    });

    matchCountEl.textContent = query ? count + ' match' + (count !== 1 ? 'es' : '') : '';
  }

  searchInput.addEventListener('input',  applySearch);
  filterMode .addEventListener('change', applySearch);
  sourceOnly .addEventListener('change', applySearch);

  // ── ASM line highlight (from source cursor) ──────────────────────────────
  function highlightAsmLines(lines) {
    var toHL = {};
    (lines || []).forEach(function (n) { toHL[n] = true; });

    asmContainer.querySelectorAll('.line').forEach(function (line) {
      var idx = line.dataset.asmLine;
      line.classList.toggle('asm-highlighted', idx !== undefined && toHL[parseInt(idx, 10)] === true);
    });
    asmContainer.querySelectorAll('.asm-block').forEach(function (block) {
      if (block.querySelector('.line.asm-highlighted') !== null) {
        block.setAttribute('open', '');
      }
    });
    var first = asmContainer.querySelector('.line.asm-highlighted');
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
}());
</script>
</body>
</html>
`;
}

function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
