# Lotomation design docs

An [Obsidian](https://obsidian.md) vault; open this `docs` folder as the vault. The notes are plain Markdown and read fine on GitHub too.

- `design/`: design notes, research and prior art.
- `board/`: tickets, one folder per board column, indexed by [All Factory Tickets](board/All%20Factory%20Tickets.md). The folder a ticket is in is its status.
- `attachments/`: images and other files the notes embed.

## Links

Link between notes with standard Markdown links and relative paths, such as `[Save File Format](Save%20File%20Format.md)`, not `[[wikilinks]]`, which GitHub does not render. The vault settings already write new links this way.

Links to a heading use the GitHub style anchor, lowercase with dashes, such as `[Loot Tables](Generation%20Data%20Format.md#loot-tables)`.

Notes that only exist in the original Obsidian vault (the MMO notes) are named in italics instead of linked.

## Status

Each design note starts with a `status` property, so brainstorms can be told apart from settled design:

| Status | Meaning |
| --- | --- |
| idea | A brainstorm or open question, nothing settled. |
| draft | Being worked out; parts may change. |
| decided | Settled design, not built yet. |
| implemented | Built; the code is the final word if they disagree. |
| superseded | Replaced by a later design; kept for history. |
| reference | Research or prior art, not our design. |
