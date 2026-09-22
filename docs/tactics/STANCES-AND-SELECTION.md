# Gameplay stances, casualties and group selection

The playable encounter has Stand, Kneel and Prone controls for the primary merc. These call the unchanged pinned core's `setStance`, including its two-AP combat cost, free changes outside combat costs, action guards and stance-dependent movement costs. The controls use `combatCosts` even during alerted exploration.

Shift-drag draws a rectangle and replaces the selection with living, present squad members whose displayed ground positions lie inside it on the viewed floor. Dragging either direction works. An empty rectangle retains the current selection. Shift-click a merc or squad card to toggle membership; ordinary selection returns to one merc. The star and thicker ring identify the primary merc. Ground clicks send the selected group through canonical `moveGroup`; Fire, Reload and stance controls affect the primary merc. Escape cancels a rectangle and stops queued movement. Pointer cancellation, loss of capture and window blur discard the rectangle. Selection is pruned after casualties and reset on restart.

The existing painted rigs now blend between standing, kneeling and prone, with a lower avian crouch. Kneeling movement and prone leg cycles follow accepted movement distance. The reduced-motion preference snaps position and posture and disables gait. Rifle shots retain the low stance, two-hand grips and alignment with the resolved core trajectory. Rifle, assault, SMG, shotgun and sniper equipment have a forward prone ready pose; this does not add full firing animations for the other weapons.

Bleeding, stabilized and dead actors have separate articulated grounded poses, with a brief fall transition. Guards with zero HP and no casualty flag are treated as dead. Squad status text identifies bleeding turns, stabilization and death. Existing shot playback delays a casualty's visual fall until discharge, without delaying or recalculating the core outcome. Canonical recovery restores the actor's current stance. Captured, departed and away actors remain absent. Downed actors hide their held equipment; world loot models remain separate work.

These are authored procedural transitions, not ragdoll physics or terrain-conforming falls. Bodies ground against the floor plane and may intersect nearby props. Hen firearm handling, other weapons' full firing cycles, medical treatment animation and climbing remain outside this change. The simulation modules and map collision are unchanged.

## Verification

- `tests/battle-posture.test.mjs`: selection filtering, canonical AP guards, interrupted transitions, recovery and reduced motion; all twelve species' grounded poses, visibly lowered crouches, stance gaits and low rifle alignment; prone ready equipment combinations.
- `tools/battle-posture-review.mjs`: actual Shift rectangles in both directions, group movement, stance controls, selection pruning, controlled casualty/recovery fixtures and twelve painted six-pose contact sheets. Evidence goes to `artifacts/battle-posture/`. Sheet columns are standing, kneeling, prone, bleeding, stabilized and dead.
- Existing `battle-firing-review.mjs` and `battle-motion-review.mjs` check gameplay firing and walking regressions. `PLAYWRIGHT_PATH` selects the installed Playwright package; `REVIEW_URL` selects the encounter URL.
- `npm run check`, `npm run build:tactics-3d` and `node tools/sync-tactics-core.mjs --check` validate tests, assets, packaging and the twenty unchanged pinned simulation modules.

Implementation is isolated on `work/stances-selection` for integration review.

Final validation: 574 tests and asset checks passed; the 3D build passed; all twenty pinned core modules were verified unchanged. Browser checks passed Shift selection/group movement, standing/kneeling/prone rifle discharge, normal/reduced walking, casualty/recovery fixtures and all twelve pose sheets. The independent hostile review scored this bounded change **9/10**, after the avian crouch was strengthened. No blocking findings remained.
