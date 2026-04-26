import { AssemblyBlock, INSTRUCTION_HOVER, REGISTER_HOVER } from "../assembly";
import { logger } from "../logger/logger";
import { SourceRef } from "./lineMaps";
import { SourceFileMatchTarget, matchesSourceFile } from "./sourceMatch";

interface RenderBlock {
  header: string;
  lines: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function syntaxHighlight(escaped: string): string {
  return escaped
    .replace(/(0x[0-9a-fA-F]+)/g, '<span class="addr">$1</span>')
    .replace(
      /\b(AX|AL|BX|BL|CX|CL|DX|DL|SI|DI|R[0-9]+|SP|SB|BP|FP|PC|TLS)\b/g,
      '<span class="reg">$1</span>',
    )
    .replace(/(\$-?\d+)/g, '<span class="imm">$1</span>')
    .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
    .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
    .replace(/(#.*$|\/\/.*$)/g, '<span class="comment">$1</span>');
}

function createAssemblyLine(
  line: string,
  idx: number,
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
): string {
  const srcRef = lineToSource.get(idx);
  const isCurrentSource = srcRef
    ? matchesSourceFile(srcRef.srcFile, sourceMatchTarget)
    : false;
  const dataAttrs = srcRef
    ? ` data-src-file="${escapeHtml(srcRef.srcFile)}" data-src-line="${srcRef.srcLine}" data-is-current-source="${isCurrentSource}" data-asm-line="${idx}"`
    : ` data-asm-line="${idx}"`;

  const styledLine = syntaxHighlight(escapeHtml(line));

  return `<span class="line"${dataAttrs}>${styledLine}</span>`;
}

function convertToRenderBlocks(
  rawBlocks: AssemblyBlock[],
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
): RenderBlock[] {
  let offset = 0;
  return rawBlocks.map((block) => {
    const blockOffset = offset;
    offset += block.data.length;
    return {
      header: block.header,
      lines: block.data.map((line, idx) =>
        createAssemblyLine(
          line,
          idx + blockOffset,
          lineToSource,
          sourceMatchTarget,
        ),
      ),
    };
  });
}

function renderBlocksHtml(blocks: RenderBlock[]): string {
  return blocks
    .map(
      (block) => `
<details class="asm-block" open>
  <summary class="asm-block-header">${escapeHtml(block.header)}</summary>
  <div class="asm-block-body">${block.lines.join("")}</div>
</details>`,
    )
    .join("\n");
}

/** Serializes an object to JSON for safe embedding inside a <script> tag. */
function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

/** Builds a single lookup map combining register and instruction hover data. */
function buildHoverDataJson(): string {
  const combined: Record<string, { title: string; description: string; category: string }> = {
    ...REGISTER_HOVER,
    ...INSTRUCTION_HOVER,
  };
  return safeJsonForScript(combined);
}

/**
 * Returns the static HTML shell for the assembly view panel.
 * Rendered once when the panel is created; assembly content is updated
 * via postMessage({ type: 'updateAsm', html }) without reloading this shell.
 */
export function getShellHtml(filename: string): string {
  const hoverDataJson = buildHoverDataJson();

  return `
<html>
<head>
<style>
  body { font-family: var(--vscode-editor-font-family, monospace); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 10px; }
  .addr { color: var(--vscode-textPreformat-foreground, #d7ba7d); }
  .op { color: var(--vscode-debugTokenExpression-name, #c586c0); cursor: help; }
  .reg { color: var(--vscode-debugTokenExpression-type, #4a90e2); cursor: help; }
  .imm { color: var(--vscode-debugTokenExpression-number, #b5cea8); }
  .comment { color: var(--vscode-descriptionForeground, rgba(204,204,204,0.7)); font-style: italic; }
  .src { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 2px 4px; border-radius: 3px; }
  .line { white-space: pre; min-height: 1em; padding: 0 10px; display: block; }
  .line:hover { background-color: var(--vscode-editor-hoverHighlightBackground); }
  .line.asm-highlighted { background-color: var(--vscode-editor-findMatchHighlightBackground); border-left: 2px solid var(--vscode-editorLineNumber-activeForeground); }
  .line.match { background-color: var(--vscode-editor-findMatchHighlightBackground); }
  .line.no-match { display: none; }
  .asm-block.no-visible-lines { display: none; }
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
  h3 { margin: 6px 0 2px 0; padding: 0 10px; }
  #asm { padding: 4px 0 10px 0; }
  /* Hover tooltip */
  #asm-tooltip {
    position: fixed;
    z-index: 200;
    max-width: 400px;
    background: var(--vscode-editorHoverWidget-background, var(--vscode-editor-background));
    color: var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground));
    border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-panel-border, #444));
    border-radius: 4px;
    padding: 8px 10px;
    font-family: var(--vscode-font-family, sans-serif);
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    pointer-events: none;
    display: none;
    white-space: normal;
    line-height: 1.4;
  }
  #asm-tooltip.visible { display: block; }
  .tooltip-title { font-weight: bold; margin-bottom: 5px; font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; }
  .tooltip-category {
    display: inline-block;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--vscode-badge-background, #444);
    color: var(--vscode-badge-foreground, #fff);
    margin-bottom: 6px;
  }
  .tooltip-desc { font-size: 12px; opacity: 0.92; }
</style>
</head>
<body>
<div class="search-bar">
  <input type="text" id="searchInput" placeholder="Search (opcode, register, comment\u2026)" autocomplete="off" spellcheck="false" />
  <label><input type="checkbox" id="filterMode" /> Filter lines</label>
  <label><input type="checkbox" id="sourceOnly" checked /> Source file only</label>
  <span id="matchCount"></span>
</div>
<h3>Go Assembly: ${escapeHtml(filename)}</h3>
<div id="asm"><span style="padding: 0 10px; opacity: 0.6;">Loading assembly\u2026</span></div>
<div id="asm-tooltip" role="tooltip" aria-hidden="true">
  <div class="tooltip-title"></div>
  <div class="tooltip-category"></div>
  <div class="tooltip-desc"></div>
</div>
<script>
  (function () {
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const filterMode = document.getElementById('filterMode');
    const sourceOnly = document.getElementById('sourceOnly');
    const matchCountEl = document.getElementById('matchCount');
    const asmContainer = document.getElementById('asm');

    // Restore persisted UI state across panel reloads (e.g. VS Code restart)
    (function restoreState() {
      const state = vscode.getState();
      if (!state) { return; }
      if (typeof state.sourceOnly === 'boolean') { sourceOnly.checked = state.sourceOnly; }
      if (typeof state.filterMode === 'boolean') { filterMode.checked = state.filterMode; }
      if (typeof state.search === 'string') { searchInput.value = state.search; }
    }());

    function saveState() {
      vscode.setState({ sourceOnly: sourceOnly.checked, filterMode: filterMode.checked, search: searchInput.value });
    }

    // Re-queries lines from the live DOM so it works after updateAsm replaces innerHTML
    function applySearch() {
      const lines = asmContainer.querySelectorAll('.line');
      const query = searchInput.value.toLowerCase();
      const isFilter = filterMode.checked;
      const isSourceOnly = sourceOnly.checked;
      let count = 0;

      lines.forEach(function (line) {
        const text = line.textContent.toLowerCase();
        const matches = !query || text.includes(query);
        const isCurrentSource = line.getAttribute('data-is-current-source') === 'true';
        const filteredBySearch = isFilter && query.length > 0 && !matches;
        const filteredBySource = isSourceOnly && !isCurrentSource;
        const isHidden = filteredBySearch || filteredBySource;

        line.classList.toggle('match', matches && query.length > 0 && !isHidden);
        line.classList.toggle('no-match', isHidden);

        if (matches && query.length > 0 && !isHidden) { count++; }
      });

      asmContainer.querySelectorAll('.asm-block').forEach(function (block) {
        const hasVisibleLine = block.querySelector('.line:not(.no-match)') !== null;
        block.classList.toggle('no-visible-lines', !hasVisibleLine);
      });

      asmContainer.querySelectorAll('.asm-block').forEach(function (block) {
        if (!query) { return; }
        const hasMatch = block.querySelector('.line.match:not(.no-match)') !== null;
        if (hasMatch) { block.setAttribute('open', ''); }
        else { block.removeAttribute('open'); }
      });

      matchCountEl.textContent = query
        ? count + ' match' + (count !== 1 ? 'es' : '')
        : '';
    }

    searchInput.addEventListener('input', function () { saveState(); applySearch(); });
    filterMode.addEventListener('change', function () { saveState(); applySearch(); });
    sourceOnly.addEventListener('change', function () { saveState(); applySearch(); });

    // Event delegation: ASM line hover -> highlight source in editor
    // Attached once to the container so it survives innerHTML replacements.
    var currentHoverLine = null;
    asmContainer.addEventListener('mouseover', function (e) {
      var line = e.target.closest ? e.target.closest('.line') : null;
      if (line === currentHoverLine) { return; }
      if (currentHoverLine) { vscode.postMessage({ type: 'hoverEnd' }); }
      currentHoverLine = line;
      if (line && line.getAttribute('data-src-file')) {
        vscode.postMessage({
          type: 'hover',
          srcFile: line.getAttribute('data-src-file'),
          srcLine: parseInt(line.getAttribute('data-src-line'), 10),
        });
      }
    });
    asmContainer.addEventListener('mouseleave', function () {
      if (currentHoverLine) { vscode.postMessage({ type: 'hoverEnd' }); }
      currentHoverLine = null;
    });

    // Incoming messages from extension
    window.addEventListener('message', function (event) {
      const msg = event.data;
      if (!msg) { return; }

      if (msg.type === 'updateAsm') {
        asmContainer.innerHTML = msg.html;
        applySearch();
        return;
      }

      if (msg.type === 'updateStatus') {
        const el = document.createElement('span');
        el.style.cssText = 'padding: 0 10px; opacity: 0.6;';
        el.textContent = msg.message;
        asmContainer.replaceChildren(el);
        return;
      }

      if (msg.type === 'highlightLines') {
        const toHighlight = new Set(msg.lines);
        asmContainer.querySelectorAll('.line').forEach(function (line) {
          const idx = line.getAttribute('data-asm-line');
          line.classList.toggle('asm-highlighted', idx !== null && toHighlight.has(parseInt(idx, 10)));
        });
        asmContainer.querySelectorAll('.asm-block').forEach(function (block) {
          if (block.querySelector('.line.asm-highlighted') !== null) {
            block.setAttribute('open', '');
          }
        });
        if (msg.lines && msg.lines.length > 0) {
          const first = asmContainer.querySelector('.line.asm-highlighted');
          if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    });

    // Hover tooltips for registers (.reg) and instructions (.op)
    // Event delegation so tooltips work after innerHTML is replaced.
    var hoverData = ${hoverDataJson};
    var tooltip = document.getElementById('asm-tooltip');
    var tooltipTitle = tooltip.querySelector('.tooltip-title');
    var tooltipCategory = tooltip.querySelector('.tooltip-category');
    var tooltipDesc = tooltip.querySelector('.tooltip-desc');

    function showTooltip(el) {
      var key = el.textContent.trim().toUpperCase();
      var item = hoverData[key];
      if (!item) { return; }

      tooltipTitle.textContent = item.title;
      tooltipCategory.textContent = item.category;
      tooltipDesc.textContent = item.description;
      tooltip.setAttribute('aria-hidden', 'false');
      tooltip.classList.add('visible');

      var rect = el.getBoundingClientRect();
      var tipWidth = tooltip.offsetWidth;
      var left = Math.max(4, Math.min(rect.left, window.innerWidth - tipWidth - 8));
      tooltip.style.left = left + 'px';

      var spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow >= 80 || spaceBelow >= rect.top) {
        tooltip.style.top = (rect.bottom + 6) + 'px';
        tooltip.style.bottom = '';
      } else {
        tooltip.style.top = '';
        tooltip.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      }
    }

    function hideTooltip() {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }

    asmContainer.addEventListener('mouseover', function (e) {
      var el = e.target;
      if (el.classList && (el.classList.contains('reg') || el.classList.contains('op'))) {
        showTooltip(el);
      }
    });
    asmContainer.addEventListener('mouseout', function (e) {
      var el = e.target;
      if (el.classList && (el.classList.contains('reg') || el.classList.contains('op'))) {
        hideTooltip();
      }
    });
  }());
</script>
</body>
</html>
`;
}

/**
 * Generates the inner HTML string for the #asm container from assembly blocks.
 * Send via postMessage({ type: 'updateAsm', html }) to update the view without
 * reloading the shell or losing UI state.
 */
export function getAsmContentHtml(
  rawBlocks: AssemblyBlock[],
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
): string {
  const start = performance.now();
  const blocks = convertToRenderBlocks(rawBlocks, lineToSource, sourceMatchTarget);
  logger.info(`Rendered ${blocks.length} assembly blocks in ${(performance.now() - start).toFixed(2)}ms`);

  if (blocks.length === 0) {
    return '<span style="padding: 0 10px; opacity: 0.6;">No assembly output.</span>';
  }

  return renderBlocksHtml(blocks);
}

