# Summary
pickBiomeBasedOnName can pick a negative index
# Details
**Assignee:** Ches Burks
**Reporter:** Claude
**Labels:** #Factory-Core 
**Priority:** High
**Related Tickets:** [FACT-4](../5%20-%20Done/FACT-4.md)
# Description
In `WorldGenerator.pickBiomeBasedOnName`, `Arrays.hashCode(new int[] {x, z}) % orderedChoices.size()` is negative whenever the hash is negative, so `orderedChoices.get(selection)` throws `IndexOutOfBoundsException` whenever there is more than one equally good biome.

`Arrays.hashCode` is also a weak positional hash: neighbouring coordinates give correlated results.

**Fix:** use `Math.floorMod` with a proper seeded positional hash (e.g. SplitMix64 over seed, x, z). Sort the choices by ID instead of `String.hashCode`, so hash collisions can't fall back to HashMap order.
# Comments

