import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INSTRUCTION_HOVER, REGISTER_HOVER, HoverItem } from "../assembly/hover-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertValidItem(key: string, item: HoverItem) {
  assert.ok(item.title.length > 0, `${key}: title must not be empty`);
  assert.ok(item.description.length > 0, `${key}: description must not be empty`);
  assert.ok(item.category.length > 0, `${key}: category must not be empty`);
}

// ---------------------------------------------------------------------------
// REGISTER_HOVER
// ---------------------------------------------------------------------------

describe("REGISTER_HOVER", () => {
  it("contains entries for all Go pseudo-registers", () => {
    const pseudoRegs = ["FP", "SB", "PC", "TLS"];
    for (const reg of pseudoRegs) {
      assert.ok(reg in REGISTER_HOVER, `Missing pseudo-register: ${reg}`);
    }
  });

  it("contains entries for common x86-64 registers", () => {
    const common = ["AX", "BX", "CX", "DX", "SI", "DI", "SP", "BP"];
    for (const reg of common) {
      assert.ok(reg in REGISTER_HOVER, `Missing register: ${reg}`);
    }
  });

  it("contains entries for extended x86-64 registers R8–R15", () => {
    for (let i = 8; i <= 15; i++) {
      const key = `R${i}`;
      assert.ok(key in REGISTER_HOVER, `Missing register: ${key}`);
    }
  });

  it("every entry has non-empty title, description, and category", () => {
    for (const [key, item] of Object.entries(REGISTER_HOVER)) {
      assertValidItem(key, item);
    }
  });

  it("FP entry mentions pseudo-register and arguments", () => {
    const fp = REGISTER_HOVER["FP"];
    assert.ok(fp !== undefined, "FP entry should exist");
    assert.ok(
      fp.description.toLowerCase().includes("argument") ||
        fp.description.toLowerCase().includes("pseudo"),
      "FP description should mention arguments or pseudo-register",
    );
  });

  it("SB entry mentions static or global", () => {
    const sb = REGISTER_HOVER["SB"];
    assert.ok(sb !== undefined, "SB entry should exist");
    assert.ok(
      sb.description.toLowerCase().includes("static") ||
        sb.description.toLowerCase().includes("global"),
      "SB description should mention static or global",
    );
  });
});

// ---------------------------------------------------------------------------
// INSTRUCTION_HOVER
// ---------------------------------------------------------------------------

describe("INSTRUCTION_HOVER", () => {
  it("contains entries for common move instructions", () => {
    const moves = ["MOVQ", "MOVL", "MOVW", "MOVB"];
    for (const op of moves) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing instruction: ${op}`);
    }
  });

  it("contains entries for arithmetic instructions", () => {
    const arith = ["ADDQ", "SUBQ", "IMULQ", "IDIVQ", "INCQ", "DECQ", "NEGQ"];
    for (const op of arith) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing instruction: ${op}`);
    }
  });

  it("contains entries for bitwise instructions", () => {
    const bitwise = ["ANDQ", "ORQ", "XORQ", "NOTQ", "SHLQ", "SHRQ", "SARQ"];
    for (const op of bitwise) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing instruction: ${op}`);
    }
  });

  it("contains entries for control flow instructions", () => {
    const flow = ["JMP", "JE", "JNE", "JL", "JG", "CALL", "RET", "NOP"];
    for (const op of flow) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing instruction: ${op}`);
    }
  });

  it("contains entries for Go assembly directives", () => {
    const directives = ["TEXT", "GLOBL", "DATA"];
    for (const op of directives) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing directive: ${op}`);
    }
  });

  it("contains entries for atomic operations", () => {
    const atomic = ["XCHGQ", "XCHGL", "CMPXCHGQ", "XADDQ", "MFENCE"];
    for (const op of atomic) {
      assert.ok(op in INSTRUCTION_HOVER, `Missing atomic instruction: ${op}`);
    }
  });

  it("every entry has non-empty title, description, and category", () => {
    for (const [key, item] of Object.entries(INSTRUCTION_HOVER)) {
      assertValidItem(key, item);
    }
  });

  it("MOVQ title contains 'Quadword'", () => {
    assert.ok(
      INSTRUCTION_HOVER["MOVQ"].title.includes("Quadword"),
      "MOVQ title should include 'Quadword'",
    );
  });

  it("XCHGL title mentions Exchange", () => {
    assert.ok(
      INSTRUCTION_HOVER["XCHGL"].title.toLowerCase().includes("exchange"),
      "XCHGL title should mention Exchange",
    );
  });

  it("RET description mentions return", () => {
    assert.ok(
      INSTRUCTION_HOVER["RET"].description.toLowerCase().includes("return"),
      "RET description should mention return",
    );
  });

  it("CALL description mentions push or return address", () => {
    const desc = INSTRUCTION_HOVER["CALL"].description.toLowerCase();
    assert.ok(
      desc.includes("push") || desc.includes("return address"),
      "CALL description should mention pushing or return address",
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-checks: registers and instructions should not overlap
// ---------------------------------------------------------------------------

describe("REGISTER_HOVER and INSTRUCTION_HOVER", () => {
  it("have no overlapping keys", () => {
    for (const key of Object.keys(REGISTER_HOVER)) {
      assert.ok(
        !(key in INSTRUCTION_HOVER),
        `Key '${key}' appears in both REGISTER_HOVER and INSTRUCTION_HOVER`,
      );
    }
  });
});
