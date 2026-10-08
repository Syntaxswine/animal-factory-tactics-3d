# Strategic structures: editor and gameplay

2026-10-07 · `work/editor-3d` · Reviewed models imported from local art commit `5d77ec0`.

Radio towers, radar towers and SAM sites are now available in the **Objects**
palette, in intact and wreck variants. Each reserves an 8 × 8 footprint on
ground level, with no overhead floors or roofs. Placement, the existing prop
rotation control, copy settings, undo/redo, reusable blocks, portable map files
and playtesting use the same saved props.

## Destruction

- A visible contact from a flamethrower destroys the structure. Solid scenery
  shields it; the concrete pad alone is not flammable equipment.
- Grenades, grenade launchers and RPGs use the shared explosive path. Nearby
  fuel-tank and explosive-barrel blasts also destroy exposed sites.
- Ordinary firearm impacts stop on the actual model but do not destroy it.
- Destruction replaces the intact kind with `-destroyed`, retaining location,
  rotation and authored options. It is idempotent and survives encounter and
  campaign sector saves. Reloading never resurrects the intact model.
- Wrecks use the reviewed wreck geometry and passage map. A survivor caught in
  new debris can walk outward along a former passage, paying normal movement
  costs, until reaching a clear cell. No teleportation, extra damage, or free
  movement occurs. Other characters cannot enter the blocked debris cells.

Target a structure by clicking its model with an explosive weapon equipped;
hand grenades open the lob planner, while launchers and RPGs use the shot popup.
With a flamethrower, clicking opens the normal cone planner. Scenery targeting respects the selected interaction
level. Both editor and gameplay render the same native-scale models, including
the 0.24-tile hardstanding height under characters.

## Tutorial sabotage hook

Select an intact site in the editor, check **Allow sabotage action**, and apply
the setting. It can also be set while placing a new site. A merc beside the
control cabinet receives **Sabotage [site name]** in the ordinary field-action
panel. This costs **6 AP and 3 stamina** in combat, or **one game minute and
3 stamina** during exploration. There is no skill roll or area blast from
this action. Repeating it after destruction costs nothing and is rejected.

This is suitable for the tutorial's first radio tower, without requiring the
player to own explosives. No tutorial sector has been overwritten: the map
author enables it on the intended tower. Trusted quest code can also call
`destroyStrategicSite(state, siteId, {cause:'trigger'})`, inspect its one-time
receipt, then refresh the encounter. Map properties contain a boolean, not
executable scripts.

Radio alerts, radar coverage, SAM air defence and objective rewards are **not**
implemented by this change. Destroying a site currently changes its persistent
local state, collision, navigation and appearance. It does not spawn a secondary
area explosion. There is no bespoke collapse animation.

## Geometry and build contract

`strategic-site-data.js` is baked from the same model triangles used by Three.js,
with a bounding-volume hierarchy. Shots, perception, lighting and terrain sight
use those triangles: the entire 8 × 8 reserve is never treated as an opaque box.
The art manifest's conservative whole-roster standing mask, swept cardinal links
and boundary entries govern ordinary movement. No untested diagonals are added.
The hut is a closed shell; its painted door is not an enterable room.

After changing the models or passage data:

```text
node tools/export-strategic-sites.mjs
node tools/export-strategic-site-gameplay.mjs
node tools/sync-tactics-core.mjs
```

The pinned upstream tactical sources remain untouched. The new checked adapter
records generated 3D-core changes. Both Pages copy lists include their new module
dependencies; module-closure checks remain enabled.

## Review and checks

- 25 original art/clearance tests plus 17 integration tests pass. Coverage includes
  1,200 rendered-versus-tactical ray comparisons, open paths, blocked walls,
  all weapons, fuel blasts, AP/ammunition, slab support, sabotage, saves and
  survivor escape from every newly blocked clear cell.
- `tools/check-strategic-site-integration.mjs` exercises actual editor mouse
  placement, settings, copy, undo/redo and save; then the live sabotage button,
  encounter save/load, and the rocket target popup and Fire button.
- The wider 1,888-test run initially found two integration omissions: the base
  Pages module list and a renderer test double missing the new scene. Both were
  fixed; all five tests in those two affected suites pass on rerun.
- Asset audit, generated-core verification, baked-geometry verification and the
  3D Pages build pass.

Review links (relative to the served `dist` root):

- `tactics/editor-3d.html?editing=1&study=strategic-sites`
- `tactics/battle-3d.html?study=strategic-sites`
- `tactics/strategic-sites-study.html`

The explicit review map provides all three sites, appropriate weapons and
sabotage enabled. It does not replace Quick Fight or alter existing saves.
