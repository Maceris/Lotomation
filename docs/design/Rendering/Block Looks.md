---
status: draft
---

# Block Looks

How blocks look: art direction, the files a block's look is made of, and how those files get made. Looks are client owned ([Mods: Rules and Looks](../User%20Data/Mods.md#rules-and-looks)) and can be replaced by [resource packs](../User%20Data/Resource%20Packs.md). Companion to [Starting a Game](../Simulation/Starting%20a%20Game.md).

**Core rule: everything sits on a 1/16 m grid.** A block face is 16x16 pixels of pixel art, and anything that isn't a plain cube is a mesh whose vertices sit on 1/16 m steps and whose textures keep the same 16 pixels per meter. Rare, deliberate exceptions are allowed, such as a tasteful lamp.

# Art Direction

- Pixel art in the spirit of Minecraft (with something like the Decocraft mod for decoration), lit physically: closer in feel to Teardown or Shadows of Doubt than to Minecraft's flat light. The lighting stays physically based; see the renderer's sun, sky, shadows and fog.
- Standard block textures are 16x16 pixels per face; a block whose faces differ has its tiles side by side in one texture.
- Pixels stay sharp up close: block textures load with Graphics' `TextureFilter.PIXELS`, nearest when magnified, with mipmaps for distance. Far LOD draws each block as flat colors by direction (see Far Away).

# Files

Looks live in the namespaced asset layout ([Resource Packs](../User%20Data/Resource%20Packs.md#format)). The base game's are in Factory-Client's data folder, since only the client reads them:

```
plugins/Factory-Client/data/assets/lotomation/
  looks/block/<id>.kvt          what a block looks like: its model, texture and material
  materials/block/<name>.ika    how a surface reflects light (see Materials), shared by any blocks
  textures/block/<name>.png     base color in 16x16 tiles, sRGB, alpha for cut-out or see-through pixels
  textures/block/<name>.normal.png     tangent-space normals, green up, laid out like the texture
  textures/block/<name>.orm.png        optional: occlusion, roughness, metallic
  textures/block/<name>.emissive.png   optional
  models/block/<name>.ika       a block's mesh, exported from the asset editor (see Models)
```

## Look Files

Text KVT, like the worldgen data. A look names three pieces and holds no values of its own: a model, one texture and one material. Which part of the texture each face shows is the model's business, through its UVs, so stairs, lecterns and fences need nothing a cube doesn't. For example:

```
/* stone.kvt */  {model:"lotomation:block/cube_all", texture:"lotomation:block/stone", material:"lotomation:block/stone"}
/* grass.kvt */  {model:"lotomation:block/cube_bottom_top", texture:"lotomation:block/grass", material:"lotomation:block/grass"}
/* water.kvt */  {model:"fluid", texture:"lotomation:block/water", material:"lotomation:block/water"}
```

- **Models:** a namespaced model name, a path under the namespace's `models` folder such as `lotomation:block/cube_all` (the default), or `fluid`, which the renderer's water system draws instead of a block mesh (see [Water](Water.md)). A model file that is missing or broken is logged and drawn as a cube.
- **Names** are namespaced paths under the namespace's `models`, `textures` or `materials` folder, without the extension; with no namespace, `lotomation`.
- **The texture is the base color**, under the material's values. A block with no material is a matte non-metal (roughness 0.85, specular 0.5), see-through if it is a fluid; a material that is missing or broken is logged and drawn the same way.
- A block with no look file is drawn as a cube in a color picked from its name, so new blocks are never invisible.

## Materials

A material is how a surface reflects light, on its own so many blocks can share one. The game loads it as an `.ika` file holding one `MATL` section, a fixed record it copies straight into the GPU's material table; people edit it as text, or in the asset editor.

- **Sources** live in the repo under `art/materials/block/<name>.material.yml`, and the game's files are made from them with the asset editor's converter, which turns each file into its other form beside it, or to a named file:

```
../Ikala-Asset-Editor/bin/convertAsset art/materials/block/grass.material.yml -o plugins/Factory-Client/data/assets/lotomation/materials/block/grass.ika
../Ikala-Asset-Editor/bin/convertAsset plugins/Factory-Client/data/assets/lotomation/materials/block/grass.ika    (writes grass.material.yml beside it)
```

- **In the asset editor,** the workbench's material panel opens and saves material files in either form (Open file, Save file), so a material can be tuned on any model and saved back.
- **The text form** is YAML. Every key is optional, and a source lists only what differs from the default; converting a binary file back writes every key.

| Key | Meaning | Default |
| --- | --- | --- |
| `transparency` | `opaque`; `cutout` for holes where alpha is low, like leaves; `translucent` for see-through by alpha, like glass | `opaque` |
| `roughness` | 0 polished to 1 matte | 0.85 |
| `metallic` | 0 for a non-metal, 1 for a metal, which reflects its base color and has no diffuse light | 0 |
| `specular` | How strongly a non-metal reflects head on: 0.5 is 4% (index of refraction 1.5, most solids), 0.25 is 2% (water), 1 is 8% | 0.5 |
| `specularTint` | How much a non-metal's reflection takes on its base color | 0 |
| `subsurface` | Flattens the diffuse light as light scattered under the surface does: leaves, grass, wax, skin | 0 |
| `sheen`, `sheenTint` | A soft grazing glow for cloth and fuzz, and how much it takes on the base color | 0, 0 |
| `clearcoat`, `clearcoatGloss` | A clear varnish layer on top, and how glossy it is | 0, 1 |
| `anisotropic` | How much the highlight stretches, as on brushed metal | 0 |
| `emissive` | Light given off, in cd/m^2 per channel, linear; a block glows in its texture's own color times this. A screen or lit sign is a few hundred to 1,000, a frosted bulb tens of thousands. In full sun a white wall is about 32,000, so a sign looks dim by day as real ones do | `[0, 0, 0]` |
| `baseColor` | sRGB red, green, blue and alpha, for a face with no texture | `[1, 1, 1, 1]` |
| `normalGreenDown`, `packedOcclusion`, `triplanar` | Flags for maps made the DirectX way, packed maps whose red is occlusion, and level of detail projecting the texture along each axis | `false` |
| `textures` | `baseColor`, `normal`, `packed` and `emissive` image paths relative to the material file, as the asset editor saves them; blocks take their textures from the look instead | none |

## Matching Real Materials

The lighting is physical, so a block looks right when its base color's average, in linear light, is the real material's albedo; roughness can't make up for a texture that is too bright or too dark. Paint the pattern freely, then scale the texture so its average lands on the measured value. Metals' base color is their reflectance, which is bright.

| Block | Linear albedo (R, G, B) | Material |
| --- | --- | --- |
| Stone | 0.20, 0.20, 0.19 | roughness 0.85 |
| Dirt | 0.16, 0.115, 0.075 | roughness 0.95 |
| Sand (dry) | 0.50, 0.40, 0.22 | roughness 0.9 |
| Concrete | 0.32, 0.32, 0.30 | roughness 0.85 |
| Grass block top | 0.06, 0.12, 0.03 | roughness 1, specular 0.35, subsurface 0.3 |
| Grass tufts | 0.06, 0.12, 0.03 | roughness 0.8, subsurface 0.5, cutout |
| Oak leaves | 0.045, 0.10, 0.025 | roughness 0.55, subsurface 0.5, cutout |
| Oak bark | 0.10, 0.078, 0.055 | roughness 0.85 |
| Oak end grain | 0.45, 0.28, 0.12 | roughness 0.85 |
| Bronze | 0.80, 0.58, 0.36 | roughness 0.4, metallic 1 |
| Steel | 0.56, 0.57, 0.58 | roughness 0.3, metallic 1 |
| Glass | tint in the texture, see-through by alpha | roughness 0.02, translucent |
| Water | drawn by the water system | roughness 0.05, specular 0.25, translucent |

- **Foliage is darker than it seems:** grass and leaves reflect most of their light in the infrared, and only about 10% of visible light.
- **A face that stands in for many small parts is rougher than the parts.** A grass block's top is a mat of blades that shade most of its reflection, so it is fully rough with a weaker specular; at roughness 0.8 its sky reflection at grazing angles reads as plastic.

## Maps That Are Hard to Paint

Base color is painted by hand. The other maps are hard to paint directly, so tools make them from things that are easy to paint:

- **Normals from height:** `./gradlew :Factory-Client:blockNormals --args="[--force] <data folder>"` writes `<name>.normal.png` beside every base color texture that lacks one. Each 16x16 tile's height is its brightness, dark crevices low, unless a hand-painted grayscale `<name>.height.png` gives it; tiles wrap within themselves, so neighboring blocks meet without a seam. How deep the bumps go is per texture, in `BlockNormals.STRENGTH`: bark 3, stone 2.5, dirt 1.6, grass 1.2, sand 1.2, concrete 0.8, metals 0.4, glass and water none. The game finds the map by name and samples it pixel-sharp like the color, so each texel is its own small facet. Touch up the height, not the normal, and write the map again with `--force`.
- **Roughness and metallic from a mask:** paint `<name>.mask.png`, where each color stands for a material named in the look file (for example rough stone, polished metal, glass). This may become choosing a whole material per pixel instead of writing an ORM map, since the G-buffer already holds a material index per pixel; it would also give a grass block's dirt sides dirt's material.

## Far Away

Far sections are drawn as flat colors, each triangle its material's average, with separate materials for faces pointing up and down. Since a block has one texture, `BlockMeshes` works out from the model's UVs what its up, down and side faces show (`FaceAverages`, holes left out). Where they differ, as grass's green top and dirt sides do, it gives the material top and bottom variants that draw the same up close and state their own far color (Graphics' `Material.averageColor`).

# Models

Many blocks aren't cubes and aren't very voxel-like either: chests, lecterns, torches, desk lamps, tall grass, flowers, fence posts, ladders. They are ordinary meshes of vertices and indices with UVs into 16x16-pixel textures, so a model is free in shape but keeps the pixel grid:

- **Meshes are data, never code.** Every fixed shape, the plain cube included, is a model file, so adding a block shape never needs a code change. The one exception is a fluid's surface, whose shape follows its level.
- **Cubes come in three, by how the texture is laid out,** each face 16x16 pixels of it:

| Model | Texture | For |
| --- | --- | --- |
| `cube_all` | 16x16, on every face | stone, sand, leaves |
| `cube_column` | 32x16: the sides, then both ends | logs |
| `cube_bottom_top` | 48x16: the sides, the top, then the bottom | grass |

- **Made in the asset editor.** Models are authored or imported in the asset editor and exported in the engine's own `.ika` format to `models/block/<name>.ika`; the game doesn't read source formats like OBJ or glTF. The file holds one mesh (a `MESH` section: vertices, triangles, bounds) and no materials, since the look file chooses those.
- **Sources** live in the repo under `art/models/block/`, as files the asset editor imports (OBJ for now). A block model fills its cell from 0 to 1 m; sources centered on their bottom, as Blockbench and Minecraft models are, are moved to the cell's corner on export.
- **Exporting:** open the source in the asset editor's workbench, and use the Export section (whole scene or the selected node, with "The file's origin is the middle of the bottom" for Blockbench-style sources). It reports the vertex and triangle counts, the bounds and any vertices off the 1/16 m grid. Scripts can do the same without the window: `converter.exportMesh(source, target, bottomCenter)`, to re-export every model in one go.
- Vertices sit on 1/16 m steps, and UVs map one texture pixel to 1/16 m, except for the rare exceptions.
- A look file names the model, and the one texture its UVs read.
- **Hidden faces come from the shape.** Graphics works out which faces of the block's cell a mesh covers from its geometry (`BakeSource`): triangles flat on a cell face are dropped when a neighbor hides that face, and a covered face hides its neighbor's. A model doesn't list them, so a cross of grass blades hides nothing and a slab hides only below.

# Making the First Textures

- **Procedural start:** `./gradlew :Factory-Client:starterTextures --args="<data folder>"` writes a PNG for every base block, 16x16 tiles laid out for its model, as a first set to repaint by hand: Graphics' test art (`benchmark/BlockTextures`) for stone, dirt, grass, leaves and water, and art drawn in the tool for the rest. It only writes missing files and never overwrites one, so painted textures are kept; to start a texture again, delete it and run the tool.

# Changes This Needs

- **Factory-Client:** `BlockLooks` searches a list of folders, first match wins, but only Factory-Client's data folder is in it; resource packs and mods add theirs in front once they exist.
- **Tools:** mask-to-ORM, as an asset editor or command line tool.
- **Asset editor:** opening a whole look, putting its model, textures and materials together in the workbench to tune a material where it is used and save it back.

# Open Questions

- **Model authoring:** which tools feed the asset editor (Blockbench, Blender, or both), and what the export holds besides the mesh: and whether a model can be turned to face the way it was placed.
- **Animated textures,** such as flowing water or lava: frames in one image, or a shader effect.
- **Connected textures,** such as glass panes that join seamlessly.
- **Light from blocks:** whether emissive blocks also cast light (point lights per lamp, or the emission alone).
