---
status: draft
---

# Game Interface

The game's own screens and overlays: key bindings, the menus, chat, and the debug overlay. They are retained UI from Ikala-Graphics, built in YAML specs or Java, so mods can add to them the same way. Companion to [Starting a Game](../Simulation/Starting%20a%20Game.md) and [Command Frames](../Simulation/Command%20Frames.md).

# Key Bindings

- **Actions, not keys.** Code asks whether an action is held or was just pressed, never about a key. An action has a namespaced id (`lotomation:jump`), a category and a name to show, and a default binding. Plugins and mods register their own through their graphics context, like a jetpack toggle or a key to open their menu, and they go when the plugin unloads.
- **Bindings** are a keyboard key or mouse button, optionally with Ctrl, Shift and Alt, written as text like `space`, `f3`, `mouse_right` or `ctrl+f3`. A binding without modifiers matches whatever modifiers are held, so sprinting with Ctrl doesn't stop W. When two held bindings share a key, the one with more modifiers wins, so Ctrl+F3 doesn't also press F3. Gamepads come later.
- **Reading keys:** the bindings are read once per drawn frame. Keyboard actions read as up while a text field has the keyboard, and mouse actions while the GUI has the mouse. Command frames sample held actions; menus and toggles use presses.
- **Saving:** only the bindings that differ from the defaults are saved, in `<home>/settings/controls.yml`. Bindings for actions nobody registered, as when a mod is unloaded, are kept.
- **The Controls screen** (Options, Controls) lists every action by category. Clicking a binding waits for the next key or mouse button, with the modifiers held; pressing a modifier alone and letting go binds the modifier itself; Escape cancels. A binding another action shares is marked, and each changed one has Reset, with Reset All at the bottom. While it waits, every action reads as up, so the key pressed doesn't also act.

Lotomation's actions:

| Category | Action | Default |
| --- | --- | --- |
| Movement | Walk forward, backward, strafe left, right | W, S, A, D |
| Movement | Jump / fly up | Space |
| Movement | Sneak / fly down | Left Shift |
| Movement | Sprint | Left Ctrl |
| Interface | Pause menu | Escape |
| Interface | Open chat | T, and Enter as a second action |
| Interface | Open chat with a command | / |
| Interface | Free the mouse (hold) | Left Alt |
| Debug | Debug overlay (Ikala-Graphics) | F3 |

- **The mouse looks around while playing:** the cursor is hidden and held in the window, the camera turns as it moves, and the GUI ignores it, so nothing behind it gets hovered or clicked. Opening a menu or the chat lets it go, and so does holding the free-mouse key, to click the debug overlay or a tool window. Mouse buttons bound to actions still work while it is held.

# Menus

- **Main menu:** Single Player, Multiplayer (not built), Options, Quit Game. A note above the buttons says why the last game ended, like a server turning the player away.
- **Pause menu:** Back to Game, Options, Exit to Main Menu; see [Starting a Game](../Simulation/Starting%20a%20Game.md#player) for what pausing stops.
- **Options:** Controls for now; graphics and sound settings later. Back goes to whichever menu opened it.
- **The pause key goes back a step** in any of them: Controls to Options, Options to where it came from, the pause menu to the game.
- While a menu or the chat is open, the player's inputs are empty, so they stand still, keeping flight if it was on.

# Chat

- **Opening:** T or Enter opens the chat box, and / opens it with `/` typed. Enter sends and Escape closes. If the key that opened it also types its character, that is undone.
- **Showing:** closed, the box shows the last 10 lines for 10 seconds without taking input; open, it shows the last 20 and a line to type in. It keeps 100 lines, and forgets them on leaving the game.
- **Lines are colored spans**, which only the server builds: grey for system messages, yellow for joins and leaves, red for errors. A player's line starts with their role's title in its color, `[Owner]` in gold or `[Op]` in aqua, then `<Name>`. Players can't type colors yet.
- **Messages:** the client sends `ChatSend` with what was typed, up to 256 characters; the server sends `ChatMessage` with each span's text and color. Talking needs `lotomation.chat`.
- **Commands** are lines starting with `/`, run on the server's tick thread. Each needs a permission ([Accounts and Identity](../User%20Data/Accounts%20and%20Identity.md#roles-and-permissions)):

| Command | What it does |
| --- | --- |
| `/help` | Lists the commands the player can use |
| `/gamemode <survival\|creative\|spectator> [player]` | Changes a game mode; `s`, `c`, `sp` and `0` to `2` work too. Another player's needs `lotomation.command.gamemode.others` |
| `/op <player>`, `/deop <player>` | Makes an account an operator or a player again; the owner keeps their role |
| `/accept <player>` | Lets in a player waiting for approval |
| `/say <message>` | Speaks to everyone as the server |
| `/setblock <x> <y> <z> <block>` | Changes one block; `~` is relative to you, and a block's namespace can be left out when only one block has its name. Operators only |
| `/tick`, `/tick rate <n>`, `/tick freeze`, `/tick unfreeze`, `/tick step [ticks]`, `/tick sprint <ticks\|stop>` | Shows or changes how fast the world runs, as Minecraft's `/tick`: players keep moving while the world is slowed or frozen. Operators only; servers only allow slowing, freezing and stepping ([Command Frames: Clocks](../Simulation/Command%20Frames.md#changing-the-rate)) |
| `/time`, `/time set <time>`, `/time add <length>` | Shows the day and time, sets the time of day keeping the day (`sunrise`, `morning`, `noon`, `sunset`, `night`, `midnight`, a 24-hour `HH:MM` or an hour like `6.5`), or moves the clock by ticks, hours (`3h`) or days (`2d`), which also moves the moon's phase |

A dedicated server's console runs the same commands without the `/` (except help, which is the console's own), with every permission.

# Debug Overlay

- **F3** shows a panel in the top left corner made of collapsible sections. It is retained UI in Ikala-Graphics, so any plugin adds sections to it through its graphics context, and they go when the plugin unloads.
- **A section** has lines of text, read again ten times a second while shown; toggles; buttons; and custom IkGui content like graphs. Sections are ordered by number, the game's first.
- **The panel never keeps the keyboard:** clicking a toggle gives focus back, so the game keeps reading the keys.
- **Lotomation's sections:**
  - **Game** (open): the version, frames a second, the day and time, and whether the world is paused.
  - **Player** (open): position, block, chunk and the block in it, facing as a compass direction with yaw and pitch, speed, game mode and movement mode.
  - **Network:** the netcode's numbers ([Command Frames](../Simulation/Command%20Frames.md#transport)).
  - **World:** chunks received and drawn, and how drawing them is going.
  - **Debug lines:** chunk borders (the player's chunk with a 4-block grid on its faces, and the corners of the chunks around it), and the player's box and look direction, with the box the server last confirmed in orange when it differs.
  - **Tools:** the IkGui demo, script debugger, script monitor and Worldgen Lab.
- **Ikala-Graphics' section:** frames a second and the quality setting, the Graphics Debug window, wireframe, instance bounds, shadow cascades, light gizmos and culling.
- **Later:** other entities' boxes and look directions once there are other players and NPCs.
