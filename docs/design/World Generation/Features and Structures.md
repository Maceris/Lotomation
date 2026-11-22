---
status: decided
---

# Features and Structures

Everything world generation places on top of the shaped terrain: single plants, trees, villages, cities and the roads between them, and the final pass that adds snow. Companion to [Cubic Chunk Generation](Cubic%20Chunk%20Generation.md), whose principles still hold: every chunk generates on its own, in any order and on any thread, and never reads blocks another chunk generated. Data formats are in [Generation Data Format](Generation%20Data%20Format.md).

# Goals

- **Any size.** A grass tuft, a 40 m tree, a 2 km city and a highway between cities 10 km apart all work, and any of them can cut across chunk borders wherever they happen to fall.
- **Natural-looking.** Forests are spaced like real forests, not on a grid; structures fit the ground they stand on.
- **Pure.** What generates at a position depends only on the seed, the data and the position. Chunks never wait for each other, and a chunk nobody changed can always be generated again.

# Instances Over Cells

One mechanism places everything bigger than a block.

1. **Candidates come from cells.** Each placement layer divides space into cells of its own size: a few meters for bushes, tens of meters for trees, kilometers for city sites. A cell's candidates come from `hash(seed, layer, cell)`, so any thread can work them out for any cell without generating anything.
2. **A candidate becomes an instance** once it finds an anchor (floor, ceiling, wall, inside solid, open air) by evaluating the terrain functions at a few points, and passes its conditions. An instance is an id, an origin, a seed and a bounding box.
3. **The layout is computed lazily and cached.** An instance's layout is what it builds: its blocks, sorted by chunk, and its terrain edits (see [Terrain Edits](#terrain-edits)). It is computed the first time a chunk needs it and kept in a cache shared by the generator's threads, so every later chunk it touches costs only a lookup.
4. **A chunk stamps its own part.** It finds every instance whose bounding box reaches it and writes only its own share of each layout.

Each layer declares a maximum extent, which decides how many neighboring cells a chunk checks. Candidates are cheap, so large extents are fine; layouts are the expensive part, and each is made once.

**Big layouts expand in levels.** A layout can be a tree of parts, each with its own bounding box: a city's plan holds districts, a district holds blocks and plots, a plot holds a building. A part is expanded only when a chunk it reaches is generated, so a 2 km city costs little until someone is inside it.

**Single blocks** are the smallest case: the cell is one block and the layout is the block itself, so nothing is cached. See [Small Features](#small-features).

# Layers

Layers run in a fixed order. Each one sees the terrain as edited by the layers above it, and avoids their footprints.

1. **Networks:** settlement sites, cities, and the roads and highways between them.
2. **Structures:** villages, ruins, towers.
3. **Large features:** trees, boulders, spikes.
4. **Small features:** plants and other single blocks.
5. **Final pass:** snow and ice, on the chunk's finished blocks.

## Footprints

A layer never reads another layer's blocks, but it can ask about the instances of the layers above it, since those are pure too. Each instance has a **footprint**: a coarse mask of where it stands, much cheaper than its blocks. A tree candidate whose trunk falls in a village's footprint is dropped, so no oak grows through a house. A footprint part can say it keeps the ground clear (roads, floors, the ground under a trunk), and small features skip those parts.

## Terrain Edits

Structures and roads change the ground: foundations, carving, flattening, paving, road cuttings and embankments. They do it with **edit volumes** in their layouts (boxes, terraces, prisms along a road), not by writing blocks over terrain. Each layer sees the base terrain plus every edit from the layers above it that covers the point. That is still a pure function, so a tree grows on the new slope of a road cutting rather than floating over it, and tufts grow on a village's new embankment.

# Small Features

Single blocks, such as grass tufts and flowers, use the `each_floor` placement: every air cell with solid ground under it (as the edited terrain and block rules say) rolls once against a chance, by `hash(seed, feature, x, y, z)`. That gives the same density on every surface, including cave floors, cliff ledges and floating islands, at any height and whatever the chunk borders. A noise condition makes patches and meadows.

The chunk already knows which cells are solid, one block past its own edges included, so this costs no extra terrain work. It only fits features that stay inside their own cell; anything taller or wider is an instance.

# Forests

- **Spacing without a grid.** Each cell holds a few candidates, and one survives only if no stronger candidate (by hash) is within its spacing distance. Only neighboring cells' candidates are needed, so every chunk agrees. This gives the even-but-random spacing of a real forest.
- **Density varies** with noise or parameters: dense groves, glades, scattered trees at a forest's edge.
- **Species are data.** A species names a shape type from code (for example `broadleaf`, grown by space colonization, `conifer` or `palm`) and ranges for its parameters: height, trunk taper, branch angles, crown shape, leaf density, roots. Each tree draws its values from those ranges, seeded by its id and location, so no two oaks match.
- **Spacing comes from the species**, such as trunk distance and crown radius. Trunks keep apart; crowns may overlap, as they do in real forests. Trees have no size limit beyond their layer's extent.
- **Composite layouts:** a tree's own layout can hold what grows on or under it, such as vines, roots and undergrowth, since nothing can react to another feature's blocks.

# Structures

- **Anchor terrain requirements:** a slope range, how flat the footprint must be, and a minimum and maximum height span. A mountainside village requires steep ground and won't generate on flat land; a farmstead requires flat ground.
- **Adaptation within a budget.** The candidate samples the terrain over its footprint and works out how much it must cut and fill, and how deep its foundations go. Over the budget, the candidate is rejected, which is still deterministic. Under it, the edits go into its layout: foundations down to solid ground, clearance carved above, paving and terraces.
- **Pieces adapt one by one,** so a village steps down a hill in terraces instead of sitting on one slab.
- Placement over cells, loot and templates stay as in [Generation Data Format](Generation%20Data%20Format.md#structures).

# Networks

For huge cities and long roads or highways between them. Everything is coarse first and refined only near the chunks that need it.

- **Sites:** settlement candidates on a very coarse grid (say 2 to 4 km cells), scored from coarse samples of the terrain and parameters and thinned by spacing like forests. A site's score and size decide between a city, a town or nothing.
- **The road graph** follows a local rule, such as a relative neighborhood graph limited to a maximum road length: whether two sites connect depends only on the sites near them. A chunk finds every road that might cross it by listing the sites within that length.
- **Routes:** each road gets a coarse path search along a corridor (about 32 m steps), costed by slope, water, and how much it must cut and fill. Routes are cached per road. Near a chunk, a route is refined into a spline with a smoothed gradient and its earthworks. Past a cut or fill threshold, it becomes a bridge or a tunnel.
- **Cities expand in levels:** the city plan (outline, main roads, districts, the gates highways arrive at) is cached, and districts, plots and buildings expand only when a chunk reaches them.
- **Lower tiers** use the same machinery: village lanes join the nearest road, and paths run between villages.

# Final Pass: Snow and Ice

Runs after every layer has stamped the chunk, so it knows the chunk's finished blocks, leaves and roofs included.

- **Where snow lies:** on the top of a solid block or leaves where it is cold enough and open to the sky. It goes in the cell above as a snow fill (see [Snow](../Simulation/Snow.md)), up to the natural depth.
- **Cold enough** is a climate condition, mostly the `temperature` parameter. Snowlines on mountains come from data, by folding height into temperature with a `y_gradient`.
- **Open to the sky** (`sky_open`) is the bounded, deterministic check from [Sky Light](Cubic%20Chunk%20Generation.md#sky-light), scanning straight up: the chunk's own blocks, then the edited terrain through the generator's interval bounds, plus the cached layouts covering that column, so a canopy 20 blocks up shelters the ground. Combined with `enclosure`, so a huge cave doesn't count as sky. Block rules can use the same condition.
- **Water** open to the sky in the cold freezes to ice. Grass under snow can become a snowy variant through block rules.
- The rules are cover rules in data, in the style of block rules, per biome or world type.

# Order of Work

1. **Instances and layouts:** the instance, layout cache and footprint machinery, with procedural trees as the first user.
2. **The final pass:** snow and ice with `sky_open`, once the fill channel exists.
3. **Terrain edits and adapting structures,** with a village as the first user.
4. **Networks:** sites, roads and cities that expand in levels.
5. **Worldgen Lab:** show instances, footprints and edits, with a switch for each layer and placed feature, as each step lands.

# Open Questions

- **The layout cache:** its size and what it evicts, since cities are big even when they expand lazily.
- **Saving layouts:** should costly results, such as road routes, be saved with the world instead of computed again?
- **Chunks players changed:** a road planned through chunks a player already built in still generates in the chunks around them, so it may end at the player's chunks.
- **Stages within a layer:** whether features need named stages (such as `ground`, `vegetation`, `decoration`) besides priority.
- **Taller single plants:** two-block grass needs `each_floor` to see the top of the chunk below, a thin slab of extra terrain work.
- **Branches thinner than a block** may want their own models; logs need an axis block state.
