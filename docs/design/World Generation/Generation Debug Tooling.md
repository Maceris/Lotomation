---
status: implemented
---

# Generation Debug Tooling

A plan for tools that let modders (and us) see what the world generation data does. Companion to [Generation Data Format](Generation%20Data%20Format.md) and [Cubic Chunk Generation](Cubic%20Chunk%20Generation.md).

**Core rule: the tools run the exact same generator code as the game.** There is never a second implementation of noise or density. A preview that disagrees with the game is worse than no preview.

# Layers

```
Factory-Core: worldgen + Debug API   (no graphics, used by everything below)
 ├─ CLI tools                        (render, check, test, benchmark, stats)
 ├─ Worldgen Lab                     (plugin loaded into Ikala-Asset-Editor)
 └─ In-game commands and overlays    (Factory-Client / Factory-Server)
```

# 1. Debug API (Factory-Core)

A small, headless API that the generator exposes so the tools don't reach into internals.

| Capability | Purpose |
| --- | --- |
| `load(worldType, dataDirs, seed)` → context + diagnostics | Loads a data set on its own, separate from a running game. Diagnostics give file, field and message for each problem |
| `slice(target, plane, origin, size, resolution, channel)` → float grid | Samples any noise, density node, parameter or file over a 2D slice. `target` can be an ID or a path to a node inside a file (`lotomation:overworld/terrain#args[1].arg`) |
| `trace(target, x, y, z)` → tree of (node, value, bounds) | The value of every node in a tree at one point: "why is this block solid?" |
| `bounds(target, box)` | Shows the min/max range each node reports for a region, to check the all-air/all-stone shortcut is working |
| `biomeAt(x, y, z)` → parameter values + ranked candidates with distances | "Why is this a desert?" |
| `generate(chunk, untilStage)` | A chunk generated only up to a given stage (terrain only, + block rules, + structures, ...) |
| `structures(area)` → starts, anchor attempts, rejection reasons | "Why is there no village here?" |
| Instrumentation | Time and sample count per node, interpolation reuse, how often chunks were skipped as all air or all stone |

# 2. CLI Tools

Cheap to build, useful from day one, and they run in CI.

- **`worldgen check <data dirs>`** checks a data pack for errors (unknown types, missing references, cycles, out-of-range values). Modders run it before publishing.
- **`worldgen render`** writes a PNG of any target / plane / area / colormap, for docs, bug reports and quick looks.
- **Determinism tests:**
  - Generate a fixed set of chunks, each a hash of its block and biome data, for a few seeds. Store a golden hash file per game version. Any change fails the test until the file is deliberately updated.
  - Run the same set single-threaded, multi-threaded and in shuffled order. All hashes must match.
  - Run it in CI on Windows and Linux, and on more than one JVM.
- **`worldgen bench`** reports chunks per second plus the cost of each node, with thresholds that catch performance regressions.
- **`worldgen stats`** samples a large area (say 100k × 100k, sparsely) and reports:
  - how much of the area each biome covers, and its typical patch size
  - ore counts per biome and depth
  - structure spacing and failed-anchor rates
  - air / solid / fluid ratios per height band

  This answers balance questions like "how rare is jungle?" or "does copper actually appear in cave biomes?"

# 3. Worldgen Lab (editor plugin)

A tool for writing and tuning data, with no game client needed. It ships to modders, since modding is a core pillar.

**It is a plugin loaded into the asset editor (Ikala-Asset-Editor), not a separate app.** The editor already has what the Lab needs: retained UI with YAML specs and hot reload, debug shapes for chunk grids and structure bounds, async texture loading for slice images, and the LOD debug views. A separate app would duplicate all of that. Modders get one tool for both assets and world generation.

The Lab also feeds rendering work: it is how generated sections reach the graphics tests (see the "World generation as a test source" section of the Ikala-Graphics Vulkan-Only Architecture doc).

## Main view: 2D slice

- **Plane:** XZ, XY or ZY, with a slider for the slice coordinate (so you can scrub through Y).
- **Zoom** from 1 pixel = 1 block out to 1 pixel = 64k blocks. Rendering is progressive: coarse first, then refined.
- **Colormaps:**
  - *diverging* for density, centred on 0: air one colour, solid another, with a contour line at 0 marking the solid boundary
  - *sequential* for parameters
  - *categorical* for biomes, rooms and cell IDs, with colours hashed from the ID so they stay stable
  - *solid / air / fluid* blocks
  - *bounds* view: certainly solid / certainly air / mixed, per chunk or per larger region. This shows how well the all-air/all-stone shortcut is working
- **Overlays:** chunk grid, structure cells, structure bounding boxes and anchor points, feature origins, aquifer cells, the world border.
- **Hover readout:** coordinates, the value and every channel, all parameter values, the biome and its runner-up, and the block-rule match ("rule 3: air_above ≤ 4 → dirt").
- **Click** pins a point and opens its full `trace`.

## Node tree panel

- Shows the selected density file as a tree. **Each node has a live thumbnail** of its own output on the current slice, so you can see where a composition goes wrong.
- Click a node to make it the main view's target.
- Each node shows its range, which axes it depends on, and its cost.

## Workflow

- **Hot reload:** watch the data folders; on save, re-check the files and re-render. Errors appear in a panel with file and field, and the last good version stays on screen.
- **Seed control**, plus bookmarks (saved positions, slices and targets).
- **A/B compare:** split view or difference highlight between two seeds, two data versions, or two nodes.
- **3D preview** of a small volume (up to about 256³), meshed by the real Ikala-Graphics section baker rather than a preview-only mesher. Needed for judging overhangs, caves, tendrils and floating islands, which 2D slices don't show well.
- **Export** to PNG, and as a list of chunk positions to paste into tests.
- **Section corpus export:** writes generated sections (block palette, rotations, named edit scripts) to `.ika` files under a factory-owned section tag. Graphics benchmarks and the LOD prototype load the corpus without running the generator; regenerate it on purpose when the data changes.

# 4. In-Game

For checking things in context, inside the real world.

**Commands** (development / cheat permission):

- `/worldgen sample <target>`: value and trace at the player's feet
- `/worldgen biome`: parameters and ranked candidates where the player is standing
- `/worldgen locate biome|structure <id>`: deterministic search out from the player, within the world border
- `/worldgen reload`: reload data, then regenerate unmodified chunks (dev worlds only)
- `/worldgen regen <radius>`: dev worlds only

**Debug overlay:** parameter values, biome, enclosure, the sky light inputs (enclosure, biome sky light, the gameplay sun check), chunk generation timings, and the generation stage of nearby chunks.

**World overlays:** 3D chunk borders, structure boxes and cell grid, feature origins, aquifer cells, the world border and kill distance.

# Phases

1. **Debug API, plus `check`, `render` and the determinism tests.** These can start against the current code; the determinism tests should be in place before the refactor so it can be checked against them.
2. **Worldgen Lab plugin, 2D:** slice view, hover readout, hot reload, node tree with thumbnails.
3. **`stats` and `bench`.**
4. **In-game commands and overlays,** once the client can show chunks.
5. **Lab extras:** 3D preview, A/B compare, bounds view.

# Open Questions

- Is a golden hash file per version enough, or should save files record which generation hashes they were created with?
