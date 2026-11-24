---
status: decided
---

# Resource Packs

Packs of assets that change how the game looks and sounds, without code and without touching gameplay. Planned, but no pack is built yet. What is built now is what mods need anyway: the layered asset lookup and the rule and look tagging from [Mods](Mods.md#rules-and-looks). A working pack format falls out of those.

# Format

A pack is a folder or a zip in `<home>/resourcepacks/<pack>/`:

```
<pack>/
  pack.kvt        id, version, description, the game and mod versions it targets
  icon.png
  <namespace>/
    textures/
    models/
    render_materials/
    sounds/
    fonts/
```

A pack only replaces other namespaces' files, so it is laid out like a plugin's `overrides/` folder ([Mods: Content Folders](Mods.md#content-folders)), and one lookup serves packs, mods and the base game.

# What a Pack Can Change

- Asset files, by their namespaced path.
- The *look* fields of definitions (textures, models, sounds, particles, emitted light).

A pack can't contain scripts or code, and can't change rules. The loader rejects anything else in a pack. That includes filter shaders: they run code on the GPU and can hang the driver, so replacing them is a job for client mods.

# Layering

When the game looks up an asset or a look field, the top layer that has it wins:

1. Enabled resource packs, in the order the player picks.
2. Mods, later ones in dependency order over earlier ones.
3. The base game.

The player's pack order is saved in `<home>/settings/client.kvt`. Mods use the same layering to restyle the base game's blocks.

A pack doesn't have to cover everything: whatever it leaves out comes from the layers below. That includes packs made for an older version of the game or a mod, so the versions a pack targets in `pack.kvt` only show a "made for version X" note in the pack list.

# Packs From a Server

A server can suggest a pack. If the player agrees, the client downloads it into `cache/resourcepacks/<sha256>/` and uses it while connected. Because packs hold no code, this is the only thing a server may send a client automatically ([Mods](Mods.md#never-downloaded-automatically)).
