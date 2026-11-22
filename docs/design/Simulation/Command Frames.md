---
status: draft
---

# Command Frames

How the game simulates anything that moves or acts: players now; abilities, NPCs and monsters later. The server is the authority. Clients predict their own player, and when the server disagrees they rewind to the server's answer and replay their inputs to catch up. The model is the one in the "Overwatch Gameplay Architecture and Netcode" GDC talk. Companion to [Starting a Game](Starting%20a%20Game.md).

**Core rule: the simulation is a pure function of the previous state, the inputs, and the world at that frame.** Everything else (prediction, rollback, replay, lag compensation, tests) depends on that.

# The Frame Clock

- **A command frame is 16 ms** (62.5 a second). Frames are numbered by a `long` counted from when the server opened. The simulation always steps by exactly one frame, whatever the wall clock does, and its numbers are integers per frame (see [Determinism](#determinism)).
- **The world tick is a separate clock.** Time of day, chunk upkeep, and later block and machine simulation keep their own 20 a second. The two clocks don't line up and don't need to.
- **One thread runs both** on the server, so the world never changes under a frame. The loop wakes for whichever clock is due next. If it falls behind, it runs frames back to back to catch up, up to a limit, then drops the backlog and logs it.
- **Waiting:** the loop parks until the next deadline. Parking on Windows wakes about 2 to 3.5 ms late, so steps start that late, but deadlines stay on the clock and the rates are exact. A late server frame never starves a client, since its input has had longer to arrive. A dedicated server can set `-Dikala.server.preciseFrames=true` to park until shortly before each deadline and yield the rest, which starts frames within tens of microseconds for about a third of a core.
- **The client runs ahead of the server.** Its frame number is the server frame that its input is meant for. It leads by half the round trip plus a small buffer. At a 160 ms round trip that is 80 ms + one 16 ms frame = 96 ms, 6 frames: one in the server's buffer and five in flight.
- **Time dilation:** the client changes how long its frames take on the wall clock, never the step it simulates. When the server reports a starved buffer or missed inputs, client frames shrink (to about 15.2 ms) so inputs arrive faster and a buffer builds up. When the buffer is above target, client frames stretch until it shrinks back. The rate stays within about 5% of normal, so it is never noticeable.
- **Resync:** if the client is far off (a stall, a hitch while loading), it jumps its frame number to the server's frame plus its estimated lead, instead of dilating there.

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
- **Randomness:** a `SplittableRandom` seeded from the entity, the frame and a salt, never a shared generator.
- **Times as frames:** anything that lasts (a stun, a cooldown, a jump's rise) stores the frame it ends on, not a countdown in seconds. Restoring a frame's state restores everything about it.
- **Drawing converts at the edge:** the client turns states into floating point only to draw them.

# Simulated State

- **Entities** (players now, NPCs later) carry simulated components: small immutable records. A player's movement component holds its position, velocity, whether it is on the ground, and its mode. Status effects and abilities will be components too: a stun with its end frame, an ability's phase and the frame the phase started, a cooldown's end frame.
- **Systems** are pure steps that run in a fixed order each frame: apply input, then abilities, then movement. Movement is the first system.
- **A frame's snapshot** is every simulated component of every entity at the end of that frame. Rolling back means putting a snapshot back, so nothing needs undo logic.
- **The server keeps about a second of history** for every entity. This isn't needed for walking. It is what lag compensation will use: when a shot or ability lands, the server rewinds the targets to the frame the attacker saw.
- **The store is the EntityComponentSystem plugin, rewritten from scratch** as a general ECS: entities are ids, each component type is stored in its own table of immutable records, systems run in a declared order, and queries walk the entities that have a set of components. On top of that it offers what rollback needs: a cheap snapshot of the simulated tables at the end of each frame (shared structure, so an unchanged component costs nothing), restoring a snapshot, and marking which component types are simulated (snapshotted and compared) and which are local (drawing, sound, UI state that is never rolled back). Nothing in it knows about networking or frames; Factory-Core drives it.

# Inputs

- **One input per frame:** a bitmask of buttons (forward, back, left, right, jump, sprint, sneak) and the look (yaw and pitch). Ability buttons join later.
- **Sampling:** the client samples the input once per command frame. Mouse look turns the camera at render rate, so aiming never waits for a frame. The input carries the look as it was at the moment the frame was sampled.
- **A sliding window:** every frame, the client sends all its inputs since the last frame the server acknowledged, run-length coded (a held key costs nothing extra). A lost packet's inputs arrive with the next one, so loss rarely causes a mispredict. The window is capped at 64 frames.

# Server

- **Input buffer:** each player has a buffer of inputs by frame. Each frame the server takes that frame's input. If none has arrived, it repeats the previous input and counts a miss.
  - Inputs for frames already run are dropped.
  - Inputs more than 32 frames ahead are dropped too. A client that runs fast (a speed hack) can't gain anything: the server still uses one input per frame.
- **Target buffer:** one frame when healthy, rising to two or three after misses, and easing back once the link is steady.
- **Player state:** after each frame, the server sends each player a `PlayerState`:
  - the frame number and the last input frame it used;
  - the player's full simulated state, not just their position, so a stun or a knockback reaches the client with it;
  - buffer health: how many inputs are waiting and any misses since the last report. The client dilates time from this.
- **Trust:** the server takes buttons and look from the client, nothing else. Positions only ever come from the simulation.

# Client Prediction

- **Two ring buffers** of 128 frames (about 2 s): the input for each frame, and the predicted state after each frame.
- **When a `PlayerState` for frame F arrives:**
  - If it is older than one already handled, it is ignored, since unreliable messages can arrive out of order.
  - If it equals the prediction for F, nothing changes. Frames up to F are confirmed.
  - If it differs, that is a **mispredict:** the client takes the server's state for F, then replays its stored inputs from F+1 to now against its current world, and overwrites its predictions as it goes.
  - If F has already left the ring, the client takes the server's state and replays what the ring still holds.
- **Drawing:** the camera interpolates between the last two predicted frames by how far the wall clock is into the current frame. After a mispredict, the jump between the old and new prediction fades out over about 0.1 s. The fade only affects what is drawn, never the simulation.
- **Other players, and later NPCs,** aren't predicted. They are drawn interpolated between the server states they last received, a little in the past. Lag compensation on the server makes up for that delay.

# The World in a Step

- **Movement reads blocks** through a view: the loaded world on the server, the received chunks on the client.
- **Missing chunks are solid**, on both sides: chunks the server hasn't sent to this player yet, and chunks the client hasn't received. This keeps the two sides agreeing at the edge of the loaded area. A player at that edge stops instead of falling into the void.
- **Block changes aren't predicted at first.** When a block changes, the client sees it when the server's change arrives, and any mispredict it causes is corrected the usual way. Placing and breaking blocks will later be predicted through the same frames.
- **Collision is shared data, not looks.** Each block declares its collision in the block registry: `full` (the default for solid blocks) or `none` (tufts, fluids). Boxes on the 1/16 m grid come later, for slabs, posts and the like.

# Movement

The first system. Its numbers are starting points to tune by feel.

- **The player** is a 0.6 x 1.8 x 0.6 m box, with eyes at 1.62 m.
- **Modes:**
  - **Walking:** the default.
  - **Flying:** allowed by the server (for now, always), toggled by an input, for building and debugging. Level flight where the keys point, turned by the yaw, with jump and sneak rising and sinking straight up and down; 10 m/s, 40 m/s sprinting. It passes through everything.
- **Walking:**
  - accelerates toward where the keys point, relative to the yaw;
  - 4.3 m/s walking and 5.6 m/s sprinting, with ground friction and weak control in the air;
  - gravity of about 25 m/s^2, with a jump that clears 1.25 m.
- **Collision:** the box sweeps through the blocks one axis at a time, y first, then x, then z. Landing sets the on-ground flag.
- **Later:** stepping up small heights (slabs), sneaking at ledges, swimming, ladders.

# Transport

- **Two kinds of message:**
  - **Reliable and ordered:** join, chunks, block changes and time.
  - **Unreliable, newest wins:** inputs and player states.
- **UDP, one socket**, through Netty, with a small reliability layer of our own on top, in the style of ENet or the "Gaffer on Games" articles:
  - **Packets** carry a sequence number, the latest sequence received from the other side, and a 32-bit field of the ones before it. Acks ride on every packet, so there are no separate ack packets while traffic flows.
  - **Reliable messages** are resent until a packet carrying them is acked, and handed over in order.
  - **Unreliable messages** go once; a stale one (an older frame than one already handled) is dropped on arrival.
  - **Fragments:** packets stay under about 1200 bytes. Big messages, chunks mostly, are split and put back together; a reliable message is only handed over once all its fragments are in.
  - **Round trip** is measured from acks, smoothed, and it feeds the client's lead.
  - **Pacing:** reliable traffic has a send budget per connection, so a burst of chunks can't crowd out inputs and states. Inputs and states always go first.
  - **Connecting:** the client says hello, the server answers with a random token, and the client must echo it before the server keeps any state for it. This stops spoofed addresses from using the server to flood someone. A connection with no packets for a few seconds is closed.
  - **Encoding:** per-frame messages (inputs, states) have a compact hand-written binary form, not the general request serialization.
  - **Encryption and identity** come with the server keys in [Accounts and Identity](../User%20Data/Accounts%20and%20Identity.md); the packet layer leaves room for them.
- **Single player** stays in one process over the local connection, with no serialization. A simulated link (delay, jitter, loss and reordering, per direction, set by system properties) can wrap either connection, so the netcode is tested without a second machine, and UDP is tested against a bad network on one.
- **A stats overlay** shows the round trip, the client's lead in frames, the server's buffer, the current dilation, misses, mispredicts, resends and packet loss.

# Testing

- **Determinism:** the same input stream run twice gives identical states. Restoring a snapshot from the middle and replaying gives the same result as running straight through.
- **Rollback:** a scripted mispredict (the server applying a knockback the client didn't know about) converges on the server's state within one round trip.
- **Under loss:** a headless walk over a simulated link with delay and loss ends with the client and server in the same place. The overlay's counters stay within bounds.
- **Transport:** the packet layer over loopback with heavy simulated loss and reordering delivers every reliable message once and in order, and big chunks intact.
- **Movement:** unit tests against small built worlds: falling onto a floor, walking into a wall, jumping onto a block, being blocked by a ceiling, standing at the edge of a missing chunk.

# Steps

1. **ECS:** rewrite the EntityComponentSystem plugin from scratch: entities, component tables, ordered systems, queries, simulated and local components, snapshots and restore, with its own tests.
2. **Frames:** the server's 16 ms frame loop beside the world tick on one thread, and the shared fixed-point simulation package (units, angle tables, integer square root) with determinism tests and the no-floating-point guard.
3. **The pipe:** inputs and their window, the server's input buffer, `PlayerState`, and the client's ring buffers and rollback, all driving today's flying. Flying is simple, so this step tests the plumbing on its own.
4. **Bad networks:** the simulated link, time dilation, resync and the stats overlay, tested under delay and loss.
5. **UDP:** the packet layer (acks, resends, ordering, fragments, pacing, the connect handshake), a dedicated server that listens on it, and joining one from the client, tested over loopback with the simulated link.
6. **Walking:** collision data in the block registry, gravity, jumping, the world view and missing-chunks-are-solid, with the movement tests.
7. **Other players:** interpolated remote players, now that a second client can join over UDP.

# Open Questions

- **Where movement numbers live:** constants for now. Whether they become data (per mode, or per entity type for NPCs) is open.
- **Menus for multiplayer:** joining a server by address, and opening a single-player world to others, need menu screens; what they look like is open.
