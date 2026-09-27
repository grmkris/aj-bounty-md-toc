export interface TocOptions {
  minLevel?: number
  maxLevel?: number
}

/** The table of contents of `markdown` as a Markdown list. */
export function toc(markdown: string, options: TocOptions = {}): string {
  void markdown
  void options
  return ''
}
