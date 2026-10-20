# Factory machine editor and gameplay proposal

Coder handoff · 20 October 2026 · Proposed implementation

Add the painted lathe, milling machine and power press to the normal 3D editor
and tactical game. A map maker should be able to place and rotate a machine,
save it in a sector or reusable block, and play the map with movement, sight,
bullets and grenades respecting the machine's actual form.

This delivery covers the three static props and their physical cover. Production,
operating animations, economic output and new interaction commands belong to
later work. Reuse the existing art at its native scale.

## Assets and placement dimensions

Use the existing [factory machine collection](FACTORY-MACHINES.md). Its reduced
meshes are the runtime source; retain the author meshes for art tooling.

| Editor name | Suggested kind | Runtime mesh | Triangles | Native height |
| --- | --- | --- | ---: | ---: |
| Metalworking lathe | `machine-lathe` | `machine-lathe-10k-data.json` | 9,996 | 1.744 |
| Vertical milling machine | `machine-mill` | `machine-mill-10k-data.json` | 9,996 | 2.852 |
| Power press | `machine-press` | `machine-press-10k-data.json` | 9,997 | 2.519 |

All three fit the authored 2 × 3 tile reservation. Quarter turns exchange that
reservation for 3 × 2; half turns preserve its dimensions but reverse the working
face. Use `factory-machine-model.js` and `factory-machine-paint.js`, including
the press's current version 2 paint.

**Height needs explicit validation.** The game's rendered floor spacing is 2.12
units, so the mill and press extend above one ordinary floor interval. Show their
full height in the preview and reject intersections with a ceiling, upper floor
or another solid object. They fit open factory halls or appropriately open
upper space. Do not shrink the machines or automatically remove overhead floors
to make placement succeed.

## Editor workflow

Add a clearly named Factory machines group to Objects. Each entry should show
its painted model, footprint and facing before placement. Provide all four
quarter-turn orientations through the placement controls and R. Keep Q and E
as camera rotation controls under the existing editor convention.

The cursor preview must use the same model transform as the committed prop,
with a visible footprint and working-face marker. Mark unsupported placement,
overlap and insufficient headroom as invalid, with a short reason. Keep the
last valid document intact when a placement or rotation fails.

Selection, rotation, copy settings, deletion, Undo and Redo must work on an
existing machine. A rotation is one undoable operation and rechecks the new
reservation and headroom. Preserve the normal support rules on every supported
editor level and prevent overlap with starts, occupied objects and access points.
Show available approach space without reserving an invented operator tile.

Persist the kind, anchor, level and full orientation through browser saves,
JSON export/import, reusable blocks, sector variants and ordinary Playtest.
Use one normalization function for orientation throughout the implementation.
If an additive `rotation: 0 | 90 | 180 | 270` field is used, retain the existing
meaning of `rotated` for old props and define a consistent import rule. Do not
collapse 180° into 0° or 270° into 90°. Block rotation must compose with the
machine's orientation and return exactly to the original state after four turns.

## Shared geometry and transforms

Extend the existing helicopter and furnishing path rather than creating a
separate machine-only map format. Useful starting points are `scenery-catalog.js`,
`scenery-scene.js`, `scenery-rules.js`, `scenery-collision.js`,
`tools/export-helicopter-gameplay.mjs` and `tools/core-scenery-adapter.mjs`.

Bake versioned physical data from the committed reduced meshes in a reproducible
Node tool. Include standing clearance, legal movement links and an acceleration
structure for finite triangle queries. Record the mesh source hashes and add a
freshness check. The runtime simulation must load this data without a renderer,
WebGL context or model fetch.

One local-to-map transform must define the mesh origin, rotated footprint,
height and inverse queries. Map the native centered model into the editor's
anchored reservation once. Explicitly reconcile native render units with the
shared core's tactical height coordinates; a level offset alone does not make
the two height conventions equivalent. Test raised floors and cross-floor rays.

Exclude machines from the old generic prop box after installing their physical
queries. Otherwise an accurate query through a real gap can still be blocked
by the fallback 0.8-unit or tall-prop prism. The renderer must likewise avoid
drawing a second placeholder box over the painted model.

## Movement and physical cover

Keep three distinct decisions consistent with the same shape:

- **Placement reservation:** the 2 × 3 rectangle keeps separate authored props
  from overlapping during editing.
- **Standing movement:** use conservative body clearance and swept movement
  links. Machinery bases, legs and projecting tables must stop a character
  when its standing body cannot fit. Small tooling gaps are not walking routes.
  A clear tile center alone must not permit a diagonal step through a machine.
- **Sight and projectiles:** use the finite physical surfaces, including their
  genuine openings. A broad opaque base blocks sight and bullets; a ray through
  a clear press throat or above a low component remains clear.

The machine can conceal the lower body while leaving a standing head exposed.
Kneeling and prone characters use their existing body heights. Cover depends
on the direction and height of the actual shot, including shots from above;
the entire placement rectangle must not become an invisible solid wall.

Integrate with the existing hit, exposure and cover rules. Do not award a new
unconditional accuracy bonus or apply a second penalty on top of an already
intercepted shot. Shot previews, real attacks, enemy fire and visibility queries
must agree about which physical parts obstruct the ray.

Grenades and rockets must use the same placed solid geometry for their existing
collision queries. Grenade sweeps need their existing projectile radius, not
only a zero-width center ray. Preserve the current explosion propagation and
prop destruction policy, with physical surfaces supplying obstruction where
the existing simulation asks for it. The machines are ordinary inert scenery,
not explosive fuel barrels.

When an existing action removes a machine, remove its render instance,
navigation obstruction and collision data in the same state change. Invalidate
the affected geometry, visibility and path caches. Encounter and campaign saves
must retain that removal; returning to a sector must not recreate its cover.
This delivery does not introduce a separate machine health or production system.

## Rendering and preparation cost

Load a machine family only when it occurs in the map or its editor preview.
Share geometry, textures and compatible materials between instances of that
type. Prepare the six-view paint projection and its visibility texture once
per type and renderer, rather than once per placed machine or frame. Keep
shared-resource ownership separate from instance disposal.

The paint must work with the game's daylight, local lighting, fog and interior
reveal rules. A gallery shader must not leave a machine conspicuously bright
at night or expose it through undiscovered interiors. Rendering visibility
changes must not remove authoritative collision or sight obstruction.

Use the existing scene culling and cache invalidation. Camera movement,
selection, aim previews and turns must not rebuild the machine meshes or bake
their paint again. Measure cold preparation separately from steady rendering
and collision-query costs. Report triangles, draw calls, texture memory and
CPU frame/query timings against the same empty-room baseline for a small
factory fixture and a 30-machine stress fixture. Repeated instances must share
preparation; timing data should identify any remaining cost before release.

## Verification and release

Provide a compact editor/playtest fixture containing all three models in four
orientations, cover targets on both sides, an open approach and a supported
raised example. Include one invalid low-ceiling example that the editor rejects.
Keep this fixture separate from the user's authored maps.

Required checks are:

1. Placement, all four rotations, support, headroom, Undo/Redo and failed-edit
   atomicity; export/import, block rotation and sector save preserve identity
   and orientation. Existing maps retain their current behavior.
2. Independent comparisons between transformed model triangles and headless
   collision data for every type and orientation, at ground and raised levels.
   Include deliberately blocked rays and deliberately clear gaps, including
   the press throat and space above the lathe.
3. Real movement routes and diagonal links around each machine. Compare standing,
   kneeling and prone sight/shot results from different directions and heights.
   Verify the shot preview against the committed attack, and test grenade sweeps.
4. Removal followed by an immediate path and shot query, save/reload and sector
   revisit. No invisible remaining collider or restored destroyed prop.
5. A normal browser playthrough from editor placement into Playtest, with all
   paints present, correct lighting, no module errors and clean resource disposal.
   Test the packaged Pages output as well as source.

Implement shared-core changes in adapters and regenerate with
`node tools/sync-tactics-core.mjs`; do not hand-edit generated `core/` files.
Preserve the existing asset audit, both build manifests, transitive module and
worker checks, and geometry freshness checks. Run the relevant regressions,
core reproduction, asset validation and Pages build, followed by the repository's
required release checks. Include the new runtime meshes and paints without
requiring the author-resolution meshes at gameplay startup.

The handoff for review should identify the commit, fixture URL, collision bake
command, checks and cost measurements, with gameplay-size screenshots showing
the same machine providing cover and permitting a shot through an actual gap.
Update the collection's scope note when this integration is complete.
