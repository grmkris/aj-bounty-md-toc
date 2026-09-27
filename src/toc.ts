export interface TocOptions {
  minLevel?: number
  maxLevel?: number
}

/** The table of contents of `markdown` as a Markdown list. */
export function toc(markdown: string, options: TocOptions = {}): string {
  const minLevel = options.minLevel ?? 2
  const maxLevel = options.maxLevel ?? 3
  const lines = markdown.split(/\r?\n/)
  const items: string[] = []
  const seen = new Map<string, number>()
  let fence: { char: '`' | '~'; len: number } | null = null

  for (const line of lines) {
    const fenceLine = matchFence(line)
    if (fence) {
      if (
        fenceLine &&
        fenceLine.char === fence.char &&
        fenceLine.len >= fence.len &&
        fenceLine.closer
      ) {
        fence = null
      }
      continue
    }
    if (fenceLine?.opener) {
      fence = { char: fenceLine.char, len: fenceLine.len }
      continue
    }

    const heading = matchHeading(line)
    if (!heading) continue

    const text = stripInline(heading.text)
    const slug = allocateAnchor(githubAnchor(text), seen)
    if (heading.level < minLevel || heading.level > maxLevel) continue

    const indent = '  '.repeat(heading.level - minLevel)
    items.push(`${indent}- [${escapeLinkText(text)}](#${slug})`)
  }

  return items.join('\n')
}

function matchFence(line: string): { char: '`' | '~'; len: number; opener: boolean; closer: boolean } | null {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line)
  if (!match) return null
  const marker = match[2]
  const char = marker[0] as '`' | '~'
  const rest = match[3]
  if (char === '`' && rest.includes('`')) return null
  const closer = rest.trim() === ''
  return { char, len: marker.length, opener: true, closer }
}

function matchHeading(line: string): { level: number; text: string } | null {
  const match = /^( {0,3})(#{1,6})(.*)$/.exec(line)
  if (!match) return null
  const level = match[2].length
  const rest = match[3]
  if (rest !== '' && !/^[ \t]/.test(rest)) return null

  let text = rest.replace(/^[ \t]+/, '')
  if (/^#+[ \t]*$/.test(text)) return { level, text: '' }
  text = text.replace(/[ \t]+#+[ \t]*$/, '')
  text = text.replace(/[ \t]+$/, '')
  return { level, text }
}

/** GitHub anchor: lower-case, drop other punctuation, keep Unicode letters, spaces become `-`. */
function githubAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{Nd} _-]/gu, '')
    .replace(/ /g, '-')
}

/**
 * First use of a base anchor is bare. Later uses are `-1`, `-2`, ...
 * A suffix that another heading already owns is skipped.
 */
function allocateAnchor(base: string, seen: Map<string, number>): string {
  if (!seen.has(base)) {
    seen.set(base, 0)
    return base
  }
  let n = seen.get(base) ?? 0
  let slug = base
  do {
    n += 1
    slug = `${base}-${n}`
  } while (seen.has(slug))
  seen.set(base, n)
  seen.set(slug, 0)
  return slug
}

function escapeLinkText(text: string): string {
  return text.replace(/[\\[\]]/g, (ch) => `\\${ch}`)
}

function stripInline(input: string): string {
  const codes: string[] = []
  let stripped = takeCodeSpans(input, codes)

  stripped = stripped.replace(/!\[([^\]]*)\]\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\)/g, '$1')
  stripped = stripped.replace(/\[([^\]]*)\]\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\)/g, '$1')

  for (let pass = 0; pass < 6; pass++) {
    const next = stripped.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    if (next === stripped) break
    stripped = next
  }

  return stripped.replace(/\u0000(\d+)\u0000/g, (_all, index: string) => codes[Number(index)] ?? '')
}

function takeCodeSpans(input: string, codes: string[]): string {
  let out = ''
  for (let i = 0; i < input.length; ) {
    if (input[i] !== '`') {
      out += input[i]
      i++
      continue
    }
    let n = 0
    while (i + n < input.length && input[i + n] === '`') n++
    const close = findBacktickRun(input, i + n, n)
    if (close < 0) {
      out += '`'.repeat(n)
      i += n
      continue
    }
    let content = input.slice(i + n, close)
    if (content.length >= 2 && content.startsWith(' ') && content.endsWith(' ') && /[^ ]/.test(content)) {
      content = content.slice(1, -1)
    }
    out += `\u0000${codes.length}\u0000`
    codes.push(content)
    i = close + n
  }
  return out
}

function findBacktickRun(input: string, from: number, n: number): number {
  for (let i = from; i < input.length; i++) {
    if (input[i] !== '`') continue
    let run = 0
    while (i + run < input.length && input[i + run] === '`') run++
    if (run === n) return i
    i += run - 1
  }
  return -1
}
