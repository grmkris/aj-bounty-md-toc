import { describe, expect, it } from 'bun:test'
import { toc } from '../src/toc.ts'

describe('toc edge cases', () => {
  it('recognizes ATX whitespace, indentation, empty headings, and closing hashes', () => {
    const md = '   ##\tIndented ###\r\n####### Too deep\r\n    ## Code\r\n##no space\r\n## C#\r\n## ###'
    expect(toc(md)).toBe('- [Indented](#indented)\n- [C#](#c)\n- [](#)')
  })

  it('supports all six heading levels and indentation relative to minLevel', () => {
    expect(toc('#### Four\n###### Six', { minLevel: 4, maxLevel: 6 }))
      .toBe('- [Four](#four)\n    - [Six](#six)')
    expect(toc('## Two', { minLevel: 3, maxLevel: 2 })).toBe('')
  })

  it('reserves anchors for excluded headings and avoids existing suffixes', () => {
    expect(toc('# Same\n## Same-1\n## Same\n### Same\n## Same-1'))
      .toBe('- [Same-1](#same-1)\n- [Same](#same-2)\n  - [Same](#same-3)\n- [Same-1](#same-1-1)')
  })

  it('keeps repeated spaces, Unicode, and underscores when generating anchors', () => {
    expect(toc('## 東京  Café_2 + 🐸\n## 東京  Café_2 + 🐸'))
      .toBe('- [東京  Café_2 + 🐸](#東京--café_2--)\n- [東京  Café_2 + 🐸](#東京--café_2---1)')
  })

  it('strips nested emphasis and link formatting, including balanced URL parentheses', () => {
    expect(toc('## **Bold *and em*** with [**docs**](https://x.y/a(b)) and _more_'))
      .toBe('- [Bold and em with docs and more](#bold-and-em-with-docs-and-more)')
    expect(toc('## *Em with **bold** inside* and **[docs](https://x.y)**'))
      .toBe('- [Em with bold inside and docs](#em-with-bold-inside-and-docs)')
    expect(toc('## **Bold with [**docs**](https://x.y) inside**'))
      .toBe('- [Bold with docs inside](#bold-with-docs-inside)')
  })

  it('keeps code contents literal and supports longer backtick delimiters', () => {
    expect(toc('## `*literal*` and `` a`b ``'))
      .toBe('- [*literal* and a`b](#literal-and-ab)')
    expect(toc('## **Bold with `**literal**` inside**'))
      .toBe('- [Bold with **literal** inside](#bold-with-literal-inside)')
  })

  it('preserves unmatched delimiters and escaped Markdown punctuation', () => {
    expect(toc('## A * and ` and API_v2_name and \\*literal\\*'))
      .toBe('- [A * and ` and API_v2_name and *literal*](#a--and--and-api_v2_name-and-literal)')
  })

  it('only closes fences with the same character, sufficient length, and no info', () => {
    const md = '## Before\n  ````ts\n## Hidden\n```\n## Hidden\n~~~~\n## Hidden\n```` trailing\n## Hidden\n   `````\n## After'
    expect(toc(md)).toBe('- [Before](#before)\n- [After](#after)')
    expect(toc('## Before\n~~~\n## Hidden')).toBe('- [Before](#before)')
  })

  it('does not reserve anchors for code headings or accept backticks in fence info', () => {
    expect(toc('```\n## Same\n```\n## Same\n```bad`info\n## Visible'))
      .toBe('- [Same](#same)\n- [Visible](#visible)')
  })

  it('does not share duplicate counters between calls', () => {
    expect(toc('## Again\n## Again')).toBe('- [Again](#again)\n- [Again](#again-1)')
    expect(toc('## Again')).toBe('- [Again](#again)')
  })
})
