---
status: draft
---

# Command Frames

How the game simulates anything that moves or acts: players now; abilities, NPCs and monsters later. The server is the authority. Clients predict their own player, and when the server disagrees they rewind to the server's answer and replay their inputs to catch up. The model is the one in the "Overwatch Gameplay Architecture and Netcode" GDC talk. Companion to [Starting a Game](Starting%20a%20Game.md).

**Core rule: the simulation is a pure function of the previous state, the inputs, and the world at that frame.** Everything else (prediction, rollback, replay, lag compensation, tests) depends on that.

# The Frame Clock

- **A command frame is 16 ms** (62.5 a second). Frames are numbered by a `long` counted from when the server opened. The simulation always steps by exactly one frame, whatever the wall clock does, and its numbers are integers per frame (see [Determinism](#determinism)).
- **Everything else runs inside frames.** Things that aren't players step in world frames, and blocks, machines and the day clock in world ticks. Both are scheduled onto command frames, so there is one timeline and every change has a frame number ([Clocks](#clocks)).
- **One thread runs the loop** on the server, so the world never changes under a frame. If it falls behind, it runs frames back to back to catch up, up to a limit, then drops the backlog and logs it.
- **Waiting:** the loop parks until the next deadline. Parking on Windows wakes about 2 to 3.5 ms late, so steps start that late, but deadlines stay on the clock and the rates are exact. A late server frame never starves a client, since its input has had longer to arrive. A dedicated server can set `-Dikala.server.preciseFrames=true` to park until shortly before each deadline and yield the rest, which starts frames within tens of microseconds for about a third of a core.
- **The client runs ahead of the server.** Its frame number is the server frame that its input is meant for. It leads by half the round trip plus a small buffer. At a 160 ms round trip that is 80 ms + one 16 ms frame = 96 ms, 6 frames: one in the server's buffer and five in flight.
- **Time dilation:** the client changes how long its frames take on the wall clock, never the step it simulates. When the server reports a starved buffer or missed inputs, client frames shrink (to about 15.2 ms) so inputs arrive faster and a buffer builds up. When the buffer is above target, client frames stretch until it shrinks back. The rate stays within about 5% of normal, so it is never noticeable.
- **Round trip:** each input message carries when the client sent it. The server echoes the newest one in its state, with how long it held it, so the client measures the network alone, whatever the frames are doing.
- **Lead:** an answer for frame F took half a round trip to arrive, and the next input takes half a round trip to get there, so the client aims to be a round trip (in whole frames) plus the target buffer ahead of the newest frame answered.
- **Resync:** a client more than 6 frames short of that lead, or 16 past it (a stall, a hitch while loading, or the start, before the round trip is known), jumps its frame number to the lead instead of dilating there. Frames it skips get no input, so the server leaves the player where the client has them. The bands are wide because jitter swings the lead by a frame or two between reports; dilation closes small gaps.

# Clocks

**Core rule: an effect runs on the clock of whatever causes it.** A player's own movement and actions run in command frames; what they leave in the world (an arrow, a fireball, a fire) runs on the world's clocks.

| Clock | Rate | What runs on it |
| --- | --- | --- |
| **Command frames** | 16 ms, always on the wall clock | Players: input, movement, movement abilities, casting, effects on the player (burning, poison, regeneration), direct block edits (placing, breaking, a spell that breaks a block) |
| **World frames** | the same 16 ms step, 0 or more per command frame | Everything that moves and isn't a player: projectiles, NPCs and monsters, falling blocks, physics objects |
| **World ticks** | 20 per second of world time, one every 3 or 4 world frames | Blocks (fire, fluids, crops, falling blocks starting), the [machine network](Factory%20Network.md), the day clock |

- **Every step is the same fixed size.** A world frame is always a 16 ms step and a tick always one tick, whether a command frame runs one, two or none of them. Speeding up, slowing down or freezing the world never changes a step's size, so physics stays exact.
- **The world clock is simulated state.** Its rate, a whole-number remainder, and the world frame and world tick counters are in every snapshot, so which world frames and ticks ran during command frame F is a pure function of the history, and replays, tests and rollback reproduce it.
- **Scheduling:** the rate is in world ticks a second, 20 normally. Each command frame adds the rate to the remainder, and while the remainder is at least 20, runs a world frame and takes 20 off. World tick k runs in world frame `ceil(k * 25 / 8)`, which is 8 ticks in every 25 world frames: exactly 20 a second of world time.
- **Rate changes are commands** stamped with the command frame they take effect on, like any other change, and reach clients with the world clock in their state.
- **Command frames never slow down or stop** for the world clock. In multiplayer they can't, since inputs arrive in real time.
- **The server's own upkeep runs on real time,** 20 times a second on the same 8-in-25 beat of command frames: sending chunks near players, dropping idle ones, and sending the time. A frozen world still streams chunks to a player walking through it.
- **The world clock** is `WorldClock` in Factory-Core, a record kept on its own entity in the server's simulated state.

## Changing the Rate

`/tick` changes the world clock, as Minecraft's `/tick` does:

| Command | World frames per command frame |
| --- | --- |
| `/tick` | none; shows the rate, the counters, and how long ticks take |
| `/tick rate <ticks a second>` | rate / 20, so 1 or 2 at 40, and 1 every 12 or 13 frames at 5 |
| `/tick freeze`, `/tick unfreeze` | none while frozen |
| `/tick step <ticks>` | while frozen: 1 per command frame until that many ticks have run, then none again |
| `/tick sprint <ticks>` | as many as fit in each command frame's spare time, until that many ticks have run |

- **Operators only.** On a server only slowing down, freezing and stepping are allowed. Speeding up and sprinting are for single player: they cost the server more simulation and more block changes and entity updates to send, not more client simulation, since clients don't run world frames.
- **Sprinting depends on the machine:** how many world frames fit in a frame depends on how fast the computer is. A replay records the world frames each command frame ran while sprinting.
- **Seeing it:** the debug overlay's time line says when the world is frozen or not at 20 ticks a second, and `/tick` shows the counters and how long the last world tick took, so a technical player can see when a build is too heavy.

## Frozen

**Frozen things can be acted on, but don't act.**

- **Players** keep moving, flying, casting and using movement abilities. A leap that deals damage where it lands still hits.
- **World things** take what players do to them at once: damage takes health off, and a knockback is kept as velocity that moves them when world frames run again. They don't move, react, act or die until then.
- **Projectiles hang** where they are. They find hits with their own step, so an arrow hits nothing while frozen, even a player walking through it, and checks again once it moves. A fireball cast while frozen hangs in front of the caster.
- **Frozen things that block movement still block it**, such as a falling block: players' movement checks against them every frame.
- **Blocks:** players' direct edits apply at once. What follows from them waits for world ticks: sand above a broken block falling, fire spreading, a machine noticing.
- **Effects on players** run in command frames, so a burning player keeps burning in a frozen world.

## Order Within a Frame

On the server, each command frame:

1. Takes each player's input, and runs the player systems: abilities, then movement.
2. Applies players' direct effects: damage, block edits, spawning what they cast or fire.
3. Runs the world frames due, each running the world-thing systems and then the world tick if one is due.
4. Keeps the frame's snapshot and sends states and block changes.

- **A heavy tick makes the frame late, not wrong.** The loop catches up back to back, and clients don't starve, since their inputs have had longer to arrive.
- **Spread work across ticks, not inside one.** Machines already schedule their own events. Fire and random block ticks give each block its own schedule, so the work of a tick doesn't arrive all at once. A tick is never split across command frames: frames would see half of it.
- **A big tick can use many threads**, such as a large explosion split by chunk region, but its block changes are applied together at its end.
- **Generation, lighting, meshing and saving stay off the loop.** In single player the local server has its own thread and drawing has another, so world work never runs inside a drawn frame.

# Determinism

Rollback only works if the client and server compute exactly the same result from the same inputs. The simulation uses integer math only, and tests check it.

- **Pure steps:** a system reads the previous frame's state, the frame's inputs and the world, and returns the next state. No wall clock, no shared mutable fields, no iteration in hash order.
- **Fixed point:** no `float` or `double` in simulation code. A guard test fails if the simulation packages use them.
  - **Lengths** are `long`s in 1/65536 m. A block is 65536 units, the 1/16 m grid is 4096 units, and the block a position is in is the position shifted right by 16.
  - **Velocities** are units per frame, and **accelerations** units per frame per frame. Walking at 4.3 m/s is about 4509 units a frame; gravity of 25 m/s^2 is about 419 units a frame per frame.
  - **Rounding** is always explicit: shifts and `Math.floorDiv`, never `/` on values that can be negative, since Java's division rounds toward zero.
  - **Overflow** can't happen in practice at these sizes. Tests run the step with `Math.*Exact` checks on.
- **Angles** are 16-bit binary angles (65536 to a turn), in the input and in the state. Sine and cosine come from a table worked out once from the sine's power series in integer math, so even the table never touches floating point. It is within one unit of the true value everywhere.
- **No square roots for direction:** the keys give one of eight directions, each a fixed unit vector, turned by the yaw through the table. Anything that needs a length uses an integer square root.
- **Randomness:** a `SplittableRandom` seeded from the entity, the frame and a salt, never a shared generator. Blocks seed theirs from the world seed, the world tick and the block's position, so fire spreads the same way whatever order chunks are processed in.
- **Times as frames:** anything that lasts (a stun, a cooldown, a jump's rise) stores the frame it ends on, not a countdown in seconds. Restoring a frame's state restores everything about it.
- **Drawing converts at the edge:** the client turns states into floating point only to draw them.

# Simulated State

- **Entities** (players now, NPCs later) carry simulated components: small immutable records. A player's movement component holds its position, velocity, whether it is on the ground, and its mode. Status effects and abilities will be components too: a stun with its end frame, an ability's phase and the frame the phase started, a cooldown's end frame.
- **Systems** are pure steps that run in a fixed order each frame: apply input, then abilities, then movement. Movement is the first system. Each system declares its clock ([Clocks](#clocks)): player systems run once a command frame, world-thing systems once a world frame.
- **A frame's snapshot** is every simulated component of every entity at the end of that frame. Rolling back means putting a snapshot back, so nothing needs undo logic.
- **The server keeps about a second of history** for every entity. This isn't needed for walking. It is what lag compensation uses ([Lag Compensation](#lag-compensation)).
- **The store is the EntityComponentSystem plugin, rewritten from scratch** as a general ECS: entities are ids, each component type is stored in its own table of immutable records, systems run in a declared order, and queries walk the entities that have a set of components. On top of that it offers what rollback needs: a cheap snapshot of the simulated tables at the end of each frame (shared structure, so an unchanged component costs nothing), restoring a snapshot, and marking which component types are simulated (snapshotted and compared) and which are local (drawing, sound, UI state that is never rolled back). Nothing in it knows about networking or frames; Factory-Core drives it.

# Inputs

- **One input per frame:** a bitmask of buttons (forward, back, left, right, jump, sprint, sneak, fly) and the look (yaw and pitch). Ability buttons join later. The keys behind the buttons are the player's bindings ([Game Interface](../Rendering/Game%20Interface.md#key-bindings)).
- **Sampling:** the client samples the input once per command frame. Mouse look turns the camera at render rate, so aiming never waits for a frame. The input carries the look as it was at the moment the frame was sampled.
- **A sliding window:** every frame, the client sends all its inputs since the last frame the server acknowledged, run-length coded (a held key costs nothing extra). A lost packet's inputs arrive with the next one, so loss rarely causes a mispredict. The window is capped at 64 frames.

# Server

- **Input buffer:** each player has a buffer of inputs by frame. Each frame the server takes that frame's input. If none has arrived, it repeats the previous input and counts a miss.
  - Inputs for frames already run are dropped.
  - Inputs more than 32 frames ahead are dropped too. A client that runs fast (a speed hack) can't gain anything: the server still uses one input per frame.
- **Player state:** after each frame, the server sends each player a `PlayerState`:
  - the frame number and the last input frame it used;
  - the player's full simulated state, not just their position, so a stun or a knockback reaches the client with it;
  - buffer health: how many inputs are waiting and how many frames have run without one. The client dilates time from this;
  - the echo: when the newest input message was sent, and how long the server has held it.
- **Target buffer on the client:** one frame, plus one for each report with new misses (up to four), easing back a frame after every 2 s without misses.
- **Trust:** the server takes buttons and look from the client, nothing else. Positions only ever come from the simulation.

# Client Prediction

- **Two ring buffers** of 128 frames (about 2 s): the input for each frame, and the predicted state after each frame.
- **Joining:** the client starts a few frames ahead of the server and predicts the frames before its first input with no input, as the server runs them. With gravity, no input isn't standing still.
- **When a `PlayerState` for frame F arrives:**
  - If it is older than one already handled, it is ignored, since unreliable messages can arrive out of order.
  - If it equals the prediction for F, nothing changes. Frames up to F are confirmed.
  - If it differs, that is a **mispredict:** the client takes the server's state for F, then replays its stored inputs from F+1 to now, each frame against the blocks as they were at that frame ([Blocks in Frames](#blocks-in-frames)), and overwrites its predictions as it goes.
  - If F has already left the ring, the client takes the server's state and replays what the ring still holds.
- **Drawing:** the camera interpolates between the last two predicted frames by how far the wall clock is into the current frame. After a mispredict, the jump between the old and new prediction fades out over about 0.1 s. The fade only affects what is drawn, never the simulation.
- **Other players, and later NPCs,** aren't predicted. They are drawn interpolated between the server states they last received, a little in the past. Lag compensation on the server makes up for that delay.

# Lag Compensation

**Core rule: a server frame is final once it has run.** The server runs each frame once, in order. Its history is only ever read, never rewritten, and nothing it has done is undone: not a player's action, not a block change, not a fire.

- **Hits are checked in the past and applied now.** When a shot or an ability lands, the server rewinds the targets to the frame the attacker saw, only to see whether it hit, then applies the damage in the current frame.
- **So a player can act in the moment they were already dead on someone else's screen.** A player who fired an arrow at frame 100 and was shot by someone who saw them at frame 95, with the hit arriving at frame 104, dies at 104; the arrow fired at 100 stays. Overwatch, VALORANT and Apex Legends all work this way, and none of them re-simulate on the server.
- **A cap on how far back:** past a round trip of about 220 ms, as in Overwatch, the server stops rewinding for that attacker and checks against the present, so they must lead their targets. Without it, a laggy attacker could kill someone well after they reached cover.
- **Blocks are checked as they are now,** not as the attacker saw them, so a freshly placed wall always stops a shot or a spell.
- **No exceptions for defensive abilities yet.** Whether a target's dodge or shield that was already active on the server should beat a rewound hit is left for when abilities exist.

# The World in a Step

- **Movement reads blocks** through a view: the loaded world on the server, the received chunks on the client.
- **Missing chunks are solid**, on both sides: chunks the server hasn't sent to this player yet, and chunks the client hasn't received. This keeps the two sides agreeing at the edge of the loaded area. A player at that edge stops instead of falling into the void.
- **Block changes reach clients when the server's change arrives,** and any mispredict they cause is corrected the usual way ([Blocks in Frames](#blocks-in-frames)).
- **Collision is shared data, not looks.** Each block declares its `collision` in its definition file (`blocks/<id>.kvt`): `full`, the default, or `none` (tufts, fluids). A name the loader doesn't know is `full`, and so is a block the definitions don't name, so nothing unknown can be walked through. Boxes on the 1/16 m grid come later, for slabs, posts and the like.
- **The client reads its own copy of the block definitions** for collision, the same data the server reads. When mods can differ between the two, the server sends its definitions when a player joins.

## Blocks in Frames

- **Every block change is stamped with the command frame it happened in**, on the server, whether a player made it or a world tick did.
- **The client keeps an undo log** of the changes it has received or predicted, `(position, old block, new block, frame)`, for the frames its ring buffers cover. Replaying after a mispredict puts the blocks back as they were at the first replayed frame and applies each change at its own frame, so a block that appeared at frame 105 doesn't stop the replayed frames before it.
- **This is safe because clients never simulate blocks.** They only apply changes and put them back; fire, fluids and falling blocks run on the server alone, and their results arrive as changes.
- **A player's own placing and breaking will be predicted:** the client changes the block at once, stamped with its input's frame, and the server accepts it or sends the real block, which the client applies through the same log. Minecraft does the same with numbered acknowledgements. A spell's direct effect on blocks can be predicted the same way; what follows from it can't.
- **The server keeps the same log** for about a second, for questions about the past.
- **On the server,** a change copies its chunk the first time, since a generation thread may still be encoding the original, and a chunk sent while a change happened is encoded again before it goes. Changed chunks stay loaded until chunks can be saved, since generating them again would lose the change.
- **For now,** operators change blocks with `/setblock <x> <y> <z> <block>`, where `~` is relative to them and a block's name can leave out its namespace when only one block has it.
- **In code:** `BlockChanges` messages, one per frame stamp, and `BlockHistory` in Factory-Core: primitive arrays and a `LongIntMap` from Ikala-Core, so replaying allocates nothing.

# Movement

The first system. Its numbers are starting points to tune by feel.

- **The player** is a 0.6 x 1.8 x 0.6 m box, with eyes at 1.62 m.
- **Game modes** decide how a player moves. A player's game mode is a simulated component, so it rolls back and replays with their movement; only the server changes it (`/gamemode`), and it is saved in their player file.
  - **Survival:** walks. The fly button does nothing.
  - **Creative:** walks, and tapping jump twice within 0.3 s toggles flight. The client holds the fly button in every input while flight is on, so a lost input can't drop the player out of the air. Flight hovers when no key is held, goes where the keys point, turned by the yaw, with jump and sneak rising and sinking straight up and down, at 10 m/s, 20 m/s sprinting, and blocks stop it like walking. Coming down onto the ground ends flight, and so does leaving creative.
  - **Spectator:** a free camera. Level flight the same way at 10 m/s, 40 m/s sprinting, through everything.
- **Walking:**
  - accelerates toward where the keys point, relative to the yaw, closing a quarter of the gap to the wanted speed each frame on the ground and a thirty-second in the air;
  - 4.3 m/s walking and 5.6 m/s sprinting;
  - gravity of 25 m/s^2, falling at most 60 m/s, and a jump that starts at 8.3 m/s and rises a little over 1.3 m, so it clears one block but not two. Holding jump jumps again on landing.
  - Leaving flight starts a fall from rest.
- **Health** comes to survival later; creative and spectator won't take damage.
- **Collision:** the box sweeps through the blocks one axis at a time, y first, then x, then z, and stops flush against the first solid block. Hitting something stops the speed along that axis; landing sets the on-ground flag. A box already inside a block isn't pushed out.
- **Later:** stepping up small heights (slabs), sneaking at ledges, swimming, ladders.

# Transport

- **Two kinds of message:**
  - **Reliable and ordered:** join, chunks, block changes and time.
  - **Unreliable, newest wins:** inputs and player states. A stale one is simply ignored where it lands: the server drops inputs for frames already run, and the client ignores states older than one it has handled.
- **UDP, one socket per end**, through Netty, with a small reliability layer of our own on top, in the style of ENet or the "Gaffer on Games" articles. It lives in Factory-Core (`networking.udp`), so the server and the client share it.
  - **Connecting:** the client sends a hello with a random salt, padded to a full packet so the answer is never bigger than the request. The server answers with a token, an HMAC of its secret, the client's address, the salt and a 10 s time bucket, and keeps nothing yet. The client sends the token back; only then does the server make a connection, and it answers with a random connection id that every data packet carries. Lost handshake packets are sent again every 250 ms, for up to 10 s.
  - **Data packets** stay within 1200 bytes. Each carries its sequence, whether anything has been received yet, the newest sequence received and a 32-bit field of the ones before it, then entries: unreliable messages, and fragments of reliable ones.
  - **Acks** ride on every packet. When packets arrive and nothing goes back, an empty packet carries the acks after 25 ms, or at once after 16 packets. 25 ms is longer than a frame, so in play the per-frame messages carry every ack and no packet goes for acks alone; one also goes every 250 ms to keep the connection alive. 10 s of silence closes the connection.
  - **Reliable messages** are split into fragments of up to 1169 bytes with consecutive ids (up to 1024 fragments a message). A fragment goes again if its packet isn't acked within one and a half round trips plus 20 ms (40 ms to 1 s). At most 1024 fragments are in flight; the receiver holds 4096 ids ahead and hands messages over whole and in order.
  - **Unreliable messages** go once, first, in whatever packet goes next, and must fit one packet.
  - **Pacing:** reliable fragments spend a byte budget that refills at 4 MB/s, in bursts of up to 64 KB, so a burst of chunks can't crowd out inputs and states.
  - **Round trip:** measured from acks for the resend time. The client's frame clock keeps its own measure, from the input echo, which leaves out the server's buffer.
  - **Encoding:** everything but the per-frame messages is its registered id and its fields as a tree, as the stream codec writes them. Those of 128 bytes or more are compressed with deflate when that makes them smaller, which is what chunks need: a join's 2,601 chunks shrink from about 2.2 MB to about 0.63 MB. The length before compression comes first and is at most 16 MiB, so a hostile peer can't make the other end inflate a few bytes into gigabytes. Inputs and states are packed by each connection, which keeps what it last sent and received to pack against:
    - Whole numbers are variable length, 7 bits a byte, and signed ones zigzag coded, so small values either way take a byte or two.
    - **Inputs** carry the first frame, the low 32 bits of the send time, the newest state the client holds, then each run's count, buttons, and the change of yaw and pitch from the run before. Held keys cost about 12 bytes; turning costs about 4 bytes a frame.
    - **States** carry the move mode and the game mode in one field, the game mode above the low 4 bits, so changing game mode costs a byte in the next state. They are written as changes from the newest state the client said it holds, which the server keeps for 64 frames, or from nothing when it has none of those: a mask of the fields that changed, then each change. The echo is the low 32 bits of the send time, widened again against the client's clock, and the hold time is in microseconds. Standing still costs about 12 bytes and walking about 13; a whole state is about 35. A state packed against one the client no longer holds can only be older than one it has, so it is dropped.
  - **Traffic:** in play each end sends one packet a frame of about 37 bytes, about 2.4 KB/s each way, or about 4 KB/s with the IP and UDP headers. Streaming chunks costs far more while it lasts: about 0.63 MB for a join's first 2,601 chunks.
  - **Leaving:** either end sends a disconnect three times. The server removes the player; the client stops playing.
  - **Identity:** after connecting, the client and server prove who they are before the player joins ([Accounts and Identity](../User%20Data/Accounts%20and%20Identity.md#signing-in)). Encryption comes later; the packets leave room for it.
- **Hosting:** a save's `server.kvt` says whether its server listens (`listen`: `off`, `lan` or `public`), on which address (`bind`, empty for all) and port (`port`, 25640 by default). `bin/runServer <save folder>` hosts a save as a dedicated server: it listens even if the save says `off`. `-Dikala.server.port=<port>` makes any server listen, single player included, until a menu can open a world to others.
- **Joining:** `-Dikala.connect=host[:port]` joins a server at start, until there is a multiplayer menu.
- **Single player** stays in one process over the local connection, with no serialization.
- **Bad networks for testing:**
  - A simulated link can wrap the local connection: `-Dikala.net.delay` (ms one way), `-Dikala.net.jitter` (most extra ms) and `-Dikala.net.loss` (share of unreliable messages lost), the same both ways. Jitter reorders unreliable messages; reliable ones are only delayed, in order.
  - `-Dikala.net.packetLoss` drops that share of every UDP packet each end sends, to test the reliability layer on one machine.
- **Testing the netcode in virtual time:** a client test runs the real prediction and frame clock against a stand-in server over a simulated network, so 30 s of play runs in milliseconds and every run is the same. At 80 ms each way with 20 ms jitter and 5% loss, the server misses about one input in a thousand frames once settled. The reliability layer has its own virtual-time tests: hundreds of messages up to 200 KB arrive whole and in order at 20% loss with reordering and duplicates.
- **A stats overlay** (the Network section of the debug overlay, F3) shows the round trip, the client's lead in frames, the server's buffer and target, the current dilation, misses, mispredicts and resyncs, and over UDP the packets sent and lost, the resends and the bytes a second each way. Each connection logs its totals when it closes.

# Testing

- **Determinism:** the same input stream run twice gives identical states. Restoring a snapshot from the middle and replaying gives the same result as running straight through.
- **Rollback:** a scripted mispredict (the server applying a knockback the client didn't know about) converges on the server's state within one round trip.
- **Under loss:** a headless walk over a simulated link with delay and loss ends with the client and server in the same place. The overlay's counters stay within bounds.
- **Transport:** the packet layer over loopback with heavy simulated loss and reordering delivers every reliable message once and in order, and big chunks intact.
- **Movement:** unit tests against small built worlds: falling onto a floor, walking into a wall, jumping onto a block, being blocked by a ceiling, standing at the edge of a missing chunk.

# Steps

1. **Other players:** interpolated remote players, now that a second client can join over UDP.
2. **Predicted placing and breaking.**
3. **World frames:** the first things that aren't players, such as projectiles, and lag compensation with its cap.
4. **Saving changed chunks,** so they can be dropped from memory again.

# Open Questions

- **Where movement numbers live:** constants for now. Whether they become data (per mode, or per entity type for NPCs) is open.
- **Menus for multiplayer:** joining a server by address, and opening a single-player world to others, need menu screens; what they look like is open.
