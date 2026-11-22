---
status: draft
---

# Block Looks

How blocks look: art direction, the files a block's look is made of, and how those files get made. Looks are client owned ([Mods: Rules and Looks](../User%20Data/Mods.md#rules-and-looks)) and can be replaced by [resource packs](../User%20Data/Resource%20Packs.md). Companion to [Starting a Game](../Simulation/Starting%20a%20Game.md).

**Core rule: everything sits on a 1/16 m grid.** A block face is 16x16 pixels of pixel art, and anything that isn't a plain cube is a mesh whose vertices sit on 1/16 m steps and whose textures keep the same 16 pixels per meter. Rare, deliberate exceptions are allowed, such as a tasteful lamp.

# Art Direction

- Pixel art in the spirit of Minecraft (with something like the Decocraft mod for decoration), lit physically: closer in feel to Teardown or Shadows of Doubt than to Minecraft's flat light. The lighting stays physically based; see the renderer's sun, sky, shadows and fog.
- Standard block textures are 16x16 pixels per face.
- Pixels stay sharp up close: textures are sampled pixel-sharp (nearest) when magnified, with mipmaps for distance. Far LOD averages each material's color on its own.

# Files

Looks live in the namespaced asset layout ([Resource Packs](../User%20Data/Resource%20Packs.md#format)). The base game's are in Factory-Client's data folder, since only the client reads them:

```
plugins/Factory-Client/data/assets/lotomation/
  looks/block/<id>.kvt          what a block looks like: model, textures, surface values
  textures/block/<name>.png     16x16 base color, sRGB, alpha for cut-out or see-through pixels
  textures/block/<name>.normal.png     optional
  textures/block/<name>.orm.png        optional: occlusion, roughness, metallic
  textures/block/<name>.emissive.png   optional
  models/block/<name>.ika       a block's mesh, exported from the asset editor (see Models)
```

## Look Files

Text KVT, like the worldgen data. For example:

```
/* stone.kvt */  {model:"lotomation:block/cube", textures:{all:"lotomation:block/stone"}, roughness:0.9F}
/* grass.kvt */  {model:"lotomation:block/cube", textures:{top:"lotomation:block/grass_top", side:"lotomation:block/grass_side", bottom:"lotomation:block/dirt"}}
/* water.kvt */  {model:"fluid", textures:{all:"lotomation:block/water"}, roughness:0.05F}
/* oak_leaves.kvt */  {model:"lotomation:block/cube", textures:{all:"lotomation:block/oak_leaves"}, transparency:"cutout"}
```

- **Models:** a namespaced model name, a path under the namespace's `models` folder such as `lotomation:block/cube` (the default), or `fluid`, which the renderer's water system draws instead of a block mesh (see [Water](Water.md)); until that switch lands, a fluid is a see-through cube made in code. A model file that is missing or broken is logged and drawn as a cube.
- **Textures:** `all` sets every face; `top`, `bottom` and `side` override it. Names are namespaced paths under the namespace's `textures` folder, without the extension; with no namespace, `lotomation`.
- **Transparency:** `opaque` (the default), `cutout` for holes where alpha is low, like leaves, or `translucent` for see-through by alpha, like glass. Fluids default to `translucent`.

- **Surface values** (`roughness`, `metallic`, `emission`) apply to the whole block when there is no map for them. Roughness defaults to 0.85, the others to 0. Emission glows in the texture's own color. Most blocks need nothing more than a base color texture and these values.
- A block with no look file is drawn as a cube in a color picked from its name, so new blocks are never invisible.

## Maps That Are Hard to Paint

Base color is painted by hand. The other maps are hard to paint directly, so tools make them from things that are easy to paint:

- **Normals from height:** paint a grayscale 16x16 `<name>.height.png` (or start from the base color's brightness), and a tool turns it into `<name>.normal.png`. Touch up the height, not the normal.
- **Roughness and metallic from a mask:** paint `<name>.mask.png`, where each color stands for a surface named in the look file (for example rough stone, polished metal, glass), and a tool writes `<name>.orm.png`. Touch up the mask, not the ORM map.

# Models

Many blocks aren't cubes and aren't very voxel-like either: chests, lecterns, torches, desk lamps, tall grass, flowers, fence posts, ladders. They are ordinary meshes of vertices and indices with UVs into 16x16-pixel textures, so a model is free in shape but keeps the pixel grid:

- **Meshes are data, never code.** Every fixed shape, the plain cube included, is a model file, so adding a block shape never needs a code change. The one exception is a fluid's surface, whose shape follows its level.
- **Made in the asset editor.** Models are authored or imported in the asset editor and exported in the engine's own `.ika` format to `models/block/<name>.ika`; the game doesn't read source formats like OBJ or glTF. The file holds one mesh (a `MESH` section: vertices, triangles, bounds) and no materials, since the look file chooses those.
- **Sources** live in the repo under `art/models/block/`, as files the asset editor imports (OBJ for now). A block model fills its cell from 0 to 1 m; sources centered on their bottom, as Blockbench and Minecraft models are, are moved to the cell's corner on export.
- **Exporting:** open the source in the asset editor's workbench, and use the Export section (whole scene or the selected node, with "The file's origin is the middle of the bottom" for Blockbench-style sources). It reports the vertex and triangle counts, the bounds and any vertices off the 1/16 m grid. Scripts can do the same without the window: `converter.exportMesh(source, target, bottomCenter)`, to re-export every model in one go.
- Vertices sit on 1/16 m steps, and UVs map one texture pixel to 1/16 m, except for the rare exceptions.
- A look file names the model, and its textures as usual.
- **Hidden faces come from the shape.** Graphics works out which faces of the block's cell a mesh covers from its geometry (`BakeSource`): triangles flat on a cell face are dropped when a neighbor hides that face, and a covered face hides its neighbor's. A model doesn't list them, so a cross of grass blades hides nothing and a slab hides only below.

# Making the First Textures

- **Procedural start:** `./gradlew :Factory-Client:starterTextures --args="<data folder>"` writes a 16x16 PNG for every base block, as a first set to repaint by hand: Graphics' test art (`benchmark/BlockTextures`) for stone, dirt, grass, leaves and water, and art drawn in the tool for the rest. It only writes missing files and never overwrites one, so painted textures are kept; to start a texture again, delete it and run the tool.

# Changes This Needs

- **Ikala-Graphics:** a pixel-sharp texture option (nearest magnification, mipmapped). Until then, `BlockLooks` enlarges textures 4x on load, so linear filtering keeps them sharp.
- **Factory-Client:** `BlockLooks` searches a list of folders, first match wins, but only Factory-Client's data folder is in it; resource packs and mods add theirs in front once they exist.
- **Tools:** height-to-normal and mask-to-ORM, as asset editor or command line tools, and look keys for the maps they make.
- **Worldgen decoration:** a step that places blocks in the air above the ground, such as grass tufts on grass, flowers and trees. Block rules only choose which solid block goes where, so `lotomation:grass_tuft` exists, with its model, look and texture, but no world places it yet.

# Open Questions

- **Model authoring:** which tools feed the asset editor (Blockbench, Blender, or both), and what the export holds besides the mesh: texture slots a look file fills (one texture per model today, with top, bottom and side variants by which way a face points in the world), and whether a model can be turned to face the way it was placed.
- **Animated textures,** such as flowing water or lava: frames in one image, or a shader effect.
- **Connected textures,** such as glass panes that join seamlessly.
- **Light from blocks:** whether emissive blocks also cast light (point lights per lamp, or the emission alone).
