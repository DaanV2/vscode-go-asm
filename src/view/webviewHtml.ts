import { AssemblyBlock } from "../assembly";
import { logger } from "../logger/logger";
import { SourceRef } from "./lineMaps";
import { SourceFileMatchTarget, matchesSourceFile } from "./sourceMatch";
import { ProgressLocation, window } from "vscode";

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

function parseRenderBlocks(
  rawLines: string[],
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  let currentBlock: RenderBlock | null = null;

  rawLines.forEach((line, idx) => {
    if (/^# /.test(line)) {
      currentBlock = { header: line.slice(2).trim(), lines: [] };
      blocks.push(currentBlock);
      return;
    }

    if (line.startsWith("#") || !currentBlock) {
      return;
    }

    currentBlock.lines.push(
      createAssemblyLine(line, idx, lineToSource, sourceMatchTarget),
    );
  });

  return blocks.filter((b) => b.lines.length > 0);
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
        createAssemblyLine(line, idx + blockOffset, lineToSource, sourceMatchTarget),
      ),
    };
  });
}

function renderBodyContent(content: RenderBlock[] | string[]): string {
  const isBlocks =
    content.length > 0 &&
    typeof content[0] === "object" &&
    content[0] !== null &&
    "header" in content[0];

  if (!isBlocks) {
    return (content as string[]).join("");
  }

  return (content as RenderBlock[])
    .map(
      (block) => `
<details class="asm-block" open>
  <summary class="asm-block-header">${escapeHtml(block.header)}</summary>
  <div class="asm-block-body">${block.lines.join("")}</div>
</details>`,
    )
    .join("\n");
}

function renderHtml(
  filename: string,
  content: RenderBlock[] | string[],
): string {
  const bodyContent = renderBodyContent(content);

  return `
<html>
<head>
<style>
  body { font-family: var(--vscode-editor-font-family, monospace); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 10px; }
  .addr { color: var(--vscode-textPreformat-foreground, #d7ba7d); }
  .op { color: var(--vscode-debugTokenExpression-name, #c586c0); }
  .reg { color: var(--vscode-debugTokenExpression-type, #4a90e2); }
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
<div id="asm">${bodyContent}</div>
<script>
  (function () {
    const vscode = acquireVsCodeApi();
    const searchInput = document.getElementById('searchInput');
    const filterMode = document.getElementById('filterMode');
    const sourceOnly = document.getElementById('sourceOnly');
    const matchCountEl = document.getElementById('matchCount');
    const lines = document.querySelectorAll('.line');

    // Search / filter
    function applySearch() {
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

      document.querySelectorAll('.asm-block').forEach(function (block) {
        const hasVisibleLine = block.querySelector('.line:not(.no-match)') !== null;
        block.classList.toggle('no-visible-lines', !hasVisibleLine);
      });

      // Auto-expand blocks that have matching lines; collapse blocks with no matches
      document.querySelectorAll('.asm-block').forEach(function (block) {
        if (!query) { return; }
        const hasMatch = block.querySelector('.line.match:not(.no-match)') !== null;
        if (hasMatch) { block.setAttribute('open', ''); }
        else { block.removeAttribute('open'); }
      });

      matchCountEl.textContent = query
        ? count + ' match' + (count !== 1 ? 'es' : '')
        : '';
    }

    searchInput.addEventListener('input', applySearch);
    filterMode.addEventListener('change', applySearch);
    sourceOnly.addEventListener('change', applySearch);
    applySearch();

    // Hover over ASM line -> highlight source
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

    // Incoming highlight from extension (source cursor -> highlight ASM lines)
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

export async function getHtml(
  asm: string,
  filename: string,
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
) {
  return getHtmlLines(asm.split("\n"), filename, lineToSource, sourceMatchTarget);
}

export async function getHtmlLines(
  rawLines: string[],
  filename: string,
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
) {
  const popts = {
    location: ProgressLocation.Window,
    cancellable: true,
    title: "Generating assembly view...",
  };

  return window.withProgress(popts, async (progress, token) => {
    const start = performance.now();
    const validBlocks = parseRenderBlocks(
      rawLines,
      lineToSource,
      sourceMatchTarget,
    );

    if (validBlocks.length > 0) {
      logger.info(
        `Parsed assembly into ${validBlocks.length} blocks in ${(performance.now() - start).toFixed(2)}ms`,
      );

      return renderHtml(filename, validBlocks);
    }

    const processedLines = rawLines.map((line, idx) =>
      createAssemblyLine(line, idx, lineToSource, sourceMatchTarget),
    );
    return renderHtml(filename, processedLines);
  });
}

export async function getHtmlAssembly(
  rawLines: AssemblyBlock[],
  filename: string,
  lineToSource: Map<number, SourceRef>,
  sourceMatchTarget: SourceFileMatchTarget,
) {
  const popts = {
    location: ProgressLocation.Window,
    cancellable: true,
    title: "Generating assembly view...",
  };

  return window.withProgress(popts, async () => {
    const start = performance.now();
    const validBlocks = convertToRenderBlocks(
      rawLines,
      lineToSource,
      sourceMatchTarget,
    );

    if (validBlocks.length > 0) {
      logger.info(
        `Parsed assembly into ${validBlocks.length} blocks in ${(performance.now() - start).toFixed(2)}ms`,
      );

      return renderHtml(filename, validBlocks);
    }

    return renderHtml(filename, ["issue rendering assembly"]);
  });
}
