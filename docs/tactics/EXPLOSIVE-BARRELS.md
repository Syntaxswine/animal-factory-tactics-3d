# Explosive barrels — 3D integration

## Integration review — October 5, 2026

Reviewed `2d39081` (barrels) and its parent `9c3ab71` (worn tanks) against canonical `main` at `6b60606`. Both gameplay commits are on `work/editor-3d`; neither is on canonical or GitHub Pages at this review. Release remains held for the items below. These notes record findings and do not change that approval status.

### Asset validation: register the procedural barrel path

`node tools/check-assets.mjs` fails at the environment asset-list comparison because `barrel-explosive` is registered in `PROPS` but has neither a separate raster-manifest entry nor a validated procedural exception. The visible drum is already rendered by the cargo library using `explosiveRed`, the flammable label and existing atlases. The failure is in how the asset audit classifies that render path; a missing standalone barrel PNG is not evidence that the painted drum failed to load.

Bring forward canonical's existing procedural checks for wood planks and trellis walls, then explicitly validate the explosive barrel's actual cargo model, finish, label and texture dependencies. Preserve the manifest comparison and existing asset checks. Simply omitting the barrel from validation would leave the coverage gap open. The full Pages workflow runs `npm run check` before packaging, so a successful packaging/module-closure check alone does not clear this failure.

### Merge reconciliation: preserve both sets of behavior

A read-only `git merge-tree --write-tree` comparison reports conflicts in seven paths:

- `dist/tactics/battle-renderer.js`: combine pending barrel props and tank effects with canonical's `visibilityFiltered` forwarding. That forwarding keeps already-visible casualties on screen during their pre-impact pose; replacing it with the builder version would lose the fix.
- `dist/tactics/tank-blast-effects.js`: canonical extracted `painted-blast-effects.js` so the barrel and tank studies share the effect, while the builder added world coordinates, surface heights, fog clipping and shared texture ownership to the old tank module. Carry those live capabilities into the shared implementation and preserve the callers' exports and options.
- `dist/tactics/tank-blast-motion.js`: retain the live route/world placement argument and compatibility with the existing study's default route.
- `dist/tactics/fixtures/tank-blast-contract.json`: regenerate or reconcile against the final core; preserve the recorded dry-ground/water exclusions and the current event contract.
- `tools/build-tactics-3d.mjs`: include the shared blast module, approved barrel study, new gameplay modules and their transitive dependencies. Preserve all existing module-closure checks, including the Quick Fight missing-module protection.
- `docs/tactics/LIVE-FIRE-INTEGRATION.md` and `docs/tactics/tank-blast/README.md`: reconcile the study and live-integration status and validation records.

### Barrel breakup still needs its live connection

`BattleTankEffects.make()` currently creates the tank effect for barrel receipts as well. That implementation emits eight small tank-shell fragments; it never calls the approved `createBarrelBlastMotion()` from canonical `6b60606`. Reuse the approved flying lid, base and torn panels, with the actual explosive-red finish/label, and suppress the duplicate small tank fragments. Keep the existing simulation-owned detonation, fire footprint, casualties, AP and ammunition. Connect the presentation to discharge timing, actual world/support height, visibility and cleanup; animation callbacks must not apply damage again.

The approved study is documented in [canonical's barrel handoff](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/6b60606ccdc6070a1c2408b2f6d2a52025b62cd1/docs/tactics/barrel-blast/README.md). The visual branch also carries a short coordination note in its tank-study README. Release reconciliation and live hookup belong to the coding branch; the existing approved barrel motion is the visual baseline.

### Evidence and release checks

The review passed 156 focused tests, pinned-core synchronization, and Pages packaging/module closure. A normal Quick Fight UI test selected the red barrel, fired a full-aim AK-47 shot, removed the drum and rendered ground fire. AP changed from 12 to 4 and ammunition from 30 to 29, with no browser warnings or errors. Local evidence is under `artifacts/oct05-fuel-review/` in the architect's review checkout; it is not part of the repository.

After reconciliation and the missing hookup, run `npm run check`, `node tools/sync-tactics-core.mjs --check`, and `npm run build:tactics-3d`. Retain both barrel-study and live barrel/tank regressions, then inspect the playable battle's detonation timing, barrel breakup, water/visibility/elevation behavior, save/reload and restart. Only a passing integrated result should be merged to `main` and deployed. Documentation-only commits carrying this handoff do not clear the release hold.

## Implemented gameplay behavior

`barrel-explosive` is an editor object with a one-tile solid footprint, a bright red painted drum and large flammable labels. Ordinary `barrel-single` and `barrels-cluster` props retain their existing behavior. The single drum at (7, 10) in Quick Fight is now explosive.

Hovering its actual mesh gives a red crosshair when the selected merc has a clear shot within their sight cone, or grey when blocked. Clicking opens the graphic shot menu with the existing hip / aimed / full-aim choices, probability forecast and AP costs. The barrel has no character body-part targets. An accurate firearm roll aims at its centre; failed rolls use roll-margin scatter and cannot hit that same barrel, but may strike another object or person. Incidental hits can detonate barrels too. Melee attacks on barrels are not supported.

Tanks and barrels now share `fuel-blast.js`: the existing lethal 3×3 centre, five-tile ignition radius, three-round dry-ground fire and elevation rules. This preserves the tank's current area rules, including its lack of wall clipping within the blast itself. Bullets, shotgun pellets, exposed grenade/RPG blast damage and scenery-clipped flamethrower spray can trigger barrels. Fuel blasts trigger other explosive barrels within their radius. Each barrel is removed before the chain expands, so overlapping hits cannot detonate it twice. Normal casualty, panic, loot and AP/ammunition handling remain authoritative in the engine.

The tank effect renders barrel bursts and debris at the drum centre. The drum and newly created fire wait for the triggering rifle/flame discharge; presentation never deals damage. Saves retain removed props, casualties and fire, while discarding transient animation receipts. Loading cannot replay an explosion. Fog, floor switches, reduced motion and disposal retire transient effects.

Editor placement uses the existing undo/redo, map export/import, block and playtest paths. No additional per-barrel identity or save schema is required. Projectile cylinders match the drum radius and height instead of filling its entire tile. `tools/core-barrel-adapter.mjs` applies these changes after the existing flame adapter; `core/` remains generated from the pinned upstream revision.

Validation: 147 distinct focused tests across barrel, tank, fire, ballistics, aiming, cargo, editor, save and loot suites passed. Core synchronization and the Pages build/module closure passed. `tools/check-explosive-barrels.mjs` exercises the real battle page's crosshair, graphic menu, resource charge, burst, restart, editor placement/undo/redo, and the painted model. Its temporary browser closes in `finally`; screenshots and its lifecycle receipt are in local `artifacts/explosive-barrels/`, outside the commit.

Publish this work on `work/editor-3d` for architect review. The Pages workflow deploys `main`; pushing this builder branch does not update canonical Pages.
