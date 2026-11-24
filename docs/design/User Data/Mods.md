---
status: decided
---

# Mods

How mods are built, loaded and matched between a client and a server. Companion to [Folder Structure](Folder%20Structure.md), [Resource Packs](Resource%20Packs.md) and [Save File Format](Save%20File%20Format.md).

**Core rule: the server is always the authority.** A player can edit the base game's files by hand or run client mods that never tell the server, so nothing the client has decides what can be done or how it happens. The server checks every action and sends the client the rules it plays by.

# Three Kinds of Add-on

| Kind | What it is | Matched between client and server? |
| --- | --- | --- |
| Plugin | Any Ikala plugin: graphics, ECS, a rendering upgrade, a profiler. | No (only the protocol version) |
| Mod | An Ikala plugin, so a jar, that also declares itself a Lotomation mod. | Yes, when it runs on both sides |
| Resource pack | Assets only, client only, no code. See [Resource Packs](Resource%20Packs.md). | No |

Mods are always plugins, so they have everything the game is built on: the event system, and the same APIs Factory-Client and Factory-Server use. A mod doesn't need code: a jar holding only its `plugin.yml`, with its content in its data folder ([Content Folders](#content-folders)), is a whole mod. It is installed and trusted like any other plugin, since scripts have plugin trust.

# The Base Game

The base game is split the same way a mod with code would be: an engine and its content.

- **The engine** is Factory-Core (registries, worlds, chunks, the worldgen engine, networking, the content loader), Factory-Server and Factory-Client. They ship no content. Their data folders hold only what the engine itself uses, such as Factory-Client's interface images.
- **The content** is the `Lotomation` plugin: a jar with no code that depends on Factory-Core, and a data folder with the blocks, items, worldgen, looks and everything else that makes up the world. It loads through the same path as every mod, just first, since everything depends on it. Its namespace is `lotomation`.

| Runs | Plugins |
| --- | --- |
| Dedicated server | Ikala-Core, EntityComponentSystem, Factory-Core, Factory-Server, Lotomation |
| Client | the same, plus Ikala-Graphics and Factory-Client |

The same Lotomation folder serves both: the server never reads its client-only folders, and a server download may leave them out.

A pack can disable Lotomation and bring its own world on the same engine. Engine tests use small content of their own, so changing the game's blocks doesn't break them; checks of the game's own world belong with Lotomation.

When a client and server compare mods, the base game is listed under the id `lotomation` with the game version, so a game version mismatch is reported the same way as a mod mismatch.

# Declaring a Mod

A mod is declared in the plugin's `plugin.yml` (or a `mod.kvt` in the jar), not by registering at runtime. The declaration must be readable without running any mod code, so a client can compare its mods with a server's, and show what is missing, before loading anything.

A declaration gives:

- **Mod id and version.** The mod id defaults to the plugin's name in lower case. One mod id can cover several plugins, the way the base game is split into an engine and its content: for example `CreateIsh` (its content, and code both sides run), `CreateIsh-Server` and `CreateIsh-Client` all declaring mod id `createish`. A mod's content all sits in one of its plugins, so it has one namespace. A small mod can be one jar.
- **Side** of each plugin: `both`, `server` or `client`.
- **Compatible versions** (optional): a range such as `>=1.2 <2` that the author says can connect to each other. Without one, the client and server need the exact same version.
- **Dependencies** on other mods, with version ranges. Mods depend on each other like plugins do; big mods such as an overhaul or a shared API are the base many others build on.

Content itself (blocks, recipes, worldgen) comes from the mod's data folder ([Content Folders](#content-folders)), and code can add to or change it through the registry APIs ([Load Phases](#load-phases)).

# Content Folders

**A plugin's namespace is its name in lower case.** Names must match `[a-z][a-z0-9_-]*` once lowered, so the `Lotomation` plugin's content is `lotomation:stone`, and `Ores2`'s is `ores2:copper_ore`. A plugin has exactly one namespace, so its own content sits directly in its data folder with no namespace folder. Every enabled plugin that depends on Factory-Core, directly or not, is read for content, so the engine's own data folders (Graphics' shaders, say) never are:

```
plugins/<Plugin>/data/
  blocks/  items/  tags/  materials/  recipes/  worldgen/   rules: read by the server and the client
  looks/  models/  textures/  render_materials/  sounds/    looks: read only by the client
  overrides/<namespace>/...                                 replacing another plugin's files
```

- **IDs come from paths,** as the worldgen data already does: `data/blocks/stone.kvt` is the block `lotomation:stone`, and `data/textures/block/stone.png` is the texture `lotomation:block/stone`. One file per thing, so a later plugin can replace a single block, and nothing has to merge one big table across mods.
- **Rules and looks share the folder,** split by kind rather than by a top-level folder. A dedicated server skips the look kinds; a client reads both. A block's look is in the same namespace as the block, so they always travel together.
- **`materials` are gameplay materials** (bronze, steel: what things are made of, see [Materials](../Types%20of%20Things/Materials.md)). How a surface reflects light is a **render material**, in `render_materials`. A look's `material` key still names a render material, since looks are client only and can't mean the other kind.
- **Overrides** replace a file of another namespace: a plugin that restyles the base game's stone puts its texture at `overrides/lotomation/textures/block/stone.png`. Overrides are rare and deliberate, and the folder makes them easy to see. A plugin that overrides another must load after it, as a dependency or through "load after", so which one wins is always defined. [Resource packs](Resource%20Packs.md) are made only of overrides.
- **What isn't content stays put:** an engine plugin's own files, such as Ikala-Graphics' shaders and fonts or Factory-Client's interface images, are not read as content.

# Sides

| A mod... | Side | Clients need it installed? |
| --- | --- | --- |
| only adds or edits rules, adds server logic or commands | `server` | No: its effects reach clients through the rule sync |
| adds things with new looks (blocks, items, machines), new screens, client code | `both` | Yes |
| only changes the client (rendering, UI, minimap) | `client` | No, and the server never hears of it |

- A `server` mod can't add anything that needs a client-side look or code. Anything that adds a new block or item is `both`.
- A save records its `both` and `server` mods with their versions ([Save File Format](Save%20File%20Format.md#savekvt)). Client-only mods are never recorded.
- A client can report its client-only mods and a server may refuse some, but that only takes the client's word for it. It is not enforcement.

# Load Phases

Registries are filled in three phases:

1. **Files:** every enabled plugin's content folder is read, in dependency order, so the base game comes first. Within that, kinds load in a fixed order, since each refers to the ones before it: tags, materials, blocks (which register their items), items, recipes, worldgen. A file replaces one with the same ID read earlier, which is how overrides win.
2. **Edit:** mods with code add, change and remove entries through the official APIs, in dependency order. Each kind fires its `Loading` event after its files are read, and its `Completed` event after the edits.
3. **Freeze:** no more changes. Numeric ids are assigned for this run, or synced from the server on a client. Saves store names, never numeric ids ([Save File Format](Save%20File%20Format.md#names-not-numeric-ids)).

A mod that must run early, such as an overhaul that reworks the base game's recipes before other mods add to them, does so by being a dependency of later mods, or through a soft "load after" for mods that don't otherwise depend on it. There are no numeric load priorities.

Editing the base game's data files directly (by hand, or with a custom launcher) is not standard practice, but it is allowed. It is mostly for single-player, where the local server reads the edited files. Online, the server's files are what count.

## Reloading

Registries are frozen, not fixed for good: a plugin can reload its own content while a world is open, such as a minigame built on the base mechanics, or a mod author trying a change. The registry compares the new content with the old and applies what it safely can. What it can't apply is reported, not half-applied.

| Change | Takes effect |
| --- | --- |
| Looks, models, textures, render materials, sounds | At once |
| Tags, recipes, and new blocks or items (new numeric ids are added at the end and sent to clients) | At once |
| Worldgen, or changing or removing a block or item | When the world is next opened |
| Anything in a mod that declares `reload: restart`, such as a big overhaul | When the game restarts |

On a server, changes that take effect at once go to connected clients through the rule sync like any other rule change.

# Rules and Looks

Every definition field is either a rule or a look, tagged in the definition API. **A field is a rule unless nothing on the server ever reads it**; when in doubt, it is a rule.

| Rules (server owned) | Looks (client owned) |
| --- | --- |
| Recipes, hardness, drops, stack sizes, what a machine does, worldgen | Textures, models, sounds, particles, emitted light |

**On connect, the server sends its rule registries**, as they stand after all of its mods loaded, together with its numeric ids. The client uses them for prediction, the recipe book, tooltips and machine screens. So:

- A client's own edits to rules don't apply online, and can't make the client show the wrong recipes.
- A server's hand-edited files are simply that server's rules.
- Looks stay local, which is what resource packs and client mods change.

## Hashes

The synced registries are encoded in a canonical form (sorted keys, no comments, no source order) and hashed per registry and per entry. KVT binary already sorts keys and drops comments.

- Hashes are only for skipping the download: the client caches registries it was sent under `cache/registries/<hash>.kvt`.
- Reordering, reformatting or commenting a data file changes no hash. Changing one recipe's ingredients changes that entry's hash and nothing else.
- Per-entry hashes allow a precise notice, such as "this server changes 14 recipes and 2 blocks". It informs; it doesn't refuse.

The only mismatch that refuses a connection is something the server can't send: code and looks for content the client doesn't have, such as a new block's model or a new machine's screen. There are no placeholder looks: a client missing a `both` mod is refused, and told which mods and versions it needs.

# Loading on Connect

Mods are hot-reloadable, so a client loads a server's mods when it connects and unloads them when it disconnects.

On connect:

1. The client receives the server's mod list.
2. It finds installed mods with matching versions under `<home>/mods/<mod-id>/<version>/`.
3. It loads them and runs the Edit phase on a clean copy of the base defaults.
4. It applies the rule registries the server sent.

On disconnect, it unloads those mods and resets the registries to its own defaults. Plugins the player always runs (client-only rendering or UI) stay loaded throughout.

- Single-player works the same way: the local server loads the save's mods, and the client loads the matching set when it connects to it.
- Several versions of a mod can be installed side by side, since different servers can need different versions.
- The base defaults are kept as a template rather than edited in place, so going back to them is cheap.
- Caches are unaffected: LOD cells are named by their content and synced registries by their hash, so switching mod sets never serves stale data.

## Never Downloaded Automatically

A client never downloads a mod from a server automatically. Mods are code, and with no central mod portal any server could send anything. Scripts have plugin trust too, so data that includes scripts counts as code.

The server sends its mod list with ids and versions, and the player finds and installs them on purpose. Where a mod comes from is not something the game knows. The only thing a server may send automatically, with the player's agreement, is a [resource pack](Resource%20Packs.md).

# Installing and Removing

- **A mod is shared as a zip** holding its jars and each plugin's folder, as they sit in `plugins/`: `CreateIsh-1.2.jar`, `CreateIsh/`, and so on.
- **Installing** unpacks it into `<home>/mods/<mod-id>/<version>/` ([Folder Structure](Folder%20Structure.md#layout)), by hand or from the game's mod list. A dedicated server installs mods the same way, or puts them in one instance's `plugins/` folder for that instance only, so a modpack server can be one folder with all its mods in it.
- **Removing** deletes that folder. A save made with the mod keeps the mod's blocks, items and entities as placeholders that keep their names, so installing the mod again brings them back. The owner can also remove them for good, or swap them for something else ([Save File Format](Save%20File%20Format.md#removed-content)). A save records its mods, so the game warns before opening a world whose mods are missing.

# Changes This Needs

- **Ikala-Core:** a "load after" soft ordering beyond `soft-dependencies`, plugins loaded from several folders, and choosing between installed versions.
- **Factory-Core:** the mod declaration, the Edit and Freeze phases as their own steps, rule and look tagging in the definition APIs, canonical registry encoding and hashing, a reset back to the defaults, and comparing content on reload.
- **Factory-Client / Factory-Server:** the mod list comparison and registry sync in the connection handshake, and loading and unloading mods around a connection.
- Plugin unload tests should cover connect, disconnect and connect again.
