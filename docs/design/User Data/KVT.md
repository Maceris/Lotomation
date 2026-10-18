---
status: implemented
---

Key Value Trees (KVT) are key value pairs that store named information. A tree has a text format, for data files people write, and a binary format, for saves and the network.

The code lives in Factory-Core, in `com.ikalagaming.factory.kvt`. The grammar is in `Factory-Core/docs/KVTLexer.g4` and `KVTParser.g4`.

# Node Types

| **Node Type** | **Description**                                                                                            | **Text Format**                       | **Text Example**                               |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| Boolean       | Byte value of 1 or 0 that represents true or false.                                                        | `true`, `false`                       | `true`                                         |
| Boolean Array | Ordered list of booleans.                                                                                  | `[Z;<boolean>,<boolean>,...]`         | `[Z;true,false,false,true]`                    |
| Byte          | A signed 8-bit integer, ranging from -128 to 127 (inclusive).                                              | `<integer>b` or `<integer>B`          | `12B`, `-123b`                                 |
| Byte Array    | Ordered list of signed 8-bit integers.                                                                     | `[B;<integer>,<integer>,...]`         | `[B;1,-2,34,1]`                                |
| Double        | A 64-bit, double-precision floating-point, ranging from -1.7E+308 to +1.7E+308.                            | `<decimal>`, `<number>d` or `<number>D` | `1.23456`, `1e5`, `1.2345d`, `5D`            |
| Double Array  | Ordered list of doubles.                                                                                   | `[D;<number>,<number>,...]`           | `[D;1.0,0.345,9.99]`                           |
| Float         | A 32-bit, single-precision floating-point, ranging from -3.4E+38 to +3.4E+38.                              | `<number>f` or `<number>F`            | `1.2345f`, `5F`                                |
| Float Array   | Ordered list of floats.                                                                                    | `[F;<number>,<number>,...]`           | `[F;1.02,0.345,9.99]`                          |
| Integer       | A signed 32-bit integer, ranging from -2,147,483,648 to 2,147,483,647 (inclusive).                         | `<integer>`                           | `12345`, `-234`                                |
| Integer Array | Ordered list of integers.                                                                                  | `[I;<integer>,<integer>,...]`         | `[I;1,-2,34,1]`                                |
| Long          | A signed 64-bit integer, ranging from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 (inclusive). | `<integer>l` or `<integer>L`          | `8654L`, `-70000l`                             |
| Long Array    | Ordered list of longs.                                                                                     | `[L;<integer>,<integer>,...]`         | `[L;10000,-2345345]`                           |
| Node          | A list of key-value pairs, ordered by key. Each value can be of any type.                                  | `{<key>:<value>,<key>:<value>,...}`   | `{X:1,Y:64,Z:128,age:-2.3f}`                   |
| Node Array    | Ordered list of nodes.                                                                                     | `[N;<node>,<node>,...]`               | `[N;{X:4,Y:4},{inventory:[N;{id:4}]}]`         |
| Short         | A signed 16-bit integer, ranging from -32,768 to 32,767 (inclusive).                                       | `<integer>s` or `<integer>S`          | `34s`, `-90S`                                  |
| Short Array   | Ordered list of shorts.                                                                                    | `[S;<integer>,<integer>,...]`         | `[S;4,203,10,-3]`                              |
| String        | A sequence of characters surrounded by double quotes.                                                      | `"<text>"`                            | `"text"`, `"My name is \"Jeff\"?"`             |
| String Array  | Ordered list of strings.                                                                                   | `[T;<string>,<string>,...]`           | `[T;"example","of several", "strings!"]`       |

# Text Format

A file holds exactly one node, the root, so it starts with `{` and ends with `}`. Whitespace between tokens is ignored.

## Keys

- A key can be unquoted if it contains only `0-9`, `A-Z`, `a-z`, `_`, `-`, `.` and `+`. Otherwise it must be quoted with double quotes, such as `"tag name"`. Single quotes are not quotes here.
- A key that is a plain number or `true`/`false`, such as `12`, `5b`, `1e5` or `true`, must be quoted too, since it reads as a value rather than a key. The writer quotes these keys itself. Only the whole key counts: `12x` and `truey` stay unquoted.
- The empty key is written `""`.
- A `.` in a key is a path: `{a.b:1}` is read as `{a:{b:1}}`. This is also true for quoted keys, so a key can't contain a literal dot.
- Keys are unique within a node and kept sorted by name (case-sensitive, so `Z` sorts before `a`). When a tree is written out, entries come out in that order, whatever order they were read in.

## Numbers

- A number with no suffix is an Integer if it has no decimal point or exponent (`12`), and a Double if it does (`1.5`, `.5`, `5.`, `1e5`).
- A suffix picks the type: `b`/`B` byte, `s`/`S` short, `l`/`L` long, `f`/`F` float, `d`/`D` double. Either case works when reading. The writer uses upper case.
- A value outside its type's range, such as `128b`, is an error.
- Values that are not finite numbers are written `NaN`, `Infinity` and `-Infinity`, with the same suffixes as other floating point numbers (`NaNF` is a float). They work in arrays too (`[D;NaN,-Infinity]`). A key with one of these names, such as `NaN`, is quoted like the other number keys.

## Strings

- Strings use double quotes. They can contain any character except an unescaped `"` or `\`, including `'` and new lines.
- The escapes are `\b`, `\t`, `\n`, `\f`, `\r`, `\"`, `\'` and `\\`. Any other character after `\` is an error.
- **Escapes are not decoded.** The value keeps the backslashes exactly as written (`"a\"b"` holds the five characters `a\"b`), and they are written back out unchanged. Code that builds a tree has to store strings already escaped.

## Arrays

- An array starts with its type letter and a `;`, such as `[I;1,2,3]`. An empty array is `[I;]`.
- Array elements take no type suffix: `[B;1,2]`, not `[B;1b,2b]`. The suffixed form is an error for byte, short, integer and long arrays. The writer never writes suffixes in arrays.
- In a boolean array, any element other than `true` reads as `false`.
- No trailing commas, in arrays or nodes.

## Comments

Block comments, `/* like this */`, can go anywhere whitespace can, and are skipped. There are no line comments, so the text can be reformatted freely, even onto one line.

## Errors

A file that doesn't match the grammar fails to load. A value that matches the grammar but can't be converted, such as `128b` or `[I;"a"]`, logs a warning, and the rest of that node is skipped.

# Binary Format

All numbers are big-endian. Floats and doubles are IEEE 754 bits. There is no compression at this level.

The tree is written as its root node: the root's size, then its entries. The root has no type byte or key.

Each node entry is:

1. A byte with the ID of the entry's type, from the table below.
2. The key, as a string: a signed 32-bit integer _length_, then _length_ bytes of UTF-8.
3. The payload for that type.

## Payloads

| **Node Type** | **ID** | **Payload**                                                                                                                                                                                                                                                                  |
| ------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boolean       | 0      | A single byte, 1 for true and 0 for false.                                                                                                                                                                                                                                   |
| Boolean Array | 1      | Signed 32-bit integer _size_, then _size_ booleans packed one bit per boolean into ceil(_size_ / 8) bytes. The first boolean is the most significant bit of the first byte. For example, 9 true values are stored as `1111 1111 1000 0000`, and the last 7 bits are ignored. |
| Byte          | 2      | A signed 8-bit integer.                                                                                                                                                                                                                                                      |
| Byte Array    | 3      | Signed 32-bit integer _size_, then _size_ 8-bit bytes.                                                                                                                                                                                                                       |
| Double        | 4      | A 64-bit, double-precision floating-point.                                                                                                                                                                                                                                   |
| Double Array  | 5      | Signed 32-bit integer _size_, then _size_ 64-bit doubles.                                                                                                                                                                                                                    |
| Float         | 6      | A 32-bit, single-precision floating-point.                                                                                                                                                                                                                                   |
| Float Array   | 7      | Signed 32-bit integer _size_, then _size_ 32-bit floats.                                                                                                                                                                                                                     |
| Integer       | 8      | A signed 32-bit integer.                                                                                                                                                                                                                                                     |
| Integer Array | 9      | Signed 32-bit integer _size_, then _size_ 32-bit integers.                                                                                                                                                                                                                   |
| Long          | 10     | A signed 64-bit integer.                                                                                                                                                                                                                                                     |
| Long Array    | 11     | Signed 32-bit integer _size_, then _size_ 64-bit longs.                                                                                                                                                                                                                      |
| Node          | 12     | Signed 64-bit integer total size in bytes, then the node's entries until that size is used up. The total includes the 8 bytes of the size itself.                                                                                                                           |
| Node Array    | 13     | Signed 64-bit integer total size in bytes (including these 8 bytes), then a signed 32-bit integer _size_, then _size_ nodes, each with its own total size and entries.                                                                                                     |
| Short         | 14     | A signed 16-bit integer.                                                                                                                                                                                                                                                     |
| Short Array   | 15     | Signed 32-bit integer _size_, then _size_ 16-bit shorts.                                                                                                                                                                                                                     |
| String        | 16     | Signed 32-bit integer _length_, then _length_ bytes of UTF-8. The length counts bytes, not characters.                                                                                                                                                                      |
| String Array  | 17     | Signed 64-bit integer total size in bytes (including these 8 bytes), then a signed 32-bit integer _size_, then _size_ strings. Each string is a signed 32-bit integer _length_ followed by _length_ bytes of UTF-8.                                                         |
