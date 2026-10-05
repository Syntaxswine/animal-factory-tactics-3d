# Explosive barrels — 3D integration

`barrel-explosive` is an editor object with a one-tile solid footprint, a bright red painted drum and large flammable labels. Ordinary `barrel-single` and `barrels-cluster` props retain their existing behavior. The single drum at (7, 10) in Quick Fight is now explosive.

Hovering its actual mesh gives a red crosshair when the selected merc has a clear shot within their sight cone, or grey when blocked. Clicking opens the graphic shot menu with the existing hip / aimed / full-aim choices, probability forecast and AP costs. The barrel has no character body-part targets. An accurate firearm roll aims at its centre; failed rolls use roll-margin scatter and cannot hit that same barrel, but may strike another object or person. Incidental hits can detonate barrels too. Melee attacks on barrels are not supported.

Tanks and barrels now share `fuel-blast.js`: the existing lethal 3×3 centre, five-tile ignition radius, three-round dry-ground fire and elevation rules. This preserves the tank's current area rules, including its lack of wall clipping within the blast itself. Bullets, shotgun pellets, exposed grenade/RPG blast damage and scenery-clipped flamethrower spray can trigger barrels. Fuel blasts trigger other explosive barrels within their radius. Each barrel is removed before the chain expands, so overlapping hits cannot detonate it twice. Normal casualty, panic, loot and AP/ammunition handling remain authoritative in the engine.

The tank effect renders barrel bursts and debris at the drum centre. The drum and newly created fire wait for the triggering rifle/flame discharge; presentation never deals damage. Saves retain removed props, casualties and fire, while discarding transient animation receipts. Loading cannot replay an explosion. Fog, floor switches, reduced motion and disposal retire transient effects.

Editor placement uses the existing undo/redo, map export/import, block and playtest paths. No additional per-barrel identity or save schema is required. Projectile cylinders match the drum radius and height instead of filling its entire tile. `tools/core-barrel-adapter.mjs` applies these changes after the existing flame adapter; `core/` remains generated from the pinned upstream revision.

Validation: 147 distinct focused tests across barrel, tank, fire, ballistics, aiming, cargo, editor, save and loot suites passed. Core synchronization and the Pages build/module closure passed. `tools/check-explosive-barrels.mjs` exercises the real battle page's crosshair, graphic menu, resource charge, burst, restart, editor placement/undo/redo, and the painted model. Its temporary browser closes in `finally`; screenshots and its lifecycle receipt are in local `artifacts/explosive-barrels/`, outside the commit.

Publish this work on `work/editor-3d` for architect review. The Pages workflow deploys `main`; pushing this builder branch does not update canonical Pages.
