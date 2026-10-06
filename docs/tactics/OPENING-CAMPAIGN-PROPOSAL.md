# Opening campaign and persistent sectors

Build a playable opening campaign by connecting the existing overmap, authored sectors, tactical combat and saves. The first delivery is two connected sectors with reliable population and inventory persistence. Expand that working foundation into the five-sector tutorial valley, its town and the introduction to three nearby factories.

The population and peaceful-sector inventory rules below are user decisions. The data organization and delivery sequence are implementation recommendations. This proposal describes work to build, not features already available.

## Player experience

A player starts a campaign, equips a squad, enters a sector, talks and searches where appropriate, fights, and travels onward. Returning shows the sector's current occupants and remaining items. Saving and continuing restores the campaign, including an unfinished fight or journey. Defeating a force changes the population; actual reinforcements can occupy the sector later.

The final opening milestone lets the player liberate the valley town and receive directions to three nearby factories with better earning potential, using ordinary game controls throughout.

## Confirmed population rules

The sector population table is authoritative. It represents the people currently there: enemy soldiers, civilians, other NPCs, militia and present mercenaries.

- Defeated enemies are removed from the population according to the resolved gameplay outcome. The campaign does not reconstruct them from the map's original guard list on return.
- Soldiers or other characters entering the sector join its population. Departing characters leave it and continue under the travel system.
- Each person has a stable campaign identity. Existing mercenary and group records refer to that identity; entering a map does not create a replacement person.
- Preserve relevant living-character state, including health, injuries, equipment, ammunition, faction, attitude, combat behavior and authored NPC references.
- Corpse models do not need persistence. Their surviving dropped items do.

Use the existing casualty rules to distinguish death, capture and living incapacitation. A living wounded or captured character must not disappear because corpse presentation was discarded. Death and capture effects, dropped equipment and quest consequences come from the rules, independently of whether a body mesh is retained temporarily.

The authored map provides the initial population once. An initialized sector with an empty population is a valid saved state, not a request to populate it again. Population initialization must also work before the player's first visit: if an enemy group reaches that sector first, later loading must preserve both its initial residents and the newcomers exactly once.

Stable IDs must be unique across sector instances. Reusing a template in two sectors must not create two people with the same ID. Keep the editor's permanent character identity and explicit reference mappings; display names and readable Script IDs remain editable labels, not database keys. Apply a consistent instance mapping to authored character references.

A conversation or objective reference to someone who has departed or died must resolve as unavailable, without selecting a different person or respawning the target. Active population and travel-group references must still point to valid living or otherwise retained character records.

## Confirmed item access rules

While a sector is at peace, any merc physically in that sector can access all available items on its map, across distances and floors. Walking to each loose pile after a battle is unnecessary. The exception is a chest or container that has not yet been searched: its contents remain unavailable until searched.

Save remaining loose items, dropped equipment and container contents separately from character bodies. Save each container's search state. Opening a lid or door must not silently count as searching unless the existing search action explicitly includes that step.

The peaceful-sector inventory is a view of the existing item records. It must not create a second copy of the loot. Taking an item from this view removes it from the corresponding pile or searched container; taking it locally has the same effect. Preserve quantities, loaded ammunition, condition, medical supplies and other existing item properties. Items carried by living characters and a trader's stock belong to their existing inventories, not the free sector-loot pool.

Unsearched containers must not reveal their item names, quantities or value through aggregate inventory totals. Persist their contents or deterministic generation state so revisiting and reloading cannot reroll them. Searching reveals those same contents. Normal search and lock rules continue to govern the initial search.

Recommended implementation: expose one shared `canUseSectorInventory` query and use it in both the UI and transfer action. Derive peace from authoritative threat and clearance rules, not a camera state, a quiet frame, or an old victory flag. Neutral civilians do not prevent peace. Reinforcements that contest the sector revoke access, and each attempted transfer rechecks permission. Mercs in other sectors receive no access through selection or group membership. Overmap travel markers alone are not proof of physical presence.

Keep normal capacity and item-compatibility checks when transferring into a merc's pack. Preserve world source locations so remaining loot is still consistent if fighting resumes. A rejected transfer changes neither inventory. Combat continues to use the established tactical interaction rules.

## One campaign state

Use renderer-independent campaign data and actions. The 3D renderer consumes their outcomes; it must not decide population changes, ownership, loot, money or time. Preserve the shared-core contract with the 2D game. Changes to generated core modules must be reproduced through the established source dependency or checked adapter workflow, never by independently editing the generated copy.

The following is a suggested organization, not a mandated file layout:

| Record | Responsibility |
| --- | --- |
| Campaign | Save version, world seed, shared clock, treasury, content version and current selection. |
| Character registry | One authoritative person per stable ID, including their state and current location. |
| Sector state | Assigned map variant, initialization state, population references, ownership, changed geometry, items, containers and authored event state. |
| Travel group | Member ID references, route, progress, orders, fatigue/rest state and timing. |
| Active encounter | Sector, participant IDs, tactical snapshot, RNG, turn state and result-application state. |
| Incident queue | Pending encounters and strategic events in chronological order, with stable tie ordering and resolution state. |

A stationary group can reference people also listed in its sector population: those are references to the same people, not separate copies. Every living person has one physical location. Travel, encounter contact and sector inventory must use the same membership rules. Define sector-entry and sector-exit events at the travel system's actual boundaries; do not infer arrival from opening a page or infer presence from a destination marker. Preserve the existing opposing-travel and same-sector contact behavior.

Treat transfers and encounter results as transactions. Departure, arrival, casualty removal, loot creation and ownership changes must either complete consistently or leave the prior state intact. Give applied results an identity or revision so a repeated callback, page reload or restored pending encounter cannot apply them twice. Committed tactical actions must be reflected in a save taken mid-fight; do not postpone all population and equipment changes until victory.

The existing encounter snapshot contains its own numeric unit IDs and inventories. Reuse it through an explicit stable-ID adapter and checkpoint reconciliation, or separate its tactical-only fields. Do not leave campaign and encounter copies independently writable and let load order decide which health or inventory wins.

Templates remain authoring inputs. Fix each sector's chosen variant and orientation in the campaign; a template edited afterward must not silently replace an ongoing sector's population or loot. The first implementation can retain full map snapshots where that simplifies correctness. Avoid instantiating 450 tactical renderers or complete combat states to represent the overmap.

## Sector assignment and travel

Keep the agreed vocabulary: Overmap → Sector → Block → Tile. The overmap is 30 by 15 sectors; a sector is 10 by 10 blocks; a block is 24 by 24 tiles. Reuse the existing seeded generator and sector library.

The first proof uses two explicitly assigned authored sectors. Validate matching travel boundaries, legal entry areas and a route in both directions. Preserve entering characters' identity and equipment. Occupied or invalid entry spaces need deterministic legal placement or a clear rejected transition, with no lost or duplicated people and no spawn inside a wall or unsearched container.

For the valley milestone, assign all five tutorial sectors from their authored variants and validate the connected route to the town. Keep the fixed introduction layout. Broader automatic assignment across all 450 sectors is a later extension using the same saved assignment contract.

Persist ownership separately from population. Clearing a sector follows the agreed control rule; an empty sector retains its last controller. A later arrival or battle can change that control. A previous victory must not prevent new occupants from triggering a real encounter.

## Battle handoff and shared time

Replace the campaign's test-only victory path with an actual encounter result. Enter with the participating population and group identities. Return survivor state, casualties, item transfers, changed objects, ownership consequences and elapsed game time. Support victory, defeat and retreat; leaving early must not clear enemies or grant victory rewards.

Reuse the existing shared clock, travel durations and combat-round accounting. Loading a map must not reset the campaign to its authored start time, grant fresh resources, or charge travel and combat minutes twice. Browser animation time never determines a gameplay result.

Preserve the user's incident ordering: a strategic conflict arising during a local conflict is recorded for subsequent resolution in chronological order. Store encounter identity and timing per sector, plus queue order, so one pending battle cannot overwrite another. The first UI may present one fight at a time; its save format must retain additional pending conflicts. Do not silently resolve offscreen fights as player victories. Detailed offscreen combat resolution and a full multi-battle interface are later work.

## Campaign save and continue

Extend the existing validated encounter-save and storage facilities with a versioned campaign format. Reuse their atomic writes, error handling and paused restoration. Keep editor documents, standalone Quick Fight saves and campaign saves distinguishable. Existing saves should remain loadable through their supported format or an explicit migration; do not silently reinterpret them as new campaigns.

Retain the seed and map assignments, character registry and locations, sector populations and item state, travel groups, shared time, treasury, contracts, progression, NPC/objective state and relevant logistics. Preserve current tactical positions, awareness, RNG and turn state for unfinished encounters. Reconstruct presentation without replaying completed shots, explosions, item drops or rewards. Corpse rendering is not a required part of campaign persistence.

Validate the whole candidate save before replacing a running campaign. Reject duplicate physical occupants, dangling active population/group or item references, inconsistent travel membership, malformed quantities, invalid clocks and invalid pending encounter references. Authored references to an unavailable former occupant are handled as described above. No automatic fresh-guard fallback is allowed for an empty or damaged population record.

Checkpoint transitions and result application as well as ordinary saves. If a required checkpoint fails, retain the active state and report the failure. A quit and resume during travel or combat must continue from committed state without losing a person, granting a duplicate item or processing an event twice.

## Opening content and economy

The five-sector encounter targets remain as follows. Sectors 3 and 4 can exchange their roles; one of those two encounters supplies the town intelligence.

| Sector | Opponents | Purpose |
| --- | --- | --- |
| 1 | 2–4 | Introduce basic actions, including examining, opening/searching and talking, with a modest fight. |
| 2 | 6–8 | Teach the benefit of engaging smaller groups with local numerical superiority. |
| 3 | 4–6 | Provide intelligence useful for approaching the town. |
| 4 | 4–6 | Provide another nearby tactical encounter and preparation opportunity. |
| 5 | About 12 | Town assault and the valley's exit; building spacing makes movement out of cover meaningful with starter weapons. |

Coordinate encounter placement and entry/descent geometry with the map builder. Retain room for ordinary perimeter movement and flanking. The geographical choke point should not become an unexplained requirement to fight down one narrow tactical lane. Reuse approved characters, weapons and environment parts.

Connect the existing NPC identity and capability hooks to a small conversation/objective system. The straw-hat donkey provides the first useful conversation. Add one working trader with persistent stock and atomic item/money exchange. Use explicit resource and character references, with editor validation for missing links. Preserve the current faction, attitude, fear and combat-behavior rules; the Red Hat outfit alone does not determine whether someone can talk or sell. Objective rewards and conversation effects must be saved and applied once.

Use $20,000 as the opening campaign budget, intended to acquire a squad and sustain it for roughly one to two weeks. Hiring, contracts and wages should reuse the existing rules where available. Keep prices, pay rates and income configurable and demonstrate the runway with a representative starter squad. The strategic tester's $5,000 treasury is not the campaign starting balance. Broader difficulty scaling and final economic balance remain adjustable.

After the town, reveal three nearby factories with better earning potential. Full industrial logistics, all settlement variants, militia battle AI and fortress balance are outside this opening delivery. Their existing strategic records must remain compatible with the population and encounter contracts.

## Delivery sequence

1. **Two-sector campaign foundation.** Add the campaign state, explicit sector assignments, population transfers, real encounter results, peaceful-sector inventory and campaign save/continue. Include one searchable container to exercise the inventory rule through normal controls. Use existing assets and a small fixture population. Demonstrate travel, partial combat, retreat, return and a later reinforcement arrival.
2. **Opening interactions and authoring.** Expand the interaction content, connect dialogue and simple objectives, and add one trader. Expose and validate their references in the editor. Keep map authors able to change names, appearance and placement without rewriting identity links.
3. **Five-sector opening.** Integrate the authored valley, its encounter populations, town capture, starter finances and the three factory leads. Deliver a complete new-game-to-town playthrough and save/continue check.

Each delivery should have a runnable entry point, relevant tests and a short record of implemented behavior and remaining scope. The first delivery should establish the campaign contract before the later content relies on it.

## Acceptance checks

Use automated state tests for persistence and ownership, plus browser playthroughs for actual UI wiring. Required cases include:

- A sector starts with six enemies; two are defeated and removed. Retreat and return produces four survivors with their retained state. Three actual arrivals then make seven. Reloading or reopening does not change that total.
- An initialized empty sector stays empty. An incoming group arriving before the first tactical visit is present exactly once alongside the correctly initialized residents.
- Splitting, departure, arrival and retreat preserve stable person IDs and equipment. A person cannot occupy two sectors or be duplicated between a group and its encounter.
- A defeated enemy's dropped weapon remains after its body is omitted from a save. Taking it, leaving and returning does not produce another copy. Non-dropping destruction outcomes, including destroyed fuel equipment, remain respected.
- In peace, mercs in the same sector can take loose items and searched-container contents from distant tiles and upper floors. Another sector's merc cannot. Pack capacity still applies.
- An unsearched chest contributes no contents to the shared inventory. Searching reveals its persistent contents; taking an item through either local or sector UI updates the same record and survives reload.
- Hostile arrival revokes peaceful inventory access. A stale open inventory panel cannot complete an unauthorized transfer, and a failed action changes nothing.
- Saving during a fight, a journey, a sector transfer or a pending incident restores committed state without replaying damage, drops, rewards, recruitment, wages or elapsed time. Several pending incidents retain their order.
- Corrupt records and failed storage writes preserve the current campaign and last good save. Template edits do not refill an existing campaign's population or containers.
- The same campaign commands produce the same population, item, clock and ownership results without the 3D renderer. Verify shared-rule behavior against the pinned core.

For release, run the relevant new tests and existing encounter-save, inventory, NPC, group-travel, logistics, clock and core regressions; then `npm run check`, `node tools/sync-tactics-core.mjs --check` and `npm run build:tactics-3d`. Preserve the deployment module-closure checks. Review the packaged game's normal controls, including save/continue, rather than relying only on editor playtest or test-only outcome controls.

## Existing integration points

At proposal baseline `f1b2400`, encounter saves and NPC reactions are implemented, while overmap contacts still stop at a test-only handoff and authored local templates remain unassigned. Older documents include historical boundaries; use the current code and the focused records below when reconciling work.

- [Encounter save and load](SAVE-LOAD.md), [encounter snapshots](../../dist/tactics/encounter-save.js) and [battle entry point](../../dist/tactics/battle-3d.js).
- [Overmap travel](OVERMAP-TRAVEL.md), [group state](../../dist/tactics/overmap-groups.js), [logistics and militia](OVERMAP-LOGISTICS.md) and [existing encounter handoff](../../dist/tactics/overmap-logistics.js).
- [Sector library](SECTOR-LIBRARY.md) and [tutorial terrain and town sketch](TUTORIAL-PLATEAU-ROUGH.md). The rough terrain still needs authored encounters and usable travel geometry.
- [Character identity and editor hooks](CHARACTER-PROPERTIES-HANDOFF.md), [current NPC behavior](NPC-BEHAVIOR.md) and [character properties](../../dist/tactics/character-properties.js). The newer NPC behavior record supersedes the older handoff's guard-only runtime limitation.
- [Clock principles](GAME-CLOCK.md) and [shared clock implementation](../../dist/tactics/game-clock.js). Use the newer overmap travel rules for strategic travel duration rather than the older document's fixed one-hour example.
- [Inventory rules](../../dist/tactics/core/inventory.js), [existing campaign rules](../../dist/tactics/core/world.js), [shared-core contract](THREED-PROJECT.md) and [reproducible core synchronization](../../tools/sync-tactics-core.mjs).
