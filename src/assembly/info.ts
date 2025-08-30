export interface AssemblyBlock {
  header: string;
  data: string[];
}

export namespace AssemblyBlock {
  export function parse(text: string): AssemblyBlock[] {
    const lines = text.split("\n");

    let result: AssemblyBlock[] = [];
    let i = 0;
    while (lines[i].startsWith("#")) {
      i++;
    }
    let last: AssemblyBlock = {
      header: lines[i].trim(),
      data: [],
    };
    result.push(last);

    for (; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith("\t")) {
        last.data.push(l.trim());
      } else {
        last = { header: lines[i].trim(), data: [] };
        result.push(last);
      }
    }

    return result.filter(
      (e) => e.header.trim().length > 0 && e.data.length > 0
    );
  }
}
