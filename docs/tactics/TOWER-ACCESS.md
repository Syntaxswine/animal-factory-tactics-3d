# Tower windows, lookouts and access

The three playable searchlight towers support four fixed top positions: the wooden platform tower, iron stair guardhouse and iron ladder guardhouse.

In the editor, select a tower, choose the species/weapon/outfit under Guard / squad placement, and click **Add lookout to selected tower**. Repeating fills the available posts. Guard placement supports undo, browser saves, export, block capture/placement and playtest. Remove the lookout before removing a tower; invalid or orphaned posts fail map validation. Relative `towerPost` references bind occupants to their tower and survive block translation.

In battle, move a standing merc onto the gold entrance ring. **Climb tower** uses the stairs or ladder and moves them to an available top post. **Descend tower** returns them to the entrance. Each traversal costs 6 AP in combat or 30 game seconds during exploration. An occupied/blocked exit or full platform prevents traversal. These are discrete traversal actions, not a new limb-by-limb climbing animation. Top positions are fixed; use descent instead of ground movement. Stationed enemy guards hold their posts, can turn, detect and shoot, and do not automatically climb down during pursuit.

Every occupied tower post automatically identifies spotlight-lit people in all directions if a lit body region has clear line of sight. Sneaking, camouflage and awareness delays do not help. Windows and doorways pass sight, beams and projectiles; walls, sills, frames, decks and roofs block them. Ordinary ground observers retain facing rules. The tower's own lamp need not provide the light: a target in any active spotlight qualifies.

Rendering, sight origins and projectile bodies use the actual 6.36-tile deck elevation above the base floor. A post remains associated with its base floor for UI filtering; it does not invent a fourth global map floor. Tactical structural boxes model the open-window shell and roof panels, with fine railings/braces and beveled details still approximated. Terrain level spacing retains the existing tactical/presentation distinction.

Tests cover opening and solid rays, rotations, placement persistence, stale references, climbing costs, occupied exits, stationary AI, 360-degree illuminated-target detection and elevated shooting. `tools/tower-access-review.mjs` exercises editor lookout placement and the battle climb/descend buttons, including the rendered actor height.

## Animation handoff

`climbTower(state, unit)` in `tower-actions.js` is the only traversal mutation. It validates, charges the action, commits the destination, and refreshes perception. Failed requests leave the state unchanged. The animation layer must not charge AP/time or replay this mutation.

Each accepted action publishes `state.towerTraversal`: monotonically increasing `id`, `unitId`, `direction` (`up`/`down`), `access` (`stairs`/`ladder`), a tower prop snapshot, `from` and `to` poses, charged `apCost`, and `gameMinutes: 0.5`. Poses retain relative `towerPost` metadata when elevated. Observe each event once; queue snapshots if presentation remains busy. This is separate from combat effects. Presentation can interpolate these poses while simulation stays at the committed destination, following existing pause/reduced-motion controls.

`towerEntry`, `towerSlots`, `towerForUnit` and `unitBaseHeight` live in `tower-geometry.js`. Unit `z` is the tower's base map floor, while `towerPost` identifies the elevated position. `toWorld` adds the deck elevation for rendered actors. Do not convert posts into a fourth global map floor. The art builders remain the source for rung/tread geometry if the animation needs intermediate hand/foot targets.
