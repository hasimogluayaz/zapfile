/** Line/column helpers shared by the text tools (1-based line and column). */

export interface SourcePos {
  line: number;
  col: number;
}

export function offsetToLineCol(text: string, offset: number): SourcePos {
  const end = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lineStart = 0;
  let i = text.indexOf("\n");
  while (i !== -1 && i < end) {
    line++;
    lineStart = i + 1;
    i = text.indexOf("\n", lineStart);
  }
  return { line, col: end - lineStart + 1 };
}

export function lineColToOffset(text: string, line: number, col = 1): number {
  let offset = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf("\n", offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  const lineEnd = text.indexOf("\n", offset);
  const max = lineEnd === -1 ? text.length : lineEnd;
  return Math.min(offset + Math.max(0, col - 1), max);
}

/** Text of one (1-based) line, without the newline. */
export function lineText(text: string, line: number): string {
  const start = lineColToOffset(text, line, 1);
  const end = text.indexOf("\n", start);
  return text.slice(start, end === -1 ? text.length : end).replace(/\r$/, "");
}

export function countLines(text: string): number {
  let n = 1;
  let i = text.indexOf("\n");
  while (i !== -1) {
    n++;
    i = text.indexOf("\n", i + 1);
  }
  return n;
}

export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
