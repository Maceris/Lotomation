---
status: decided
---

# Save Folder

A save is an instance: the whole state of one hosted game, server identity and accounts included. Single-player runs the same server, just without opening a port, so opening a world to friends changes one setting and nothing else. Where saves live is in [Folder Structure](Folder%20Structure.md#instances).

```
<save>/
  save.kvt                 see below
  save.kvt.old             the previous save.kvt
  server.kvt               hosting settings
  icon.png
  host/
    server-id              the server's permanent random id
    host.key, host.pub     the server's identity; it moves with the save
  accounts.kvt             registered accounts
  players/<account-id>.kvt what belongs to one player
  teams/<team-id>.kvt      what belongs to a team
  worlds/<world>/          one folder per world, such as earth
    world.kvt              seed, world type, spawn, time, weather
    regions/               blocks: r.x.y.z.reg
    entities/              entities: r.x.y.z.reg
    factory/               the factory network: r.x.y.z.reg
    data/<mod-id>/         global state each mod owns
  plugins/                 server-only plugins and mods for this save
  logs/                    this server's logs
  session.lock             held while a process has the save open
```

There is no `local_player.txt`. The first time a player opens a new single-player save, their key for that server is registered as the `owner` account ([Accounts and Identity](Accounts%20and%20Identity.md)).

Everything in a save is big-endian, matching [KVT](KVT.md), and every structured file is KVT. The `.ika` asset container is little-endian because it is read straight into GPU buffers; the two never meet.

## save.kvt

- Format version, game version, and whether a development build last wrote it.
- Created and last played times, display name.
- The mods the save needs, with versions: those running on both sides and those running on the server only. Client-only mods are never recorded. See [Mods](Mods.md#sides).
- The list of worlds.

Keys (binary KVT): `version`, `name`, `created` and `lastPlayed` (epoch milliseconds), `gameVersion` (Factory-Core's), `devBuild` (true for a pre-release version) and `worlds` (folder names, the first being where players start). `save.kvt` is written last, so a save folder without it never finished being made and isn't listed.

## server.kvt

- `listen`: `off` (single-player), `lan` or `public`.
- Bind address, port, maximum players, message of the day.
- Registration policy: see [Accounts and Identity](Accounts%20and%20Identity.md#registration-policy).

## accounts.kvt

Each account has a random account id, a username, the public key it signs in with, a role (`owner`, `operator`, `player`), whether it is banned, and when it registered. The account id, not the username, names the player's file, so a username can change later.

# Names, Not Numeric Ids

Saves refer to blocks, items, entities, biomes and block entity types by their namespaced names, such as `lotomation:stone`, never by numeric id. Numeric ids exist only at runtime and in the registry sync from server to client ([Mods](Mods.md#rules-and-looks)). A save has no id table, so a mod update or a changed load order can't scramble what is stored.

## Removed Content

Anything whose name is no longer registered, for example after a mod is removed, loads as a placeholder that keeps its name and data, and is written back unchanged. That covers palette entries, block entities, entities, items and mod sections. Adding the mod back restores everything as it was. A server command purges placeholders for good when the owner wants them gone.

# Worlds

## world.kvt

- Seed and world type. Keys: `version`, `worldType`, `seed`, `time` (the clock in ticks, see [Starting a Game](../Simulation/Starting%20a%20Game.md#time)), and `spawn` (`[I;x,y,z]`, the block a new player's feet are in) with `spawnPlatform`. A seed typed as a whole number is used as is, other text is hashed (64-bit FNV-1a), and a blank seed is random.
- Spawn position.
- Game time in ticks, and weather.
- A hash of the loaded worldgen data (mod list plus files). A mismatch on load is a warning, not a refusal ([Cubic Chunk Generation](../World%20Generation/Cubic%20Chunk%20Generation.md#determinism)).
- A hash of the block opacity rules the region headers' opacity masks were built with (see [Header](#header)).

## What Is Saved

Generation is a pure function of the seed, so **only chunks that were changed are saved**. Any other chunk is regenerated. A changed chunk is saved whole, not as a difference from what the generator made, so a worldgen update never shifts the terrain under a player's build.

A world has three sets of region files with the same layout, so each can be loaded and saved without the others:

| Folder | Holds | Loaded |
| --- | --- | --- |
| `regions/` | Blocks, biomes, block entities, scheduled ticks | Per chunk, near players or for a [distant edit](../Simulation/Factory%20Network.md#distant-edits) |
| `entities/` | Entities | Per chunk, near players |
| `factory/` | The factory network | Whole, when the world starts |

## Region Files

A region file holds a cube of 16x16x16 chunks. Chunks are 16x16x16 blocks ([Cubic Chunk Generation](../World%20Generation/Cubic%20Chunk%20Generation.md)), so a region covers a 256-block cube.

### Location

Region files are named `r.x.y.z.reg` after the region's coordinates, for example `r.1.-2.0.reg`. A chunk's region coordinates are its chunk coordinates shifted right by 4 (rounding down, so chunk -1 is in region -1).

A region file only exists once one of its chunks is stored, and chunks never stored take no space, so regions that are mostly air stay small.

### Header

A region file starts with an 80 KiB header of three tables, each with 4096 entries, one per chunk.

| **Byte** | **0x00000 - 0x03FFF** | **0x04000 - 0x0BFFF** | **0x0C000 - 0x13FFF** | **0x14000 - end** |
| --- | --- | --- | --- | --- |
| **Description** | Locations (4 bytes each) | Timestamps (8 bytes each) | Opacity masks (8 bytes each) | Chunks and padding |

A chunk's entry index is `(x & 15) + 16 * ((z & 15) + 16 * (y & 15))`, using its chunk coordinates. That is the same x, then z, then y order a chunk uses for its blocks. Its location is at byte `4 * index`, its timestamp at `0x4000 + 8 * index` and its opacity mask at `0xC000 + 8 * index`.

A location is four bytes: a three-byte offset in 4 KiB sectors from the start of the file, then a one-byte length in 4 KiB sectors, rounded up. A chunk that isn't stored has both fields zero.

| **Byte** | **0** | **1** | **2** | **3** |
| --- | --- | --- | --- | --- |
| Description | Offset | | | Sector count |

A timestamp is a signed 64-bit integer: the chunk's last modification time in epoch seconds.

An opacity mask is 64 bits, one per 4x4x4 cell of blocks in the chunk, set when every block in the cell is opaque. Cell `(cx, cy, cz)` is bit `cx + 4 * (cz + 4 * cy)`, with bit 0 the least significant. The gameplay sky light check reads these without loading chunks ([Cubic Chunk Generation](../World%20Generation/Cubic%20Chunk%20Generation.md#gameplay-server)). Masks are rebuilt when a chunk is saved. When the opacity rules hash in `world.kvt` no longer matches, for example after a mod update, the server rebuilds every mask as it goes. `entities/` and `factory/` files leave the table zero.

### Chunk Records

Each chunk starts with a signed 32-bit length, the exact number of bytes that follow it, then a compression byte, then the compressed data. Each chunk is padded to a multiple of 4096 bytes.

| **Byte** | **0 - 3** | **4** | **5 - end** |
| --- | --- | --- | --- |
| Description | Length (in bytes) | Compression type | Compressed data (length - 1 bytes) |

Compression types, in order of preference:

| **Type** | **Method** |
| --- | --- |
| 1 | Zstandard. What the game writes. |
| 2 | LZ4 (reserved) |
| 3 | Zlib (RFC 1950) |
| 4 | GZip (RFC 1952) |
| 5 | Uncompressed, the same format as in memory |

Type 0 is invalid. Zstandard comes from the `zstd-jni` library, through the plugin `libraries` setup.

### Oversized Chunks

The one-byte sector count limits a chunk inside a region file to 255 sectors (just under 1 MiB). A chunk larger than that is written to its own file next to the region, `c.x.y.z.chunk`, named by its chunk coordinates. In the region it keeps a one-sector entry with a length of 1 and its compression type with the high bit set (`0x80`), meaning "the data is in the overflow file". The overflow file holds just the compressed data.

## Chunk Contents

A chunk in `regions/` is one KVT node:

| Key | Type | Holds |
| --- | --- | --- |
| `version` | Integer | The chunk format version. |
| `palette` | Node Array | The distinct blocks in the chunk, each `{name:"lotomation:stairs", state:{facing:"north"}}`. `state` is left out when empty. |
| `blocks` | Long Array | Palette indices, packed (see below). Left out when the palette has one entry, so open air or solid stone costs one palette entry. |
| `fills` | Node | `{palette:[N;...], cells:[L;...]}`: what fills each position besides its block, such as a snow layer, packed like `blocks`. Each palette entry is `{name:"lotomation:snow", level:8}`; an empty fill is `{}`. Left out when nothing in the chunk has a fill (see [Fills](#fills)). |
| `biomes` | Node | `{palette:[T;...], cells:[L;...]}`: one biome per 4x4x4 cell, 64 per chunk, packed the same way. `cells` is left out when there is one biome. |
| `blockEntities` | Node Array | `{pos:<Short>, id:"<name>", data:{...}}` per block that has its own data. |
| `ticks` | Node Array | Scheduled updates, `{pos:<Short>, kind:"<name>", due:<Long game tick>}`. |
| `mods` | Node | Data mods attach to the chunk, keyed by mod id. |

- **Block index order** is `x + 16 * (z + 16 * y)`, as in Factory-Core's `Chunk`. `pos` in `blockEntities` and `ticks` is that index.
- **Packing:** each index uses `max(1, ceil(log2(palette size)))` bits, so up to 16 kinds of block take 4 bits each. Indices are packed from the least significant bit of each long and never straddle two longs; leftover high bits are zero. The bit count is worked out from the palette size, not stored.
- **Palettes are per chunk.** A palette lists only the blocks in that chunk: one entry for open air or solid stone, a handful for natural ground, a few dozen for a busy base. That is at most about a tenth of a chunk before compression, and resolving names costs one lookup per palette entry, not per block. A Zstandard dictionary trained on common names can shrink it further later without changing the format.
- **Biomes are stored**, even though worldgen could recompute them, so a worldgen update doesn't change the biome under an existing base. Biomes affect gameplay, such as what spawns and what grows.

### State and Block Entities

- **State** is small and has a fixed set of values: a stair's facing, a lever or a door being open, which half of a door a block is. It lives in the palette, so blocks with the same state share an entry.
- **Block entity data** is per position and changes freely: a chest's contents, a sign's text, the loot seed of a structure's container. It never goes in the palette.
- Anything connected to the factory network (machines, belts, pipes, power) keeps its data in `factory/`, not in `blockEntities`. See [Factory Network](../Simulation/Factory%20Network.md).

### Fluids

Fluids in the world, such as oceans and lakes, are blocks, as in Minecraft. Fluids in pipes, tanks, machines and items (a full bucket) are separate data, kept by the factory network or the item.

### Fills

A position holds a block and, optionally, a **fill**: something that shares the position with the block, around it, such as snow lying around a fence post or a grass tuft. So a position is a fluid block, or another block with an optional fill.

- **A fill has a level** in 1/16 m steps, up to 16 (a full position). Snow is the first fill; see [Snow](../Simulation/Snow.md).
- **Which blocks take a fill** is a property of the block, set by a tag or derived from how much of the position its model fills. A full cube takes none.
- **Water as a fill** (waterlogging, and water levels for Minecraft-like flow) is planned for the same channel but not decided: water may stay blocks with a level state.
- A fill's level is game state: the server owns it and syncs it. How it is drawn is the client's (see [Snow](../Simulation/Snow.md#drawing)).

## Entity Contents

A chunk in `entities/` is `{version:<Integer>, entities:[N;...]}`, holding the entities standing in that chunk:

| Key | Type | Holds |
| --- | --- | --- |
| `id` | String | The entity type's name. |
| `uuid` | Long Array | Two longs. |
| `pos`, `vel` | Double Array | Position and velocity. |
| `rot` | Float Array | Yaw and pitch. |
| `data` | Node | The entity type's own data. |
| `mods` | Node | Mod data, keyed by mod id. |

Players are not entities on disk; they have their own files.

## Factory Store

`factory/` holds the factory network: machines, multi-block structures, belts, pipes and their contents. Each structure is filed in the region file and chunk of its origin cell, but that is only a storage key so saves can be incremental: the whole store is loaded when the world starts, whatever chunks are loaded. Its contents are described in [Factory Network](../Simulation/Factory%20Network.md#storage).

## Mod Data

`worlds/<world>/data/<mod-id>/<name>.kvt` holds global state a mod owns, such as map markers, claims or a mod's own lists. Files for a mod that isn't loaded are kept untouched.

# Players and Teams

**Teams own progression, players own personal things.** In single-player the player is a team of one.

- What a factory produces is shared by the team, since it sits in the team's machines and storage.
- Currencies belong to each player.
- Quest progress belongs to the team, but each player claims a quest's rewards for themselves, independently of teammates.

`players/<account-id>.kvt`:

- Format version, account id, team id.
- World, position (doubles) and rotation.
- Inventory, equipped items, attributes such as health.
- Currencies, and which quest rewards they have claimed.
- Stats, cosmetics and collections.
- `mods`: mod data, keyed by mod id.

`teams/<team-id>.kvt`:

- Format version, name, members.
- Quest progress, unlocked recipes, research.
- `mods`: mod data, keyed by mod id.

# Versions and Upgrades

- `save.kvt`, every chunk, entity chunk, factory chunk, player and team file carry a format version.
- Old data is upgraded on load by a chain of upgrade steps, one per version, never by guessing.
- Mods version their own block entity, entity and save data the same way, and upgrade it themselves.
- A version newer than the game knows refuses to load rather than risking damage.

# Crash Safety

- **KVT files** (`save.kvt`, players, teams, world and mod data) are written to a temporary file and then renamed over the old one. The previous `save.kvt` is kept as `save.kvt.old`.
- **Region files are copy-on-write.** A changed chunk is written to free sectors first, and its header entry is updated only after the data is on disk. A crash leaves either the old chunk or the new one, never half of each. The old chunk's sectors are freed afterwards.
- **Chunks and the factory store are written in the same save cycle.** If they disagree after a crash, the factory store wins (see [Factory Network](../Simulation/Factory%20Network.md#storage)).
