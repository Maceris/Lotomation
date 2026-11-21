---
status: decided
---

# Accounts and Identity

How players and servers prove who they are with no central login service. Anyone can host a game, including a single-player world, and players connect by address. Companion to [Folder Structure](Folder%20Structure.md) and [Save File Format](Save%20File%20Format.md).

**Core rule: both ends have a key.** The player proves to the server that they own an account, and the server proves to the player that it is the same server they registered with. Without the second half, anyone at that address could pose as the server.

# Player Keys

- Each Home has one master secret, `<home>/identity/identity.key`, with owner-only permissions. It never goes in a save or the repository.
- A passphrase on it is optional and off by default, like SSH keys. Unlocking it through the OS keychain (Windows Credential Manager, macOS Keychain) can come later.
- The key a player uses on a server is **derived from the master secret and that server's id** (for example, an Ed25519 seed from HKDF-SHA256 over the master secret, with the server id as context). The server id, not the host key, so a server can replace its host key without changing any player's key.
- Every server sees a different public key, so servers can't link a player's accounts by comparing keys. The player still backs up one file, and restoring it restores every account.
- The derivation is deterministic, so a player can work out their key for a server before ever connecting to it (see [Join Codes](#join-codes)).
- Today's code generates one RSA key pair in `auth_keys.pem`. Deriving keys needs a seed-based algorithm such as Ed25519, which Java supports.

# Server Keys

- Each save has a **server id** (a random 256-bit value made with the save, never changed) and a **host key**, both in `<save>/host/`. They move with the save, so a world opened to friends and the same world later run as a dedicated server are the same server to its players.
- The server presents its id signed by its host key.
- On first connect, the client records the host key for that server id in `<home>/known_hosts.kvt` and pins it in `servers.kvt`.

## Replacing a Host Key

A server can replace its host key by signing the new key with the old one. A client that sees a new key with a valid signature from the pinned one accepts it quietly and pins the new key. Any other change of key gets a warning before signing in, like SSH.

Players' keys don't change, since they come from the server id.

A fake server that copies a real server's id learns the public key a player uses there, which links the player to that server. It learns nothing secret, and a player who stops at the host key warning gives it nothing more.

# Signing In

1. The client connects and checks the server's id and host key, which the server proves by signing a challenge.
2. To register, the client sends a username and its key for this server, and signs a challenge to prove it owns the key.
3. Later sign-ins send the username and sign a fresh challenge.

Every challenge the client signs also covers the server's host key and a nonce for this connection. Otherwise a fake server could pass a real server's challenge through to the player and sign in as them.

The first time a player opens a new single-player save, their key for it is registered as the `owner` account automatically.

# Registration Policy

Set per save in `server.kvt`:

| Policy | Who can register |
| --- | --- |
| `open` | Anyone who connects |
| `approval` | Anyone, but new accounts wait for an operator to accept them |
| `invite` | Only players with a join code on the allow-list or an invite code |

Single-player worlds opened to others default to `approval`: the owner is in the game, so a friend's first connection pops up "X wants to join, accept?" with no codes needed. Dedicated servers default to `invite`.

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

# Lost Keys

A player who loses their master secret is locked out of every server. The client offers an "export identity" backup. An operator can reset an account to a new join code or invite, keeping the account's player data.

# Recognizing Friends

With a different key on every server, players recognize each other only within a server. A friend code that works across servers is deferred. If it is added, it would be an opt-in fingerprint a player shares on purpose, so nobody is linkable by default; nothing in this design blocks it.
