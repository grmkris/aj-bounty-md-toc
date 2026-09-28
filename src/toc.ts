export interface TocOptions {
  minLevel?: number
  maxLevel?: number
}

/** Match code runs exactly and count nested emphasis delimiters. */
function closingDelimiter(text: string, start: number, delimiter: string): number {
  let depth = delimiter.length
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '\\' && delimiter[0] !== '`') {
      index += 1
      continue
    }
    if (text[index] === '`' && delimiter[0] !== '`') {
      let contentStart = index + 1
      while (text[contentStart] === '`') contentStart += 1
      const codeDelimiter = text.slice(index, contentStart)
      const codeEnd = closingDelimiter(text, contentStart, codeDelimiter)
      if (codeEnd !== -1) index = codeEnd + codeDelimiter.length - 1
      continue
    }
    if (text[index] !== delimiter[0]) continue
    let end = index + 1
    while (text[end] === delimiter[0]) end += 1
    const length = end - index
    if (delimiter[0] === '`') {
      if (length === delimiter.length) return index
    } else {
      const before = text[index - 1] ?? ''
      const after = text[end] ?? ''
      const beforeWhitespace = before === '' || /\s/.test(before)
      const afterWhitespace = after === '' || /\s/.test(after)
      const beforePunctuation = /[\p{P}\p{S}]/u.test(before)
      const afterPunctuation = /[\p{P}\p{S}]/u.test(after)
      const canClose = !beforeWhitespace && (!beforePunctuation || afterWhitespace || afterPunctuation)
      const canOpen = !afterWhitespace && (!afterPunctuation || beforeWhitespace || beforePunctuation)
      if (canClose) {
        if (length >= depth) return index + depth - delimiter.length
        depth -= length
      } else if (canOpen) {
        depth += length
      }
    }
    index = end - 1
  }
  return -1
}

/** Links may contain nested brackets or balanced parentheses in their URL. */
function closingBracket(text: string, start: number, open: string, close: string): number {
  let depth = 1
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1
    } else if (text[index] === open) {
      depth += 1
    } else if (text[index] === close && --depth === 0) {
      return index
    }
  }
  return -1
}

/** Strip formatting while keeping code contents and literal punctuation intact. */
function plainHeadingText(text: string): string {
  let result = ''

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (character === '\\' && /[!-/:-@[-`{-~]/.test(text[index + 1] ?? '')) {
      result += text[++index]
      continue
    }

    if (character === '[') {
      const labelEnd = closingBracket(text, index, '[', ']')
      if (labelEnd !== -1 && text[labelEnd + 1] === '(') {
        const destinationEnd = closingBracket(text, labelEnd + 1, '(', ')')
        if (destinationEnd !== -1) {
          result += plainHeadingText(text.slice(index + 1, labelEnd))
          index = destinationEnd
          continue
        }
      }
    }

    if (character === '`' || character === '*' || character === '_') {
      let contentStart = index + 1
      while (text[contentStart] === character) contentStart += 1
      const delimiter = text.slice(index, contentStart)
      const end = closingDelimiter(text, contentStart, delimiter)
      const intraword = character === '_' && /[\p{L}\p{N}]/u.test(text[index - 1] ?? '')
      const canEmphasize = !intraword && delimiter.length <= 3 &&
        /\S/.test(text[contentStart] ?? '') && /\S/.test(text[end - 1] ?? '') &&
        !(character === '_' && /[\p{L}\p{N}]/u.test(text[end + delimiter.length] ?? ''))

      if (end !== -1 && (character === '`' || canEmphasize)) {
        let content = text.slice(contentStart, end)
        if (character === '`') {
          // CommonMark code spans retain their literal content, with one padding space removed.
          if (content.startsWith(' ') && content.endsWith(' ') && /[^ ]/.test(content)) {
            content = content.slice(1, -1)
          }
          result += content
        } else {
          result += plainHeadingText(content)
        }
        index = end + delimiter.length - 1
        continue
      }
      result += delimiter
      index = contentStart - 1
      continue
    }

    result += character
  }

  return result
}

function githubAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-')
}

function openingFence(line: string): string | null {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  if (!match) return null
  if (match[1][0] === '`' && match[2].includes('`')) return null
  return match[1]
}

/** The table of contents of `markdown` as a Markdown list. */
export function toc(markdown: string, options: TocOptions = {}): string {
  const minLevel = options.minLevel ?? 2
  const maxLevel = options.maxLevel ?? 3
  const anchors = new Set<string>()
  const suffixes = new Map<string, number>()
  const lines: string[] = []
  let fence: string | null = null

  for (const line of markdown.split(/\r\n|\n|\r/)) {
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)?.[1]
      if (closing && closing[0] === fence[0] && closing.length >= fence.length) fence = null
      continue
    }

    const possibleFence = openingFence(line)
    if (possibleFence) {
      fence = possibleFence
      continue
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?=[ \t]|$)(.*)$/)
    if (!heading) continue

    const level = heading[1].length
    const withoutClosingHashes = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim()
    const text = plainHeadingText(withoutClosingHashes)
    const baseAnchor = githubAnchor(text)
    let suffix = suffixes.get(baseAnchor) ?? 0
    let anchor = baseAnchor
    while (anchors.has(anchor)) anchor = `${baseAnchor}-${++suffix}`
    suffixes.set(baseAnchor, suffix)
    anchors.add(anchor)

    // All document headings reserve an anchor, even those omitted from the TOC.
    if (level < minLevel || level > maxLevel) continue
    lines.push(`${'  '.repeat(level - minLevel)}- [${text}](#${anchor})`)
  }

  return lines.join('\n')
}
