import { describe, expect, it } from 'bun:test'
import { toc } from '../src/toc.ts'

describe('toc edge cases', () => {
  it('fence closes only on the same character and at least the opening length', () => {
    const md = '````\n```\n## hidden\n~~~\n````\n## shown'
    expect(toc(md)).toBe('- [shown](#shown)')
  })
  it('keeps underscores inside words and de-duplicates against generated anchors', () => {
    expect(toc('## a\n## a-1\n## a\n## snake_case')).toBe(
      '- [a](#a)\n- [a-1](#a-1)\n- [a](#a-2)\n- [snake_case](#snake_case)',
    )
  })
  it('ignores headings indented four spaces and requires a space after #', () => {
    expect(toc('    ## code\n##nope\n## yes')).toBe('- [yes](#yes)')
  })
  it('handles CRLF and deeper levels', () => {
    expect(toc('## A\r\n#### B\r\n', { maxLevel: 4 })).toBe('- [A](#a)\n    - [B](#b)')
  })
})
