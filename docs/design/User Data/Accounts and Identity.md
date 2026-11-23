---
status: decided
---

# Accounts and Identity

How players and servers prove who they are with no central login service. Anyone can host a game, including a single-player world, and players connect by address. Companion to [Folder Structure](Folder%20Structure.md) and [Save File Format](Save%20File%20Format.md).

**Core rule: both ends have a key.** The player proves to the server that they own an account, and the server proves to the player that it is the same server they registered with. Without the second half, anyone at that address could pose as the server.

# Player Keys

- Each Home has one master secret, `<home>/identity/identity.key`, with owner-only permissions. It never goes in a save or the repository.
- A passphrase on it is optional and off by default, like SSH keys. Unlocking it through the OS keychain (Windows Credential Manager, macOS Keychain) can come later.
- The key a player uses on a server is **derived from the master secret and that server's id**: an Ed25519 seed from HKDF-SHA256 over the master secret, with the salt `lotomation identity` and the info `lotomation player key v1` followed by the server id. The server id, not the host key, so a server can replace its host key without changing any player's key.
- The file is text: the line `lotomation-identity-v1`, then the 32-byte secret in Base64. A file in another format, like the RSA key pair earlier builds wrote, is kept beside it as `identity.key.old` and a new secret is made.
- Every server sees a different public key, so servers can't link a player's accounts by comparing keys. The player still backs up one file, and restoring it restores every account.
- The derivation is deterministic, so a player can work out their key for a server before ever connecting to it (see [Join Codes](#join-codes)).

# Server Keys

- Each save has a **server id** (a random 256-bit value made with the save, never changed) and an Ed25519 **host key**, both in `<save>/host/`: `server.id` holds the id in hex, and `host.key` the line `lotomation-host-key-v1` and then the private and public keys in Base64. They move with the save, so a world opened to friends and the same world later run as a dedicated server are the same server to its players.
- The server presents its id signed by its host key.
- On first connect, the client records the host key for that server id in `<home>/known_hosts.kvt` and pins it in `servers.kvt`.

## Replacing a Host Key

A server can replace its host key by signing the new key with the old one. A client that sees a new key with a valid signature from the pinned one accepts it quietly and pins the new key. Any other change of key gets a warning before signing in, like SSH.

Players' keys don't change, since they come from the server id.

A fake server that copies a real server's id learns the public key a player uses there, which links the player to that server. It learns nothing secret, and a player who stops at the host key warning gives it nothing more.

# Signing In

1. The client sends `Hello` with a random 32-byte nonce.
2. The server answers with `ServerHello`: its id, its host public key, its own nonce, and the host key's signature over both nonces, the id and the key. That proves it holds the host key, for this connection.
3. The client checks the signature and the pinned key, derives its key for the server id, and sends `SignIn`: a username, its public key, and its signature over both nonces, the server id, the host key, the username and its key.
4. The server checks the signature and finds the account by key, or registers one (see below), then the player joins. Otherwise it sends `Disconnect` with a reason the client shows on the main menu.

Every proof starts with its purpose and puts each field after its length, so a signature for one purpose, server or connection can't be reused for another. Because the player's signature covers the host key and the server's nonce, a fake server can't pass a real server's challenge through and sign in as them.

A username is 3 to 16 letters, digits and underscores, and unique on the server in any case. An account already signed in can't sign in twice.

The first time a player opens a new single-player save, their key for it is registered as the `owner` account automatically.

# Registration Policy

Set per save in `server.kvt`:

| Policy | Who can register |
| --- | --- |
| `open` | Anyone who connects |
| `approval` | Anyone, but new accounts wait for an operator to accept them |
| `invite` | Only players with a join code on the allow-list or an invite code |

Single-player worlds opened to others default to `approval`: the owner is in the game, so a friend's first connection pops up "X wants to join, accept?" with no codes needed. Dedicated servers default to `invite`.

A new player waiting for approval gets an account marked pending, and is told so and disconnected. An operator lets them in with `/accept <name>` (also typed at a dedicated server's console as `accept <name>`), and they connect again. Until join and invite codes exist, `invite` works the same way. The popup comes with the menus for hosting.

Without a central service, nothing stops someone on an `open` server from deleting their key and coming back as a new player. It can be made costly (approval queues, rate limits, perhaps a small proof of work at registration) but not impossible. Invite-only servers are the real defense, and bans hold there because a banned player can't come back without a new invite.

# Allow-lists

There are two ways to let a player in ahead of time, outside the game (a private message, a website signup form). Both exist, since they suit different flows:

## Join Codes

From the player to the server owner.

1. The owner shares the server's address and id, as an invite link or code.
2. The player's client derives its key for that server and shows a short join code: a fingerprint of that public key.
3. The player sends the join code to the owner, who adds it to the allow-list.

The join code means nothing on any other server.

## Invite Codes

From the server owner to the player. The owner generates a one-time invite code, and the first sign-in that redeems it ties the player's key to a new account. This suits a signup form, since the player only pastes a code.

# Roles and Permissions

Each account has a role:

| Role | Who | Can lose it |
| --- | --- | --- |
| `owner` | The first player in a single-player save | No |
| `operator` | Made with `/op <name>` | `/deop <name>` |
| `player` | Everyone else | |

What anyone may do is decided by permission nodes in the style of Bukkit's, from the Ikala-Permissions plugin:

- **Nodes** are dotted names like `lotomation.command.gamemode`. Plugins declare theirs in YAML in Bukkit's `permissions:` format: a description, a default (`true`, `false`, `op` or `not op`) and children. A child follows its parent when the parent is set: the same value if its flag is true, the opposite if false.
- **Operators** are owners and operators. They have the `op` defaults; everyone else has the `not op` ones.
- **Groups** in the save's `permissions.yml` set nodes and wildcards (`lotomation.command.*`, `*`) to true or false, and inherit other groups. Each role is in a group: `default` for players, `operator` (inheriting `default`) and `owner` (inheriting `operator`), so an operator can grant all operators something by editing one group.
- **Players** can be put in more groups and given their own settings in the same file, by account id.
- **Working it out:** every node's default first, then the player's groups, each after the groups it inherits, then their own settings; within one layer, wildcards before exact nodes. Undeclared nodes fall back to the last wildcard that matches, else false.
- The server console may do anything.

Lotomation's nodes are in Factory-Server's `permissions.yml`: `lotomation.chat` (true) and the commands, `lotomation.command.help` (true), `.gamemode`, `.gamemode.others`, `.op`, `.deop`, `.accept` and `.say` (op), all children of `lotomation.admin`.

# Lost Keys

A player who loses their master secret is locked out of every server. The client offers an "export identity" backup. An operator can reset an account to a new join code or invite, keeping the account's player data.

# Recognizing Friends

With a different key on every server, players recognize each other only within a server. A friend code that works across servers is deferred. If it is added, it would be an opt-in fingerprint a player shares on purpose, so nobody is linkable by default; nothing in this design blocks it.
