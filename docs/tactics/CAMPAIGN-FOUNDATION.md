# Two-sector campaign foundation

This implements delivery 1 of [Opening campaign and persistent sectors](OPENING-CAMPAIGN-PROPOSAL.md). Start from the title screen's **Campaign** button, then **New campaign**. Campaign saves use their own slots and database; standalone Quick Fight saves keep their existing format.

## Playable route

The seed-42 overmap has two explicit local assignments: sector 70, **Valley safehouse**, and sector 71, **Road checkpoint**. These are small encounter fixtures on full 240 × 240 maps, not the finished tutorial plateau. The remaining 448 sectors have no player-enterable tactical assignment.

At the safehouse, use **Sector inventory** to collect loose supplies on either floor. Select Anya and open her character screen to **Search container** beside the supply chest. Its medical chest and ammunition stay hidden from the sector inventory until that search. The friendly donkey is present; dialogue is a later delivery.

Use **Leave cleared sector**, select the squad and click the adjacent outlined checkpoint sector. Confirm the travel order, advance time and enter the pending encounter. Fight with the ordinary tactical controls. **Campaign map** suspends the encounter; it does not grant victory. To retreat, gather the group's able mercs in the six-tile-wide, eight-tile-deep entry corridor and use its retreat button. The checkpoint starts with six guards. Three additional guards depart the southern reserve sector after 180 minutes and travel using their real agility and fatigue. Arrival time is derived, not a hardcoded spawn deadline.

Time is paused on the campaign map until advanced, and tactical loads start paused. During local exploration or combat, the shared clock also advances travelling groups. Additional conflicts wait in chronological order. Finish or retreat from the current encounter before resolving the next one.

## Authored maps

The portable map collection contains `special/opening-safehouse/` and `special/opening-checkpoint/`, each with a `foundation-1.json` variant. Their runtime copies live under `dist/tactics/sector-library/`. They appear in the normal sector library and open in the local editor. New campaigns load those exported files; saves pin their own copies, so later author edits cannot refill an existing campaign.

`campaign-opening.js` supplies the explicit assignments, seed and reserve orders. `tools/create-campaign-fixtures.mjs` creates the initial source folders only when they do not exist. It deliberately refuses to overwrite authored work. Normal builds use the existing sector export workflow.

Each assignment declares midpoint, six-tile ground entrances. Both sides of neighbouring assignments must match. Creation and save loading check passable boundary tiles and a route to the local travel marker. Actual arrivals separately check the current changed geometry, occupants and unopened containers, then choose legal positions deterministically.

A blocked entry holds the whole group at its last valid travel position while world time continues. Travel and fatigue are staged before placement; a rejected final step does not charge fatigue repeatedly. The campaign map reports the entry hold, and the next time update retries it. These holds survive saving and loading. Clearing space allows a single arrival with the original character records and equipment. Live encounter, unit and clock objects retain their identities.

Simultaneous arrivals reserve distinct landing cells before committing anyone. An intercepted pair needs enough space for both groups; otherwise both wait. All arrivals commit before onward travel, so opposing groups entering the same sector make contact. Direct placement still rejects a blocked entry; campaign time advancement defers it safely.

The `campaignLoot` extension defines initial loose supplies and containers. It is preserved by the portable map editor, but does not yet have a dedicated placement/property tool. Container locks and search state are separate. Only the existing search action reveals contents; opening a door is not a search.

## Population and encounter contract

- `campaign-model.js` owns campaign actions without a renderer. Each person has one stable `campaignId`, one registry record and one physical location: a sector, a journey, or a resolved removed state. Travel groups and sector populations contain identity references.
- Tactical `state.units` refers to the exact registry unit objects. Health, injuries, weapons, ammunition, condition, medical charges, faction and other existing unit state therefore have one writable authority. Shared-core numeric unit IDs are allocated once across the campaign.
- Authored character IDs are mapped per sector instance. A renamed character keeps the mapping. A departed or dead target resolves as unavailable; it is never replaced by another actor or respawned.
- Initial residents and loot are created exactly once, including when reinforcements arrive before the first visit. Empty initialized sectors stay empty. Death removes population membership; living wounded and captured people remain recorded under the existing casualty rules.
- Corpse presentation can be omitted on return. Surviving dropped items remain in the sector's original loot records. Fuel equipment destroyed by combat follows the existing non-drop rules.
- Encounter victory comes from shared combat state and the current hostile population. Results have persistent incident identity and status. Retreat does not clear defenders. If another squad stays behind, it keeps the same active fight. An empty sector retains its recorded controller.
- The clock advances at shared movement/round boundaries. Restoring a snapshot primes its observer without awarding AP, replaying actions or charging elapsed time again. Offscreen battles are queued, not automatically won.

## Inventory and checkpoints

`sector-inventory.js` exposes one `canUseSectorInventory` check to both UI and transfer actions. It requires a physically present, available merc and authoritative peace. Neutral civilians do not block it. Hostile arrival revokes permission, including for a stale panel. Available items are references to the same piles used by local pickup; normal capacity and compatibility rules still apply. Unsearched container contents contribute no names, quantities or aggregate contents.

`campaign-save.js` stores a version-1 `animal-factory-campaign` record. The character registry is serialized once; tactical states store identity references. It retains assigned maps, changed geometry, populations, items/search states, strategic routes, clock, treasury, objective/logistics extension data and unfinished tactical RNG/awareness/turn state. Presentation events and unexecuted movement orders are discarded on capture, preserving already committed outcomes.

Whole-record validation rejects duplicate or dangling people, inconsistent physical/group membership, malformed items and clocks, broken assignments and invalid incident links. The previous live state is replaced only after validation. `CampaignSession.transition` stages commands on a detached candidate and commits through one IndexedDB transaction. Failed transition writes preserve the prior state. Checkpoint writes compare the campaign ID and revision, preventing a stale tab from overwriting a newer session.

Tactical autosaves follow committed state changes. If storage fails, the encounter pauses with a retry message and retains its live state. Manual campaign saves, campaign quicksave and the continue checkpoint are separate from the Quick Fight database. Starting a new campaign or explicitly loading a named campaign save replaces the continue checkpoint.

The only shared-engine additions in this milestone are searchable-container support, reproduced by `tools/core-campaign-adapter.mjs` through `tools/sync-tactics-core.mjs`. Generated core files must not be edited independently.

## Verification and remaining scope

`tests/campaign.test.mjs` covers population counts, actual arrivals, empty sectors, identity/reference mapping, cross-floor inventory, searches, stale permissions, corpse-independent loot, splitting, journey restoration, blocked entries, failed/stale writes, real shooting and enemy-turn continuation, casualties, corrupt saves, incident ordering, opposing travel, synchronised arrival and partial-group retreat.

`tools/check-campaign.mjs` uses normal browser controls for title entry, new game, searching, sector inventory, travel, mid-journey reload, a real shot, quicksave/load and retreat. Set `CAMPAIGN_ROOT=.pages-output` to run against a temporary packaged-build server. Its browser and optional server close in `finally`; screenshots and lifecycle records go to `artifacts/campaign` or `CAMPAIGN_OUTPUT`.

Initial delivery verification: all 1,836 tests passed, including 18 campaign regressions. `node tools/sync-tactics-core.mjs --check` and `npm run build:tactics-3d` passed. The packaged browser playthrough passed, with additional IndexedDB checks for stale-write rejection and corrupt named-save rejection preserving the continue checkpoint.

The October 8 arrival correction adds live blocked-terrain and occupied-entry regressions, simultaneous arrivals competing for capacity, and atomic placement of intercepted groups. These check save/restore, elapsed time, fatigue, retained object identity and exactly-once arrival after clearing the entrance.

Fix verification: 157 focused tests pass, including all 22 campaign cases and both base/3D packaging checks. The exact live blocked-arrival browser reproduction quicksaves and reloads at minute 880, then admits the three reinforcements exactly once at minute 881 after clearing the entry. The packaged normal-controls campaign playthrough and generated-core check also pass. This is focused release-fix verification, not a new full-suite run.

Dialogue, trader transactions, quest rewards, the authored five-sector plateau, hiring/wages and the three factory leads are delivery 2/3 work. Existing strategic logistics and militia demonstrations remain in the overmap tester; this fixture does not yet run their full simulation or import tester saves. The campaign retains an extension record for that integration without representing it as finished gameplay.
