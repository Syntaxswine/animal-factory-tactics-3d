# Stamina and field interactions

3D battles now have a first usable stamina/interaction loop. Starting numbers are balance settings, not final tuning.

## Stamina

- Per straight tile: walk 1, sneak 2, run 4, prone crawl 3. Diagonals scale by distance. Changing elevation costs 12 per floor; tower traversal costs 12 once, independent of its animation.
- Exhaustion blocks running, sneaking, crawling and climbing. Ordinary walking remains available at zero to prevent a stranded character.
- Attacks spend 2 stamina (ranged) or 6 (melee). Firing remains available at zero; fatigue currently restricts strenuous movement, not accuracy or AP capacity.
- Idle recovery is 8 per game minute after a 15-second delay following exertion. Queued movers do not recover during exploration. A completed combat round applies recovery once (6 after exertion, 8 if rested); reading/settling the clock does not apply it again. Pauses and animation frames never grant extra recovery.
- Catch breath restores up to 20 stamina for 4 AP in combat, or one game minute outside combat.
- Existing stats-less callers retain their prior movement/resource behavior. Stamina is enabled by canonical character stats.

## Nearby actions

The battle sidebar lists available nearby interactions with costs, estimated benefit or success chance, and disabled-reason tooltips. Primary selection performs the action.

| Action | Combat AP | Stamina | Effect |
| --- | ---: | ---: | --- |
| Treat teammate/self | 6 | 3 | Consume one medkit; restore 10 + floor(effective Medical * .4) HP, capped at max HP |
| Stabilize | Existing Medical cost | 0 | Existing bleeding-casualty stabilization; one medkit |
| Repair light fixture | 8 | 3 | Restore max(5, floor(effective Mechanical / 2)) condition |
| Pick lock | 8 | 4 | Dexterity versus authored lock difficulty |
| Force door | 10 | 12 | Strength versus authored lock difficulty; noise radius 20 |

Effective Medical/Mechanical include floor(Intelligence / 10), capped at 100. Lock success is clamp(50 + stat - difficulty, 5, 95) percent. A deterministic saved interaction seed advances once per attempt; failed attempts cost the same resources. Successful checks open the door. Picking now requires a carried reusable lockpick set, and each repair action consumes one unit of repair supplies. See [Inventory and locks](INVENTORY-AND-LOCKS.md).

Outside combat, each field action takes one game minute and no AP. Time uses the encounter clock, including morale and contract settlement. Other eligible idle characters recover stamina during that minute. Previewing or rejecting an action changes nothing. Treatment requires a conscious teammate/self, an open adjacent edge and the same physical height. Bleeding teammates use Stabilize.

## Authoring

In the 3D editor, expand **Locks & repairs**, select a closed door boundary and apply difficulty (0 removes the lock, 1-100 sets it). Select an electrical light fixture and apply condition (0-100). Changes support undo, redo and map JSON export.

Full maps store locks as `edgeLocks: {"e:10:10": 50}`. Locks prevent automatic door opening and path traversal. Connectivity validation treats locked doors as potentially openable; it still catches genuinely disconnected terrain. Erasing a door in the editor removes its lock. Locks now survive block-library extraction and placement as well as full maps; conflicting shared-door locks are rejected.

Fixtures store `condition` on the prop. Values below 100 disable both rendered light and tactical illumination; reaching 100 restores the authored on/off/automatic schedule. Rotation preserves condition. Repairs currently cover electrical lights and searchlight towers, not fires, weapon wear or general factory machinery. Existing maps retain unlocked doors and working fixtures unless explicitly authored otherwise.

## Validation

Regression tests cover actual single-unit movement, varied costs, frame-independent/paused recovery, round recovery, medical effects and barriers/heights, resource rejection, successful/failed locks, path blocking, fixture repair and editor persistence. Browser review exercises Catch breath, treatment, lock picking, repair and editor controls on the running app.
