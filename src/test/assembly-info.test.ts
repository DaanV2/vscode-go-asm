import * as assert from "assert";
import { AssemblyBlock } from "../assembly/info";

// ---------------------------------------------------------------------------
// Helper – build a realistic compiler stderr snippet
// ---------------------------------------------------------------------------

const SIMPLE_ASM = `# command-line-arguments
main.Add STEXT nosplit size=16 args=0x10 locals=0x0 funcid=0x0 align=0x0
\tTEXT\tmain.Add(SB), NOSPLIT, $0-16
\tMOVQ\t"".a+8(SP), AX
\tADDQ\t"".b+16(SP), AX
\tMOVQ\tAX, "".~r0+24(SP)
\tRET
main.Mul STEXT nosplit size=20 args=0x10 locals=0x0 funcid=0x0 align=0x0
\tTEXT\tmain.Mul(SB), NOSPLIT, $0-16
\tMOVQ\t"".a+8(SP), AX
\tIMULQ\t"".b+16(SP)
\tMOVQ\tAX, "".~r0+24(SP)
\tRET
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssemblyBlock.parse", () => {
  it("returns one block per function", () => {
    const blocks = AssemblyBlock.parse(SIMPLE_ASM);
    assert.strictEqual(blocks.length, 2);
  });

  it("parses the header line correctly", () => {
    const blocks = AssemblyBlock.parse(SIMPLE_ASM);
    assert.strictEqual(
      blocks[0].header,
      "main.Add STEXT nosplit size=16 args=0x10 locals=0x0 funcid=0x0 align=0x0"
    );
  });

  it("strips leading tab from data lines", () => {
    const blocks = AssemblyBlock.parse(SIMPLE_ASM);
    // All data lines should NOT start with a tab after trimming
    for (const line of blocks[0].data) {
      assert.ok(!line.startsWith("\t"), `Line still starts with tab: ${line}`);
    }
  });

  it("collects all instruction lines under their header", () => {
    const blocks = AssemblyBlock.parse(SIMPLE_ASM);
    assert.strictEqual(blocks[0].data.length, 5); // TEXT + 3 MOV/ADD + RET
    assert.strictEqual(blocks[1].data.length, 5);
  });

  it("ignores leading comment lines starting with #", () => {
    const withExtra = `# command-line-arguments\n# extra comment\n${SIMPLE_ASM.split("\n").slice(1).join("\n")}`;
    const blocks = AssemblyBlock.parse(withExtra);
    assert.strictEqual(blocks.length, 2);
  });

  it("filters out blocks with an empty header", () => {
    const text = "\nmain.Foo STEXT\n\tMOVQ\tAX, BX\n";
    const blocks = AssemblyBlock.parse(text);
    assert.strictEqual(blocks.length, 1);
    assert.strictEqual(blocks[0].header, "main.Foo STEXT");
  });

  it("filters out blocks with no data lines", () => {
    const text = "main.NoBody STEXT\nmain.HasBody STEXT\n\tRET\n";
    const blocks = AssemblyBlock.parse(text);
    assert.strictEqual(blocks.length, 1);
    assert.strictEqual(blocks[0].header, "main.HasBody STEXT");
  });

  it("returns an empty array for empty input", () => {
    // An all-comment / blank file should yield no blocks
    const blocks = AssemblyBlock.parse("# comment\n");
    assert.strictEqual(blocks.length, 0);
  });

  it("handles multiple functions without leading comments", () => {
    const text =
      "main.A STEXT\n\tMOVQ\tAX, BX\nmain.B STEXT\n\tRET\n";
    const blocks = AssemblyBlock.parse(text);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[0].header, "main.A STEXT");
    assert.strictEqual(blocks[1].header, "main.B STEXT");
  });
});
