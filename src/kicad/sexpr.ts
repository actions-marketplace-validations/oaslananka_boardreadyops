export function extractBlocks(text: string, head: string): string[] {
  const blocks: string[] = [];
  let index = 0;
  while (index < text.length) {
    const start = findBlockStart(text, head, index);
    if (start === -1) {
      break;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let cursor = start; cursor < text.length; cursor += 1) {
      const char = text[cursor];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          blocks.push(text.slice(start, cursor + 1));
          index = cursor + 1;
          break;
        }
      }
    }
    if (index <= start) {
      break;
    }
  }
  return blocks;
}

export function sexprStringAfter(block: string, head: string): string | undefined {
  const escaped = head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = new RegExp(`\\(${escaped}\\s+"((?:[^"\\\\]|\\\\.)*)"`).exec(block)?.[1];
  if (quoted) {
    return quoted.replace(/\\"/g, '"');
  }
  return new RegExp(`\\(${escaped}\\s+([^\\s)]+)`).exec(block)?.[1];
}

function findBlockStart(text: string, head: string, fromIndex: number): number {
  const needle = `(${head}`;
  let index = fromIndex;
  while (index < text.length) {
    const start = text.indexOf(needle, index);
    if (start === -1) {
      return -1;
    }
    const next = text[start + needle.length];
    if (next === undefined || /\s|\)/.test(next)) {
      return start;
    }
    index = start + 1;
  }
  return -1;
}
