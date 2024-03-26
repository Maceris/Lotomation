# Lotomation

Lotomation is a voxel-based factory game. The game code/configuration is released under an MIT license.
The Ikala engine and plugins that are used to create it are also open source. Please see their corresponding repositories for more information.

## Building

In order to build and run this game, some other repositories are going to be required. It is expected that this repo be installed in the same directory as the following:

* [Ikala-Core](https://github.com/Maceris/Ikala-Core)
* [Ikala-Plugins](https://github.com/Maceris/Ikala-Plugins)

To build the program, run `./gradlew build`. This will build all the dependent projects and install the jars in the plugins folder.

## Running

Once the build has been run, `./runGame` will start running the game.
