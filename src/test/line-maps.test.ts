import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLineMaps } from "../view/lineMaps";
import { SourceFileMatchTarget } from "../view/sourceMatch";

describe("buildLineMaps", () => {
  it("maps asm lines to source refs and current-file line groups", () => {
    const asm = [
      '0x0000 00000 (./pkg/foo.go:10) MOVQ AX, BX',
      '0x0001 00001 (./pkg/foo.go:10) ADDQ CX, DX',
      '0x0002 00002 (./pkg/bar.go:20) RET',
    ].join("\n");

    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    const { lineToSource, sourceToLines } = buildLineMaps(asm, target);

    assert.deepStrictEqual(lineToSource.get(0), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(lineToSource.get(1), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(lineToSource.get(2), { srcFile: "./pkg/bar.go", srcLine: 20 });

    assert.deepStrictEqual(sourceToLines.get(10), [0, 1]);
    assert.strictEqual(sourceToLines.has(20), false);
  });

  it("ignores lines without source annotations", () => {
    const asm = [
      '0x0000 00000 MOVQ AX, BX',
      '0x0001 00001 (./pkg/foo.go:10) RET',
    ].join("\n");

    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    const { lineToSource, sourceToLines } = buildLineMaps(asm, target);

    assert.strictEqual(lineToSource.has(0), false);
    assert.deepStrictEqual(lineToSource.get(1), { srcFile: "./pkg/foo.go", srcLine: 10 });
    assert.deepStrictEqual(sourceToLines.get(10), [1]);
  });
});
