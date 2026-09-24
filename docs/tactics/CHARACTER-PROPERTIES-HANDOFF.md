# Character property editor and identity hooks

Select any placed character in the 3D editor to edit its display name, species,
model, outfit, supported visual variant, equipment, faction, starting attitude,
Can talk / dialogue reference, Can sell / inventory and pricing references, and
readable Script ID. The existing actor is edited in place. Appearance does not
infer allegiance or capabilities. NPCs is a placement category, not a faction.
The initial faction list is Player, Red Hats, Civilians and Unaffiliated.

## Identity and references

Each saved start/guard record has a `character` object containing a permanent
`id` (UUID with `char_` prefix), separate `displayName` and `scriptId`,
`category` (`squad`, `combat`, or `npc`), `faction`, `attitude`, boolean
`canTalk` / `canSell`, `dialogueRef`, `shopInventoryRef`, `shopPricingRef`, and
`references: [{role, targetId}]`. Optional `model` and `visualVariant` describe
supported presentation choices. Species, outfit, weapon and coordinates retain
the existing record fields. The runtime retains its numeric simulation ID and
exposes the authored ID as `unit.characterId`, with a copy of `unit.character`.

Internal IDs remain out of normal editor text. Connection dropdowns show names,
Script IDs and tile coordinates but store internal IDs. Known incoming references
are listed in the panel. Changing a Script ID warns about external scripts;
editor-managed targets remain unchanged. Display names can repeat. Nonempty
Script IDs are map-unique, start with a letter and allow letters, digits,
underscores and hyphens, up to 80 characters.

Duplication allocates new UUIDs, chooses collision-free Script ID suffixes, and
remaps links among the copied characters (including self-links). Links to actors
outside a copied block keep their original UUIDs and report missing targets when
that actor is not present. Block opening/import for editing preserves the saved
identities; placing that block into a map duplicates and remaps them. Connected
map generation also remaps each repeated block instance. Resource catalogs are
merged when blocks are placed. No arbitrary object fields are traversed as
references: future dialogue/quest systems should use this explicit target-ID
contract rather than saving readable names as keys.

## Resource references and validation

The map's `characterResources` catalog has arrays `dialogues`, `shopInventories`
and `shopPricing`. The panel can register known external resource IDs, one per
line. These lists declare availability; they do not create the resources or
contain executable code. Missing enabled dialogue/shop references and unresolved
character connections appear in the panel and in map validation. They are warnings
so unfinished work can be saved and exported. Invalid structure, duplicate IDs,
duplicate Script IDs, invalid factions/attitudes and unsupported appearances are
errors and reject the edit/import atomically.

## Compatibility and current gameplay boundary

Opening an old map for editing assigns identities and defaults without changing
combat behavior: existing guards stay hostile, squad starts stay player/friendly,
and capabilities default off. Ordinary placement needs no extra configuration.
Property edits, resource-catalog edits, duplication and block placement use normal
undo/redo and survive browser saves, JSON export/import and playtest transfer.
Moving a squad start preserves its identity. Squad slots cannot be duplicated.

Names and appearance are active in playtest. Dialogue, trading, faction relations,
starting attitude and quest connections are configuration awaiting integration.
The panel states this explicitly: non-squad characters, including the NPC editor
category, still use the current guard AI in playtest. A neutral/friendly setting
does not yet change that AI. Future shared systems can consume the stored hooks
without replacing map identities or coupling behavior to the Red Hat outfit.

## Verification

Acceptance tests cover a talking/selling Red Hat, in-place rename with incoming
links, self/external links on character duplication, repeated block remapping,
resource persistence, JSON roundtrip and runtime hooks, legacy behavior, invalid
imports, missing references, squad appearance edits and squad repositioning.
The Edge UI check edits through the real panel, verifies conditional fields and
rename warnings, duplicates, undoes/redoes and reopens exported data without
browser errors. Run `tools/check-editor-characters.mjs` against port 4323 with
`PLAYWRIGHT_PATH` set when Playwright is not installed locally.

Generated core changes are reproduced by `tools/core-character-adapter.mjs`;
never edit `dist/tactics/core` directly.
