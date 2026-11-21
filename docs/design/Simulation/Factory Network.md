---
status: decided
---

# Factory Network

How machines, belts, pipes and multi-block structures run and are stored, so a large factory keeps working without its chunks loaded. Companion to [Save File Format](../User%20Data/Save%20File%20Format.md), [Machines](../Types%20of%20Things/Machines.md) and [Transport](../Types%20of%20Things/Transport.md).

**Core rule: the network is the only authority on what the factory does, near or far.** Near a player, moving items and machine animations are drawn from the network's state. They are never a second simulation. When near and far run under different rules, results depend on what happens to be loaded, the same trap [Cubic Chunk Generation](../World%20Generation/Cubic%20Chunk%20Generation.md#gameplay-server) avoids for sky light.

# Three Layers

| Layer | What it holds | When it is in memory |
| --- | --- | --- |
| Factory network | Machines and multi-block structures as nodes. Belts and pipes as links, with their length and contents. Buffers, inventories, power. | Always, for the whole world. A few hundred bytes per machine, so 100,000 machines is tens of MB. |
| Simulated chunks | Blocks, block ticks, entities, world fluid flow. | Only near players, or held by a [simulation ticket](#mods-that-act-away-from-players). |
| Rendering | The LOD system and its cache. | Whatever is in view. It draws terrain without simulating it. |

Machines never keep chunks loaded. A factory spread over a thousand chunks keeps running with none of them loaded, and loading and rendering costs grow only with what players are near or looking at.

# How It Runs

The network simulates **discrete events** on fixed game ticks, in the spirit of Factorio, which also simulates every entity on the whole map and never unloads anything. Something costs time only when something happens to it.

- **A machine schedules its own next event**, such as "this craft finishes at tick T". Between events it costs nothing.
- **Idle machines sleep**, as [Machines](../Types%20of%20Things/Machines.md) asks: a starved or blocked machine has no event at all until something wakes it, such as an item arriving or space freeing up.
- **Belts are runs that track the gaps between items**, like Factorio's belt optimization ([Friday Facts #176](https://cf-www.factorio.com/blog/post/fff-176)). Moving items along a run doesn't touch them; an event fires only when an item reaches the end of a run, or the run backs up.
- **Pipes and tanks** hold amounts of fluid. Events fire when a tank fills or empties, or a pipe run's flow changes.
- **Splitters and filters route real items** as they arrive, so priorities, filters and overflow need no flow solver.
- **Randomness is per craft**, seeded by the structure id and its craft count, so chance outputs and quality rolls are exact and deterministic.
- **Conditions** (circuit-style rules such as "run while the chest holds under 500") are checked when a count they read changes.
- **Near players**, belts are drawn from the real items and gaps, so belts bunch and stutter for real, and machines animate from their state. Nothing is approximated, so nothing needs correcting.

Cost grows with crafts per second, not with machines times ticks: 100,000 machines each crafting every 2 seconds is 50,000 events a second. A steady factory costs a little all the time, one event per craft, which is the price of exact, simple and moddable behavior. There is no offline progress: a factory runs only while its server does.

# Structures

Two kinds of thing span several blocks:

## Small Fixed Shapes

Doors, beds and tall plants. Each cell is an ordinary block whose palette state says which part it is and anything else small about it, such as `half:"upper"` or `open:true`. They have no data outside the palette and are not part of the network. Breaking one part breaks the others, loading the neighboring chunk's data if needed ([Distant Edits](#distant-edits)).

## Machines

Fixed-size machines and multi-block machines are both structures in the network.

- **Each machine type has a validity rule**: a strict template with optional parts, a grown shape (like a tank of any size), or custom constraints within sanity limits. Some rules are stricter than others.
- The rule is checked when the structure is formed, and again when one of its parts changes.
- **Whatever the rule, the store records the actual cells the structure covers**, so storage doesn't depend on how a shape was made.
- **Maximum extent: 3x3x3 chunks.** That bounds how many chunks one edit to a structure has to load.
- The chunks hold only the part blocks, for rendering and collision. They don't point back to the structure: which cells belong to which structure comes from the network's spatial index.

# Storage

The network's contents are saved in `worlds/<world>/factory/`, in [region files](../User%20Data/Save%20File%20Format.md#region-files) with the same layout as the block regions.

- **Each structure is filed under the chunk of its origin cell.** That is only a storage key, so a save rewrites just the regions that changed. The whole store is loaded when the world starts, whatever chunks are loaded, so a structure that crosses chunk boundaries never needs any particular chunk loaded.
- **A structure record** holds its id, type, origin, the cells it covers, its state, inventories and buffers, and its connections.
- **Structure ids are derived, not random or counted:** a 64-bit hash of the type, the origin and the cells covered, taken when the structure forms. Structures that world generation places get the same id every time the same seed generates them. The id is kept for the structure's life, even if it later grows or shrinks. Two live structures can't share an origin cell, so ids only collide by hash accident; the store checks on insert. A machine torn down and rebuilt identically in the same place gets its old id back.
- **A link** (a run of belt or pipe) is filed under its first cell. It holds the cells it runs through, what it connects, and its contents: items and the gaps between them, with repeated items compressed into runs.
- **Rebuilt on load, never saved:** power grid groupings, the event queue (from each machine's saved progress), and the spatial index from positions to structures.
- **The store wins.** Chunks and the store are written in the same save cycle. If they disagree after a crash, the store is right: when a chunk loads, part blocks with no structure are removed, and missing part blocks are restored from the structure's cells.

Things that are not connected to the network, such as a plain chest or a sign, keep their data in the chunk's `blockEntities`.

# Distant Edits

Edits don't only happen near players: a machine, an explosion or a mod's quarry can change blocks far away, including half of a door whose other half is in an unloaded chunk.

**A distant edit loads the chunk's data without simulating it.** The server loads only the chunk's blocks (no entities, no ticking), applies the edit, marks the chunk changed, and drops it again after the next save. Edits from the same source are batched per chunk.

The edit takes effect at once, so the LOD cache and the rendered terrain update as it happens: a real quarry visibly digs in the distance. A queue of edits applied when a chunk next loads stays available as an optimization if something edits far more than this can keep up with.

# What Touches the World

- **Resources in the base game are infinite.** Base-game miners and pumps produce on their own schedule and change no blocks; a pump never drains the body of fluid it draws from.
- **A mod's pump can drain**, removing fluid blocks through distant edits as it works, the same way a real quarry digs.
- **A mod that really digs**, such as a literal quarry, removes real blocks through distant edits as it works.
- **Building, breaking and reshaping** happen through block edits. They change the network's connections, and the affected machines and belts are woken.

## Mods That Act Away From Players

In the base game, nothing destroys what players build. Mods may want things to happen with no player near, like Factorio's enemies or a machine that milks nearby cows. They have two routes:

1. **Join the network.** For example, a pasture becomes a machine that produces on its own schedule, based on the animals it holds. Cheap, and works over any distance.
2. **Hold a simulation ticket.** A mod asks to simulate a bounded area for a while, within a budget the server enforces. Admins can see who holds tickets. This is Minecraft's force-loaded chunks, made explicit and accountable, so no mod can quietly keep half the world running.

Otherwise, entities and block ticks only run near players.

# Open Questions

- **Tick rate:** 20 ticks a second, as in Minecraft, or 60, as in Factorio. With events it sets timing precision and the cost of what is simulated near players, so 20 is likely enough.
- **Power shortages:** whether every machine slows down in proportion, as in Factorio, or some machines get priority.
