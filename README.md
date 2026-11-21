# Lotomation

Lotomation is a voxel-based factory game. The game code/configuration is released under an MIT license.
The Ikala engine and plugins that are used to create it are also open source. Please see their corresponding repositories for more information.

Binary files are not generally available as they are tracked through git LFS.

## Building

In order to build and run this game, some other repositories are going to be required. It is expected that this repo be installed in the same directory as the following:

* [Ikala-Core](https://github.com/Maceris/Ikala-Core)
* [Ikala-Plugins](https://github.com/Maceris/Ikala-Plugins)

If you wish to install these in another location, that location can be configured in gradle.properties.

To build the program, run `./gradlew build`. This will build all the dependent projects and install the jars in the plugins folder.

The `./gradlew clean` command will delete all the jars and the log folder, but leave plugin config, scripts, and data alone.

## Running

Once the build has been run, `./runGame` will start running the game.

## Where the Game Keeps Your Files

The folder the game is installed in is never written to while it runs. Your settings, keys, saves, installed mods and logs go in a Home folder, and caches in a separate cache folder:

| Platform | Home | Cache |
| --- | --- | --- |
| Windows | `%APPDATA%\Lotomation` | `%LOCALAPPDATA%\Lotomation\cache` |
| Linux | `~/.local/share/lotomation` (or `$XDG_DATA_HOME/lotomation`) | `~/.cache/lotomation` (or `$XDG_CACHE_HOME/lotomation`) |
| macOS | `~/Library/Application Support/Lotomation` | `~/Library/Caches/Lotomation` |

- `-Dlotomation.home=<dir>` (or `--home <dir>`) moves the Home, and `-Dlotomation.cache=<dir>` moves the cache.
- A file named `portable` next to the game's jar keeps everything in a `home` folder inside the install.
- Back up `identity/identity.key` in the Home. It is what signs you in to every server, and it can't be recovered if lost.
- Everything in the cache can be deleted; the game rebuilds it.

Builds run from this repository use the same Home, as a development version of the game.

Not built yet: current builds still keep everything in `~/.lotomation`. See [Folder Structure](docs/design/User%20Data/Folder%20Structure.md) for the full layout.
