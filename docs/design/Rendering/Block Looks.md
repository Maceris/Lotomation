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
  models/block/<name>.*         optional, a mesh for blocks that aren't cubes (see Models)
```

## Look Files

Text KVT, like the worldgen data. For example:

```
/* stone.kvt */  {model:"cube", textures:{all:"lotomation:block/stone"}, roughness:0.9F}
/* grass.kvt */  {model:"cube", textures:{top:"lotomation:block/grass_top", side:"lotomation:block/grass_side", bottom:"lotomation:block/dirt"}}
/* water.kvt */  {model:"fluid", textures:{all:"lotomation:block/water"}, roughness:0.05F, translucent:true}
```

- **Surface values** (`roughness`, `metallic`, `emission`) apply to the whole block when there is no map for them. Most blocks need nothing more than a base color texture and these values.
- A block with no look file is drawn as a cube in a color picked from its name, so new blocks are never invisible.

## Maps That Are Hard to Paint

Base color is painted by hand. The other maps are hard to paint directly, so tools make them from things that are easy to paint:

- **Normals from height:** paint a grayscale 16x16 `<name>.height.png` (or start from the base color's brightness), and a tool turns it into `<name>.normal.png`. Touch up the height, not the normal.
- **Roughness and metallic from a mask:** paint `<name>.mask.png`, where each color stands for a surface named in the look file (for example rough stone, polished metal, glass), and a tool writes `<name>.orm.png`. Touch up the mask, not the ORM map.

# Models

Many blocks aren't cubes and aren't very voxel-like either: chests, lecterns, torches, desk lamps, tall grass, flowers, fence posts, ladders. They are ordinary meshes of vertices and indices with UVs into 16x16-pixel textures, so a model is free in shape but keeps the pixel grid:

- Vertices sit on 1/16 m steps, and UVs map one texture pixel to 1/16 m, except for the rare exceptions.
- A look file names the model instead of `cube`, and its textures as usual.
- Models come in through the asset pipeline the engine already has for meshes, which bakes them into the engine's own format.

# Making the First Textures

- **Procedural start:** Ikala-Graphics already draws 16x16 pixel art in code for its test blocks (`benchmark/BlockTextures`: stone, dirt, grass, water, planks, leaves, glass). A tool writes that art out as 16x16 PNGs in this layout, as a first set to repaint by hand. The same tool runs the height-to-normal and mask-to-ORM steps.
- **First rendering:** plain colored cubes plus water, until look files exist. See [Starting a Game](../Simulation/Starting%20a%20Game.md#client).

# Changes This Needs

- **Ikala-Graphics:** a pixel-sharp texture option (nearest magnification, mipmapped). Until then, 16x16 art is enlarged 4x on load, as `BlockTextures` does today, so linear filtering keeps it sharp.
- **Factory-Client:** a `BlockLooks` registry that reads look files and textures through the layered asset lookup, makes Graphics meshes and materials, and falls back to colored cubes.
- **Tools:** the procedural export, height-to-normal and mask-to-ORM, as asset editor or command line tools.

# Open Questions

- **Model authoring and format:** which tool (Blockbench, Blender, or both) and which file it hands the asset pipeline (glTF is the likely choice), and how a model says which faces a neighboring block hides.
- **Animated textures,** such as flowing water or lava: frames in one image, or a shader effect.
- **Connected textures,** such as glass panes that join seamlessly.
- **Light from blocks:** whether emissive blocks also cast light (point lights per lamp, or the emission alone).
