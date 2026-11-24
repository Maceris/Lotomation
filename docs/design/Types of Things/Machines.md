---
status: idea
---

# Machines

What a machine is made of, the kinds of machine the game needs, and a first list of machines per era on both tracks. The goal is to pin down what [Inventories](Inventories.md) has to hold and move. Nothing here is decided.

Related: [Tiers](../Gameplay/Tiers.md), [Tech Branch](../Gameplay/Tech%20Branch.md), [Magic Branch](../Gameplay/Magic%20Branch.md), [Side Branches](../Gameplay/Side%20Branches.md), [Factory Network](../Simulation/Factory%20Network.md), [Resource Gathering](../Prior%20Art/Resource%20Gathering.md).

# Is Magic Done With Machines?

**Mostly yes.** A machine is anything in the [Factory Network](../Simulation/Factory%20Network.md): a structure with ports, storage and a process that schedules its own events. Almost every magic mechanic fits that shape, and putting it there is what makes magic automatable, which is the first rule from [What Went Wrong Before](../Gameplay/Magic%20Branch.md#what-went-wrong-before).

| Magic mechanic | As a machine? | Shape |
| --- | --- | --- |
| Essence extraction | Yes | A processor with item input and essence (fluid) output |
| Compound essences | Yes | A processor with two essence inputs and one essence output |
| Ritual circles | Yes | A multiblock whose pedestals are its slots and whose glyphs are its validity rule |
| Infusion | Yes | A processor whose output is its input with a new component, plus a strength stat |
| Wards | Yes | An area emitter: no recipe, consumes essence, sets a condition on a region |
| Spell Engines | Yes | A processor whose configuration is a program of spell cards in slots |
| Transmutation Pool | Yes | A grown-shape multiblock that accepts inserts and item entities |
| Magical crops | Yes | A growth bed machine, like a greenhouse |
| Ley lines and aura | No | A world field that machines read as a condition and draw from |
| Familiars | Partly | Their home (a roost) is a machine; the familiar is a slow, short-range logistics link |
| Wands, charms, potions | No | Items the player carries and uses |

So magic machines differ from tech machines in what they **need** (aura, beauty, time of day, a warded room) and what they **emit** (Null, area effects), not in what a machine is. The same component list below covers both.

The exceptions are the player's own magic (wands, charms, potions), which are items, and the world fields (aura, ley lines, starlight), which are read by machines but aren't in them.

# Machine Components

Every machine type is built from these. A type picks the ones it needs; most use only a few.

## Identity

- **Type**: what the machine is, and the recipe category it runs.
- **Grade**: the [power grade](../Gameplay/Tech%20Branch.md#power-grades). Higher grades run lower-grade recipes faster. Magic machines use the same grades as their tier, so one scale covers both tracks.
- **Shape**: a single block, a fixed template, or a grown shape, with the validity rule from [Factory Network](../Simulation/Factory%20Network.md#machines).
- **Facing**: which way it points, so sides can be named relative to it (front, back, left, right, top, bottom).
- **Item form**: what the player gets back when it's broken. State (stored power, recipe configuration, side assignments, progress) is dropped, so machine items stack as plain items. Only what the machine is made of stays as a component, such as quality. Whatever is in its slots and upgrade slots goes back to the player as items; fluid in its tanks is lost, since players carry fluids only in containers. A later item may let the player pack up a machine with its state kept.

## Ports

A port is where something enters or leaves. Each face of a single-block machine, or each **hatch** part of a multiblock, has zero or more ports. Ports carry one kind of thing each:

| Port kind | Carries | Unit | Moved by |
| --- | --- | --- | --- |
| Item | Item keys and counts | count | Belts, splitters, the player |
| Fluid | Liquids, gases, plasma, and essences | ml | Pipes |
| Power | Energy | J | Cables (by grade) |
| Heat | Heat at a temperature | J and K | Heat pipes, losing some over distance |
| Data | Research data and matter patterns | data cards, or bits on a data cable | Cards on belts and pipes, or a data cable |
| Logic | Signals: numbers keyed by item or fluid | integers | Logic wires |
| Area | An effect on, or a draw from, a region | radius | Nothing; it's spatial |

- **Essences are fluids.** They use fluid ports, tanks and pipes, with their own fluid keys. That keeps magic logistics the same skill as tech logistics. Some fluids need special pipes: hot fluids, plasma, exotic matter in containment.
- **Heat is piped.** A heat pipe carries heat from one machine to another and loses some over its length, so heat recovery rewards putting the machines close together.
- **Data has two routes.** Data cards on belts or pipes give high throughput but more steps (write, ship, read). A data cable gives a steadier, lower rate with no items to handle.
- **Mechanical power**, like Create's rotation, is left out: steam is a fluid, and everything powered draws J. One energy system, as in [Types of Things Summary](Types%20of%20Things%20Summary.md#energy).
- **Side configuration**: which port each face exposes, and whether it pushes, pulls or both. The player sets it; [Where an Item Goes](Inventories.md#where-an-item-goes) uses it first.
- **Auto-output**: a machine can push its outputs into whatever is on an output face, so a machine row doesn't need a belt between every pair. Push is part of the port, not a separate block ([Transport](Transport.md) rejects separate connectors).

## Storage

Everything a machine holds between events.

### Item slots

A slot holds one key, has a capacity and a role ([Machine Inventories](Inventories.md#machine-inventories)). The roles the machines below need:

| Role | Consumed? | Examples |
| --- | --- | --- |
| **Input** | Yes, per craft | Ore fractions in a furnace |
| **Output** | Produced | Ingots |
| **Byproduct** | Produced, by chance or always | Slag, tailings, stone dust |
| **Fuel** | Yes, by burn time | Coal in a boiler |
| **Catalyst** | No, or rarely by chance | Platinum mesh in a reactor, Sulfur in an athanor |
| **Tool part** | Wears out over many crafts | Drill heads in a bore, saw blades, lenses in a bore |
| **Shape** | Never | Molds, dies, extruder shapes, lithography masks |
| **Program** | Never | Spell cards in a Spell Engine, a circuit chip in an assembler |
| **Pattern** | Never | Data recipes for the advanced assembler and the replicator |
| **Upgrade** | Never | Speed, efficiency and parallel upgrades, gems |
| **Container** | The container comes back | Empty cells or jars that get filled, filled ones that get emptied |
| **Payload** | Leaves with the machine's output | A rocket's cargo manifest |

**Wear is tracked in the slot, and kept on the item when it's taken out.** A drill head in a bore wears down as a value in its slot. A fresh part has no wear component, so fresh drill heads stack as one plain entry in a chest. A half-worn part taken out keeps its wear as a component, which makes it a different key from fresh ones. Wear is exact while the part is in the slot, and only rounded when it comes out, toward more worn, to a few steps (such as every 10%), so worn parts make only a few keys and taking a part out and back in never undoes wear. A slot holding several parts wears only the one in use. They are still plain items, not `pooled` ([Wear](Inventories.md#wear)).

### Tanks

Like slots, but for fluids: one fluid key, a capacity in ml, and a role (input, output, byproduct, catalyst). Multiblocks often have many small tanks rather than one big one, so a distillation tower can hold six products at once.

### Internal buffers

- **Energy buffer**: J stored, so a machine can finish a craft through a brief shortage. Fusion reactors need a large one charged before they start.
- **Heat**: the machine's own temperature. Furnaces heat up and cool down; a blast furnace's coils set the maximum.
- **Pressure**: for boilers and pressurized vessels.
- **Containment**: power held in reserve for exotic matter and plasma. If it runs out, the contents are lost, never the machine.

None of these are inventories, but they are machine state that is saved, shown, and read by logic.

## Process

- **Recipe set**: every recipe of the machine's category it can run at its grade.
- **Configured recipes**: the subset the player chose, in priority order ([Recipes](Inventories.md#recipes)).
- **Progress**: how far the current craft is, and the tick it finishes ([How It Runs](../Simulation/Factory%20Network.md#how-it-runs)).
- **Parallel**: how many crafts run at once. Late multiblocks run many, like GregTech parallels.
- **Chance outputs**: seeded per craft, so they are deterministic.
- **Continuous processes**: generators, bores and emitters don't craft discrete items, but still schedule events: "the output tank fills at tick T", "the fuel runs out at tick T".

## Requirements

What has to be true for the machine to run. Unmet requirements stop or slow it and show why, never damage it.

| Requirement | Tech or magic | Examples |
| --- | --- | --- |
| Power grade | Tech | Refuses power above its grade |
| Temperature | Both | Blast furnace coils, Fire infusion |
| Pressure or vacuum | Tech | High-pressure steam, vacuum chambers |
| Room | Both | Inside a sealed cleanroom, or a Light-warded room |
| Depth band | Tech | Bores yield the composition of the band they reach |
| Biome or place | Both | Air condensers, sea-water pumps, ley taps |
| Placement | Both | Reactor layout, ley nexus layout, radiation shielding |
| Aura | Magic | A minimum aura around the machine; it draws from it |
| Beauty | Magic | Plants, water and decoration nearby speed it up |
| Celestial | Magic | Day, night, moon phase; a bonus, never a gate |

Requirements are read from the world when the machine is placed or something nearby changes, not every tick. A machine only reacts when a reading crosses a threshold.

## Emissions

What the machine puts out besides its outputs.

- **Null**: magical waste, into a byproduct tank. It never spreads; a full Null tank stops the machine like any full output.
- **Heat**: waste heat, which heat exchangers can recover for another machine.
- **Radiation**: a placement rule for fission, not damage to blocks.
- **Area effects**: wards, aura boosts, light, beacon-style buffs.
- **Pollution or noise**: if ever added, only as a resource or a nuisance, never as destruction.

## Modifiers

- **Upgrades**: items in upgrade slots. Speed, efficiency and parallel. Auto-output needs no upgrade; it's part of the port.
- **Infusions**: essences infused into the machine itself, stored as components on the machine (and its item form). A Fire-infused furnace runs hotter.
- **Gems and affixes**: the optional gacha versions from [Mechanics](../Gameplay/Mechanics.md#machine-gems).
- **Quality**: if [quality rolls](../Gameplay/Mechanics.md#quality-rolls) exist, a component on the machine's item form.
- **Mastery**: small branch-wide bonuses from the [Mastery Board](../Gameplay/Side%20Branches.md#specialization-mastery).

## Control

- **On/off switch** in the machine's UI, which logic can also drive.
- **Conditions**: run while a logic signal or a count meets a rule.
- **Logic out**: progress, buffer levels, slot counts and status as signals.
- **Priority**: for power shortages, if machines get priority (open in [Factory Network](../Simulation/Factory%20Network.md#open-questions)).

## Status

Every machine is in exactly one state, shown on the block, in its UI, and as a logic signal:

| State | Meaning | Ticks? |
| --- | --- | --- |
| Working | A craft or process is in progress | Only its scheduled events |
| Starved | Missing an input, fuel, power or essence | No, waits to be woken |
| Blocked | An output or byproduct is full | No, waits to be woken |
| Unmet | A requirement isn't met (room, aura, temperature) | No, re-checked when the world nearby changes |
| Off | Switched off by the player or logic | No |
| Invalid | A multiblock that isn't formed | No |

Starved, Blocked, Unmet and Off are the sleep states. Each carries **why**, such as `STARVED: Fire essence`, the same way inserts carry their rule.

# Machine Archetypes

Most machines are one of these shapes. The archetype says which components the machine uses, which is most of what the inventory system has to support.

| Archetype | Ins | Outs | Notable storage | Examples |
| --- | --- | --- | --- | --- |
| **Processor** | Items, fluids, power or essence | Items, fluids | Input, output, byproduct | Furnace, crusher, essence still |
| **Assembler** | Many item kinds | One item | Many inputs, program, pattern | Assembler, circuit assembler |
| **Source** | Power, a requirement | Items or fluids from nowhere | Tool parts, output | Bore, pump, air condenser, ley tap |
| **Generator** | Fuel or fluid | Power or a fluid | Fuel, energy buffer | Boiler, turbine, Lightning coil |
| **Converter** | One energy form | Another | Buffers | Transformer, Arcanum bridge, heat exchanger |
| **Storage** | Anything | The same | One big slot or tank | Tank, battery, essence jar |
| **Emitter** | Essence or power | An area effect | Upkeep tank | Ward stone, beacon, glow basket |
| **Transformer of a target** | One target item, essences | The same item, changed | A target slot | Infusion altar, enchanting, tool repair |
| **Controller** | Through hatches | Through hatches | Owned by its hatches | Blast furnace, ritual circle, reactor |
| **Room** | Nothing | A condition on machines inside | Filters as tool parts | Cleanroom, warded room |
| **Launcher** | A payload | Off-world, into the network | Payload | Rocket pad |

Multiblock **hatches** are the slots of a controller: an input bus, an output bus, a fluid hatch, an energy hatch, a pedestal. The player places them where they like within the validity rule, which is how a multiblock gets side configuration.

# Machines by Era

A first list. Each era names the machines that bring its new mechanic, not every variant: most machines also come in higher grades, and electric versions of steam machines arrive in the Galvanic era.

The original sketch's **Miner** and **Quarry** become the **Bore**: base-game resources come from bulk matter and virtual depth columns, and base-game sources never change blocks ([What Touches the World](../Simulation/Factory%20Network.md#what-touches-the-world)). A real digging quarry is left to mods, or to a construction tool that clears an area for building and hands back the blocks.

## 1. Hearth: Stone Age and Folk Magic

Muscle power. Most of these run on the player's clicks, or on time alone.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Workbench | Tech | Crafts nearly everything early ([Ideas](../Gameplay/Ideas.md) keeps hand crafting minimal) | Grid inputs, output |
| Kiln | Tech | Fires clay, makes charcoal | Input, fuel, output |
| Quern | Tech | Hand-cranked crushing of stone and seeds | Input, output, byproduct |
| Sieve | Tech | Sifts crushed stone into its first fractions | Input, output, byproducts |
| Drying Rack | Both | Dries herbs, hides and clay over time; no fuel | A few input-output pairs |
| Charm Bench | Magic | Makes charms from herbs and trinkets | Inputs, output |
| Glow Basket | Magic | Light, and a little aura around it | Upkeep slot for glow fungi |
| Essence Lens | Magic | A tool, not a machine: shows the essences in what it looks at | (an item) |

## 2. Crucible: Bronze Age and Essence Extraction

The first **hand-fed machines** that burn fuel, and the first separation of both matter and essence.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Furnace | Tech | Smelts | Input, fuel, output |
| Alloy Crucible | Tech | Melts metals together into alloys (the sketch's Alloy Smelter) | Two inputs, fuel, output, Mold |
| Coke Oven | Tech | Coal to coke, with creosote | Input, output, fluid byproduct |
| Steam Macerator | Tech | Crushes, more fractions than the quern | Input, output, byproduct, steam tank |
| Steam Extractor | Both | Presses juice, latex, and the first essences out of things | Input, output, fluid output |
| Essence Crucible | Magic | Melts items into a mixed essence soup | Input, fuel, mixed essence tank |
| Essence Still | Magic | Separates the soup into single essences | Mixed tank in, several essence tanks out |
| Sun Mirror / Shade Well | Magic | Collect Light by day and Dark by night | Essence tank |
| Essence Jar | Magic | Stores one essence, and carries it as an item | One tank; Container as an item |

## 3. Clockwork: Steam Age and Runecraft

**Full automation**: belts, pipes, auto-output, and magic that runs by itself. Null appears.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Boiler | Tech | Water and fuel to steam, low then high pressure | Fuel, water tank, steam tank, pressure |
| Steam Bore | Tech | Yields the composition of the depth band below it | Drill head (Tool part), output |
| Pump | Tech | Water, then sea water, oil and lava, by place | Output tank |
| Washer | Tech | Washes crushed matter for cleaner fractions | Input, water tank, output, byproduct |
| Forge Hammer | Tech | Plates and rods | Input, output, Shape |
| Blast Furnace | Tech | Iron to steel; the first multiblock | Hatches; heat |
| Steam Turbine | Tech | Steam to power, the bridge into Galvanic | Steam tank, water output, energy |
| Rune Table | Magic | Carves glyphs and rune stones | Inputs, essence tank, output |
| Ritual Circle | Magic | Runs rituals on items placed on its pedestals | Pedestals (hatches), essence hatches, Null hatch |
| Ley Tap | Magic | Draws Aether from a ley line | Essence output; requires place |
| Rune Sorter | Magic | Order-powered filter splitter that sorts by tag or essence | Program (rune) |
| Null Sump | Magic | Stores Null until something uses it | One large tank |

## 4. Galvanic: Electric Age and Magitech

A **network of a new energy**: cables and grades, and essence that converts to and from power.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Generator | Tech | Fuel or steam to power | Fuel, energy buffer |
| Transformer | Tech | Steps power between grades | Energy buffer |
| Battery Bank | Tech | Stores power; grown shape | Energy, battery items as cells |
| Wiremill | Tech | Wire and cable | Input, output, Shape |
| Electrolyzer | Tech | Splits fluids into gases | Tanks |
| Magnetic Separator | Tech | Pulls magnetic fractions out | Input, outputs |
| Assembler | Tech | Crafts from parts | Many inputs, output, Program |
| Circuit Assembler | Tech | Boards and components | Many inputs, output |
| Conjunction Altar | Magic | Combines two essences into a compound | Two essence in, one out, Null out |
| Arc Coil | Magic | Lightning essence to power and back | Essence tank, energy |
| Steam Heart | Magic | Steam essence as a generator | Essence tank, energy |
| Arcanum Drawer | Magic | Draws wire that carries essence and power | Input, essence tank, output |

## 5. Alembic: Industrial Age and Alchemy

**Bulk reactions with byproducts** that must go somewhere.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Distillation Tower | Tech | One input, many outputs by height | A tank per layer |
| Chemical Reactor | Tech | Reactions between items and fluids | Inputs, tanks, Catalyst |
| Cracker | Tech | Breaks heavy oils into light ones | Tanks |
| Polymerizer | Tech | Plastics and rubber | Tanks, output |
| Arc Furnace | Tech | Recycles items back into materials | Input, outputs |
| Bioleaching Vat | Biology | Microbes pull metals from crushed rock | Culture (Catalyst), input, outputs |
| Alembic Array | Magic | Bulk alchemy multiblock | Hatches |
| Brewing Cauldron | Magic | Potions | Inputs, tanks, Container (bottles) |
| Transmutation Pool | Magic | Fixed, lossy item-to-item changes | Takes inserts and item entities; grown shape |
| Balance Stabilizer | Magic | Neutralizes Null with Balance | Two tanks in |
| Rot Vat | Magic | Refines Null with Wood into Rot | Tanks |
| Spirit Garden | Both | Grows magical crops and normal ones | Seeds (Catalyst), outputs; beauty matters |

## 6. Athanor: Heat Age and Infusion

**A stat that gates recipes**: temperature on the tech side, infusion strength on the magic side.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Coil Blast Furnace | Tech | Coil material sets the maximum temperature | Hatches, coils as parts |
| Heat Exchanger | Tech | Moves waste heat into another machine | Heat ports, tanks |
| Vacuum Freezer | Tech | Cools hot ingots and fluids | Input, output, coolant tank |
| Sintering Kiln | Tech | Ceramics and refractory parts | Input, output, Shape |
| Deep Bore | Tech | Reaches hotter, deeper bands | Heat-rated drill head, coolant |
| Infusion Altar | Magic | Infuses a tool, coil, belt or machine item | Target slot, essence hatches, strength |
| Tempering Forge | Magic | Forge essence into metals: tempered metal for infusion | Input, essence tank, output |
| Frost Shrine | Magic | Ice essence cooling, the magic vacuum freezer | Input, output, essence tank |

## 7. Prism: Precision Age and Warding

**Clean, sealed rooms**.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Cleanroom | Tech | A sealed room; machines inside can run clean recipes | Filters (Tool part), energy |
| Crystal Puller | Tech | Grows silicon boules | Seed crystal (Catalyst), input tank, output |
| Wafer Saw | Tech | Cuts boules into wafers | Saw blade (Tool part) |
| Lithograph | Tech | Prints circuits on wafers | Mask (Shape), inputs |
| Ward Stone | Magic | Purity, hiding, disguise or perfect output in an area | Upkeep essence tank |
| Warded Room | Magic | The magic cleanroom, from ward stones on its walls | (a room) |
| Lens Grinder | Magic | Crystal lenses for bores, observatories, Spell Engines | Input, essence tank, output |
| Salt Fixer | Magic | Salt locks a machine to its best output | Target slot, Salt tank |

## 8. Nexus: Atomic Age and Geomancy

**Placement puzzles around a core**.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Gas Centrifuge | Tech | One step of an isotope cascade | Tanks |
| Fluorinator | Tech | Turns ore into a gas for the cascade | Tanks |
| Fission Reactor | Tech | Layout sets output and heat; throttles, never melts | Fuel rods (wear like Tool parts), coolant |
| Reprocessor | Tech | Spent fuel back into fractions | Input, outputs |
| Ley Nexus | Magic | Where placed stones fall on ley lines sets the aura field | Hatches; layout |
| Gravity Press | Magic | Dense materials from Gravity essence | Input, essence, output |
| Exchange Font | Magic | Exchange essence turns surplus into what's short | Input, essence, output |

## 9. Oracle: Information Age and Spellcraft

**Information as a resource**.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Analyzer | Tech | Studies an item to make research data | Target slot, data out |
| Data Bank | Tech | Stores data patterns for nearby machines | Pattern slots |
| Advanced Assembler | Tech | Crafts only what it has a data pattern for | Many inputs, Pattern |
| Factory Computer | Computation | Programmable control for a section | Program, logic |
| Spell Engine | Magic | Runs a spell card sequence on items passing through | Program (cards), essence tank, Null out |
| Card Inscriber | Magic | Makes spell cards | Inputs, essence, output |
| Scrying Pool | Magic | Lore divination as research data | Target slot, essence, data out |
| Gnosis Eye | Magic | Watches an area and reports as logic signals | Upkeep tank, logic out |

## 10. Zenith: Orbital Age and Celestial

**Leaving the ground**.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Launch Pad | Tech | Sends a payload to the orbital shipyard | Payload, fuel tanks |
| Rocket Assembler | Tech | Builds rockets | Many inputs |
| Cryo Refinery | Tech | Rocket fuels and liquid gases | Tanks |
| Satellite Uplink | Tech | Satellites as passive bonuses | Satellite slots |
| Observatory | Magic | Constellations; boosts sky rituals | Lens (Tool part) |
| Starlight Collector | Magic | Renewable Starlight, like solar | Essence tank |
| Levitation Platform | Magic | Sky rituals that lift loads | Hatches |
| Sulfur Athanor | Magic | Sulfur, the catalyst principle | Tanks |

## 11. Sunforge: Fusion Age and Summoning

**Containing something enormous**.

| Machine | Track | Does | Storage |
| --- | --- | --- | --- |
| Fusion Reactor | Tech | Startup power, then plasma to power | Big energy buffer, plasma tanks, containment |
| Plasma Conduit | Tech | Plasma pipes that need power | Containment |
| Coil Winder | Tech | Superconducting coils | Inputs, output |
| Tritium Breeder | Tech | Breeds fusion fuel | Inputs, tanks |
| Summoning Circle | Magic | Calls and binds a great spirit | Hatches, containment |
| Familiar Roost | Magic | Home node for familiars; their range and carry limit | A small buffer per familiar |
| Vitality Womb | Magic | Grows organic machine parts | Seed, essence tanks, output |

## Combined Tiers

| Machine | Tier | Does | Storage |
| --- | --- | --- | --- |
| Containment Vessel | C1 | Holds exotic matter while powered | Containment tank |
| Antimatter Trap | C1 | Antimatter as power storage | Containment, energy |
| Null Reactor | C1 | Null compounds with exotic matter | Hatches |
| Matter Replicator | C2 | Makes an element from power, base matter and its pattern | Pattern, input, output |
| Great Athanor | C2 | Salt, Sulfur and Mercury into the Philosopher's Stone | Hatches |
| Shipyard | All | Takes each era's capstone | Payload hatches |

# What This Asks of Inventories

The machines above are what [Inventories](Inventories.md) is shaped around. That note holds the rules; this is where each need lands:

- **Slot roles and tanks**, each with its own rule for when it's consumed: [Machine Inventories](Inventories.md#machine-inventories).
- **Fluids** move through the same transfer interface as items, in ml: [Moving Items](Inventories.md#moving-items). Magic alone adds about 44 fluid keys, so fluids aren't an edge case.
- **Containers**: whole-only (a bucket holds exactly 1 m^3, bottles and essence jars their own sizes) and any-amount portable tanks: [Containers](Inventories.md#containers).
- **Wear** on tool parts, fuel rods and filters: [Wear](Inventories.md#wear).
- **Shapes, programs, patterns and upgrades** are filled by hand: [Hand-Only Roles](Inventories.md#hand-only-roles).
- **Capacities that grow** with grade, upgrades and parallels: [Capacity](Inventories.md#capacity).
- **Multiblock hatches, ritual pedestals and the Transmutation Pool**: [Multiblocks](Inventories.md#multiblocks) and [Item Entities as a Source](Inventories.md#item-entities-as-a-source).
- **`unique` items**: wands, filled portable tanks, and a machine packed with its state, if that item is added: [Items and Counts](Inventories.md#items-and-counts).
- **Data cards** are plain: a research result or matter pattern as a component, so equal patterns stack.
- **Non-item resources** (power, heat, pressure, containment, data on a cable, logic signals, aura) are machine state, not inventories. They are saved with the machine and read by logic, but don't go through `insert` and `extract`.

# Open Questions

- **Grades without power**: what a grade limits on a magic machine that draws no power, such as essence per second.
- **Wear steps**: how coarsely wear is rounded on parts taken out.
- **Heat loss**: how much a heat pipe loses per meter, and whether better pipes lose less.
- **Infusions on a broken machine**: whether they count as what the machine is made of (kept, like quality) or as state (dropped). Dropping them would destroy the player's work, which the pillars avoid.
- **Packing machines**: what item packs up a machine with its state, and when it unlocks.
- **Magic capstones**: what a magic tier ends in ([Tiers](../Gameplay/Tiers.md#open-questions)), which may add machines to the shipyard.
