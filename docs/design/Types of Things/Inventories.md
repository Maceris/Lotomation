---
status: draft
---

# Inventories

How items are stored, counted, shown, found and moved: the player's inventory, storage blocks, machines, and the one transfer interface between them. Companion to [Machines](Machines.md), [Factory Network](../Simulation/Factory%20Network.md) and [Game Interface](../Rendering/Game%20Interface.md).

The player inventory works more like Factorio than Minecraft: it has no size limit, every stackable item type has one entry with one count, and it is always sorted. A player can carry a hundred thousand item types with billions of each, so storage, sorting and search are built for that.

# Items and Counts

- **An item key** is an item type id plus the components that stack overrides from the type's defaults (the Minecraft 1.20.5 model). Override sets are canonical and interned, so two keys are equal when they are the same object, and most keys are just the type id.
- **Counts are 64-bit**, capped at **2^61** (2,305,843,009,213,693,952). Adding any two counts at or below the cap fits in a `long`, so a merge adds, then compares with the cap; no checked arithmetic on the hot path.
- **Stacking modes**, chosen by the item definition:

| Mode | Examples | Storage | Merging |
| --- | --- | --- | --- |
| `plain` | blocks, ingots | key -> count | Counts add. |
| `pooled` | charge, freshness | key -> count and a pooled total | Counts and totals add; taking N items takes the average value. |
| `unique` | wands, part-filled portable tanks, renamed items | a list of records under the type | Never merge; the grid shows one icon that expands. |

- **`plain` and `unique` are built first.** Wands (a sequence of spell cards) and part-filled portable tanks are early `unique` items ([Machines](Machines.md#what-this-asks-of-inventories)).
- **`pooled` is reserved.** Nothing planned uses it, so it is a reserved name in the item definition, and the inventory save format carries a version so adding it is a migration.
- **Wear is not `pooled`.** Worn parts are plain items with a rounded wear component; see [Wear](#wear).
- **Names can come from components**, like "Bucket of Water", and search matches those names too.
- **Items from a missing plugin** are kept as placeholder records with their original key and count. They show as "unknown item", can't be used, and turn back into the real item when the plugin returns. Nothing is deleted because a plugin is gone.

# Merged Inventories

The player inventory and storage blocks (chest-like containers) are merged inventories: a map from item key to count, with no slots.

- **Items only.** The player inventory holds fluids only inside containers (buckets, bottles, jars, portable tanks). Fluid storage blocks are tanks, not merged inventories.

- **One entry per stackable key.** A key at the cap takes nothing more: pickups, transfers and crafting results stop there.
- **Partial moves:** when an item entity, a container or a machine offers more than fits, the part that fits moves and the rest stays where it was.
- **Crafting** is refused when its result would go past the cap, rather than voiding the result.
- **When a key is full**, the player sees "\<item\> is full" once, not on every tick while standing on a pile.
- **Storage blocks have no size limit** for now.
- **Death never drops the inventory.**

## Pickup Lists

Each player has three lists of item keys (or searches):

- **No pickup:** these items stay on the ground.
- **Auto-void:** these are destroyed as they are picked up.
- **Void when full:** these are picked up normally, and the part that would go past the cap is destroyed instead of left on the ground.

## Item Entities

- **One entity holds one key and a 64-bit count**, never one entity per stack.
- **Entities of the same key within 0.75 m of each other merge**, so a dropped mountain of items is still one entity.

# Showing Counts

- **Exact** up to 9,999.
- **Then 3 significant figures** with a suffix: `10.2K`, `152K`, `1.52M`, `2.14B`, `3.07T`, `4.11Qa`, `2.30Qi`.
- **Always rounded down**, so 999,999 shows `999K`, never `1M`. The player never sees more than they have.
- **An option** switches the suffixes to scientific notation (`2.30e18`). The default is the suffixes.
- **The tooltip** shows the exact count with thousands separators.

# The Inventory Screen

A scrolling grid of item icons (or models) with their counts, a search bar above it, and a sidebar of filters. The grid only builds the rows on screen.

## Taking and Depositing

- **A click takes the whole entry** onto the cursor.
- **Right-click takes half.**
- **Taking an exact amount:** a slider and a text field. The slider is logarithmic, because counts span nine orders of magnitude. The field accepts `64`, `1k`, `1.5m`, `half` and `all`. The last amount is remembered per item.
- **Clicking a held stack on an inventory deposits as much as fits**, which can be far less than what is held, like dropping an entry of 2 quintillion onto a machine slot that holds 10. The rest stays on the cursor.
- **Clicking held containers on a machine** empties or fills whole containers only, as many as fit, through the machine's container rule ([Containers](#containers)).
- **Closing the screen** returns whatever is on the cursor to the inventory.
- **Quick-stack to nearby containers** (Terraria style): deposits everything a storage block within 10 m already holds, and nothing else.
- **Locked items** are skipped by quick-stack and every other deposit-all. The lock is a per-player list of item keys, toggled from the item's context menu, and locked entries show a small lock on their icon.

## Hotbars

- **Hotbar slots refer to inventory entries.** They are not a container and hold no items: a slot shows an item and its inventory count, and using it draws from the inventory. A slot whose item runs out keeps its reference and shows 0.
- **10 hotbars of 10 slots**, one shown at a time, with its number beside it.

| Input | Does |
| --- | --- |
| 1-0 | Select a slot in the shown hotbar |
| Left Ctrl + 1-0 | Show that hotbar |
| Left Ctrl + mouse wheel | Cycle through the hotbars |

Left Ctrl is also sprint, so while sprinting the number keys switch hotbars rather than slots. Left Alt isn't used because holding it frees the mouse ([Game Interface](../Rendering/Game%20Interface.md#key-bindings)), so the wheel would scroll whatever GUI is under the cursor.

A clickable hotbar switcher like Factorio's may come later.

## Sorting

- **The grid is always sorted.** Sort by **name**, **count**, **mod** or **material**, ascending or descending. Ties break by name, then by key, so the same inventory always gives the same order.
- **Group by** category, mod or material, with a header over each group.
- **No jumping:** the order is worked out again when the screen opens, when the search, sort or grouping changes, and when the mouse leaves the grid. Items that arrive in between take their sorted place at the next of those, and are highlighted briefly.
- **Recently acquired** is a separate small bar of the last ~10 item keys picked up, which can be turned off. Only those few are tracked, not times for the whole inventory.

## Search

EMI's syntax, since players coming from modpacks already know it:

| Syntax | Matches |
| --- | --- |
| `word` | name contains the word (localized and English) |
| `@mod` | the item's mod or plugin |
| `#tag` | the item has the tag |
| `$text` | tooltip text |
| `/regex/` | name matches the regular expression |
| `"two words"` | the exact phrase |
| `a b` | both |
| `a\|b` | either |
| `-term` | excludes the term |
| `key:value`, `key>value` | a field: `material:iron`, `count>1m` |

- **Fields** extend the search without spending a new symbol on each: `material:` and `count` to start.
- **Autocomplete** for mod, tag and material names.
- **Speed:** each item key keeps a lowercased name (localized and English), its tag ids as a bitset, and a collation key for sorting by localized name. A substring scan over 100,000 names takes milliseconds, so there is no search index. Tooltip text is built in the background and cached.

## Sidebar

- **Every sidebar entry is a filter.** Selecting one combines it with whatever is in the search bar, and each entry shows how many items it matches.
- **Built-in categories** are saved searches, such as Building as `#building` and Food as `#food`.
- **User entries** are either saved searches or pinned lists of chosen items.

# Moving Items

All item and fluid movement goes through one interface, whatever is on either side: players, merged inventories, machines, tanks, pipes, belts and item entities. It is generic over the resource: item keys moved in counts, and fluid keys moved in ml.

```java
interface Storage<K extends ResourceKey> {
	long insert(K key, long amount, AccessContext context, Transaction tx);
	long extract(K key, long amount, AccessContext context, Transaction tx);
}
```

- **Each returns how much it actually moved.** Partial moves are normal.
- **Fluid keys** work like item keys: a fluid type plus component overrides, interned. Fluid amounts use the same 2^61 cap, in ml.
- **Transactions** commit or roll back every side together, so nothing is ever in two places or none. One transaction can move items and fluids at once, like a full bucket whose water goes to a tank while the empty bucket goes to a slot. Fabric's Transfer API (`Storage<ItemVariant>` and `Storage<FluidVariant>` with transactions) is the model.
- **Simulating is just rolling back:** a pipe asks how much a machine would take by inserting in a transaction it then aborts. Rules decide during the transaction, and nothing outside the inventories changes until commit, so a simulated move and a real one always agree.
- **The access context** says who is moving (a player, a belt or pipe, a machine) and through which port: a machine face, or a multiblock hatch. The same inventory can answer a player and a pipe differently.
- **Committing wakes machines.** A Starved or Blocked machine sleeps until something changes ([Status](Machines.md#status)), so a committed insert into it, or extract from it, wakes it to check again.
- **Auto-output** is the machine itself moving: it extracts from its own output slots and inserts into whatever is on a pushing port, as the actor.
- **The server decides.** Client prediction only changes what the player sees until the server's answer arrives.

# Machine Inventories

Machines have fixed slots and tanks instead of a merged map. A slot holds one item key and a tank one fluid key; each has a capacity and a role, and never merges with its neighbors. The roles are those in [Item slots](Machines.md#item-slots): input, output, byproduct, fuel, catalyst, tool part, shape, program, pattern, upgrade, container and payload. Each role has its own rule for when it's consumed, which the recipe reads.

Whether a machine takes something is decided in layers, and each layer can only narrow what the one before it allowed:

1. **Inherent limits:** from the machine type, the same for every block of it. The slots and tanks, their capacities, and what each role can hold, as a union of sources. Plugins widen a role only by registering a source.
2. **Configuration:** set by the player on each machine. Recipes, slot filters and locks, and port assignments. Which of these each machine type offers is up to the type.
3. **Current state:** free space, and how much of each ingredient the configured recipes want buffered. This turns "allowed" into an amount.

## Capacity

- **Capacity depends on the machine's grade and upgrades,** and is worked out again with its acceptance tables. A parallel-64 machine needs 64 crafts' worth of each input.
- **Shrinking never destroys anything.** When an upgrade comes out and a slot holds more than its new capacity, the items stay; the slot takes nothing more until it's below capacity again.

## Hand-Only Roles

Shape, program, pattern and upgrade slots set what a machine does rather than feeding it, so **automation doesn't fill them** unless a port is assigned to that slot, for setups that swap molds or programs on purpose. Players fill them by hand. Without this, a belt of molds could land in the shape slot and quietly change what the machine makes.

## Wear

- **Wear is tracked in the slot while a part is in a machine,** exactly, as a value on the part in use. A tool-part slot holding several parts wears only the one in use.
- **Wear is rounded only when a part comes out,** toward more worn (to steps such as every 10%), and kept as a wear component. Rounding toward fresher would let taking a part out and putting it back undo wear.
- **Taking out N parts** gives N-1 fresh ones and 1 worn one, as two keys. A fresh part has no wear component, so fresh parts stack as one plain entry.
- **Putting a worn part in** reads its wear component into the slot.

## Containers

- **Whole-only containers** (buckets, bottles, essence jars) hold exactly their size of a fluid, or nothing. The fluid is a component, so full buckets of water are one plain key. Machines fill and drain them whole: the fluid moves to or from a tank, and the container goes to or from a container slot, in one transaction.
- **Any-amount containers** (portable tanks) store a fluid by the ml. Empty ones are plain and stack; a filled one is `unique`.

## Multiblocks

A multiblock's slots and tanks are spread over its hatches. The controller sees one combined inventory per role; each hatch is a port that belts and pipes connect to, and the access context names the hatch an insert came through. Ritual pedestals are one-slot hatches.

## Item Entities as a Source

Machines that take dropped items, like the Transmutation Pool, turn an item entity touching them into an ordinary insert with the entity as the source.

Example sources for the inherent limits:

```
input slots    <- inputs of every recipe this machine type can run
fuel slot      <- items with a burn value
upgrade slots  <- items tagged #upgrade/<machine type>
```

## Recipes

- **A recipe is both a filter and a behavior.** A machine configured with recipes accepts only the union of their inputs, and only makes those recipes.
- **Ingredients are limited by amount, not just allowed:** each configured recipe asks for a couple of crafts' worth of its inputs, and an ingredient several recipes share gets the sum. Without that, a pipe full of one shared ingredient fills every slot and the machine stalls waiting for another.
- **A "fill up" toggle** drops the per-recipe buffer and takes as many inputs as the slots hold.
- **When several recipes can run,** the first in the configured order runs.

## Where an Item Goes

A rule picks the slot, not just yes or no. For an item that could go in more than one slot, such as wood that both burns and smelts, the first of these that decides wins:

1. **Port assignment:** this face or hatch feeds that slot.
2. **Slot filter or lock.**
3. **Configured recipe.**
4. **A slot already holding that key** gets more of it, so pre-filling a slot steers what follows.
5. **The machine type's default order of slot roles,** such as input before fuel. Hand-only roles are never in it.

There is always an answer, so an insert behaves the same way every time. Every decision carries the rule that made it (`ROUTED: fuel via north face`, `REFUSED: input filter`), which the UI shows on pipe connections and in a "why isn't this moving" view, and tests can check.

## Who the Rules Apply To

- **Configuration applies to automation.** A player can put items in by hand that a filter or port assignment would turn away from a pipe.
- **Inherent limits apply to everyone.** A machine refuses an item it could never use, from a player too.

## Items a Machine No Longer Accepts

- **Filters only decide what goes in.** They never invalidate what is already inside.
- When the configuration changes or a plugin's recipe goes away, items already in the input slots stay where they are. If the machine can't use them, it stops. Automation doesn't pull them out; the player takes them out by hand.

## Breaking a Machine

Everything in its slots, upgrade slots and hatches goes to the player who broke it, as items. **Fluid in its tanks is lost**, since the player inventory holds fluids only in containers. The machine itself becomes a plain item ([Identity](Machines.md#identity)).

## Speed

Pipes ask machines what they accept constantly, so rules don't run on each ask. Item and fluid keys are interned integer ids, and each machine keeps an acceptance table per slot and port: the intersection of its inherent limits and its configuration, with the capacities. The table is rebuilt when the configuration, grade or upgrades change, when the recipe, item or fluid registries change, or when a plugin loads or unloads. Each tick, an ask is a lookup plus a free-space check.

Rules that plugins register come with handles, and unloading the plugin removes them and rebuilds the tables.

# Networking and Saves

- **The server sends inventory changes keyed by item key,** never the whole inventory. The client keeps the sorted view and patches it.
- **Saves** store each inventory as its keys and counts, with a format version (see [Save File Format](../User%20Data/Save%20File%20Format.md)).

# Open Questions

- **Hotbar switcher:** whether to add a clickable one like Factorio's.
- **Quick-stack targets:** only storage blocks, or machines as well.
- **Machine types:** the slots, capacities and configuration options each machine type offers.
- **Storage block limits:** unlimited for now; a limit by types, by total count or by tier may come later.
- **Pooled values:** if charge or freshness are ever added, whether averaging is too generous.
- **Wear steps:** how coarse the rounding is when a part comes out ([Machines](Machines.md#open-questions)).
