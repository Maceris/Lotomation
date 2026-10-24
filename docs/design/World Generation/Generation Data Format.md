---
status: implemented
---

# Generation Data Format

The data files that drive world generation: what each kind can do and how it is laid out. Companion to [Cubic Chunk Generation](Cubic%20Chunk%20Generation.md).

Guiding rule: **the types are fixed in code, the configurations are data.** Every object has a `type` field naming a type that code registers: a noise primitive, a density node, a feature type, and so on. Data can only configure and combine those types. Mods that include code can register new types.

# File Conventions

- Files are KVT string format, with one object per file.
- **The ID comes from the path.** `mods/<mod>/worldgen/<kind>/<path>.kvt` gets the ID `<mod>:<path>`. For example, `mods/lotomation/worldgen/density/overworld/terrain.kvt` → `lotomation:overworld/terrain`.
- **Wherever a value of some kind is expected, it can be given three ways:**
  - a string ID referring to another file of that kind
  - an inline object `{type:...}`
  - for density only, a bare number, which is shorthand for a constant
- **KVT arrays are typed**, so lists of objects are `[N;...]` and lists of IDs are `[T;...]`. Inside an `[N;...]` list, a reference has to be written `{type:"ref", id:"..."}`.
- A `#` prefix in an ID list means a tag, for example `"#lotomation:overworld_biomes"`.
- **Checks when data loads:** unknown types, missing references, reference cycles (including parameter ↔ density cycles), arguments out of range, and a maximum tree depth. Any failure rejects the file with a message naming the file and the field.

## Mod merging

- **Same ID replaces.** The later mod wins, and the mod load order is fixed and saved with the world.
- **Most extension is additive, with no patching.** Placed features and structure sets say *which biomes* they appear in (`biomes:"#lotomation:has_copper"`), so a mod can add ores to an existing biome by adding one file. Biomes don't have to list everything.
- **Patch files for the rest:** `<id>.patch.kvt` with `add` / `remove` / `set` operations on lists and fields, for example to add a biome to an existing world type.

# Directory Layout

| Folder                     | Kind                              | Code-defined types                                           |
| -------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `worldgen/noise/`          | Noise sources                     | `simplex`, `cellular`, `subdivision`, `wave`, `white`        |
| `worldgen/density/`        | Scalar fields `f(x,y,z) → double` | the node catalogue below                                     |
| `worldgen/parameter/`      | Biome selection inputs            | one type (wraps a density)                                   |
| `worldgen/biome/`          | Biomes                            | one type                                                     |
| `worldgen/terrain_style/`  | Terrain shape + where it applies  | `shape`, `overlay`                                           |
| `worldgen/block_rules/`    | Which block goes where            | rule and condition types                                     |
| `worldgen/fluids/`         | Fluid filling                     | `none`, `level`, `aquifer`                                   |
| `worldgen/feature/`        | Small placed things               | `blob`, `vein`, `column`, `scatter`, `template`, `tree`, ... |
| `worldgen/placed_feature/` | Feature + where/how often         | placement modifiers                                          |
| `worldgen/structure/`      | Large placed things               | `template`, `jigsaw`                                         |
| `worldgen/structure_set/`  | Structure grid placement          | one type                                                     |
| `worldgen/template/`       | Saved block arrangements          | none (raw data)                                              |
| `worldgen/loot/`           | Container contents                | pool / entry types                                           |
| `worldgen/world_type/`     | Ties it all together              | one type                                                     |

# Noise Sources

A noise file defines a deterministic field together with its fractal settings. Every noise outputs a value in **[-1, 1]**; ranges that are symmetric around 0 make thresholds natural. Cellular and subdivision noise output several *channels*.

Common fields:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `type` | string | required | which primitive |
| `dimensions` | int | 3 | 2 = ignores y (cached per column automatically), 3 = full |
| `wavelength` | double or `[D;x,y,z]` | 64 | feature size in blocks, per axis if needed. More intuitive than frequency |
| `salt` | string | the file's ID | seed = `mix64(worldSeed, hash64(salt))` |
| `fractal` | node | none | see below |

Two references to the same noise ID give **the same field**, which is deliberate sharing. To get an independent copy, override the salt where it is used: `{type:"noise", noise:"x", salt:"x_copy"}`.

## Fractal

```
fractal:{mode:"fbm", octaves:6, lacunarity:2.0, gain:0.5}
```

- **`fbm`**: the normal sum of octaves. Gives rolling hills and climate.
- **`ridged`**: `1 − |n|` per octave, with each octave weighted by the one before it. Gives sharp ridgelines and mountains.
- **`billow`**: `|n|` per octave, rescaled. Gives puffy clouds and dunes.
- Each octave gets its own seed (`noiseSeed + octaveIndex`, mixed). The total is normalised back into [-1, 1].

## Primitives

| Type          | What it looks like                                  | Extra fields                                                                                                        | Channels                                                                                                                                                             |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simplex`     | Smooth blobs (OpenSimplex2S)                        | —                                                                                                                   | `value`                                                                                                                                                              |
| `cellular`    | Voronoi cells                                       | `metric`: `euclidean` (round cells) / `manhattan` (diamonds) / `chebyshev` (cubes); `jitter` 0–1 (0 = perfect grid) | `f1` distance to nearest point, `f2` second nearest, `edge` = f2 − f1 (0 at cell walls), `cell` = random value per cell                                              |
| `subdivision` | Recursive box splitting: rooms of varying sizes     | `root_size [I;x,y,z]`, `min_size [I;x,y,z]`, `split_chance`, `axis_weights [D;x,y,z]`                               | `wall` distance to the nearest room face (0 at the face), `floor` / `ceiling` distance below and above, `room` random value per room, `size` room volume, normalised |
| `wave`        | Periodic bands                                      | `shape`: `sine` / `triangle` / `saw` / `square`; `direction [D;x,y,z]`; `phase`                                     | `value`                                                                                                                                                              |
| `white`       | An independent random value per cell (no smoothing) | `cell [I;x,y,z]`, default 1×1×1                                                                                     | `value`                                                                                                                                                              |

How the primitives serve the target cases:

- **Tendrils and spaghetti caves:** two `simplex` fields, combined in density (see the recipes below).
- **Cube-ish endless libraries:** `cellular` with `chebyshev` and `jitter:0`, or `subdivision` for rooms of mixed sizes. The `wall` and `floor` channels mark where shelves, floors and doorways go.
- **Building interiors:** `subdivision`, where `room` picks each room's style and `size` separates halls from closets.
- **Waves, terraces, strata:** `wave`, or a `quantize` transform.
- **Mountains:** `simplex` with `fractal:{mode:"ridged"}`.
- **Speckle and scatter:** `white`.

# Density Functions

A density function is a tree of nodes computing a scalar for any (x, y, z). The terrain uses `> 0 = solid`, but the same machinery feeds parameters, block-rule conditions, fluid levels and feature conditions.

**Every node type must provide two things:**

- `value(x, y, z)`
- `bounds(box) → [min, max]`, for whole-chunk early-outs. Standard interval arithmetic covers this.

On top of that, every node knows which axes it depends on (worked out automatically), so subtrees that only use x and z are cached per column.

## Node catalogue

### Sources

| Node | Fields | Output |
| --- | --- | --- |
| `constant` | `value` | the value (or write a bare number) |
| `noise` | `noise` (ID or inline), `channel`, optional `salt`, `wavelength` override | noise value |
| `axis` | `axis`: `x` / `y` / `z` | the raw coordinate |
| `parameter` | `id` | the value of a named parameter |
| `ref` | `id` | another density file |

### Arithmetic

| Node | Fields |
| --- | --- |
| `add`, `mul`, `min`, `max` | `args [N;...]` |
| `neg`, `abs`, `square`, `cube` | `arg` |
| `clamp` | `arg`, `min`, `max` |
| `remap` | `arg`, `from [D;a,b]`, `to [D;c,d]`. Linear, not clamped |
| `spline` | `arg`, `points [N;{x,y}...]`, `interp`: `linear` / `cubic`. Shaping curves, like the old height curve |
| `lerp` | `t`, `a`, `b` |
| `smooth_min`, `smooth_max` | `args`, `k`. Blends shapes together without creases |
| `step` | `arg`, `threshold`, `below`, `above` |
| `range_mask` | `arg`, `min`, `max`, `falloff`. 1 inside the range, easing to 0 outside |

There's no general division or `pow`: they make bounds hard to compute and can blow up. `square` / `cube` / `spline` cover the useful cases.

### Coordinate transforms

These change where the child is evaluated, not its value.

| Node | Fields | Use |
| --- | --- | --- |
| `translate` | `arg`, `offset [D;x,y,z]` | move a pattern |
| `scale` | `arg`, `factor [D;x,y,z]` | stretch: flatten caves, tall mountains |
| `rotate` | `arg`, `axis`, `degrees` | break up grid alignment. The trig is done once, at load time |
| `warp` | `arg`, `by [N;dx,dy,dz]`, `amplitude` | domain warp, for organic swirls and twisted tendrils |
| `repeat` | `arg`, `period [I;x,y,z]` (0 = no repeat on that axis) | endless tiling: library floors, pillar halls |
| `mirror` | `arg`, `axes` | symmetry |
| `quantize` | `arg`, `step [I;x,y,z]` | blocky or terraced results |

### Shapes

Signed-distance style. The convention is **positive inside**, so a shape can be used as terrain directly.

| Node | Fields |
| --- | --- |
| `sphere` | `center`, `radius` |
| `box` | `center`, `half_size [D;x,y,z]`, `rounding` |
| `cylinder` | `center`, `axis`, `radius`, `half_height` |
| `plane` | `normal`, `offset` (positive on one side) |

### Sampling

| Node | Fields | Use |
| --- | --- | --- |
| `interpolated` | `arg`, `cell [I;x,y,z]` | evaluate `arg` on a coarse grid and interpolate. Works both as the speed-up and as smoothing |
| `blur` | `arg`, `radius` | a large-scale average, built on `interpolated` with a coarse cell. This is how `enclosure` gets made |

## Operations

- **Union** (add solid): `max(a, b)`
- **Carve** (subtract): `min(terrain, carver)`, where `carver` is positive except inside the hole
- **Intersect**: `min(a, b)`
- **Blend**: `smooth_max` / `smooth_min`, or `lerp` driven by a parameter

## Recipes

Plain overworld, where the surface comes entirely from the data:

```
{type:"add", args:[N;
  {type:"spline", arg:{type:"parameter", id:"lotomation:continentalness"},
   points:[N;{x:-1.0,y:-200.0},{x:0.0,y:0.0},{x:0.6,y:80.0},{x:1.0,y:600.0}]},
  {type:"neg", arg:{type:"axis", axis:"y"}},
  {type:"mul", args:[N;{type:"noise", noise:"lotomation:overhangs"}, 24.0]}]}
```

Spaghetti caves and tendrils, where two noise fields are both near zero:

```
// tunnel field: negative inside a thin tube
{id:"lotomation:caves/spaghetti", type:"add", args:[N;
  {type:"max", args:[N;
    {type:"abs", arg:{type:"noise", noise:"lotomation:spaghetti_a"}},
    {type:"abs", arg:{type:"noise", noise:"lotomation:spaghetti_b"}}]},
  -0.05]}

// carve tunnels out of terrain
{type:"min", args:[N;{type:"ref", id:"lotomation:overworld/base"}, {type:"ref", id:"lotomation:caves/spaghetti"}]}

// solid tendrils floating in air: negate the same field and union it
{type:"max", args:[N;{type:"ref", id:"lotomation:void"}, {type:"neg", arg:{type:"ref", id:"lotomation:caves/spaghetti"}}]}
```

Endless library: cube rooms 16×8×16 with walls and floors 1 block thick:

```
{id:"lotomation:library/structure", type:"max", args:[N;
  // walls: 1 block thick at each cell boundary
  {type:"step", arg:{type:"noise", noise:"lotomation:library_cells", channel:"wall"}, threshold:1.0, below:1.0, above:-1.0},
  // floors every 8 blocks
  {type:"step", arg:{type:"noise", noise:"lotomation:library_cells", channel:"floor"}, threshold:1.0, below:1.0, above:-1.0}]}
// lotomation:library_cells = {type:"subdivision", root_size:[I;64,32,64], min_size:[I;8,8,8], ...}
// doorways: min() with box carvers placed by a `white` noise per room
// block rules then choose bookshelf vs planks with a density condition on the `wall` channel
```

Rolling waves in terrain: a `wave` added to the surface spline, run through `warp` so the crests aren't straight lines.

Mountains: `ridged` simplex, multiplied by `spline(erosion)`, so they only rise where erosion is low.

Terraces: `quantize` with step `[I;1,6,1]` around the height term, or a staircase-shaped `spline`.

# Parameters

```
{density:"lotomation:climate/temperature_field", display_range:[D;-1.0,1.0]}
```

A named density function used to select biomes. A world type lists which parameters it uses, and biomes give ranges in the same units, which are the density output, usually [-1, 1]. `display_range` is only for debug views.

# Terrain Styles

The design is in [Cubic Chunk Generation: Terrain Styles](Cubic%20Chunk%20Generation.md#terrain-styles). A terrain style is one region's terrain shape plus where it applies, in its own file under `worldgen/terrain_style/`.

```
// worldgen/terrain_style/mountains.kvt
{kind:"shape",
 weight:{type:"range_mask", arg:{type:"parameter", id:"lotomation:erosion"}, min:-1.0, max:-0.3, falloff:0.2},
 density:{type:"add", args:[N;
   {type:"mul", args:[N;
     {type:"noise", noise:"lotomation:mountains/ridged"},
     {type:"spline", arg:{type:"parameter", id:"lotomation:erosion"},
      points:[N;{x:-1.0,y:1800.0},{x:-0.3,y:200.0}]}]},
   {type:"neg", arg:{type:"axis", axis:"y"}}]},
 tags:[T;"lotomation:overworld_styles"]}

// worldgen/terrain_style/chasms.kvt
{kind:"overlay", op:"carve", priority:100,
 weight:{type:"range_mask", arg:{type:"noise", noise:"lotomation:chasms/region"}, min:0.6, max:1.0, falloff:0.1},
 density:"lotomation:chasms/slot",
 interpolation:[I;1,8,1],
 tags:[T;"lotomation:overworld_styles"]}

// worldgen/terrain_style/floating_islands.kvt
{kind:"overlay", op:"union", priority:50,
 weight:{type:"range_mask", arg:{type:"noise", noise:"lotomation:islands/region"}, min:0.7, max:1.0, falloff:0.15},
 density:{type:"mul", args:[N;
   {type:"range_mask", arg:{type:"axis", axis:"y"}, min:250.0, max:550.0, falloff:50.0},
   {type:"noise", noise:"lotomation:islands/shape"}]},
 tags:[T;"lotomation:overworld_styles"]}
```

| Field           | Applies to | Meaning                                                                                                                        |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `kind`          | all        | `shape` (part of the weighted average that makes the base surface) or `overlay` (applied on top of it)                          |
| `weight`        | all        | A density, clamped to 0..1: how strongly the style applies. May use parameters and noise, never anything that reads terrain     |
| `density`       | all        | The style's terrain, `> 0` = solid, like any density                                                                            |
| `op`            | overlay    | `union` (adds solid, like islands) or `carve` (removes it, like chasms)                                                         |
| `priority`      | overlay    | Overlays apply from low to high priority; ties are broken by ID                                                                 |
| `interpolation` | overlay    | Optional sampling cell for this style's `density`. Such overlays apply after the others, at every block, so finer cells keep thin shapes sharp |
| `tags`          | all        | Accepted but not used yet: world types list styles by ID until tags are supported                                               |

How the engine combines them, with `w` the clamped weight and `s` the style's density:

- **Shapes**: `base = (sum(w * s) + max(0, 1 - sum(w)) * f) / max(1, sum(w))`, where `f` is the world type's `fallback_style`. So where the shape weights add up to less than 1, the fallback fills the rest. Bounds are the lowest and highest bounds of the shapes (and fallback) that can contribute.
- **Union overlay**: `terrain = max(terrain, lerp(w, -M, s))`. At weight 0 the overlay is `-M`, which never wins a `max`.
- **Carve overlay**: `terrain = min(terrain, lerp(w, M, s))`, the same idea for holes.
- `M` is the world type's `style_fade` (for example 64): how far out of range a faded-out overlay sits. A larger value fades it more sharply at the edge of its weight.
- A style whose weight is 0 at a point has no effect there. Overlays with their own `interpolation` are skipped in any chunk where their weight bounds are `[0, 0]`.
- Errors when data loads: a `kind` other than `shape` / `overlay`, an `op` other than `union` / `carve`, `op` / `priority` / `interpolation` on a shape, a fallback that is an overlay, and a weight that reads terrain (any listed style's density, the fallback's, or the world type's `density`).

**Parameters from styles.** Every style's weight is also readable as the parameter `style:<id>`, both in density (`{type:"parameter", id:"style:lotomation:chasms"}`) and in biome climate ranges:

```
// worldgen/biome/sky_meadow.kvt
{climate:{"style:lotomation:floating_islands":[D;0.5,1.0], temperature:[D;0.0,0.6]},
 block_rules:"lotomation:grassy",
 tags:[T;"lotomation:overworld_biomes"]}
```

The quotes around the key are needed because it contains a `:` (see [KVT](../User%20Data/KVT.md)). The weight is clamped to 0..1, and a world type only adds a `style:` parameter when one of its biomes names it.

# Biomes

```
{climate:{temperature:[D;0.1,0.7], precipitation:[D;-1.0,-0.4], enclosure:[D;-1.0,-0.2]},
 weight:1.0,
 block_rules:"lotomation:grassy",
 visual:{sky_light:1.0, ambient:[F;1.0,1.0,1.0], fog:"lotomation:clear"},
 tags:[T;"lotomation:overworld_biomes","lotomation:has_copper"]}
```

- `climate`: a range per parameter name. Parameters the biome leaves out match anything.
- Selection uses the existing nearest-midpoint algorithm. `weight` breaks ties and lets rare biomes be rare.
- No features are listed here: placed features choose biomes by tag.

# Block Rules

An ordered list where the first match wins. Nested lists act as groups. Any rule without a match falls through to the world type's default block.

```
{rules:[N;
  {if:{type:"air_above", max:1}, then:{block:"lotomation:grass"}},
  {if:{type:"air_above", max:4}, then:{block:"lotomation:dirt"}},
  {if:{type:"air_below", max:1}, then:{block:"lotomation:moss"}},
  {if:{type:"density", id:"lotomation:strata/basalt", min:0.0}, then:{block:"lotomation:basalt"}},
  {then:{block:"lotomation:stone"}}]}
```

Condition types:

| Condition | Fields |
| --- | --- |
| `air_above`, `air_below` | `min`, `max`. Measured in blocks, capped at 16 |
| `steepness` | `min`, `max` |
| `biome` | `ids [T;...]` (tags allowed) |
| `density` | `id` or inline, `min`, `max`. The general escape hatch: any density field can drive block choice |
| `fluid` | `adjacent: true/false` |
| `all`, `any`, `not` | `of [N;...]` |

`then` can also be `{rules:"other_rule_file"}` to reuse rule sets.

# Fluids

- `{type:"none"}`
- `{type:"level", level:<density>, fluid:"lotomation:water"}`. Open space below the level fills. An ocean is `level: 0`.
- `{type:"aquifer", cell:[I;16,12,16], level:<density>, fluid_rules:[N;...]}`. Each cell picks its own level, and walls appear where neighbouring cells disagree.

# Features

A feature says what gets built. A placed feature says where and how often.

Feature types:

| Type | Fields |
| --- | --- |
| `blob` | `block`, `size` range, `replace` (block tag) |
| `vein` | `block`, `length`, `thickness`, `replace` |
| `column` | `block`, `height` range, `direction` (up / down), for spikes and stalactites |
| `scatter` | `blocks` (weighted), `count`, `radius`, for grass and flowers |
| `template` | `template`, `rotation`: `random` / `none` |
| `tree` | `trunk`, `leaves`, `shape` (fixed shape types), `height` range |

Every feature declares, or has derived, a `max_extent`, which can be at most 16 blocks.

```
// placed_feature
{feature:"lotomation:copper_blob",
 biomes:"#lotomation:has_copper",
 stage:"ores",
 placement:[N;
  {type:"count", value:8},
  {type:"in_chunk"},
  {type:"attach", to:"inside_solid"},
  {type:"condition", if:{type:"density", id:"lotomation:ore_zones/copper", min:0.2}}]}
```

Placement modifiers:

| Modifier | Fields |
| --- | --- |
| `count` | `value` or a range |
| `chance` | `p` |
| `in_chunk` | — (a random position in the chunk) |
| `attach` | `to`: `floor` / `ceiling` / `wall` / `inside_solid` / `in_air`, `search` (max blocks to scan) |
| `axis_range` | `axis`, `min`, `max` |
| `condition` | any block-rule condition |

Stages, in order: `ores`, `vegetation`, `decoration`. Within a stage the order is by priority, then by ID.

# Structures

```
// structure
{type:"jigsaw", start_pool:"lotomation:village/centers", max_depth:6, max_extent:[I;128,48,128],
 anchor:{type:"floor", min_air:8, flatness:{samples:9, max_delta:3}},
 adapt:"foundation"}

// structure_set
{structures:[N;{id:"lotomation:village", weight:3},{id:"lotomation:ruin", weight:1}],
 spacing:[I;512,0,512], separation:[I;128,0,128], salt:"lotomation:villages",
 biomes:"#lotomation:village_biomes",
 y_range:[I;-2000,4000]}
```

- `spacing` 0 on an axis means one cell spans the whole world on that axis.
- **Anchor types:** `floor`, `ceiling`, `cave`, `enclosed`, `open_air`, `fixed`.
- **Terrain adaptation** (`adapt`): `none`, `bury`, `foundation` (fill below down to solid), `carve` (clear air around).
- **Templates:** plain KVT like every other worldgen file, so they stay human readable and can be edited and extended by hand. A template is a palette plus block data and per-block KVT. A container references a loot table instead of fixed contents.

# Loot Tables

```
{pools:[N;
  {rolls:[I;2,5], entries:[N;
    {item:"lotomation:copper_ingot", count:[I;1,4], weight:10},
    {item:"lotomation:gear", weight:2}]}]}
```

A container gets loot in two ways, and may use both.

## Per-container tables

The container's per-block KVT names a table: `{loot:"lotomation:village/house"}`. This works the same for containers placed by structures, by `template` features, or anywhere else.

- **Seed:** `hash(worldSeed, tableId, x, y, z)`, using the container's world position. A multi-block container (a double chest, a large crate) uses its origin block, so it rolls once. Including `tableId` keeps several tables on one container independent (a furnace with a fuel table and an output table).
- **Why position, not an index:** an index into the template or jigsaw depends on the order blocks are listed in. Editing a template by hand, or a mod patching a jigsaw pool, would renumber the containers and reshuffle every chest.
- **Store the seed when the container is placed,** with the table ID, in the block's data. The roll happens lazily, when the container is first opened. Storing the seed means a container moved before it is opened (by a piston, a frame mover, or a player picking it up) still rolls the same loot.

## Loot groups (shared rolls)

For loot that a structure deliberately spreads over several containers: "exactly one map somewhere in the village", or "this much iron, split between the smithy's chests and furnaces".

```
// in the structure file
loot_groups:[N;
  {id:"map", table:"lotomation:village/map"},
  {id:"smithy_iron", table:"lotomation:village/smithy_iron"}]

// in a template's per-block KVT: join a group, optionally with a table of its own as well
{loot_group:"smithy_iron", loot:"lotomation:village/furnace_fuel"}
```

- **Seed:** `hash(worldSeed, structureInstance, groupId)`. `structureInstance` is the structure cell hash, so it is stable.
- **One roll, then distribute.** The group's table is rolled once, and each resulting stack goes to a member container picked with the group's RNG. A stack that doesn't fit goes to the next member with room, and is dropped if every member is full.
- **Members are ordered by position relative to the structure origin** (by y, then z, then x), never by template order, so editing a template doesn't reshuffle the loot.
- **Resolved at stamp time.** Every chunk the structure touches regenerates the same layout from the cache, computes the whole distribution, and writes only its own containers' shares into them as fixed contents. No chunk depends on another having generated first.

# World Type

```
{border:{min:[I;-30000000,-30000000,-30000000], max:[I;30000000,30000000,30000000], kill_distance:1024},
 density:"lotomation:overworld/terrain",
 interpolation:[I;4,8,4],
 default_block:"lotomation:stone",
 parameters:[T;"lotomation:temperature","lotomation:precipitation","lotomation:continentalness","lotomation:erosion","lotomation:weirdness","lotomation:enclosure"],
 biomes:"#lotomation:overworld_biomes",
 fallback_biome:"lotomation:plains",
 styles:[T;"lotomation:plains","lotomation:mountains","lotomation:chasms","lotomation:floating_islands"],
 fallback_style:"lotomation:plains",
 style_fade:64.0,
 fluids:"lotomation:overworld/fluids",
 structure_sets:"#lotomation:overworld_structures",
 spawn:{anchor:{type:"floor", min_air:3}, origin:[I;0,0,0], radius:4096}}
```

With [terrain styles](#terrain-styles), `styles` lists them by ID (by tag once tags are supported), `fallback_style` fills in where the shape weights add up to less than 1, and `style_fade` (default 64) sets how far out of range a faded-out overlay sits. `density` is the whole terrain for world types that list no styles, and is ignored, with a warning, when they do.

Debug tooling, including a viewer that renders any density, noise or parameter as a slice, is planned in [Generation Debug Tooling](Generation%20Debug%20Tooling.md): the Worldgen Lab is a plugin loaded into the asset editor, plus in-game commands and overlays.

# Open Questions

- Should `subdivision` support non-box room shapes later (L-shaped rooms, corridors)?
- Should mods be able to register new condition and placement types from data, or only from code?
- Terrain styles: should `style_fade` be per overlay instead of per world type?
