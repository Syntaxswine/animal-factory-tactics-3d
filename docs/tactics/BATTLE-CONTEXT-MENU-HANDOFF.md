# Battlefield right-click actions

2026-10-08 · `work/editor-3d`

Right-clicking the battlefield opens a compact menu. Its header identifies the
terrain or merc and shows **Column / Row / Level**, all numbered from one. Picking
respects the selected interaction level and the rotated camera. Unknown terrain
is labelled unexplored; unseen loot and hidden people do not appear in the menu.

Ground offers **Move here** and **Shoot at this tile**. Visible supplies, bodies,
and containers add a pickup/search option. Several piles on one tile get a
submenu. Decorative scenery is not an inventory item.

Right-clicking a merc offers character/inventory, stance, movement mode, held
equipment, reload/clear jam, and existing field interactions such as treatment,
rest, lockpicking, repair and nearby climbs. The menu uses their existing costs
and availability rules. Selecting another merc makes that merc the sole selected
actor. Right-clicking the current merc pauses an existing order without issuing
another one; **Stop movement** remains available.

The menu pauses simulation and presentation until dismissed. Escape closes it;
arrows navigate its submenus. A left click on the map while the menu is open only
dismisses it. Subsequent left clicks keep the existing contextual controls.

## Pickup approach

The selected merc takes the cheapest discovered route to the pile or an adjacent
interaction spot. Movement uses the ordinary queue, AP, stamina, door, occupancy,
height and traversal rules. Once the merc is close enough and the walking
presentation has settled, the character inventory opens with that pile highlighted.
It does not search or take items automatically; those operations retain their
normal costs and validation.

Replacement orders, selection changes, death, lost visibility, blocked movement
or insufficient AP cancel the pending inventory popup. The helper only cancels
movement it owns. The intention is transient UI state: saving/loading preserves
normal game state without replaying a deferred inventory popup.

## Shooting at terrain

Grenades and flamethrowers open their existing placement planners. Firearms now
support a terrain target through the standard three-level shot planner, with a
tile/crosshair graphic. Launchers and RPGs retain the explosive targeting rules.

An ordinary ground shot aims at the tile surface, not a fictional torso. It uses
the existing probability/miss system, weapon costs, bursts, ammunition, jams,
cover tracing and damage. It may strike an intervening character, including an
ally, or stop at a wall. It does not require identifying a person on the tile.
The preview only names people already visible to the squad. Ground aim does not
grant body-part bonuses or apply suppression to an invented target.

`tools/core-context-adapter.mjs` owns the small changes to the pinned tactical
core. Regenerate with `node tools/sync-tactics-core.mjs`; do not hand-edit core.

## Checks

- 90 focused tests pass, including nine new context/pickup/ground-fire tests plus
  inventory, ballistics, grenades, barrels, towers and deployment regressions.
- Core regeneration verification and the Pages build pass; missing-module checks
  include the added UI and gameplay modules.
- `tools/check-battle-context.mjs` checks actual right clicks, submenu actions,
  grenade and firearm planning, pickup travel, inventory focus, camera rotation,
  floor selection and dismissal in Edge. Its temporary browser closes in `finally`.
  Screenshots and the report are under `artifacts/battle-context/`.

The existing local preview on port 4364 is reused with its original automatic
shutdown deadline. No new persistent helper is required.
