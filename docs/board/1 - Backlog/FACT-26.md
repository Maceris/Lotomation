# Summary
generateChunk uses chunk coordinates as block coordinates
# Details
**Assignee:** Ches Burks
**Reporter:** Claude
**Labels:** #Factory-Core 
**Priority:** Medium
**Related Tickets:** 
# Description
`WorldGenerator.generateChunk` computes `actualX = chunkCoordinateX + x` (likewise for Z). If the arguments are chunk coordinates, this should be `chunkCoordinateX * World.CHUNK_WIDTH + x`. As written, neighbouring chunks sample almost the same noise and overlap.

Also: the column fill starts at index 0 instead of `World.WORLD_HEIGHT_MIN`. This code is due to be replaced by the cubic chunk generator ([Cubic Chunk Generation](../../design/World%20Generation/Cubic%20Chunk%20Generation.md)), so it may be enough to fix the coordinates and add a test.
# Comments

