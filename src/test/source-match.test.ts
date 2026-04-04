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
});
