export interface AssemblyBlock {
  header: string;
  data: string[];
}

export namespace AssemblyBlock {
  export function parse(text: string): AssemblyBlock[] {
    const lines = text.split("\n");

    const result: AssemblyBlock[] = [];
    let i = 0;
    while (i < lines.length && lines[i].startsWith("#")) {
      i++;
    }
    if (i >= lines.length) {
      return result;
    }

    let last: AssemblyBlock = { header: lines[i].trim(), data: [] };
    result.push(last);

    for (i++; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("\t")) {
        last.data.push(line.trim());
      } else {
        last = { header: line.trim(), data: [] };
        result.push(last);
      }
    }

    return result.filter((e) => e.header.length > 0 && e.data.length > 0);
  }

  // isolate grabs the last possible set of blocks, used for streaming, returns the offset of the isolated text, or -1 if no isolation was possible
  export function isolate(text: string): number {
    // Example: the last line is the /tcode of a block,
    // the foo:bar is an example of a header, but we aren't sure yet that its finished

    // \tcode
    // foo:bar
    let foundHeader = false;

    // Walk backwards
    for (let i = text.length - 1; i >= 0; i--) {
      // 
      const c = text[i];
      if (c === "\n" || c === "\r") {
        if (foundHeader) {
          if (text[i + 1] === "\t") {
            return i + 1;
          }
        } else {
          if (text[i + 1] !== "\t") {
            foundHeader = true;
          }
        }
      }
    }

    return -1;
  }
}
