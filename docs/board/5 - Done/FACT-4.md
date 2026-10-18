# Summary
Figure out how to disambiguate identical biomes
# Details
**Assignee:** Ches Burks
**Reporter:** Ches Burks
**Labels:** #Factory-Core
**Priority:** Medium
**Related Tickets:** 
# Description
When generating biomes we can have the case that certain biomes either are equally good choices for a given set of coordinates, or in the worst case have identical parameters.

For example one or more mods may add several types of forest that have the same parameters, and we want to both

1. be able to generate any biome
2. have smooth biome transitions without a bunch of noise where every single block is a different biome
# Comments

