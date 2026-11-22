---
status: decided
---

# Snow

How snow exists in the world, how it falls, and how it is drawn, with footprints that fill back in. The look is in the spirit of God of War Ragnarok: deep, soft snow that takes prints and fills over time.

# Two Kinds of Snow

- **Snow blocks:** full, solid cubes, for drifts, packed snow and anything deeper than one position. They are ordinary blocks and take no footprints.
- **Snow layers:** snow lying in a position as a **fill** (see [Save File Format: Fills](../User%20Data/Save%20File%20Format.md#fills)), with a level in 1/16 m steps. Because it is a fill, it lies around whatever block is there: a fence post, a lamp, a grass tuft. This is the snow that takes footprints.

A fill never goes past its own position. Snow deeper than one position is snow blocks with a layer on top.

# State

The level is a rule: the server owns it, syncs it, and gameplay can use it (slower walking, buried items).

- **Natural depth:** snowfall stops at about half a meter (level 8). This is a data value, so it can change.
- **World generation** sets the starting level in its final pass, on surfaces that are cold and open to the sky (see [Features and Structures: Final Pass](../World%20Generation/Features%20and%20Structures.md#final-pass-snow-and-ice)).
- **Snowfall** raises levels near players while it snows, in whole steps. There is no offline progress. Changes are batched by region, one step at a time every few tens of seconds, not per position every few seconds, because each change makes the renderer redo that area's level of detail.
- Melting, seasons and weather are a later weather simulation. Generated snow is ordinary state, so that system can change it.

# Drawing

The renderer's deformable surfaces draw snow layers; the Graphics side is in the Ikala-Graphics design doc, "Deformable surfaces (planned)". Lotomation's part:

- **Surfaces:** for each section, one entry per column of positions that has a snow layer: its top, its depth, the snow material and the deformable flag. Heights are whole 1/16 m steps; the renderer eases the drawn top toward a new level over a blend time set by the material, so snow rises smoothly as it falls. No fractional heights, no per-frame updates, and no side faces (the renderer works those out from neighboring columns).
- **Refill rate:** set on the snow material as snowfall changes, so tracks fill in during a storm and stay sharp when it is calm.
- **Footprints are client-only.** Each client stamps the entities it knows about nearby each frame: feet as ellipses, bodies, dropped items, sleds and carts as swept shapes, each at the height of its bottom. They aren't game state, aren't sent and aren't saved. Only stamps within 64 m of the camera count, and footprints show only near the player: far surfaces, level of detail, and lighting (sky occlusion, the occupancy volume, global illumination) always treat snow as undisturbed, at its full height.
- **Stacked snow:** a roof and the ground under it are separate surfaces; a print counts for a surface only within about 0.25 m of it. A layer pressed all the way down shows the block under it.
- **Material:** physically based snow (high albedo, a subsurface look, sparkle), with shadows in the prints.

# Open Questions

- Which blocks take a snow fill: a tag, or worked out from how much of the position the model fills.
- Whether snow on leaves is a fill on the leaves block, or only on the position above it.
- How snowfall decides which regions step up, and how fast, once weather exists.
