# Campaign and HUD integration review

Reviewed the campaign branch `a6a6d82` and battle layout branch `50593c5` against canonical `f1b2400` on October 6, 2026. The campaign needs an arrival-state correction before release. Approved the independent HUD branch, including its shared land painting, visible levels and interior concealment changes.

## Campaign release blocker

Priority P1: a blocked reinforcement entrance can leave the live campaign unsaveable. In `dist/tactics/campaign-model.js`, `advanceCampaign` advances the shared clock and installs a group's completed travel state before `arrive` calls `landingPlan`. If there are too few legal landing cells, `landingPlan` throws after those mutations. The group then says it reached its destination while its characters still say they are travelling.

This is reachable through `syncCampaignEncounter` during a tactical encounter. The staged `checkpointTransition` used by strategic commands does not protect that live path. The exception can also reach the battle frame's error handler and stop the encounter. A subsequent save is rejected.

Reproduce on `a6a6d82` with a Node module in the repository root:

```js
import {openingContent} from './dist/tactics/campaign-opening.js';
import {
  createCampaign, openCampaignSector, initializeSector,
  syncCampaignEncounter,
} from './dist/tactics/campaign-model.js';
import {captureCampaign} from './dist/tactics/campaign-save.js';

const campaign = createCampaign(openingContent(), {id: 'blocked-arrival'});
const encounter = openCampaignSector(campaign, 70);
const checkpoint = initializeSector(campaign, 71).state;
for (let y = 231; y <= 239; y++)
  for (let x = 117; x <= 122; x++) checkpoint.map[y][x] = 'water';
captureCampaign(campaign); // The blocked entrance alone must remain saveable.
encounter.clock.minutes += 400;
try { syncCampaignEncounter(campaign); } catch (error) { console.log(error.message); }
const group = campaign.groups.find(g => g.faction === 'red-hats');
console.log(group.travel, campaign.characters[group.memberIds[0]].location);
captureCampaign(campaign);
```

The arrival throws `Entry is blocked or occupied. The group has not been transferred.` The group is nevertheless at sector 71 with an empty route, while its first member retains a travel location from 101 to 71. Campaign time stops at 787 minutes against the tactical encounter's 880 minutes. Saving throws `This campaign save is damaged or inconsistent.`

Stage and validate arrival before committing the shared travel, clock and population changes, or introduce a coherent blocked-arrival waiting state. Preserve active tactical object references. Catching the exception after mutation does not repair the campaign.

Add regression coverage for blocked terrain and occupied landing cells during an active encounter. After the rejected or deferred arrival, capture/restore must work, elapsed time must remain accounted for, and clearing the entrance must allow arrival exactly once without missing or duplicated characters. Exercise both reinforcement and player travel, including simultaneous arrivals competing for the same cells.

The underlying design is promising. The 43 focused campaign, fatal-burn, land, interior-fog and multilevel tests passed. Independent packaged-browser checks confirmed new campaign creation, entering the safehouse, collecting upstairs supplies through peaceful sector inventory, preserving the pickup after reload, and returning to the campaign map. Unsearched contents remained excluded and those browser checks produced no console errors. The new permanent ash casualty behavior also passed its focused tests.

## HUD and campaign integration

The two branches overlap in six files: `dist/tactics/battle-3d.js`, `dist/tactics/character-screen.js`, `dist/tactics/core/manifest.json`, `tools/build-tactics-3d.mjs`, `tools/check-explosive-barrels.mjs`, and `tools/sync-tactics-core.mjs`.

When the campaign is ready, reconcile these areas deliberately:

- Retain campaign startup, saves, shared-clock synchronization and population references alongside the new HUD, Inventory draw-settling fix and two-AP ready swaps.
- Give campaign actions an explicit interactive mount in the HUD or command drawer. `campaign-battle.js` currently inserts its controls after `#phase`; in the new layout that element is inside `.field-heading`, which has `pointer-events: none`. Resolving Git conflicts alone will not make those controls usable.
- Preserve the container labels and search action from the campaign's character screen while keeping clickable weapon cards and equipment-block explanations.
- Keep every required campaign and HUD module in the Pages build, along with the transitive missing-module checks that prevent a blank Quick Fight page.
- Combine both core adapters and regenerate the core and manifest through `tools/sync-tactics-core.mjs`. Keep the ready-swap cost and permanent fuel-burn casualty behavior. Verify the generated result with `--check`.
- Update barrel browser checks for the new drawer and preserve their casualty assertions. Verify both Quick Fight and campaign routes in the packaged output.

## Independent HUD validation

On `50593c5`, the packaged game rendered the four squad cards, weapon icons and concealed interiors. Browser checks passed portrait selection, Shift multi-selection, group kneeling, a quick weapon swap followed immediately by Inventory reopening, equipping back from Inventory, command drawer opening and Escape dismissal, pause gating, floor selection with keyboard return, and quicksave/quickload. There were no console errors or warnings. At 1280 by 720, the page had no horizontal overflow and retained a 1236 by 416 battlefield after the status notice cleared.

All 1,830 tests and the asset check passed on `50593c5`. The Pages build, generated-core verification and diff whitespace checks passed. The browser checks above are a bounded independent sample; combat AP and rejection rules are also covered by the branch's headless tests. Campaign and HUD changes have not been approved as a combined build.
