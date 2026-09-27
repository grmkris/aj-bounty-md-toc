export interface TocOptions {
  minLevel?: number
  maxLevel?: number
}

const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/

/** The heading text without the closing `#` sequence of a closed ATX heading. */
function stripClosingHashes(text: string): string {
  if (/^#+$/.test(text)) return ''
  return text.replace(/[ \t]+#+$/, '').trim()
}

/** The heading text with inline Markdown removed. */
export function plainText(text: string): string {
  const codes: string[] = []
  // Protect code spans so their contents stay literal.
  let out = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _ticks: string, body: string) => {
    let code = body
    if (/^ .* $/.test(code) && code.trim() !== '') code = code.slice(1, -1)
    codes.push(code)
    return `\u0000${codes.length - 1}\u0000`
  })
  // Images and links keep their text.
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Strong, then emphasis.
  out = out.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '$1')
  out = out.replace(/(?<![\p{L}\p{N}])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}])/gu, '$1')
  out = out.replace(/\*(?=\S)([\s\S]*?\S)\*/g, '$1')
  out = out.replace(/(?<![\p{L}\p{N}_])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}_])/gu, '$1')
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)] ?? '')
}

/** The GitHub anchor slug of heading text (before de-duplication). */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} _-]/gu, '')
    .replace(/ /g, '-')
}

/** The table of contents of `markdown` as a Markdown list. */
export function toc(markdown: string, options: TocOptions = {}): string {
  const { minLevel = 2, maxLevel = 3 } = options
  const lines: string[] = []
  const seen = new Map<string, number>()
  let fence: { char: string; length: number } | null = null

  for (const line of markdown.split(/\r?\n/)) {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
      if (close && close[1]![0] === fence.char && close[1]!.length >= fence.length) fence = null
      continue
    }
    const open = line.match(FENCE_OPEN)
    if (open && !(open[1]![0] === '`' && open[2]!.includes('`'))) {
      fence = { char: open[1]![0]!, length: open[1]!.length }
      continue
    }

    const heading = line.match(HEADING)
    if (!heading) continue
    const level = heading[1]!.length
    if (level < minLevel || level > maxLevel) continue

    const text = plainText(stripClosingHashes(heading[2] ?? ''))
    const base = slug(text)
    let anchor = base
    if (seen.has(base)) {
      let n = seen.get(base)!
      do anchor = `${base}-${++n}`
      while (seen.has(anchor))
      seen.set(base, n)
    }
    seen.set(anchor, 0)

    lines.push(`${'  '.repeat(level - minLevel)}- [${text}](#${anchor})`)
  }

  return lines.join('\n')
}
