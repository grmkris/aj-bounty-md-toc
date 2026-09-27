import { describe, expect, it } from 'bun:test'
import { toc } from '../src/toc.ts'

describe('toc', () => {
  it('lists h2 and h3 by default, nested', () => {
    const md = '# Title\n\n## Install\n\n### From source\n\n## Usage\n#### Deep\n'
    expect(toc(md)).toBe('- [Install](#install)\n  - [From source](#from-source)\n- [Usage](#usage)')
  })
  it('respects the level range', () => {
    expect(toc('# A\n## B\n### C', { minLevel: 1, maxLevel: 2 })).toBe('- [A](#a)\n  - [B](#b)')
  })
  it('GitHub anchors: punctuation, case, unicode, duplicates', () => {
    const md = '## Hello, World!\n## Hello World\n## Hello World\n## Čas & Ура\n## API_v2 -- beta'
    expect(toc(md)).toBe(
      [
        '- [Hello, World!](#hello-world)',
        '- [Hello World](#hello-world-1)',
        '- [Hello World](#hello-world-2)',
        '- [Čas & Ура](#čas--ура)',
        '- [API_v2 -- beta](#api_v2----beta)',
      ].join('\n'),
    )
  })
  it('strips inline markdown from the text and anchor', () => {
    expect(toc('## Use **fast** `mode` with [docs](https://x.y) ##')).toBe('- [Use fast mode with docs](#use-fast-mode-with-docs)')
  })
  it('ignores headings in fenced code', () => {
    const md = '## Real\n```sh\n## not a heading\n```\n~~~\n## nor this\n~~~\n## Also real'
    expect(toc(md)).toBe('- [Real](#real)\n- [Also real](#also-real)')
  })
  it('empty when nothing matches', () => {
    expect(toc('just text\n#nospace')).toBe('')
  })
})
