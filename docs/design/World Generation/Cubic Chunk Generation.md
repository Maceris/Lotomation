---
status: implemented
---

# Cubic Chunk Generation

Brainstorm for moving world generation to 16×16×16 cubic chunks, where the vertical range matches the horizontal one (32-bit int, about ±2.1 billion blocks). This replaces the column-based parts of [Old Generation](Old%20Generation.md): the bottom-up layers, the `-512..512` height range, and bedrock at the floor.

# Principles

1. **Y is just another coordinate.** The engine treats x, y and z the same way. There is no surface height, sea level, bedrock floor or height band in code. Any vertical structure (altitude, strata, stacked surfaces, a sky) comes from world type data, for example through a `y_gradient` or `y_mask` node.
2. **Every chunk generates on its own.** Generation is a pure function of (seed, chunk position, data) plus a bounded neighbourhood. That means the result can't depend on chunk order or which thread runs it, so it is deterministic.
3. **A stage only reads earlier stages, by evaluating their functions.** It never reads blocks that another chunk has already generated.
4. **Node types are fixed in code, configurations are data.** This matches the rest of the game: density node types, placement types and feature types are code; their parameters and how they combine are data.

**Gravity caveat:** Y still means "down" for gravity, fluids, plant growth and lighting. So the engine has concepts tied to *direction* (floor, ceiling, up, down) but none tied to *height* (surface, sea level).

# Density

Terrain shape is a single function: `density(x, y, z) > 0` means solid, otherwise air or fluid. A world type defines it as a tree of nodes (noise, add, mul, min, max, clamp, spline, `y_gradient`, `y_mask`, ref, ...).

| World | Density sketch |
| --- | --- |
| Minecraft-like | `continentShape(x,z) − k·y + overhangs3D(x,y,z)`. The surface comes out of the data; the engine never knows about it. |
| Stacked surfaces | `max(landA, yMask(3000, 600) · landB, ...)`, several masked shapes combined |
| Floating islands | `islandNoise3D + yFalloff − threshold`, or leave out the falloff for islands at every height |
| Cave world | `1 − caveNoise3D` |
| All stone | `1` |
| Skyblock | `−1`, plus a spawn structure |

## Performance

- **Interpolate a coarse grid.** Sample every 4 blocks in x and z and every 8 in y, then interpolate between the samples. That's 5×3×5 = 75 samples per chunk instead of 4096.
- **Interval bounds.** Every node reports the minimum and maximum it can output over a given box. If a chunk's density is always positive (or always negative), the whole chunk is solid (or air) and nothing gets sampled. This matters a lot, because most of the world will be uniform.
- **Axis-dependency analysis.** Each node knows which axes it depends on: the union of its children's axes, where `noise2d(x,z)` depends on {x, z} and `y_gradient` on {y}. The engine automatically caches subtrees that only use x and z per column, and subtrees that only use y per horizontal layer. That gets back the speed of column-based generation without building surfaces into the engine.

# Parameters and Biomes

- **Parameters are named density functions defined in data**, 2D or 3D as the author chooses. They replace the fixed five-field `ParameterPack`, so mods can add their own.
- **Biome selection** keeps the existing nearest-midpoint matching, extended to any number of named parameter ranges.
- **One biome per 4×4×4 cell**, so 64 per chunk. Store them as palette indices or shorts, not `byte`, so the count isn't capped at 256.
- **Terrain is shaped from the parameters, not from the chosen biome.** That avoids seams at biome borders. Biomes only choose blocks, features and decoration.
- **Altitude effects are data**, for example `temperature = baseTemp(x,z) − 0.001·y`. Worlds that don't want them leave them out.
- **Underground vs open-sky biomes without a surface:** a parameter can reference a smoothed, low-frequency copy of the terrain density (for example an `enclosure` parameter), meaning "mostly rock around here" vs "mostly open". The node graph has to be acyclic, so terrain can't depend on a parameter that depends on terrain. Check this when data loads.

# Exposure Rules (replaces layers)

The old layer stack (`min + extraProportion × (height − totalMin)`) needs the whole column, so it's dropped. Instead, each block gets local context:

- `air_above`: distance, capped at N (say 16), to the first non-solid block going up
- `air_below`: the same, going down
- optionally `steepness`, taken from the density gradient

These are computed by sampling the (interpolated) density function past the chunk edge, so neighbouring chunks never need to exist.

Rules map conditions on (`air_above`, `air_below`, biome, noise, fluid, and y if the data wants it) to a block:

- Floor: `air_above == 1` → grass; `air_above <= 4` → dirt
- Ceiling: `air_below == 1` → moss or glow baskets
- Otherwise → the strata rule

This works for any number of surfaces, overhangs and islands; the underside of an island is just a ceiling. **Strata** for deep material come from a large-scale 3D "rock type" parameter, or from y-based rules in data for worlds that want depth layers.

# Fluids

The engine has no sea level. Fluid filling is a node, aquifer-style:

- Space is divided into coarse cells, and each cell picks a fluid level and fluid type from noise. Open space below that level is filled.
- An overworld ocean is just a constant fluid level of 0 in data. Floating islands can have no fluid at all, or a small lake per island.
- Where neighbouring cells disagree on level, place a solid barrier between them (Minecraft's approach).

# Structures (pull model)

- **Structure set** (data): spacing per axis (the y spacing can be enormous), separation, salt, and an optional y-range restriction.
- **Each 3D cell holds at most one structure start**, chosen with `hash(seed, salt, cellX, cellY, cellZ)`.
- **Finding an anchor:** the placement type turns a start into a real position with a bounded, fixed-order scan that evaluates density:
  - `floor`: solid with at least K blocks of air above it; check how flat the footprint is at a few sample points
  - `ceiling`: the same, upside down
  - `cave`: air with both a floor and a ceiling nearby
  - `enclosed`: inside solid
  - `open_air`: floating, with no ground needed
  - `fixed`: an exact offset from the cell
  - If no anchor is found, the cell has no structure. That's still deterministic.
- **Generating a chunk:** find the cells whose largest possible bounding box could reach this chunk. For each, generate the layout from the structure's own seed (kept in a small LRU cache), then stamp in only the blocks inside this chunk.
- **Loot:** see [Generation Data Format: Loot Tables](Generation%20Data%20Format.md#loot-tables).
  - **Per-container tables** are seeded by position, `hash(seed, tableId, x, y, z)` of the container's origin block, so they don't depend on template order and work outside structures. The seed is stored when the container is placed, and the table is rolled lazily on first open.
  - **Loot groups** spread one roll over several containers in a structure. They are seeded by `hash(seed, structureInstance, groupId)`, ordered by position relative to the structure origin, and resolved when each chunk is stamped, from the cached layout.
- **Spawn:** the world type defines a spawn search (the same anchor types, searched around the origin) or a spawn structure.

# Features (pull model)

- Each feature type declares a maximum extent. A chunk checks candidate origins in its 3×3×3 neighbours (radius 16 or less) and writes only inside itself.
- Placement modifiers: count, rarity, attachment (floor / ceiling / wall / inside solid), biome filter, condition.
- Features read only the base terrain and exposure functions, never other features' output. Use priorities and exclusion checks against structure layouts where they interact.
- Caves, rivers and lakes are density nodes, not carvers.

# Stages

1. Parameters
2. Biomes (3D cells)
3. Terrain density (including noise caves and rivers)
4. Fluids
5. Exposure rules
6. Structures (pulled)
7. Features (pulled)
8. Decoration

Stages 1–5 are pure functions you can evaluate anywhere. Stages 6–8 use the pull model.

# Determinism

- Derive every seed by hashing; never keep a running RNG. For example, `noiseSeed = mix64(worldSeed, hash64("lotomation:temperature"))`. Each octave gets its own derived seed too. Use a 64-bit hash (FNV or xxHash) of the data ID rather than `String.hashCode`.
- Use `StrictMath` for transcendental functions. Basic floating-point arithmetic is strict in Java 17+, but `Math.*` functions may differ by up to one unit in the last place depending on the CPU.
- Never iterate a HashMap where order matters; sort by ID or registry index.
- Store a hash of the loaded worldgen data (mod list plus files) in the save, and warn on mismatch.
- Because generation is pure, chunks the player never changed don't need saving. They can be regenerated.

# Data Files

- `worldgen/noise/`: noise type (2D / 3D / ridged / cellular), frequency, octaves, persistence, salt
- `worldgen/density/`: density node trees
- `worldgen/parameters/`: named parameters, each pointing to a density function
- `worldgen/biome/`: parameter ranges, exposure rules, features per stage, decoration palette
- `worldgen/exposure_rules/`, `worldgen/fluids/`, `worldgen/feature/`, `worldgen/structure/`, `worldgen/structure_set/`, `loot/`
- `worldgen/world_type/`: the root density function, parameter list, biome list, fluids, structure sets, spawn rule

```
{id:"lotomation:overworld",
 density:"lotomation:overworld/terrain",
 parameters:[T;"lotomation:temperature","lotomation:precipitation","lotomation:erosion","lotomation:weirdness","lotomation:enclosure"],
 biomes:[T;"lotomation:plains","lotomation:forest","lotomation:sky_meadow","lotomation:deep_cavern"],
 fluids:"lotomation:overworld/fluids",
 structure_sets:[T;"lotomation:villages","lotomation:sky_temples"],
 spawn:{type:"floor", origin:[I;0,0,0], radius:4096}}

{id:"lotomation:overworld/terrain", type:"max", args:[N;
  {type:"ref", id:"lotomation:overworld/main_land"},
  {type:"mul", args:[N;
    {type:"y_mask", center:3000, half_height:600},
    {type:"ref", id:"lotomation:sky_islands"}]}]}

{id:"lotomation:plains",
 climate:{temperature:[F;0.53,0.85], precipitation:[F;0.0,0.3], weirdness:[F;0.0,0.3], enclosure:[F;0.0,0.4]},
 exposure:"lotomation:grassy",
 features:{ores:[T;"lotomation:copper_blob"], decoration:[T;"lotomation:tall_grass"]}}
```

# Issues in Current Code (Factory-Core `world.gen`, Random)

1. All five parameter maps use the same seed. Erosion and weirdness have the same scale (0.002) and octave count (6), so they are identical maps. Temperature and precipitation (0.001 with 4 and 5 octaves) are nearly identical. Height's first 6 octaves equal erosion. In addition, every octave in `RandomGen.generateSimplexNoise` reuses the same seed.
2. `pickBiomeBasedOnName`: `Arrays.hashCode(...) % size` can be negative, which throws an index-out-of-bounds error. Use `Math.floorMod` with a proper positional hash.
3. `generateChunk` uses `chunkCoordinateX + x`; it presumably means `chunkX * 16 + x`.
4. `OpenSimplex2S.fastFloor` casts to `int`, so the noise breaks once `frequency × coordinate` goes past about 2.1 billion. Switch it to `long`.
5. Biomes are stored as `byte`, which caps the count at 256. `WorldGenerator` keeps its registries in static maps; move them to a per-world instance built from the world type.

# Sky Light

Base rule: sky light is a directional light that follows the sun, and only geometry loaded into the scene blocks it. The problem is that a huge cave with no loaded rock above it looks like it's outdoors. Visual sky light and gameplay sky light need different rules.

## Visual (client)

- **Enclosure ambient.** The `enclosure` parameter (a smoothed, low-frequency terrain density) already says "deep inside rock". Use it to scale sky light and ambient light, blended across biome cells so the change is smooth. Biomes can also set their own sky light, ambient colour and fog in data, for example `sky_light: 0.0` for a cave biome. This doesn't need a negative-y rule, so an enclosed biome works at any height.
- **Distant shadow casters.** Low-detail meshes of far terrain, built from the coarse density grid, can cast sun shadows past the loaded area. If distant terrain gets rendered at a lower level of detail anyway (worth it at this scale), this comes almost free.
- **Ray-march the generator.** Interval bounds give a hierarchy of cells (16, 256, 4096, ... blocks) that are each certainly solid, certainly air, or mixed. A ray toward the sun can step through big cells cheaply and stop at the first certainly-solid one, without loading anything.

## Gameplay (server)

Solar panels, crop growth and mob spawning must not depend on what happens to be loaded. Otherwise unloading the chunks above a base would switch on solar power underground, and two players could see different results.

- **Bounded, deterministic check:** scan N blocks toward the sun (say 256). Use loaded or saved chunks where they exist, and the generator's interval bounds (or a coarse sampled density) for chunks that never generated. Then combine the result with `enclosure` / the biome's sky light value.
- **Saved chunks keep a small summary** (a fully-opaque flag or a coarse occupancy mask, stored in the region header), so the check works in player-modified areas without loading whole chunks.
- **Accepted limitation:** a hole dug more than N blocks above won't count. That's fine, and much better than results that depend on what's loaded.

# World Border

The world type's generation decides everything inside the world border. Outside it, in every direction, there is only empty air.

- **The border is data.** Each world type sets a box (min/max on each axis), which may be asymmetric. The engine enforces a hard maximum below the int limit.
- **Leave a safety margin.** The engine maximum stays well inside ±2³¹ (for example ±(2³¹ − 2²⁰)), so chunk, cell and feature-radius maths and neighbour lookups never overflow.
- **The engine enforces it, not the data.** The root density outside the border is forced to air. Interval bounds make every outside chunk trivially "all air", so it costs nothing and is never stored.
- **Structures and features that cross the border are clipped.** The pull model does this naturally, because chunks outside are never generated.
- **Sky light:** the gameplay check treats anything outside the border as air.
- **No building past the border.** Nothing can create blocks outside it: player placement, machines, pistons, fluid flow and structure stamping are all refused.
- **Travel is allowed, but deadly.** Players can move past the border on their own (walking, flying, falling). Teleports and commands can't send them there; a destination outside the border is rejected. Past a kill distance (border + K blocks, K set in data) the player is killed, like falling out of the bottom of the world in Minecraft but in every direction.
- **Other entities** (items, vehicles, projectiles, mobs) past the kill distance are removed.
- **This is what keeps coordinates safe.** Nothing ever exists beyond border + K. The engine's maximum border plus K plus the fastest possible movement per tick must still stay well inside the int limit.

# Open Questions

- How expensive is the `enclosure` parameter, and does it need its own coarse grid?
- 3D region files (`r.x.y.z.region`): how many chunks per side?
- Rendering and physics near ±2 billion: keep positions as int plus float offset (as `Position` already does) and render relative to the camera.
