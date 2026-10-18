---
status: draft
---

# Save Folder

- players/
- quests/
- stats/
- worlds/
    - World folders named like world-name, e.g. earth
        - regions/
            - r.x.y.region
        - data/
        - stats/
        - quests/
- icon.png
- local_player.txt - Contains the name of the owner, for tracking the player name for single player
- save.dat

# Worlds

## Region Files

Region files store a group of 32x32 chunks. They are stored in big-endian format.

### Location

Regions are stored in a subfolder of the dimension directory called “regions”, and are named like r.x.z.region, where x and z are the x and z components of the region's coordinates. An example would be r.1.2.region for the region coordinates (1, 2).

The region coordinates for a chunk can be found by dividing the chunk coordinates by 32.

### Structure

#### Header

Region files start with an 8KiB header, made up of 2 4KiB tables for the offsets of chunks in the region file, and timestamps for the latest updates of those chunks respectively.

The offset of a chunk (x, z) in chunk coordinates in the first table can be found using the formula 4 * ((x & 31) + (z & 31) * 32). The corresponding timestamp is 4096 bytes later in the file.

|**Byte**|**0x0000 - 0x0FFF**|**0x1000 - 0x1FFF**|**0x2000 - end**|
|---|---|---|---|
|**Description**|locations (1024 entries at 4 bytes each)|timestamps (1024 entries at 4 bytes each)|Chunks and padding|

The chunk locations are four bytes, split into two fields. The first 3 bytes are an offset, measured in 4KiB sectors from the start of the file. The last byte gives the length of the chunk in 4KiB sectors, rounded up. Chunks must be less than 1MiB in size. If chunks are missing, both fields are zero.

|**Byte**|**0**|**1**|**2**|**3**|
|---|---|---|---|---|
|Description|Offset|   |   |Sector Count|

Timestamps are 4 byte integers, representing the last modification time of a chunk in epoch seconds.

|**Byte**|**0**|**1**|**2**|**3**|
|---|---|---|---|---|
|Description|Timestamp|   |   |   |

#### Body

Chunk data starts with a four-byte signed length for the exact length of the remaining chunk data in bytes. The next byte indicates the compression format used for the chunk data, and the rest of the bytes are compressed chunk data.

Each chunk is padded to be a multiple of 4096 bytes in length.

|**Byte**|**0**|**1**|**2**|**3**|**4**|**5 - end**|
|---|---|---|---|---|---|---|
|Description|Length (in bytes)|   |   |   |Compression type|compressed data (length - 1 bytes)|

The compression schemes are listed below

|**Compression type**|**Method**|
|---|---|
|1|GZip (RFC1952)|
|2|Zlib (RFC1950)|
|3|Uncompressed|

Uncompressed follows the same format as in memory.

# Player Files

# Quests

# Stats