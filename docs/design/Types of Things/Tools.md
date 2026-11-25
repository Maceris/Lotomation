---
status: idea
---

# Tools

What the player holds in their hand: hand tools, the powered multitool, weapons, armor and wands. It covers what each is for, what they're made of, how they wear, and how they're upgraded. Nothing here is decided.

Related: [Machines](Machines.md) (tool parts in machines), [Inventories](Inventories.md#wear) (wear), [Materials](Materials.md), [Tiers](../Gameplay/Tiers.md), [Tech Branch](../Gameplay/Tech%20Branch.md), [Magic Branch](../Gameplay/Magic%20Branch.md#spell-engines) (wands), [Side Branches](../Gameplay/Side%20Branches.md#combat) (combat), [Resource Gathering](../Prior%20Art/Resource%20Gathering.md), [Design Pillars](../Design%20Pillars.md).

# Lessons from Prior Art

| Source | What works | What to avoid |
| --- | --- | --- |
| **Minecraft** | Simple, familiar tool set. Tool tier gates what can be mined. | Tools break, often after being enchanted. Enchanting is random, and anvils get "too expensive". Of about six materials, only one or two are used in practice. |
| **Tinkers' Construct** | Tools built from parts, with traits per material. Repair. Tool Leveling. | Most materials feel the same, so players pick the best one and ignore the rest. Packs with hundreds of materials make choosing a part nearly impossible. |
| **Modded Minecraft wrenches** | Configuring machines by hand. | Every mod shipped its own wrench for years. |
| **GregTech** | Tools as crafting components. | Crafting tools wear out in the crafting grid, which is tedium without a decision. |
| **Terraria** | No durability. | Random reforging. |
| **Valheim** | | Durability repaired for free at a workbench: friction with no decision. Constant hotbar juggling. |
| **Factorio, Satisfactory** | Tool durability removed or never added. Equipment grids and modules that the factory makes. | |
| **Noita** | Wands as frames that hold spell cards. | The combos that make it fun break any combat balance. |
| **D&D 5e** | Bounded accuracy: better gear helps, but a modest gap stays winnable. Resistance halves damage, vulnerability doubles it. | |

## Principles

1. **Hand tools are for the early game and the world, not the factory.** Hand gathering lasts only through the Stone and Bronze Ages ([Resource Gathering](../Prior%20Art/Resource%20Gathering.md) suggestion 10), and bores never touch real blocks. After that, tools serve building, decorating, destroying, digging down to explore, and working with machines.
2. **Wear belongs to machines.** Keeping bores supplied with drill heads is a supply chain to automate. Hand tools don't need the same sink.
3. **Tools never break** (pillar: don't destroy the player's stuff). The worst case is slow.
4. **One property table for every material.** Hand-tool heads, drill heads, saw blades, armor and coils all read the same material properties, so a modded material works everywhere without tool code.
5. **Each era's new mechanic asks something new of tools.** That keeps tools relevant without turning them into a stat ladder.
6. **Upgrades are deterministic.** Modules and infusions, never random rolls.
7. **Tool numbers and combat numbers are separate.** A mining upgrade never changes a fight, and a combat mod can balance weapons without touching how fast anyone digs.

# Actions and Tiers

An item doesn't have a tool type. It **provides actions**, each with a level, and blocks and entities say which action they need.

| Action | Does | Needed by |
| --- | --- | --- |
| **Break** | Removes hard blocks | Stone and the depth bands, by hardness |
| **Chop** | Removes wood and plant blocks | Trees, logs, crops grown as blocks |
| **Dig** | Removes loose blocks | Dirt, sand, gravel |
| **Configure** | Rotates, sets sides and ports, picks up machines | Every machine, base game or modded |
| **Strike** | Deals damage | Creatures, other players where allowed |
| **Cast** | Runs a spell card sequence | Wands |

- **A block declares an action and a tier**, like "break, tier 3". A tool provides "break, tier 3" or higher. Neither needs to know about the other, so a mod's block and another mod's tool work together.
- **Block hardness comes from depth.** Deeper bands are harder, so a tool's tier decides how deep the player can dig by hand. This is the same Depth axis as bores ([Tiers](../Gameplay/Tiers.md#axes-of-progression)).
- **Configure is one standard action from day one.** Any machine responds to it, so no mod needs its own wrench.
- **An item can provide several actions.** The multitool provides break, chop, dig and configure. A wand provides cast, and its spells decide the rest.

# The Tool Set

| Era | Tools | Notes |
| --- | --- | --- |
| T1 Stone Age | Pick, axe, shovel, wrench | Wood, then stone. "Craft one of each" from [Quests](../Gameplay/Quests.md). |
| T2 Bronze Age | Bronze versions | Harder heads, deeper digging. Hand tools wear (see [Wear and Charge](#wear-and-charge)). |
| T3 Steam Age | Same, better materials | Steel heads. Automation takes over gathering, so tools start to matter for building. |
| T4 Electric Age | **Multitool** | One powered item with every hand action, using charge instead of wear. Takes heads as parts and modules in slots. |
| T5 and later | Multitool heads and modules | Each era adds heads and modules for its mechanic (see [Era Hooks](#era-hooks)). |
| Combat, any era | Weapons, armor | Separate items (see [Combat](#combat)). |
| M1 and later | Wands | Frames with spell cards ([Spell Engines](../Gameplay/Magic%20Branch.md#spell-engines)). |

- **The multitool merges the early tools.** It fits "old content gets faster, not obsolete" and removes hotbar juggling (an open question in [Inventories](Inventories.md#open-questions)).
- **The old tools still work.** A player who likes a bronze pick can keep using it.
- **Magic counterpart**: a staff on the magic track that provides the same hand actions, powered by essence instead of charge. It could unlock at M4 (Magitech), the row that matches the Electric Age.

## Era Hooks

Each era's new mechanic gives tools a new job.

| Era | Mechanic | Tool job |
| --- | --- | --- |
| T3 Steam | Full automation | The wrench matters: side config, auto-output, picking up machines |
| T4 Electric | Power networks | Charge replaces wear |
| T5 Industrial | Chemistry | Corrosion-resistant heads and armor for acid and byproduct spills |
| T6 Heat | Heat | Heat-resistant heads to dig into hot depth bands |
| T7 Precision | Cleanrooms | Clean tools that can work inside a cleanroom without contaminating it |
| T8 Atomic | Radiation | Shielded tools and armor for handling and working near radioactive blocks |
| T10 Orbital, T11 Fusion | Scale | Large construction and demolition modules (the "large digging tools" from [Ideas](../Gameplay/Ideas.md)) |

# Parts

Tools are built from parts, and each part role reads the material properties it cares about.

| Item | Parts |
| --- | --- |
| Hand tool | Head, binding, handle |
| Multitool | Heads (one per action), body, power cell, module slots |
| Weapon | Blade or head, grip, guard or pommel |
| Armor piece | Plate, lining |
| Wand | Frame, spell cards |

- **Simple by default.** "Craft a pickaxe" just works with one material. Building from mixed parts is optional depth.
- **Machine tool parts** (drill heads, saw blades, lenses, filters) are separate items from hand-tool parts, but read the same material properties. A material that makes a good deep-digging pick head also makes a good deep drill head.

# Materials

## What can be used

**Rules, not a hand-picked list.** Each part role needs a minimum of some property, and any material that meets it can be used. A material qualifies for some roles and not others.

| Part role | Needs | Example exclusions |
| --- | --- | --- |
| Head, blade | Hardness | Lead and tin are too soft |
| Binding | Toughness | Glass and ceramics are too brittle |
| Handle | Low weight, some toughness | Dense metals are too heavy |
| Armor plate | Toughness, or the resistance it's for | |
| Lining | The resistance it's for | |
| Wand frame | Essence capacity | Non-magical materials |

Physical rules explain the exclusions themselves. Lead can't be a pick head, but it's the obvious radiation plate.

## Properties

A few properties, shared by every use of a material in the game:

| Property | Hand tools | Elsewhere |
| --- | --- | --- |
| **Hardness** | Tier: what it can break | Drill heads: which depth bands a bore reaches |
| **Toughness** | Wear rate, binding eligibility | Saw blades, armor |
| **Weight** | Speed vs. reach trade-off | |
| **Heat resistance** | Digging in hot bands | Coils, furnace linings, drill heads at depth |
| **Conductivity** | Charge efficiency; shock damage on weapons | Cables, wire |
| **Corrosion resistance** | Chemistry hazards | Pipes and tanks for acids |
| **Radiation shielding** | Radiation armor | Reactor shielding |
| **Essence capacity** | Wand frames | Magic machine parts |

- **Tool stats are derived, not authored.** A part's stats come from its material's properties, so a mod only defines a material's properties to get tools, drill heads, armor and coils from it.
- **About three numbers per part**: tier, one trade-off pair (speed vs. toughness, or weight vs. reach), and one environmental property. Modules and infusions carry the fancy effects, so materials don't have to.
- **Tiers make old materials obsolete for tools, and that's fine.** What to avoid is sameness *within* a tier, where several materials only differ in small numbers.

## Signature materials

- **Most materials get no trait.** Their derived stats are all they have, and many will be strictly worse than another material for tools. That's expected: their job is in the factory ([Tiers](../Gameplay/Tiers.md#principles-that-come-out-of-this) principle 9), not in the player's hand.
- **Each era gets one to three hand-authored signature materials** with a trait tied to that era's mechanic. The quest book points at them, which gives a guided path without hiding anything.
- **No points-for-variety sink.** With infinite resources it becomes a checklist, and it doesn't make the materials more interesting.

## Appearance

Any eligible material can be used as a part's **look** without its stats, like transmog. A best-in-slot head can have a copper-colored handle. This gives players who care about design a reason to use all 200 metals, and it costs nothing in balance. It belongs with the cosmetics in [Mechanics](../Gameplay/Mechanics.md#cosmetics).

## Choosing a material

In the part builder:

- **Default to the best per trade-off**: only materials that aren't strictly worse than another one on every property the part role uses. That's usually a handful.
- **Group the rest by tier**, behind a "show all" toggle.
- **Sort by the property the part role cares about.**
- **Show why a material isn't eligible** ("too soft for a head") instead of leaving it out silently.

The material count can then grow with mods or late metallurgy without the choice getting harder.

# Wear and Charge

- **Stone and Bronze Ages: wear.** Hand tools wear as they're used. A fully worn tool keeps working, at a fraction of its speed. Wear is the problem automation solves, which the Steam Macerator quest already says ([Quests](../Gameplay/Quests.md)).
- **Repair** is a target transformer machine ([Machines](Machines.md)), so it can be automated. A repair also works by hand at a workbench early on.
- **From the Electric Age: charge.** Powered tools use charge, recharged at a dock or a charging pad on the power network. An empty tool stops its powered actions but keeps working as a basic tool.
- **Machine tool parts keep their wear** ([Wear](Inventories.md#wear)). That's where wear is a real supply chain.
- **Death never touches tools** ([Inventories](Inventories.md#merged-inventories)).

How worn and charged tools are stored is an open question: a worn hand tool could be a plain item with a rounded wear component, like machine parts, or `unique`. Charge may be the first use of `pooled`.

# Upgrades

## Modules (tech)

Factory-made items in the multitool's module slots. Higher tiers need deeper production chains, so tool power grows with the factory.

| Module | Effect |
| --- | --- |
| Area | Breaks a 3x3, then 5x5, area |
| Vein | Breaks connected blocks of the same type |
| Reach | Works from farther away |
| Processing | Smelts or crushes what it breaks, using charge |
| Swap | Replaces blocks in place, for decorating |
| Line and fill | Places or removes a line, wall or volume at once |
| Clean, shielded | The [Era Hooks](#era-hooks) jobs, as modules instead of heads |

- **Area modules have an easy toggle.** They're miserable when decorating.
- **Modules move freely** between tools and never get destroyed when removed.

## Infusion (magic)

The [Infusion Altar](../Gameplay/Magic%20Branch.md#enchantment-and-infusion) (M6) already infuses tools with essences, deterministically. That's the game's enchanting, without Minecraft's randomness or anvil costs. Wrath essence gives cutting tools and demolition a peaceful use.

## Both

A tool can hold modules and infusions together, matching the combined tiers' "tech and magic together". Whether some combinations unlock only in Paradox (C1) is an open question.

# Combat

Combat is optional ([Side Branches](../Gameplay/Side%20Branches.md#combat)), but the system should support about D&D 5e's complexity: some variety in weapons, Noita-style spells, a few damage types and armor.

## Weapons are separate items

- **Not in the multitool.** Multitool upgrades are about scale (areas, veins, reach). Combat needs small, bounded numbers. Mixing them makes every mining upgrade a combat balance problem.
- **Not required.** A player who never fights never needs a weapon, and a fighter doesn't get the best weapon from their mining tool.
- **Bounded numbers.** If weapons grew with factory output like modules do, PvP would measure who has the bigger factory. Gear helps, but a modest gap stays winnable.
- **Shared foundations.** Weapons use the same parts, material properties, infusion and action system as tools. A material's sharpness, weight and conductivity give its weapon stats, so modded materials get sensible weapons for free.

## Damage types follow the eras' hazards

| Damage type | Hazard it matches | Resisted by |
| --- | --- | --- |
| Slashing, piercing, blunt | | Toughness, plate armor |
| Heat | T6 Heat Age, hot depth bands | Heat resistance |
| Cold | Ice essence, cold biomes | Insulation |
| Shock | T4 Electric Age | Low conductivity |
| Corrosive | T5 chemistry | Corrosion resistance |
| Radiation | T8 Atomic Age | Radiation shielding |
| Null | Eldritch and Null magic | Warding |

- **Resistance halves damage and vulnerability doubles it**, as in 5e.
- **Mods register damage types** with the same registry as materials and properties.

## Armor is also protection from the world

Armor protects against the same hazards outside combat: a heat suit for digging into hot bands, lead-lined gear near a reactor, acid-resistant gear in a chemical plant. That gives armor a peaceful use, which [Tiers](../Gameplay/Tiers.md#principles-that-come-out-of-this) principle 10 asks of anything that helps combat, and it makes material resistances matter.

## Wands bridge tools and combat

A wand is a frame, and spells are cards ([Spell Engines](../Gameplay/Magic%20Branch.md#spell-engines)). A dig spell and a fireball can share one wand, so the frame is a tool and only some spells are weapons.

- **Spell cards have categories**: utility (dig, place, move, light) and harmful. A server rule can limit harmful spells in PvP without touching utility ones.
- **Combat spells are capped** by Noita's own knobs: mana or essence per cast, cast delay, and frame capacity. Clever combos are allowed to be broken for digging, but not for combat.

## Randomness

[Command Frames](../Simulation/Command%20Frames.md#determinism) can seed rolls per frame, so dice-style randomness stays deterministic. Many PvP players dislike random crits, though, so a server rule could choose fixed damage for PvP and rolled variety for PvE.

# What Mods Can Add

Every one of these is a registry, with handles that are removed when a plugin unloads ([Mods](../User%20Data/Mods.md)):

- **Actions**, with tiers.
- **Part roles**, with the properties they read and their eligibility minimums.
- **Material properties** and **materials**, which give tools, drill heads, armor and coils from data alone.
- **Signature traits** on materials.
- **Modules**, and which items they fit.
- **Damage types** and the property that resists each.
- **Spell cards**, with a category.

# Changes This Needs Elsewhere

- **[Quests](../Gameplay/Quests.md)**: "Stone Tools" mentions mining "softer ores", and "Bronze Tools" says bronze is needed to mine iron. With no ores ([Ideas](../Gameplay/Ideas.md)), these should gate by block hardness in depth bands instead.
- **[Magic Branch](../Gameplay/Magic%20Branch.md#transmutation-pool)**: the Transmutation Pool turns "a broken tool" into its materials. If tools never break, that should be any tool, as recycling.
- **[Machines](Machines.md)**: tool repair, a charging dock, and the part builder as machines or stations.

# Open Questions

- **How worn and charged tools are stored**: a plain item with a rounded wear component, `unique`, or the first use of `pooled` ([Inventories](Inventories.md#items-and-counts)).
- **Whether Stone and Bronze tools wear at all**, or have no durability like Terraria and Satisfactory.
- **Charging**: only at docks, or anywhere within range of the power network. Range charging is convenient, but may be the kind of "too convenient" that [Modded Minecraft](../Prior%20Art/Modded%20Minecraft.md) warns about.
- **The magic staff**: whether it's a separate item from the multitool, and what it unlocks at.
- **Quality rolls** ([Mechanics](../Gameplay/Mechanics.md#quality-rolls)) on tools: whether they apply, given principle 6 (no randomness in upgrades).
- **Tool leveling** like Tinkers' Tool Leveling: whether tools improve with use, and how that fits with "effort per era stays flat".
- **The exact property list**: whether eight properties is too many for players to follow.
- **Mixed-material appearance**: whether looks can be set per part, or only per tool.
- **Combat numbers**: health scale, armor values, and how bounded weapon tiers are.
