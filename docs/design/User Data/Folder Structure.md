---
status: decided
---

# Folder Structure

Where the game's files live: what ships, what each player's machine writes, and what a hosted game keeps. Companion to [Save File Format](Save%20File%20Format.md), [Accounts and Identity](Accounts%20and%20Identity.md), [Mods](Mods.md) and [Resource Packs](Resource%20Packs.md).

**Core rule: the install folder is read-only while the game runs.** Anything the game writes goes into the Home folder or into an instance (save) folder. If something wants to be written next to the jars, it is in the wrong place.

# Three Roots

| Root | What it is | Written while running? |
| --- | --- | --- |
| Install | The game as shipped: Ikala-Core jar, libraries, plugins with their shipped config, data and scripts. The same on every machine. In development, this is the Lotomation repository. | Never |
| Home | One per user per machine: client settings, identity keys, server list, saves, installed mods and resource packs, caches, client logs. | Yes |
| Instance | One save folder. The whole state of one hosted game, including its server identity, accounts and logs. | Yes, by the server hosting it |

Single-player is an instance whose server does not open a port. A dedicated server is the same thing run headless. Several servers on one machine are several instance folders sharing one install.

# Install (the Repository)

The repository is both the template for the game and a copy we run during development, so it holds what ships plus build output that is ignored.

```
Lotomation/
  build.gradle, settings.gradle, gradle/, gradlew*, gradle.properties   tracked
  README.md, LICENSE                                                   tracked
  docs/                          tracked, except .obsidian/workspace*.json
  bin/                           tracked: runGame, runGameDebug, runServer
  Ikala-Core-*.jar               ignored (built)
  libs/                          ignored (built / copied)
  plugins/
    *.jar                        ignored (built)
    <Plugin>/config/             tracked: shipped defaults only
    <Plugin>/data/               tracked, binaries in LFS
    <Plugin>/scripts/            tracked
    Factory-Core/data/mods/lotomation/   tracked: the base game's content
  test-data/                     tracked (LFS): small saves and test keys for tests, never real ones
```

- The base game's content stays in Factory-Core's data folder. The base game is the Factory plugins plus this content, not a separate mod (see [Mods](Mods.md#the-base-game)). The `mods/<mod>/` layout inside it is the content namespace the worldgen data already uses ([Generation Data Format](../World%20Generation/Generation%20Data%20Format.md)).
- Run scripts move into `bin/`, and `runServer` is added. They pass no Home override: development builds use the real Home folder and are treated as a development version of the game (see [Development Builds](#development-builds)).

## What Git Ignores

```
# Built output
Ikala-Core*.jar
plugins/*.jar
libs/
build/
.gradle/

# Runtime output that must never land in the install folder (safety nets)
logs/
*.log
session.lock
gui.ini
last-version.txt

# Keys: never committed outside test-data
*.key
*.pem
!test-data/**/*.key
!test-data/**/*.pem

# Tools
.idea/**
*.cap
docs/.obsidian/workspace*.json
```

`plugins/*/last-version.txt` is committed today. It is per-machine state written by the Ikala-Core launcher, so it moves to the Home (`state/plugin-versions.kvt`) and the committed copies are removed with `git rm --cached`.

# Home

## Location

| Platform | Home | Cache |
| --- | --- | --- |
| Windows | `%APPDATA%\Lotomation` | `%LOCALAPPDATA%\Lotomation\cache` |
| Linux | `$XDG_DATA_HOME/lotomation` (`~/.local/share/lotomation`) | `$XDG_CACHE_HOME/lotomation` (`~/.cache/lotomation`) |
| macOS | `~/Library/Application Support/Lotomation` | `~/Library/Caches/Lotomation` |

- The cache is separate because it is large (the LOD cache alone is capped at 2 GiB) and must not be in Windows' roaming profile, which is copied between machines on some networks.
- `-Dlotomation.home=<dir>` or `--home <dir>` moves the Home, and `-Dlotomation.cache=<dir>` moves the cache. Without a cache override, a moved Home keeps its cache in `<home>/cache`.
- A `portable` marker file next to the Ikala-Core jar puts the Home in `<install>/home/`, for running from a USB stick or keeping one copy fully self-contained.
- These locations are listed in the repository README.

## Layout

```
<home>/
  settings/
    client.kvt               graphics, controls, audio, resource pack order, last username per server
    gui.ini                  IkGui window layout
    plugins/<Plugin>.yml     user overrides, layered over the shipped plugins/<Plugin>/config
  identity/
    identity.key             master secret (owner-only permissions, optional passphrase)
  servers.kvt                multiplayer list: name, address:port, pinned host key, last played
  known_hosts.kvt            host keys seen on first connect
  saves/<folder>/            instances, see Save File Format
  mods/<mod-id>/<version>/   installed mods: their jars and each plugin's data folder
  resourcepacks/<pack>/      resource packs, folders or zips
  screenshots/
  logs/                      client logs only
  crash-reports/
  reports/                   benchmarks, gate output, profiling dumps
  state/
    plugin-versions.kvt      last loaded version of each plugin (replaces plugins/*/last-version.txt)
```

- `servers.kvt` and `known_hosts.kvt` are text KVT so they can be edited by hand. See [Accounts and Identity](Accounts%20and%20Identity.md) for what goes in them.
- Mods are kept per version because different servers can need different versions of the same mod. See [Mods](Mods.md#loading-on-connect).
- Plugin config is layered: the shipped file under `plugins/<Plugin>/config/` holds defaults, and the Home copy holds only what the player changed. The game never writes the shipped file.

# Instances

An instance is a save folder: `<home>/saves/<folder>/` for ones the client manages, or any folder for a dedicated server (`bin/runServer --instance <dir>`). Its layout is in [Save File Format](Save%20File%20Format.md#save-folder).

- Each instance keeps its own `logs/`, so servers running at the same time never write to the same files.
- A `session.lock` file stops two processes from opening the same instance.
- Server-only plugins and mods for one instance go in its `plugins/` folder (see [Mods](Mods.md#sides)).

# Caches

```
<cache>/
  lod/                    LOD cells (.ika), named by a hash of their content; shared by all saves and servers
  shaders/                compiled SPIR-V
  registries/<hash>.kvt   rule registries synced from servers (see Mods)
  resourcepacks/<sha256>/ resource packs a server suggested and the player accepted
```

- Caches are never inside a save. Saves stay small enough to copy, back up and send to someone.
- **The LOD cache is shared, not per save.** Its keys hash the cell's meshes, position and materials, so it can never return another save's data. A deleted save's cells age out under the size cap.
- The shader cache gets its own folder and setting. Today it sits inside the LOD folder, so clearing one clears both.
- Dedicated servers do not render, so they have no LOD or shader cache.
- Everything in the cache can be deleted at any time; the game rebuilds or downloads it again.

# Development Builds

Development runs from the repository use the real Home, as a development version of the game. Each save records the game version and whether a development build wrote it ([Save File Format](Save%20File%20Format.md#savekvt)), so a release build can warn before opening a save from a development build. Tests never use the Home: they run in temporary folders.

# Changes This Needs

- **Ikala-Core:** a path resolver (install, Home, cache, logs, instance) that takes the game name from config and replaces `UserDataUtil`'s hard-coded `~/.lotomation`. Plugin config layered from install defaults and Home overrides. `last-version.txt` moved to the Home. Plugins loaded from several folders (install `plugins/`, Home `mods/`, instance `plugins/`), choosing a specific version when several are installed.
- **Ikala-Graphics:** `lodCacheDirectory`, a new shader cache setting and `gui.ini` resolved from the Home and cache instead of the working directory.
- **Factory:** saves and the server read and write the instance layout.
- **Ikala-Asset-Editor** gets the same treatment, as its own application name with its own Home.
