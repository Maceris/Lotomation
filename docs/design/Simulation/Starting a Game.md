---
status: decided
---

# Starting a Game

What happens between pressing Play (or Create) and flying around a generated world. Companion to [Save File Format](../User%20Data/Save%20File%20Format.md), [Cubic Chunk Generation](../World%20Generation/Cubic%20Chunk%20Generation.md), [Factory Network](Factory%20Network.md) and [Block Looks](../Rendering/Block%20Looks.md).

**Core rule: the player is the source of truth, and the camera follows the player.** The server always knows where each player is, so it can decide what to generate and send. The client's camera sits at the player's eye, and the observer that culling and LOD read follows the camera.

# Flow

1. The menus hand the chosen save to the client.
2. The client starts the local server with that save, or reuses it if it is already running that save. A server running another save is stopped first.
3. The server opens the save: it reads `save.kvt` and `world.kvt`, loads the registries, and compiles the world type with the save's seed into a `WorldGenerator`.
4. On a new world, the server finds the spawn (see [Spawn](#spawn)) and writes it to `world.kvt`.
5. The client joins over a local connection. The server answers with the player's id and position: the spawn for a new player.
6. The server streams the chunks around the player, nearest first, and the client draws them as they arrive.
7. The player flies; the client sends where it is, and the server keeps the chunks around it loaded and sent.

# Server

- `Server.open(saveFolder)` does steps 3 and 4. `Server` today only loads registries; it gains a `ServerWorld`.
- **`ServerWorld`** owns the loaded chunks, a generation pool and the tick loop.
  - **Ticks:** 20 a second, on the server's own thread.
  - **Generation:** a low-priority thread pool, nearest to a player first. `WorldGenerator` is safe on many threads. Low priority keeps the client's frames smooth, as the LOD background loading work found.
  - **Keeping chunks:** each player keeps the chunks within a radius loaded. Chunks no player needs are dropped after a grace period. Chunks nobody changed are never saved; they are regenerated from the seed.
- Saving changed chunks to region files comes with the first block edits, not in this step.

# Spawn

The world type's `spawn` rule says how to find it (`spawn:{anchor:{type:"floor", min_air:3}, origin:[I;0,0,0], radius:4096}`). It is searched once, when the world is created.

- **Search:** spiral outward over columns from `origin`, every 8 blocks, up to `radius`. In each column, scan down a vertical range for the first spot that passes. The range is a new `y_range` field on the rule, defaulting to -64..320. Density and fluids are pure functions, so the search samples them without making chunks, and interval bounds skip columns that are certainly all air or all solid.
- **A spot passes when:**
  - the block isn't a fluid (tagged `liquid`) or tagged `no_spawn`, like leaves, and has at least `min_air` air above;
  - it isn't under fluid;
  - the 3x3 around it is within one block of the same height;
  - the sky is above it, by the gameplay sky check in Cubic Chunk Generation.
- **Fallback:** if no spot passes within the radius, use the surface at the origin, or y = 0 if there is none. Place a 3x3 platform of the world type's default block and clear a 3x3x3 space above it. Those chunks count as changed and are saved.

# Messages

Every message is a `Request`, as today, even on a local connection.

- **Local connections pass requests as objects and never serialize them.** A remote connection serializes the same requests, so switching is trivial.
- Because local requests share objects, anything a request carries must not change after it is sent: chunks travel as immutable copies.
- First requests:

| Request | Direction | Holds |
| --- | --- | --- |
| `Join` | to server | Who is joining. Single-player joins as the save's owner. |
| `Joined` | to client | The player's id, position and rotation. |
| `ChunkData` | to client | A chunk's position, name palette and packed blocks, the same encoding as the [save format](../User%20Data/Save%20File%20Format.md#chunk-contents). |
| `ChunkUnload` | to client | A chunk position the client can drop. |
| `PlayerMove` | to server | Position and rotation, several times a second. |

# Client

- **`ClientWorld`** holds the chunks the server sent and hands them to the renderer.
- **Drawing:** the Worldgen Lab's chunk-to-section code (hidden faces from `Faces`, packed cells, `graphics.sections().compose(origin).placements(...)`) moves into a shared class that both use. When a neighbor arrives later, the hidden faces along that edge are worked out again.
- **Looks:** each block's mesh and materials come from [Block Looks](../Rendering/Block%20Looks.md). A block without a look is drawn as a box in a color picked from its name, so new blocks are never invisible. The first version draws plain colored cubes, plus water.
- **Light:** the physical sky, a sun and fog from the start.
- **Far terrain:** full-detail sections near the player first; far LOD through `lods().fromSections()` follows once streaming works.

# Time

- A world's clock counts ticks from its first midnight; a day is 24,000 ticks, 20 minutes at 20 ticks a second (`WorldTime` in Factory-Core). New worlds start at 11:00 on day 0.
- The server ticks the clock, saves it in `world.kvt` as `time` when the world closes, and sends `TimeUpdate` when a player joins and every 5 seconds. The client moves it on between updates, so the sun moves smoothly.
- The sun rises in the east at 6, is highest at noon and sets in the west at 18, on a path leaning 30 degrees south so shadows always have some length. Its light fades out at the horizon; at night only the sky's own light is left.

# Player

- A player is a position, rotation and eye height. The first version only flies, like a spectator: input moves the player, and the camera follows at the eye. Walking, with gravity and block collision predicted on the client and checked by the server, comes later.
- The client sends `PlayerMove`; the server trusts it for now and checks it once there is movement to check.

# Steps

1. Server world: open a save, compile the generator, `ServerWorld` with the generation pool and tick loop, spawn search with the fallback, spawn written to `world.kvt`. Done 2026-11-21: `Server.open`, `ServerWorld`, `SpawnRule` / `SpawnFinder` / `SpawnPlatform` in Factory-Core, and the spawn in `world.kvt` as `spawn` and `spawnPlatform`. Until changed chunks are saved, a fallback platform is stamped into its chunks each time they generate.
2. Requests and chunk streaming: join, chunk data and unload by distance, player moves. Done 2026-11-21: `Join`, `Joined`, `ChunkData`, `ChunkUnload` and `PlayerMove`; `ChunkCodec` in Factory-Core encodes chunks in the save layout; `ServerSession` and `ServerPlayer` on the server, `ClientSession` and `ClientWorld` on the client. Requests a side receives run on its own thread: the server's tick thread, the client's main thread. The flying camera is the player's eye, and its position is sent every 100 ms when it moves. A new world's 2,601 chunks in view reach the client in about 5 seconds.
3. Client drawing: the shared chunk-to-section code, colored cubes and water, sky and sun, the camera following a flying player. Done 2026-11-21: `ChunkSections` and `BlockMeshes` moved to a shared `render` package; `WorldRenderer` turns chunks into sections on a worker thread and redoes a chunk's neighbors when it arrives. Blocks whose names match Graphics' test blocks (stone, dirt, grass, water, planks, leaves, glass) use its procedural pixel art; others are cubes in a color from their name. `SkyLight` uses the physical sky and auto exposure, and moves the sun by the world's clock.
4. Block looks: look files and the first textures (see [Block Looks](../Rendering/Block%20Looks.md)). Done 2026-11-21: `BlockLooks` reads look files and textures, `BlockMeshes` draws blocks by their looks with colored cubes as the fallback, and every base block has a look and a starter texture.
5. Far LOD.
6. Walking.

Each step is checked headless with the `-Dikala.test.script` hook.

# Open Questions

- **View radius:** the server sends chunks 8 out sideways and 4 up and down from the player's chunk, and tells the client to drop them once they are more than a chunk past that. Whether these become settings, and how they relate to far LOD, is open.
- **Grace period:** a chunk no player has been near for 30 seconds is dropped on the server. Whether that should depend on memory is open.
