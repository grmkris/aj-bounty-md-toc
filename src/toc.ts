export interface TocOptions {
  minLevel?: number
  maxLevel?: number
}

interface Fence {
  character: '`' | '~'
  length: number
}

function closingDelimiter(value: string, start: number, open: string, close: string): number {
  let depth = 0
  for (let i = start; i < value.length; i++) {
    if (value[i] === open) depth++
    if (value[i] === close && --depth === 0) return i
  }
  return -1
}

function stripLinks(value: string): string {
  let result = ''
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '[') {
      const labelEnd = closingDelimiter(value, i, '[', ']')
      if (labelEnd >= 0 && value[labelEnd + 1] === '(') {
        const destinationEnd = closingDelimiter(value, labelEnd + 1, '(', ')')
        if (destinationEnd >= 0) {
          result += stripLinks(value.slice(i + 1, labelEnd))
          i = destinationEnd
          continue
        }
      }
    }
    result += value[i]
  }
  return result
}

/** Keep code literal while removing the inline markup named by the spec. */
function plainHeadingText(value: string): string {
  let marker = '\u0000'
  while (value.includes(marker)) marker += '\u0000'
  const literals: string[] = []
  const protect = (text: string): string => `${marker}${literals.push(text) - 1}${marker}`
  let masked = ''

  for (let i = 0; i < value.length;) {
    if (value[i] === '`') {
      const run = /^`+/.exec(value.slice(i))![0]
      const closingRuns = /`+/g
      closingRuns.lastIndex = i + run.length
      let closing: RegExpExecArray | null
      let end = -1
      while ((closing = closingRuns.exec(value))) {
        if (closing[0].length === run.length) {
          end = closing.index
          break
        }
      }
      if (end >= 0) {
        masked += protect(value.slice(i + run.length, end))
        i = end + run.length
        continue
      }
      masked += run
      i += run.length
      continue
    }
    masked += value[i++]
  }

  const text = stripLinks(masked)
    .replace(/\*\*(?=\S)(.*?\S)\*\*/g, '$1')
    .replace(/\*(?=\S)(.*?\S)\*/g, '$1')

  return text.replace(new RegExp(`${marker}(\\d+)${marker}`, 'g'), (_, index: string) => literals[Number(index)])
}

function githubAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-')
}

function fenceStart(line: string): Fence | undefined {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  if (!match) return undefined

  const run = match[1]
  if (run[0] === '`' && match[2].includes('`')) return undefined
  return { character: run[0] as '`' | '~', length: run.length }
}

function closesFence(line: string, fence: Fence): boolean {
  const closePattern = new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`)
  return closePattern.test(line)
}

/** The table of contents of `markdown` as a Markdown list. */
export function toc(markdown: string, options: TocOptions = {}): string {
  const minLevel = options.minLevel ?? 2
  const maxLevel = options.maxLevel ?? 3
  if (minLevel > maxLevel) return ''

  const anchors = new Map<string, number>()
  const entries: string[] = []
  let fence: Fence | undefined

  for (const line of markdown.split(/\r\n|\n|\r/)) {
    if (fence) {
      if (closesFence(line, fence)) fence = undefined
      continue
    }

    const openingFence = fenceStart(line)
    if (openingFence) {
      fence = openingFence
      continue
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/)
    if (!heading) continue

    const level = heading[1].length
    let text = (heading[2] ?? '').replace(/(?:^|[ \t]+)#+[ \t]*$/, '').trim()
    text = plainHeadingText(text)
    const anchorBase = githubAnchor(text)
    let occurrence = anchors.get(anchorBase) ?? 0
    let anchor = anchorBase
    while (anchors.has(anchor)) anchor = `${anchorBase}-${++occurrence}`
    anchors.set(anchorBase, occurrence)
    anchors.set(anchor, 0)

    // Every heading reserves its anchor, including levels omitted from this TOC.
    if (level < minLevel || level > maxLevel) continue
    const indent = '  '.repeat(Math.max(0, level - minLevel))
    entries.push(`${indent}- [${text}](#${anchor})`)
  }

  return entries.join('\n')
}
