import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prioritizeAssemblyBlocks } from "../assembly/order";

describe("prioritizeAssemblyBlocks", () => {
  it("keeps current-file functions first without dropping other blocks", () => {
    const blocks = [
      { header: "pkg.Helper STEXT", data: ["RET"] },
      { header: "pkg.CurrentOne STEXT", data: ["RET"] },
      { header: "pkg.Other STEXT", data: ["RET"] },
      { header: "pkg.CurrentTwo STEXT", data: ["RET"] },
    ];

    const ordered = prioritizeAssemblyBlocks(blocks, [
      "CurrentOne",
      "CurrentTwo",
    ]);

    assert.deepStrictEqual(
      ordered.map((block) => block.header),
      [
        "pkg.CurrentOne STEXT",
        "pkg.CurrentTwo STEXT",
        "pkg.Helper STEXT",
        "pkg.Other STEXT",
      ],
    );
  });

  it("preserves original order when no current-file functions match", () => {
    const blocks = [
      { header: "pkg.First STEXT", data: ["RET"] },
      { header: "pkg.Second STEXT", data: ["RET"] },
    ];

    const ordered = prioritizeAssemblyBlocks(blocks, ["Missing"]);

    assert.deepStrictEqual(
      ordered.map((block) => block.header),
      ["pkg.First STEXT", "pkg.Second STEXT"],
    );
  });
});