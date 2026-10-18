# Summary
Biome storage limit and static world generation registries
# Details
**Assignee:** Ches Burks
**Reporter:** Claude
**Labels:** #Factory-Core 
**Priority:** Medium
**Related Tickets:** [FACT-21](FACT-21.md)
# Description
Two limits that block data-driven or modded biomes:

1. `Chunk` stores biomes as `byte`, which caps a world at 256 biomes. Move to palette indices or `short` per 4×4×4 cell.
2. `WorldGenerator` keeps `biomes`, `biomeEncoding` and `biomeDefinitions` in static HashMaps. Move them to a per-world generator instance built from the world type, so different worlds and world types can coexist and tests are isolated.

Related to the world type files in [FACT-21](FACT-21.md).
# Comments

