import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLineMaps, extractLineInfo } from "../view/lineMaps";
import { SourceFileMatchTarget } from "../view/sourceMatch";

describe("buildLineMaps", () => {
  it("maps asm lines to source refs and current-file line groups", () => {
    const asm = [
      '0x0000 00000 (./pkg/foo.go:10) MOVQ AX, BX',
      '0x0001 00001 (./pkg/foo.go:10) ADDQ CX, DX',
      '0x0002 00002 (./pkg/bar.go:20) RET',
    ].join("\n");

    const { lineToSource, sourceToLines } = buildLineMaps(asm);

    assert.deepStrictEqual(lineToSource.get(0), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(lineToSource.get(1), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(lineToSource.get(2), { srcFile: "./pkg/bar.go", srcLine: 20 });

    assert.deepStrictEqual(sourceToLines.get(10), [0, 1]);
    assert.deepStrictEqual(sourceToLines.get(20), [2]);
  });

  it("ignores lines without source annotations", () => {
    const asm = [
      '0x0000 00000 MOVQ AX, BX',
      '0x0001 00001 (./pkg/foo.go:10) RET',
    ].join("\n");

    const { lineToSource, sourceToLines } = buildLineMaps(asm);

    assert.strictEqual(lineToSource.has(0), false);
    assert.deepStrictEqual(lineToSource.get(1), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(sourceToLines.get(10), [1]);
  });

  it("uses unique asm line keys when appending streamed blocks", () => {
    const lineToSource = new Map<number, { srcFile: string; srcLine: number }>();
    const sourceToLines = new Map<number, number[]>();

    extractLineInfo(
      [
        '0x0000 00000 (./pkg/foo.go:10) MOVQ AX, BX',
        '0x0001 00001 (./pkg/foo.go:11) RET',
      ],
      lineToSource,
      sourceToLines,
      0,
    );
    extractLineInfo(
      [
        '0x0000 00000 (./pkg/foo.go:12) MOVQ AX, BX',
        '0x0001 00001 (./pkg/foo.go:13) RET',
      ],
      lineToSource,
      sourceToLines,
      2,
    );

    assert.deepStrictEqual(lineToSource.get(0), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(lineToSource.get(1), { srcFile: "./pkg/foo.go", srcLine: 11 });
    assert.deepStrictEqual(lineToSource.get(2), { srcFile: "./pkg/foo.go", srcLine: 12 });
    assert.deepStrictEqual(lineToSource.get(3), { srcFile: "./pkg/foo.go", srcLine: 13 });
    assert.deepStrictEqual(sourceToLines.get(12), [2]);
  });
});
