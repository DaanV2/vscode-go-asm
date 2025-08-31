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

function getHtml(asm: string, filename: string) {
  return `
<html>
<head>
<style>
  body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 10px; }
  .addr { color: #808080; }
  .op { color: #569cd6; }
  .reg { color: #dcdcaa; }
  .comment { color: #6a9955; font-style: italic; }
  .src { background: #333; color: #c586c0; padding: 2px 4px; border-radius: 3px; }
  .line:hover { background-color: #333333; }
  .comment { color: #6a9955; font-style: italic; }
</style>
</head>
<body>
<h3>Go Assembly: ${filename}</h3>
<pre>
${asm
  .replace(/(0x[0-9a-f]+)/g, '<span class="addr">$1</span>')
  .replace(
    /\b(AX|AL|BX|CX|DX|SI|DI|R[0-9]+|SP|SB|BP)\b/g,
    '<span class="reg">$1</span>'
  )
  .replace(/\b([A-Z]{3,})\b/g, '<span class="op">$1</span>')
  .replace(/\(([^)]+\.go:\d+)\)/g, '<span class="src">($1)</span>')
  .replace(/(#.*$|\/\/.*$)/gm, '<span class="comment">$1</span>')}
</pre>
</body>
</html>
`;
}
