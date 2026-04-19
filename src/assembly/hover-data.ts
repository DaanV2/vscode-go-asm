/** A single hover tooltip entry for a register or instruction. */
export interface HoverItem {
  /** Short display title, e.g. "AX — Accumulator". */
  title: string;
  /** One-sentence description of what the register/instruction does. */
  description: string;
  /** Logical grouping shown as a badge in the tooltip. */
  category: string;
}

// ---------------------------------------------------------------------------
// Register descriptions (Go / Plan 9 assembly, targeting x86-64)
// ---------------------------------------------------------------------------

/** Hover data for named registers used in Go assembly output. */
export const REGISTER_HOVER: Readonly<Record<string, HoverItem>> = {
  // General-purpose (64-bit names used by Go/Plan 9 assembler)
  AX: {
    title: "AX — Accumulator",
    description:
      "General-purpose 64-bit accumulator register (RAX on x86-64). Used for arithmetic, return values, and system-call numbers.",
    category: "General Purpose",
  },
  AL: {
    title: "AL — Low byte of AX",
    description: "Low 8 bits of the AX (RAX) register.",
    category: "General Purpose",
  },
  BX: {
    title: "BX — Base Register",
    description:
      "General-purpose 64-bit base register (RBX on x86-64). Callee-saved across calls.",
    category: "General Purpose",
  },
  BL: {
    title: "BL — Low byte of BX",
    description: "Low 8 bits of the BX (RBX) register.",
    category: "General Purpose",
  },
  CX: {
    title: "CX — Counter Register",
    description:
      "General-purpose 64-bit counter register (RCX on x86-64). Used as a loop counter and for shift/rotate amounts.",
    category: "General Purpose",
  },
  CL: {
    title: "CL — Low byte of CX",
    description: "Low 8 bits of the CX (RCX) register. Used as shift/rotate count.",
    category: "General Purpose",
  },
  DX: {
    title: "DX — Data Register",
    description:
      "General-purpose 64-bit data register (RDX on x86-64). Used in division/multiplication and as the 3rd function argument.",
    category: "General Purpose",
  },
  DL: {
    title: "DL — Low byte of DX",
    description: "Low 8 bits of the DX (RDX) register.",
    category: "General Purpose",
  },
  SI: {
    title: "SI — Source Index",
    description:
      "64-bit source index register (RSI on x86-64). Used in string operations and as the 2nd function argument.",
    category: "Index / Pointer",
  },
  DI: {
    title: "DI — Destination Index",
    description:
      "64-bit destination index register (RDI on x86-64). Used in string operations and as the 1st function argument.",
    category: "Index / Pointer",
  },
  // Extended 64-bit registers (R8–R15)
  R8: {
    title: "R8 — Extended Register 8",
    description:
      "64-bit general-purpose register (x86-64 extension). Used as the 5th function argument.",
    category: "General Purpose",
  },
  R9: {
    title: "R9 — Extended Register 9",
    description:
      "64-bit general-purpose register. Used as the 6th function argument.",
    category: "General Purpose",
  },
  R10: {
    title: "R10 — Extended Register 10",
    description: "64-bit general-purpose register.",
    category: "General Purpose",
  },
  R11: {
    title: "R11 — Extended Register 11",
    description: "64-bit general-purpose register.",
    category: "General Purpose",
  },
  R12: {
    title: "R12 — Extended Register 12",
    description: "64-bit general-purpose register. Callee-saved.",
    category: "General Purpose",
  },
  R13: {
    title: "R13 — Extended Register 13",
    description: "64-bit general-purpose register. Callee-saved.",
    category: "General Purpose",
  },
  R14: {
    title: "R14 — Extended Register 14",
    description:
      "64-bit general-purpose register. Callee-saved. In Go, holds the current goroutine pointer (g).",
    category: "General Purpose",
  },
  R15: {
    title: "R15 — Extended Register 15",
    description: "64-bit general-purpose register. Callee-saved.",
    category: "General Purpose",
  },
  // Stack / frame registers
  SP: {
    title: "SP — Stack Pointer",
    description:
      "Points to the top of the current stack frame. In Go assembly, SP refers to the local (hardware) stack pointer.",
    category: "Stack",
  },
  BP: {
    title: "BP — Base Pointer",
    description:
      "Frame base pointer register (RBP on x86-64). Points to the base of the current stack frame.",
    category: "Stack",
  },
  // Go pseudo-registers
  FP: {
    title: "FP — Frame Pointer (pseudo-register)",
    description:
      "Go pseudo-register pointing to the function arguments. Use as name+offset(FP) to access arguments and return values.",
    category: "Go Pseudo-Register",
  },
  SB: {
    title: "SB — Static Base (pseudo-register)",
    description:
      "Go pseudo-register representing the base address of the global (static) data segment. Used to reference global variables and functions.",
    category: "Go Pseudo-Register",
  },
  PC: {
    title: "PC — Program Counter (pseudo-register)",
    description:
      "Go pseudo-register representing the current instruction pointer (RIP on x86-64).",
    category: "Go Pseudo-Register",
  },
  TLS: {
    title: "TLS — Thread Local Storage (pseudo-register)",
    description:
      "Go pseudo-register referencing the thread-local storage base. Used to access the current goroutine pointer (g).",
    category: "Go Pseudo-Register",
  },
};

// ---------------------------------------------------------------------------
// Instruction descriptions (Go / Plan 9 assembly, x86-64)
// ---------------------------------------------------------------------------

/** Hover data for assembly mnemonics / opcodes used in Go assembly output. */
export const INSTRUCTION_HOVER: Readonly<Record<string, HoverItem>> = {
  // -- Data Transfer --
  MOVQ: {
    title: "MOVQ — Move Quadword",
    description: "Move a 64-bit (8-byte) value from source to destination.",
    category: "Data Transfer",
  },
  MOVL: {
    title: "MOVL — Move Long (Doubleword)",
    description: "Move a 32-bit (4-byte) value from source to destination.",
    category: "Data Transfer",
  },
  MOVW: {
    title: "MOVW — Move Word",
    description: "Move a 16-bit (2-byte) value from source to destination.",
    category: "Data Transfer",
  },
  MOVB: {
    title: "MOVB — Move Byte",
    description: "Move an 8-bit (1-byte) value from source to destination.",
    category: "Data Transfer",
  },
  MOVLQSX: {
    title: "MOVLQSX — Move with Sign Extension (32→64)",
    description: "Move a 32-bit value into a 64-bit destination with sign extension.",
    category: "Data Transfer",
  },
  MOVLQZX: {
    title: "MOVLQZX — Move with Zero Extension (32→64)",
    description: "Move a 32-bit value into a 64-bit destination with zero extension.",
    category: "Data Transfer",
  },
  MOVBLSX: {
    title: "MOVBLSX — Move with Sign Extension (8→32)",
    description: "Move an 8-bit value into a 32-bit destination with sign extension.",
    category: "Data Transfer",
  },
  MOVBLZX: {
    title: "MOVBLZX — Move with Zero Extension (8→32)",
    description: "Move an 8-bit value into a 32-bit destination with zero extension.",
    category: "Data Transfer",
  },
  MOVBQSX: {
    title: "MOVBQSX — Move with Sign Extension (8→64)",
    description: "Move an 8-bit value into a 64-bit destination with sign extension.",
    category: "Data Transfer",
  },
  MOVBQZX: {
    title: "MOVBQZX — Move with Zero Extension (8→64)",
    description: "Move an 8-bit value into a 64-bit destination with zero extension.",
    category: "Data Transfer",
  },
  MOVWLSX: {
    title: "MOVWLSX — Move with Sign Extension (16→32)",
    description: "Move a 16-bit value into a 32-bit destination with sign extension.",
    category: "Data Transfer",
  },
  MOVWLZX: {
    title: "MOVWLZX — Move with Zero Extension (16→32)",
    description: "Move a 16-bit value into a 32-bit destination with zero extension.",
    category: "Data Transfer",
  },
  MOVWQSX: {
    title: "MOVWQSX — Move with Sign Extension (16→64)",
    description: "Move a 16-bit value into a 64-bit destination with sign extension.",
    category: "Data Transfer",
  },
  MOVWQZX: {
    title: "MOVWQZX — Move with Zero Extension (16→64)",
    description: "Move a 16-bit value into a 64-bit destination with zero extension.",
    category: "Data Transfer",
  },
  XCHGQ: {
    title: "XCHGQ — Exchange Quadword",
    description: "Atomically swap two 64-bit values.",
    category: "Data Transfer",
  },
  XCHGL: {
    title: "XCHGL — Exchange Long",
    description: "Atomically swap two 32-bit values.",
    category: "Data Transfer",
  },
  XCHGW: {
    title: "XCHGW — Exchange Word",
    description: "Atomically swap two 16-bit values.",
    category: "Data Transfer",
  },
  XCHGB: {
    title: "XCHGB — Exchange Byte",
    description: "Atomically swap two 8-bit values.",
    category: "Data Transfer",
  },
  LEAQ: {
    title: "LEAQ — Load Effective Address (64-bit)",
    description:
      "Calculate an effective address and store it in the destination register without accessing memory.",
    category: "Data Transfer",
  },
  LEAL: {
    title: "LEAL — Load Effective Address (32-bit)",
    description: "Calculate a 32-bit effective address and store it in the destination register.",
    category: "Data Transfer",
  },
  PUSHQ: {
    title: "PUSHQ — Push Quadword",
    description: "Push a 64-bit value onto the stack (SP -= 8, then store value at [SP]).",
    category: "Stack",
  },
  PUSHL: {
    title: "PUSHL — Push Long",
    description: "Push a 32-bit value onto the stack.",
    category: "Stack",
  },
  POPQ: {
    title: "POPQ — Pop Quadword",
    description: "Pop a 64-bit value from the stack into the destination (load [SP], SP += 8).",
    category: "Stack",
  },
  POPL: {
    title: "POPL — Pop Long",
    description: "Pop a 32-bit value from the stack.",
    category: "Stack",
  },
  // -- Arithmetic --
  ADDQ: {
    title: "ADDQ — Add Quadword",
    description: "Add two 64-bit integers: dst = dst + src.",
    category: "Arithmetic",
  },
  ADDL: {
    title: "ADDL — Add Long",
    description: "Add two 32-bit integers: dst = dst + src.",
    category: "Arithmetic",
  },
  ADDW: {
    title: "ADDW — Add Word",
    description: "Add two 16-bit integers.",
    category: "Arithmetic",
  },
  ADDB: {
    title: "ADDB — Add Byte",
    description: "Add two 8-bit integers.",
    category: "Arithmetic",
  },
  SUBQ: {
    title: "SUBQ — Subtract Quadword",
    description: "Subtract 64-bit integers: dst = dst - src.",
    category: "Arithmetic",
  },
  SUBL: {
    title: "SUBL — Subtract Long",
    description: "Subtract 32-bit integers: dst = dst - src.",
    category: "Arithmetic",
  },
  SUBW: {
    title: "SUBW — Subtract Word",
    description: "Subtract 16-bit integers.",
    category: "Arithmetic",
  },
  SUBB: {
    title: "SUBB — Subtract Byte",
    description: "Subtract 8-bit integers.",
    category: "Arithmetic",
  },
  IMULQ: {
    title: "IMULQ — Signed Multiply Quadword",
    description: "Signed multiply of 64-bit integers.",
    category: "Arithmetic",
  },
  IMULL: {
    title: "IMULL — Signed Multiply Long",
    description: "Signed multiply of 32-bit integers.",
    category: "Arithmetic",
  },
  MULQ: {
    title: "MULQ — Unsigned Multiply Quadword",
    description: "Unsigned 64-bit multiply: RDX:RAX = RAX × src.",
    category: "Arithmetic",
  },
  MULL: {
    title: "MULL — Unsigned Multiply Long",
    description: "Unsigned 32-bit multiply: EDX:EAX = EAX × src.",
    category: "Arithmetic",
  },
  IDIVQ: {
    title: "IDIVQ — Signed Divide Quadword",
    description: "Signed divide RDX:RAX by src. Quotient → RAX, remainder → RDX.",
    category: "Arithmetic",
  },
  IDIVL: {
    title: "IDIVL — Signed Divide Long",
    description: "Signed divide EDX:EAX by src.",
    category: "Arithmetic",
  },
  DIVQ: {
    title: "DIVQ — Unsigned Divide Quadword",
    description: "Unsigned divide RDX:RAX by src. Quotient → RAX, remainder → RDX.",
    category: "Arithmetic",
  },
  DIVL: {
    title: "DIVL — Unsigned Divide Long",
    description: "Unsigned divide EDX:EAX by src.",
    category: "Arithmetic",
  },
  INCQ: {
    title: "INCQ — Increment Quadword",
    description: "Increment a 64-bit value by 1.",
    category: "Arithmetic",
  },
  INCL: {
    title: "INCL — Increment Long",
    description: "Increment a 32-bit value by 1.",
    category: "Arithmetic",
  },
  DECQ: {
    title: "DECQ — Decrement Quadword",
    description: "Decrement a 64-bit value by 1.",
    category: "Arithmetic",
  },
  DECL: {
    title: "DECL — Decrement Long",
    description: "Decrement a 32-bit value by 1.",
    category: "Arithmetic",
  },
  NEGQ: {
    title: "NEGQ — Negate Quadword",
    description: "Two's complement negation of a 64-bit value.",
    category: "Arithmetic",
  },
  NEGL: {
    title: "NEGL — Negate Long",
    description: "Two's complement negation of a 32-bit value.",
    category: "Arithmetic",
  },
  // -- Bitwise / Logical --
  ANDQ: {
    title: "ANDQ — AND Quadword",
    description: "Bitwise AND of two 64-bit values: dst = dst & src.",
    category: "Bitwise",
  },
  ANDL: {
    title: "ANDL — AND Long",
    description: "Bitwise AND of two 32-bit values.",
    category: "Bitwise",
  },
  ANDW: {
    title: "ANDW — AND Word",
    description: "Bitwise AND of two 16-bit values.",
    category: "Bitwise",
  },
  ANDB: {
    title: "ANDB — AND Byte",
    description: "Bitwise AND of two 8-bit values.",
    category: "Bitwise",
  },
  ORQ: {
    title: "ORQ — OR Quadword",
    description: "Bitwise OR of two 64-bit values: dst = dst | src.",
    category: "Bitwise",
  },
  ORL: {
    title: "ORL — OR Long",
    description: "Bitwise OR of two 32-bit values.",
    category: "Bitwise",
  },
  ORW: {
    title: "ORW — OR Word",
    description: "Bitwise OR of two 16-bit values.",
    category: "Bitwise",
  },
  ORB: {
    title: "ORB — OR Byte",
    description: "Bitwise OR of two 8-bit values.",
    category: "Bitwise",
  },
  XORQ: {
    title: "XORQ — XOR Quadword",
    description:
      "Bitwise XOR of two 64-bit values. Commonly used to zero a register: XORQ AX, AX.",
    category: "Bitwise",
  },
  XORL: {
    title: "XORL — XOR Long",
    description: "Bitwise XOR of two 32-bit values.",
    category: "Bitwise",
  },
  XORW: {
    title: "XORW — XOR Word",
    description: "Bitwise XOR of two 16-bit values.",
    category: "Bitwise",
  },
  XORB: {
    title: "XORB — XOR Byte",
    description: "Bitwise XOR of two 8-bit values.",
    category: "Bitwise",
  },
  NOTQ: {
    title: "NOTQ — NOT Quadword",
    description: "Bitwise NOT (one's complement) of a 64-bit value.",
    category: "Bitwise",
  },
  NOTL: {
    title: "NOTL — NOT Long",
    description: "Bitwise NOT of a 32-bit value.",
    category: "Bitwise",
  },
  SHLQ: {
    title: "SHLQ — Shift Left Quadword",
    description: "Logical left shift of a 64-bit value: dst = dst << count.",
    category: "Bitwise",
  },
  SHLL: {
    title: "SHLL — Shift Left Long",
    description: "Logical left shift of a 32-bit value.",
    category: "Bitwise",
  },
  SHRQ: {
    title: "SHRQ — Shift Right Quadword (logical)",
    description: "Logical right shift of a 64-bit value, filling vacated bits with zeros.",
    category: "Bitwise",
  },
  SHRL: {
    title: "SHRL — Shift Right Long (logical)",
    description: "Logical right shift of a 32-bit value.",
    category: "Bitwise",
  },
  SARQ: {
    title: "SARQ — Arithmetic Shift Right Quadword",
    description:
      "Arithmetic right shift of a 64-bit value, preserving (replicating) the sign bit.",
    category: "Bitwise",
  },
  SARL: {
    title: "SARL — Arithmetic Shift Right Long",
    description: "Arithmetic right shift of a 32-bit value, preserving the sign bit.",
    category: "Bitwise",
  },
  ROLQ: {
    title: "ROLQ — Rotate Left Quadword",
    description: "Rotate 64-bit value left by count bits.",
    category: "Bitwise",
  },
  ROLL: {
    title: "ROLL — Rotate Left Long",
    description: "Rotate 32-bit value left by count bits.",
    category: "Bitwise",
  },
  RORQ: {
    title: "RORQ — Rotate Right Quadword",
    description: "Rotate 64-bit value right by count bits.",
    category: "Bitwise",
  },
  RORL: {
    title: "RORL — Rotate Right Long",
    description: "Rotate 32-bit value right by count bits.",
    category: "Bitwise",
  },
  BSWAPQ: {
    title: "BSWAPQ — Byte Swap Quadword",
    description: "Reverse the byte order of a 64-bit register (converts between endiannesses).",
    category: "Bitwise",
  },
  BSWAPL: {
    title: "BSWAPL — Byte Swap Long",
    description: "Reverse the byte order of a 32-bit register.",
    category: "Bitwise",
  },
  // -- Comparison --
  CMPQ: {
    title: "CMPQ — Compare Quadword",
    description:
      "Compare two 64-bit values (computes src1 − src2) and set flags. Does not store the result.",
    category: "Comparison",
  },
  CMPL: {
    title: "CMPL — Compare Long",
    description: "Compare two 32-bit values, setting flags.",
    category: "Comparison",
  },
  CMPW: {
    title: "CMPW — Compare Word",
    description: "Compare two 16-bit values, setting flags.",
    category: "Comparison",
  },
  CMPB: {
    title: "CMPB — Compare Byte",
    description: "Compare two 8-bit values, setting flags.",
    category: "Comparison",
  },
  TESTQ: {
    title: "TESTQ — Test Quadword",
    description:
      "Bitwise AND of two 64-bit values, setting flags without storing the result. Commonly used to test for zero.",
    category: "Comparison",
  },
  TESTL: {
    title: "TESTL — Test Long",
    description: "Bitwise AND of two 32-bit values, setting flags.",
    category: "Comparison",
  },
  TESTW: {
    title: "TESTW — Test Word",
    description: "Bitwise AND of two 16-bit values, setting flags.",
    category: "Comparison",
  },
  TESTB: {
    title: "TESTB — Test Byte",
    description: "Bitwise AND of two 8-bit values, setting flags.",
    category: "Comparison",
  },
  // -- Control Flow --
  JMP: {
    title: "JMP — Unconditional Jump",
    description: "Jump to a label or address unconditionally.",
    category: "Control Flow",
  },
  JE: {
    title: "JE — Jump if Equal",
    description:
      "Jump if the Zero Flag (ZF) is set, meaning the last comparison found equal operands.",
    category: "Control Flow",
  },
  JNE: {
    title: "JNE — Jump if Not Equal",
    description: "Jump if the Zero Flag (ZF) is not set.",
    category: "Control Flow",
  },
  JZ: {
    title: "JZ — Jump if Zero",
    description: "Alias for JE. Jump if the Zero Flag (ZF) is set.",
    category: "Control Flow",
  },
  JNZ: {
    title: "JNZ — Jump if Not Zero",
    description: "Alias for JNE. Jump if the Zero Flag (ZF) is not set.",
    category: "Control Flow",
  },
  JL: {
    title: "JL — Jump if Less (signed)",
    description: "Jump if less than after a signed comparison (SF ≠ OF).",
    category: "Control Flow",
  },
  JLE: {
    title: "JLE — Jump if Less or Equal (signed)",
    description: "Jump if less than or equal after a signed comparison (ZF=1 or SF≠OF).",
    category: "Control Flow",
  },
  JG: {
    title: "JG — Jump if Greater (signed)",
    description: "Jump if greater than after a signed comparison (ZF=0 and SF=OF).",
    category: "Control Flow",
  },
  JGE: {
    title: "JGE — Jump if Greater or Equal (signed)",
    description: "Jump if greater than or equal after a signed comparison (SF=OF).",
    category: "Control Flow",
  },
  JB: {
    title: "JB — Jump if Below (unsigned)",
    description: "Jump if below after an unsigned comparison (CF=1).",
    category: "Control Flow",
  },
  JBE: {
    title: "JBE — Jump if Below or Equal (unsigned)",
    description: "Jump if below or equal after an unsigned comparison (CF=1 or ZF=1).",
    category: "Control Flow",
  },
  JA: {
    title: "JA — Jump if Above (unsigned)",
    description: "Jump if above after an unsigned comparison (CF=0 and ZF=0).",
    category: "Control Flow",
  },
  JAE: {
    title: "JAE — Jump if Above or Equal (unsigned)",
    description: "Jump if above or equal after an unsigned comparison (CF=0).",
    category: "Control Flow",
  },
  JS: {
    title: "JS — Jump if Sign",
    description: "Jump if the Sign Flag (SF) is set, indicating a negative result.",
    category: "Control Flow",
  },
  JNS: {
    title: "JNS — Jump if No Sign",
    description: "Jump if the Sign Flag (SF) is not set.",
    category: "Control Flow",
  },
  JC: {
    title: "JC — Jump if Carry",
    description: "Jump if the Carry Flag (CF) is set.",
    category: "Control Flow",
  },
  JNC: {
    title: "JNC — Jump if No Carry",
    description: "Jump if the Carry Flag (CF) is not set.",
    category: "Control Flow",
  },
  JO: {
    title: "JO — Jump if Overflow",
    description: "Jump if the Overflow Flag (OF) is set.",
    category: "Control Flow",
  },
  JNO: {
    title: "JNO — Jump if No Overflow",
    description: "Jump if the Overflow Flag (OF) is not set.",
    category: "Control Flow",
  },
  CALL: {
    title: "CALL — Call Subroutine",
    description: "Push the return address onto the stack and jump to the target function.",
    category: "Control Flow",
  },
  RET: {
    title: "RET — Return",
    description:
      "Pop the return address from the stack and jump to it, returning from the current function.",
    category: "Control Flow",
  },
  NOP: {
    title: "NOP — No Operation",
    description: "Do nothing. Used for alignment padding or as a placeholder.",
    category: "Control Flow",
  },
  // -- Go / Plan 9 assembly directives --
  TEXT: {
    title: "TEXT — Define Function",
    description:
      "Declare the start of a function body. Syntax: TEXT pkg.Func(SB), flags, $localsize-argsize",
    category: "Go Assembly",
  },
  NOSPLIT: {
    title: "NOSPLIT — No Stack Split",
    description:
      "TEXT flag: do not insert a stack-overflow check. The function must not need more stack than it declares.",
    category: "Go Assembly",
  },
  NOPTR: {
    title: "NOPTR — No Pointers",
    description:
      "DATA/GLOBL flag: the data contains no GC-managed pointers and should not be scanned by the garbage collector.",
    category: "Go Assembly",
  },
  RODATA: {
    title: "RODATA — Read-Only Data",
    description:
      "DATA/GLOBL flag: allocate this variable in the read-only data segment.",
    category: "Go Assembly",
  },
  DUPOK: {
    title: "DUPOK — Allow Duplicates",
    description:
      "TEXT/GLOBL flag: multiple definitions of this symbol are allowed; the linker picks one.",
    category: "Go Assembly",
  },
  WRAPPER: {
    title: "WRAPPER — Wrapper Function",
    description:
      "TEXT flag: this function is a wrapper (e.g., for interface dispatch) and should not appear in stack traces.",
    category: "Go Assembly",
  },
  NEEDCTXT: {
    title: "NEEDCTXT — Needs Context Register",
    description:
      "TEXT flag: this function uses the context register (DX) for a closure or method value.",
    category: "Go Assembly",
  },
  GLOBL: {
    title: "GLOBL — Global Variable",
    description:
      "Declare a global variable accessible from other packages. Syntax: GLOBL name(SB), flags, $size",
    category: "Go Assembly",
  },
  DATA: {
    title: "DATA — Initialize Data",
    description:
      "Initialize a byte range inside a global variable. Syntax: DATA name+offset(SB)/size, value",
    category: "Go Assembly",
  },
  // -- Floating-point / SSE --
  MOVSD: {
    title: "MOVSD — Move Scalar Double",
    description: "Move a 64-bit floating-point (double-precision) value.",
    category: "Floating Point / SSE",
  },
  MOVSS: {
    title: "MOVSS — Move Scalar Single",
    description: "Move a 32-bit floating-point (single-precision) value.",
    category: "Floating Point / SSE",
  },
  ADDSD: {
    title: "ADDSD — Add Scalar Double",
    description: "Add two 64-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  ADDSS: {
    title: "ADDSS — Add Scalar Single",
    description: "Add two 32-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  SUBSD: {
    title: "SUBSD — Subtract Scalar Double",
    description: "Subtract 64-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  SUBSS: {
    title: "SUBSS — Subtract Scalar Single",
    description: "Subtract 32-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  MULSD: {
    title: "MULSD — Multiply Scalar Double",
    description: "Multiply two 64-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  MULSS: {
    title: "MULSS — Multiply Scalar Single",
    description: "Multiply two 32-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  DIVSD: {
    title: "DIVSD — Divide Scalar Double",
    description: "Divide 64-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  DIVSS: {
    title: "DIVSS — Divide Scalar Single",
    description: "Divide 32-bit floating-point values.",
    category: "Floating Point / SSE",
  },
  SQRTSD: {
    title: "SQRTSD — Square Root Scalar Double",
    description: "Compute the square root of a 64-bit floating-point value.",
    category: "Floating Point / SSE",
  },
  SQRTSS: {
    title: "SQRTSS — Square Root Scalar Single",
    description: "Compute the square root of a 32-bit floating-point value.",
    category: "Floating Point / SSE",
  },
  UCOMISD: {
    title: "UCOMISD — Unordered Compare Scalar Double",
    description: "Compare two doubles and set EFLAGS (NaN-safe float comparison).",
    category: "Floating Point / SSE",
  },
  UCOMISS: {
    title: "UCOMISS — Unordered Compare Scalar Single",
    description: "Compare two floats and set EFLAGS (NaN-safe).",
    category: "Floating Point / SSE",
  },
  CVTSS2SD: {
    title: "CVTSS2SD — Convert Float32 to Float64",
    description: "Convert a 32-bit float to a 64-bit double.",
    category: "Floating Point / SSE",
  },
  CVTSD2SS: {
    title: "CVTSD2SS — Convert Float64 to Float32",
    description: "Convert a 64-bit double to a 32-bit float (with rounding).",
    category: "Floating Point / SSE",
  },
  CVTSL2SD: {
    title: "CVTSL2SD — Convert Int32 to Float64",
    description: "Convert a signed 32-bit integer to a 64-bit double.",
    category: "Floating Point / SSE",
  },
  CVTSQ2SD: {
    title: "CVTSQ2SD — Convert Int64 to Float64",
    description: "Convert a signed 64-bit integer to a 64-bit double.",
    category: "Floating Point / SSE",
  },
  CVTTSD2SL: {
    title: "CVTTSD2SL — Truncate Float64 to Int32",
    description: "Convert (truncate) a 64-bit double to a signed 32-bit integer.",
    category: "Floating Point / SSE",
  },
  CVTTSD2SQ: {
    title: "CVTTSD2SQ — Truncate Float64 to Int64",
    description: "Convert (truncate) a 64-bit double to a signed 64-bit integer.",
    category: "Floating Point / SSE",
  },
  // -- Atomic / synchronisation --
  LOCK: {
    title: "LOCK — Lock Prefix",
    description:
      "Assert the LOCK# bus signal, making the following instruction atomic with respect to all processors.",
    category: "Atomic",
  },
  XADDL: {
    title: "XADDL — Exchange and Add Long",
    description:
      "Atomically exchange src and dst then add: tmp=dst; dst=dst+src; src=tmp. Used for atomic increment.",
    category: "Atomic",
  },
  XADDQ: {
    title: "XADDQ — Exchange and Add Quadword",
    description:
      "Atomically exchange src and dst then add (64-bit). Used for atomic increment.",
    category: "Atomic",
  },
  CMPXCHGQ: {
    title: "CMPXCHGQ — Compare and Exchange Quadword",
    description:
      "If RAX == dst, set dst = src; else set RAX = dst. The classic compare-and-swap (CAS) primitive.",
    category: "Atomic",
  },
  CMPXCHGL: {
    title: "CMPXCHGL — Compare and Exchange Long",
    description: "If EAX == dst, set dst = src; else set EAX = dst (32-bit CAS).",
    category: "Atomic",
  },
  MFENCE: {
    title: "MFENCE — Memory Fence",
    description:
      "Serialize all memory operations, preventing the CPU from reordering loads/stores across this point.",
    category: "Atomic",
  },
  SFENCE: {
    title: "SFENCE — Store Fence",
    description: "Serialize all store (write) memory operations.",
    category: "Atomic",
  },
  LFENCE: {
    title: "LFENCE — Load Fence",
    description: "Serialize all load (read) memory operations.",
    category: "Atomic",
  },
  PAUSE: {
    title: "PAUSE — Spin-Loop Hint",
    description:
      "Hint to the CPU that this is a spin-wait loop, reducing power consumption and improving performance.",
    category: "Atomic",
  },
  // -- System --
  SYSCALL: {
    title: "SYSCALL — System Call",
    description:
      "Transfer control to the OS kernel to execute a system call (x86-64 fast path).",
    category: "System",
  },
  INT: {
    title: "INT — Software Interrupt",
    description:
      "Trigger a software interrupt, e.g. INT $0x80 for Linux system calls on x86-32.",
    category: "System",
  },
  HLT: {
    title: "HLT — Halt",
    description: "Halt the processor until the next external interrupt.",
    category: "System",
  },
};
