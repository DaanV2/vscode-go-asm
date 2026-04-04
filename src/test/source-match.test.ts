import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchesSourceFile,
  normalizePathForCompare,
  SourceFileMatchTarget,
} from "../view/sourceMatch";

describe("sourceMatch", () => {
  it("normalizes separators and casing", () => {
    const normalized = normalizePathForCompare(".\\PKG\\Foo.GO");
    assert.strictEqual(normalized, "pkg/foo.go");
  });

  it("matches absolute source suffixes", () => {
    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile("pkg/foo.go", target), true);
  });

  it("matches workspace-relative path from asm", () => {
    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile("./pkg/foo.go", target), true);
  });

  it("falls back to basename matching", () => {
    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile("foo.go", target), true);
  });

  it("does not match a different file", () => {
    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile("pkg/bar.go", target), false);
  });

  // Windows-style paths from Go compiler output (e.g. C:/Users/...)
  it("matches windows absolute path in asm output", () => {
    const target: SourceFileMatchTarget = {
      absolute: "c:/users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile("C:\\Users\\me\\work\\mod\\pkg\\foo.go", target), true);
  });

  it("matches windows workspace-relative path in asm output", () => {
    const target: SourceFileMatchTarget = {
      absolute: "c:/users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    assert.strictEqual(matchesSourceFile(".\\pkg\\foo.go", target), true);
  });

  it("matches when asm has windows drive-letter path and target is unix-normalized", () => {
    const target: SourceFileMatchTarget = {
      absolute: "users/me/work/mod/pkg/foo.go",
      relative: "pkg/foo.go",
      basename: "foo.go",
    };

    // Go on Windows may emit absolute paths like C:/Users/...
    assert.strictEqual(matchesSourceFile("C:/Users/me/work/mod/pkg/foo.go", target), true);
  });

  it("normalizes windows drive letter", () => {
    assert.strictEqual(
      normalizePathForCompare("C:\\Users\\Me\\Work\\pkg\\foo.go"),
      "users/me/work/pkg/foo.go",
    );
  });

  it("normalizes unix absolute path", () => {
    assert.strictEqual(
      normalizePathForCompare("/home/me/work/pkg/foo.go"),
      "home/me/work/pkg/foo.go",
    );
  });
});
