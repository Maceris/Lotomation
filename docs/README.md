# Lotomation design docs

An [Obsidian](https://obsidian.md) vault; open this `docs` folder as the vault. The notes are plain Markdown and read fine on GitHub too.

- `design/`: design notes, research and prior art.
- `board/`: tickets, one folder per board column, indexed by [All Factory Tickets](board/All%20Factory%20Tickets.md). The folder a ticket is in is its status.
- `attachments/`: images and other files the notes embed.

## What the Notes Are For

The design notes describe the game as it is now, and ideas for how it could or will be: brainstorms, plans and settled designs not built yet. They are not a record of progress or of how things changed.

- Write what is true, or what is meant to become true, not when or how it got that way. No "done on" dates, "so far", lists of finished steps, or notes about what used to be.
- When something is built, describe it as it is and take it out of any list of steps still to do.
- When a design changes, change the note to say the new thing, or delete a note nothing is left of. Git keeps the old version.

The board is the exception: tickets track progress by the column they are in, and can carry comments about it.

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
| reference | Research or prior art, not our design. |
