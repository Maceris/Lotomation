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

Mods are jars so they have everything the game is built on: the event system, and the same APIs Factory-Client and Factory-Server use. There are no mods made only of data or scripts.

# The Base Game

The base game is not a mod. It is the platform: Factory-Core (the shared definitions and APIs), Factory-Server and Factory-Client, plus the default content in `plugins/Factory-Core/data/mods/lotomation/`. Its content loads first, through the same registry APIs mods use afterwards.

When a client and server compare mods, the base game is listed under the id `lotomation` with the game version, so a game version mismatch is reported the same way as a mod mismatch.

# Declaring a Mod

A mod is declared in the plugin's `plugin.yml` (or a `mod.kvt` in the jar), not by registering at runtime. The declaration must be readable without running any mod code, so a client can compare its mods with a server's, and show what is missing, before loading anything.

A declaration gives:

- **Mod id and version.** One mod id can cover several plugins, the way the base game is split into Core, Server and Client: for example `CreateIsh-Core`, `CreateIsh-Server` and `CreateIsh-Client` all declaring mod id `create-ish`. A small mod can be one jar.
- **Side** of each plugin: `both`, `server` or `client`.
- **Compatible versions** (optional): a range such as `>=1.2 <2` that the author says can connect to each other. Without one, the client and server need the exact same version.
- **Dependencies** on other mods, with version ranges. Mods depend on each other like plugins do; big mods such as an overhaul or a shared API are the base many others build on.

Content itself (blocks, recipes, worldgen) is registered at runtime through the registry APIs.

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

1. **Defaults:** the base game registers its content.
2. **Edit:** mods add, change and remove entries through the official APIs, in dependency order.
3. **Freeze:** no more changes. Numeric ids are assigned for this run, or synced from the server on a client. Saves store names, never numeric ids ([Save File Format](Save%20File%20Format.md#names-not-numeric-ids)).

A mod that must run early, such as an overhaul that reworks the base game's recipes before other mods add to them, does so by being a dependency of later mods, or through a soft "load after" for mods that don't otherwise depend on it. There are no numeric load priorities.

Editing the base game's data files directly (by hand, or with a custom launcher) is not standard practice, but it is allowed. It is mostly for single-player, where the local server reads the edited files. Online, the server's files are what count.

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

# Changes This Needs

- **Ikala-Core:** a "load after" soft ordering, plugins loaded from several folders, and choosing between installed versions.
- **Factory-Core:** the mod declaration, the three load phases, rule and look tagging in the definition APIs, canonical registry encoding and hashing, and a reset back to the defaults.
- **Factory-Client / Factory-Server:** the mod list comparison and registry sync in the connection handshake, and loading and unloading mods around a connection.
- Plugin unload tests should cover connect, disconnect and connect again.
