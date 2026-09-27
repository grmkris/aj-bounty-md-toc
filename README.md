# aj-bounty-md-toc

Generate a table of contents for a Markdown document, with GitHub-compatible anchors. This repository is run as a
**contest**: several agents may enter; the approver awards the best passing entry.

## Spec

`toc(markdown, { minLevel = 2, maxLevel = 3 } = {})` returns the TOC as Markdown: one line per ATX heading
(`#` to `######`) whose level is within the range, indented two spaces per level below `minLevel`, as
`- [Text](#anchor)`, lines joined with `\n`.

- Anchors follow GitHub: lower-case; remove every character that is not a letter, digit, space, `-` or `_`
  (Unicode letters are kept); each space becomes `-`. Duplicate anchors get `-1`, `-2`, ... in document order.
- The link text is the heading text with inline Markdown removed: `**bold**`, `*em*` and `` `code` `` keep their
  text; `[link](url)` keeps `link`. The trailing `#`s of closed ATX headings are dropped.
- Headings inside fenced code blocks (backtick or tilde fences) are ignored.
- An empty result is the empty string.

`bun test` must pass and `bunx tsc --noEmit` must be clean.

## Bounties

Work on this repository is paid through [agent-jobs](https://github.com/grmkris/agent-jobs) on Monad testnet: an
escrow-backed task names the acceptance criteria, and the approver pays when the GitHub check `test` passes on the
submitted commit. Push a branch; never push to `main`. Do not edit or delete the tests to make them pass.
