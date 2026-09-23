# Cliff climbing gameplay handoff

Cliff links now use the live 3D movement system. The approved cliff study assets
from main are included, but this change does not automatically stamp study
geometry into maps or infer routes from decorative contour tiles.

## Rules and authoring

- Each climb or descent costs exactly **8 AP** in combat. Running and sneaking
  do not discount or increase it. Outside combat, ordinary exploration movement
  rules apply: no AP charge, existing movement pacing and stamina cost.
- Actors must stand, have enough stamina, and have an unoccupied landing.
  Legality and resources are checked again when the queued step executes.
- Author `climbs: [{x,y,z,dx,dy,kind:"cliff"}]`. The bottom is `(x,y,z)`;
  the top is `(x+dx,y+dy,z+1)`. Directions are cardinal, one level per link.
- In the 3D editor, paint the upper landing first, then choose **Cliff climb ·
  8 AP** and click the lower tile edge toward that landing. Keep the lower
  foothold's overhead tile empty. **Erase climb**, undo/redo, JSON roundtrip,
  endpoint protection, and block transport use existing climb infrastructure.
- Only explicitly authored climbable ledges should receive these links.
  Crag tags are rejected. Water approaches, missing support, blocked upper
  edges, and blocked headroom fail validation. Upper ground behind a crag can
  still be independently walkable. No swimming routes are added.
- Nearby mercs get Climb cliff / Descend cliff buttons. Cross-level pathfinding
  and guard navigation also use the links. Legacy roof climbs remain 6 AP.

## Animation interface

`state.cliffTraversals` contains the latest 64 committed events, oldest first:

```js
{ id: 1, unitId: 0, kind: 'cliff', direction: 'up',
  from: {x: 3, y: 4, z: 0}, to: {x: 4, y: 4, z: 1}, cost: 8 }
```

Consume each id once per encounter. Multiple actors can produce events during
one update. Simulation positions, stamina, and combat AP have already committed;
`cost` is the nominal combat cost, not proof AP was charged during exploration.
Animation must not replay movement or charge resources. Previewing or cancelling
an uncommitted move produces no event. Loading strips the event history and
sequence; reset the consumer when replacing the encounter. Casualties after
commit must keep the committed endpoint. Equipment remains owned by the shared
equipment controller; this integration does not alter weapons or loadouts.

The current renderer uses its existing floor-change fallback until the animation
agent connects these events. Logical floors are 2.12 world units apart, while
study cliff faces are 2.0 units high. A future visual terrain placement adapter
must reconcile that difference; do not assume the study's local coordinates are
already gameplay landing coordinates.

## Verification

38 focused tests passed across cliff traversal, editor editing, save/load,
movement modes and movement presentation. The 7 existing sprite roof regressions
also passed. Core regeneration verification, JS syntax checks and the 3D Pages
build passed. The original 2D core is unchanged; modifications to generated 3D
core modules are reproduced by `tools/core-cliff-adapter.mjs`.
