---
status: draft
---

# Water

How the world's water is drawn. Decided: the game switches from water drawn as see-through textured blocks to the renderer's realistic water (Ikala-Graphics' water: height-field tiles with physically based optics, wind waves, flow, ripples, spray and underwater views). Oceans should be much choppier than a puddle, and water's look varies by place: open oceans are clear, rivers are muddy.

# What Stays the Same

Water is game state as before: water blocks, with levels and flow later (see [Save File Format: Fluids](../User%20Data/Save%20File%20Format.md#fluids)). The server owns where water is; only the drawing changes. Looks are client owned, so how water looks is client data.

# Blocks to Tiles

- The client turns the water it has into water tiles, one 64 x 64 m square of the world at a time, 1 m cells, aligned to 4 x 4 chunks. Each column's water under air is a surface at the top of its water blocks, and its bottom is the ground under that water; water under a roof has no surface. A square gets one tile per surface height in it, so a sea and a pond above it are two tiles, each masked to its own cells. Each corner's bottom is the deepest of the water cells around it.
- Water blocks get no block mesh; the water's look file says so (`model:"fluid"` is drawn by the water system). The blocks beside and under water are drawn as usual, so shores and the bottom show through.
- Water levels and flow, once they exist, become tile heights and flows (meters a second), so rivers carry their waves downstream.
- A square is rebuilt on its own thread a quarter of a second after the chunks in it change, so a burst of streaming chunks rebuilds it once. The new tiles go in before the old ones come out, so water never blinks out.
- Ripples from things moving through water (`disturb`) come from the entities the client knows about, like footprints in [Snow](../Simulation/Snow.md): a look, not game state.

# How Water Looks: Bodies

What a tile holds and the wind over it, which together set its color, clarity and waves:

- **Optics:** chlorophyll (phytoplankton), dissolved organic matter and sediment, in real units. Open ocean is nearly pure (about 0.05 mg/m^3 chlorophyll, no sediment), lakes are greener, rivers carry tens of grams of sediment per cubic meter.
- **Waves:** wind speed and fetch, how far the wind has blown over open water. A pond has a few meters of fetch and stays calm; the open ocean has an endless fetch and a stronger wind, so it is choppy.

The two halves are chosen differently:

- **Optics come from the biome,** in client look data, one body per tile: the biome most of the tile's surface is in. Chunks already carry their biomes (4^3 cells), so the client picks a tile's optics without the generator. Where tiles differ, the renderer blends them, so the game keeps one body per tile and doesn't blend itself. A biome without a look uses `lotomation:default`, clear coastal water.

```
/* assets/lotomation/looks/water/ocean.kvt */  {chlorophyll:0.05F, cdom:0.01F, sediment:0.0F}
/* assets/lotomation/looks/water/river.kvt */  {chlorophyll:1.0F, cdom:0.5F, sediment:40.0F, fetch:200.0F}
```

`fetch` is in meters; leaving it out means the open sea.

- **Sea state is regional,** not per tile or per biome: wind speed, direction and fetch (and swell, once it exists) are set over large regions and change slowly, with few distinct regions in view. The renderer draws at most four distinct winds at once and shows tiles in any further wind as still, and different winds on neighboring tiles leave a step at their shared edge until it blends them. Rivers and ponds get calm water by their short fetch, not by a wind of their own. Until weather exists, there is one wind per world, 8 m/s blowing 0.6 rad from +x toward +z, and each look gives its fetch.

# Open Questions

- **Water beyond the loaded chunks:** the sea ends where the loaded chunks do, and past it the ground under the sky shows. Far LOD will have to carry the sea to the horizon, perhaps as coarse tiles at sea level where the generator says there is ocean.
- **Rough seas need renderer work** (recorded in the Ikala-Graphics design doc, "Gaps for world-scale water", not scheduled). Whitecaps, foam and crest spray exist, and waves can reach about 2 m, but the wave profile holds waves only up to 80 m long, while a rough sea's main waves are 125 to 200 m. A stronger wind alone therefore gives short, steep chop, not a rolling sea. It needs a longer profile for the longest waves (about 640 m) and swell on the body (height, period, direction, spread).
- **Blending between tiles:** optics, and waves where two winds meet, until then show a line or a step at tile edges.
- **Parameters instead of biomes:** driving sediment or wind from worldgen parameters (for example a river density) would vary more smoothly, but the client doesn't run the generator, so the server would have to send samples with chunks.
- **Fetch for lakes:** whether the client works out a lake's width from its water, or data gives fetch per biome.
- **Waterfalls and water above the surface** (a level above the tile's surface, falling water) and how they meet the tiles.
