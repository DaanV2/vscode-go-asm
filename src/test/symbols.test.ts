import * as assert from "assert";
import { parseFunctionSymbols } from "../go/symbols";

// ---------------------------------------------------------------------------
// Sample gopls symbols output used as test fixtures
// ---------------------------------------------------------------------------

const BCRYPT_SYMBOLS = `HashPassword Function 10:6-10:18
ComparePassword Function 15:6-15:21
`;

const RSA_SYMBOLS = `RSAKey Struct 11:6-11:12
\t    id Field 12:2-12:4
\t    key Field 13:2-13:5
(*RSAKey).ID Method 16:18-16:20
(*RSAKey).Private Method 20:18-20:25
(*RSAKey).Public Method 24:18-24:24
GenerateRSAKeys Function 28:6-28:21
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseFunctionSymbols", () => {
  it("extracts plain function names", () => {
    const result = parseFunctionSymbols(BCRYPT_SYMBOLS);
    assert.ok(result.includes("HashPassword"), "expected HashPassword");
    assert.ok(result.includes("ComparePassword"), "expected ComparePassword");
  });

  it("excludes non-function/method symbols (structs, fields)", () => {
    const result = parseFunctionSymbols(RSA_SYMBOLS);
    assert.ok(!result.includes("RSAKey Struct"), "should not include struct line");
    assert.ok(!result.includes("id"), "should not include field names");
  });

  it("includes both raw and stripped method names", () => {
    const result = parseFunctionSymbols(RSA_SYMBOLS);
    // Raw form
    assert.ok(result.includes("(*RSAKey).ID"), "expected raw method name");
    // Stripped form (parentheses and * removed)
    assert.ok(result.includes("RSAKey.ID"), "expected stripped method name");
  });

  it("does not duplicate plain function names", () => {
    const result = parseFunctionSymbols(BCRYPT_SYMBOLS);
    const hashCount = result.filter((n) => n === "HashPassword").length;
    assert.strictEqual(hashCount, 1, "plain function should appear exactly once");
  });

  it("returns an empty array for empty input", () => {
    const result = parseFunctionSymbols("");
    assert.deepStrictEqual(result, []);
  });

  it("returns an empty array when no functions or methods are present", () => {
    const result = parseFunctionSymbols("RSAKey Struct 11:6-11:12\n");
    assert.deepStrictEqual(result, []);
  });

  it("handles mixed struct, function, and method lines", () => {
    const result = parseFunctionSymbols(RSA_SYMBOLS);
    assert.ok(result.includes("GenerateRSAKeys"), "expected GenerateRSAKeys");
    assert.ok(result.includes("(*RSAKey).Private"), "expected raw Private");
    assert.ok(result.includes("RSAKey.Private"), "expected stripped Private");
    assert.ok(result.includes("(*RSAKey).Public"), "expected raw Public");
    assert.ok(result.includes("RSAKey.Public"), "expected stripped Public");
  });

  it("handles input with trailing newline", () => {
    const result = parseFunctionSymbols("Foo Function 1:1-1:10\n");
    assert.ok(result.includes("Foo"));
  });

  it("handles input with Windows-style line endings", () => {
    const result = parseFunctionSymbols("Foo Function 1:1-1:10\r\nBar Function 2:1-2:10\r\n");
    // The carriage return becomes part of the last token but the function name itself is trimmed
    assert.ok(result.some((n) => n === "Foo"), "expected Foo");
    assert.ok(result.some((n) => n === "Bar"), "expected Bar");
  });
});
