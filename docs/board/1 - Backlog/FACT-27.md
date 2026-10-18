# Summary
OpenSimplex2S.fastFloor overflows at large coordinates
# Details
**Assignee:** Ches Burks
**Reporter:** Claude
**Labels:** #Random 
**Priority:** Medium
**Related Tickets:** 
# Description
`OpenSimplex2S.fastFloor(double)` casts to `int`. Once `frequency × coordinate` goes past about ±2.1 billion, the cast saturates and the noise silently goes constant or garbage. With cubic chunks and a world border near the int limits, detail octaves (frequency > 1) reach this near the edges of the world.

**Fix:** use a `long`-based floor and lattice hashing in OpenSimplex2S (2D, 3D and 4D paths), and add a test that samples near ±2³¹ with frequency > 1.
# Comments

