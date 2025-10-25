/**
 * Markdown utility functions for the editor
 */

export function wrapSelection(text: string, start: number, end: number, wrapper: string): string {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  return `${before}${wrapper}${selected}${wrapper}${after}`;
}

export function makeBold(text: string, start: number, end: number): string {
  return wrapSelection(text, start, end, '**');
}

export function makeItalic(text: string, start: number, end: number): string {
  return wrapSelection(text, start, end, '_');
}

export function makeCode(text: string, start: number, end: number): string {
  return wrapSelection(text, start, end, '`');
}

export function makeHeading(text: string, lineStart: number): string {
  const before = text.slice(0, lineStart);
  const after = text.slice(lineStart);

  return `${before}# ${after}`;
}

export function makeList(text: string, lineStart: number): string {
  const before = text.slice(0, lineStart);
  const after = text.slice(lineStart);

  return `${before}- ${after}`;
}

export function makeLink(text: string, start: number, end: number, url = ''): string {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  return `${before}[${selected}](${url})${after}`;
}
