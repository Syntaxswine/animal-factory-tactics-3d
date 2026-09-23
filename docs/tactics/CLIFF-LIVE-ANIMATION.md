# Live cliff animation integration

The reviewed horse/rifle ascent (`acf3dd5`) now consumes committed cliff events
through `BattleTraversal`. Its original six-second motion is unchanged. A 0.35s
entry adjustment and 0.5s exit adjustment connect its authored root positions to
exact tactical tile centers. Animation never changes AP, stamina, inventory, or
simulation coordinates. The climb remains 8 AP.

Supported: a squad horse carrying a rifle ascending a straight, full-mask ledge.
The central link and the two neighboring lateral cells must have dry, passable
approaches, open approach headroom, supported upper floors, unblocked upper edges,
and unoccupied landings. All three cliff tiles must be full flat ledges. This is
a deliberately bounded match to the reviewed sideways leg swing, not permission
to stretch the clip onto arbitrary contours. Descent, other species/loadouts,
crags, curved faces, and insufficient clearance retain ordinary movement fallback.

## Authoring

`Cliffs` paints terrain. `Cliff climb · 8 AP` is now a separate tool internally
named `cliff-climb`, avoiding the terrain painter's `cliff` tool identifier.
Paint a three-tile-wide flat ledge and upper landing floors, then click the lower
tile edge toward its central landing with the climb tool. Existing saved
`kind:"cliff"` links remain compatible. This does not automatically add routes.

## Physical support

Full ledge tiles under authored upper floors support actors at the actual two-unit
cap, using derived `unit.cliffSupport`. Rendering omits the redundant 2.12-unit
floor slab, and projectile traces omit the corresponding phantom logical slab;
the actual welded cliff triangles still stop projectiles. Actor height queries
use the cap for sight, shots, and explosive height calculations. Ordinary floors,
towers, partial contours, and crags retain their previous support rules.

## Lifecycle

The renderer queues each committed event once. It blocks further gameplay actions
while playing and owns the shared equipment presentation during the clip.
Completion, casualty, equipment change, reduced motion, renderer reset, and
cancellation dispose temporary grips/paint/geometry and restore normal posing.
The committed destination and resource charges remain intact. Save/load already
strips presentation events, so a loaded climb does not replay. The selected merc's
floor follows a climb or descent; a playing actor remains renderable across the
floor change, including group movement by another selected merc.

## Checks

44 focused tests passed covering animation contacts/restoration, four cardinal
frames, exact entry/exit, cancellation/casualties/equipment changes, physical cap
and projectile support, cliff gameplay, save/load, editor edits and pinned core.
The live Edge renderer smoke test sampled seven phases with no console errors or
renderer diagnostics, and finished with gameplay unblocked. Screenshots are under
`artifacts/cliff-live/`. Run `tools/check-cliff-gameplay.mjs` against port 4323;
set `PLAYWRIGHT_PATH` if Playwright is not locally installed.

An additional 35 tower, ladder, shared geometry and combat regressions passed.
Core generation verification and the 3D Pages build passed. The animation proof
remains available separately at `tactics/cliff-climb-study.html`.
