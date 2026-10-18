# Summary
Biome parameter noise maps share one seed
# Details
**Assignee:** Ches Burks
**Reporter:** Claude
**Labels:** #Factory-Core #Random 
**Priority:** High
**Related Tickets:** 
# Description
`ParameterPack.generateParameters` passes the same world seed to all five noise maps, and the maps differ only in scale and octave count (`NoiseParameters`):

- Erosion and weirdness are both 0.002 / 6 octaves, so they are **identical maps**.
- Temperature (0.001 / 4) and precipitation (0.001 / 5) are nearly identical.
- Height (0.002 / 10) shares its first 6 octaves with erosion.

In practice biome selection runs on about two independent values instead of five.

`RandomGen.generateSimplexNoise` also reuses the same seed for every octave, so the octaves are correlated.

**Fix:** derive a seed per noise map from a stable 64-bit hash of its ID (e.g. `mix64(worldSeed, hash64("lotomation:temperature"))`), and a seed per octave (noise seed + octave index, mixed).

See [Cubic Chunk Generation](../../design/World%20Generation/Cubic%20Chunk%20Generation.md) and [Generation Data Format](../../design/World%20Generation/Generation%20Data%20Format.md).
# Comments

