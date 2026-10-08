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

## October 8 follow-up: gameplay branch `bd58196`

Release remains held. The grenade integration and right-click actions are useful additions, but this branch has not been approved as a replacement for canonical `84a87d9`.

### P1: blocked arrivals still leave the campaign unsaveable

Reran the exact blocked-entry reproduction above on `bd58196`. It still throws `Entry is blocked or occupied. The group has not been transferred.` after setting the reinforcement group's travel position to sector 71 and clearing its route. Its member still has `{kind:'travel', group:'relief-1', from:101, to:71}`. `captureCampaign` then rejects the live campaign as damaged or inconsistent. The existing campaign tests pass because their blocked-entry case uses a staged strategic transfer; add coverage for `syncCampaignEncounter` on an active encounter as described above. Fix the mutation ordering before release.

### P2: the base Pages file list omits a new dependency

`node --test tests/tactics-pages-files.test.mjs` fails its base-build case with `weapon-models.js → grenade-model.js`. The 3D build passes, but the repository's complete check runs both. Preserve canonical's grenade module entries while merging `tools/build-tactics-pages.mjs`; keep the missing-module guard.

### Integration requirements

A read-only `git merge-tree --write-tree --name-only 84a87d9 bd58196` reports 20 conflicted paths, including the battle HTML/controller/renderer, character screen, generated core, both build scripts, strategic-site assets and grenade motion modules. Reconcile against canonical instead of taking the branch versions of whole files. Canonical already includes the accepted HUD, painted weapon sprites, site study revisions and grenade roster.

- Preserve the HUD's squad cards, command drawer, inventory draw-settling hook and two-AP ready swaps. The new context equipment menu currently labels ready-slot changes free; update its cost/availability to the reconciled engine rule.
- Preserve campaign entry, population and container integration and mount its actions in an interactive HUD container, as specified above.
- Preserve the approved grenade poses while adding prepared runtime motion. Keep both idle study modules and their deployment entries. The separate held horse correction is not part of this approval.
- Regenerate core through the adapters and rerun its check after resolving engine conflicts. Do not hand-resolve generated core independently of its generator.

### Independent checks

144 of 145 focused tests passed across battle combat/context, campaigns, grenade integration/roster/throw, camera projection, strategic-site integration and distribution coverage. The sole failing test is the missing base-build dependency above. The asset check and `node tools/sync-tactics-core.mjs --check` passed. This was a focused run, not a rerun of the entire repository suite.

`node tools/prepare-grenade-motion.mjs --check` reports stale preparation in a Windows CRLF checkout. Regenerating into separate review artifacts shows that both prepared-motion and release files match exactly after CRLF-to-LF normalization. This is a validator portability issue, not a motion-data discrepancy: normalize line endings in its comparisons or enforce LF for the generated files, then require this check in validation.

Independent packaged-browser checks confirmed: the test battle renders; right-click ground opens its actions; unknown terrain is rejected by grenade targeting; a discovered target shows the lob/rebound/blast preview; live horse and hen throws each use one grenade and five AP and recover without console errors; the merc menu exposes interactions directly; changing to kneeling through its submenu costs two AP. The all-animal release/origin and cancellation checks passed headlessly. No claim is made here that every pickup route, camera angle or campaign scenario was retested in the browser.

### Builder corrections, October 8

The blocked-entry reproduction now defers arrival while world time continues. Travel and fatigue are staged, landing cells are reserved across simultaneous arrivals, and intercepted groups transfer together or both wait. The live encounter's state, unit and clock objects retain their identities. Holds survive capture/restore and campaign quicksave/load; opening the entrance admits the original people exactly once. See [campaign behavior and verification](CAMPAIGN-FOUNDATION.md).

The base Pages list now includes the shared `grenade-model.js` dependency. The grenade preparation validator normalizes CRLF before comparing both generated modules; the full twelve-animal generation check passed with actual CRLF copies as well as the original LF files. Generated motion data was unchanged.

157 focused tests pass, including 22 campaign cases, both packaging cases and the deployed-module checks. Generated-core verification, the packaged campaign playthrough and the isolated live blocked-arrival save/load reproduction pass. Temporary browser/server helpers were closed. These are builder fixes and verification; reconciliation with canonical's HUD and the integration requirements above remain the next release step, without an implied independent approval.
