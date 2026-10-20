# Hedge editor and gameplay integration

The short clipped hedge and tall country hedgerow from artist commit `e806fce`
are now ordinary saved map objects, available in **Objects** as **Hedge · short /
clipped** and **Hedge · tall / screening**. Single-tile and rectangle strokes show
the joined model before placement. Repainting changes the form; Erase objects
can clear a rectangle. Existing map undo, save/export, blocks and playtesting
preserve the placements. No existing map is automatically replanted.

## Physical rules

- Both forms block walking in their occupied tile, including diagonal corner
  shortcuts. Neither is a vault/climb link. Omitted cells remain full-tile gates.
- Sight follows the finite painted core. The short form screens low sightlines;
  a standing observer can see above it. The tall form screens standing actors.
  Elevated sightlines remain clear when they pass above the hedge.
- Leaves screen vision but are not bulletproof. Visible five-sided wooden stems
  provide solid shot cover. Fog, detection, target previews and hybrid shots use
  the same cached foliage queries.
- Corners, ends, mixed heights and chunk boundaries use the artist's joined plan.
  Each floor is independent; full cliff ledges retain their actual height.
  Camera cutaways and distant leaf-detail culling do not alter collision or
  reveal unseen units.

## Storage and geometry

Each cell is a prop with `kind: hedge-short | hedge-tall`, integer `x/y/z`,
`hedgeVersion: 1` and a uint32 `hedgeSeed`. Omitted metadata defaults to version 1
and seed 173; invalid supplied versions/seeds fail map/block loading. Each form
defines its height. The seed remains with a copied/repainted cell. Adjacent
different seeds blend consistently across their shared join.

`hedge-surfaces.js` supplies the pure core tessellation used by both rendering
and sight geometry. Collision has internal cell closures; the renderer does not
draw internal caps. Wood uses the same tapered pentagonal cylinder as the asset.
Triangle trees are shared by world/simulation queries, with only the ray height
converted between their coordinate systems. No Three.js scene raycast is used
by gameplay.

The renderer keeps 16 × 16 chunks, a small neighbor halo for joins, two shared
paint textures, fragment fog and the existing foliage cutaway. Editing rebuilds
the changed render chunks and their affected neighbors; turns, camera movement,
fog and selection reuse geometry. Removed chunks release their meshes,
materials and shadow materials. Simulation geometry follows the map-revision
cache; a geometry change rebuilds the obstacle snapshot.

## Verification and review

- `/tactics/editor-3d.html?editing=1&study=hedges`: editable demonstration with
  both heights, a gate, a mixed row and an upper-floor garden.
- `/tactics/battle-3d.html?study=hedges`: the same ordinary map in gameplay.
- `/tactics/painted-hedges-study.html`: retained artist comparison study.
- Artist geometry tests plus integration tests cover occupied cells, diagonal
  movement, visibility/target zones, real rendered-versus-collision rays in both
  directions, gates, floors/ledges, metadata validation, undo/repaint/erase,
  blocks/saves, cache invalidation and render resource reuse.
- Packaged editor review verified drag planting, undo/redo, placement on level
  two, browser saving and opening the edited map through Playtest. A movement
  order toward a hedge stopped before entering it; the guard behind the intact
  row stayed hidden while the guard by the gate was visible.
- The full regression run passed 2,612 of 2,616 tests before four integration
  fixes: the two catalog tests now exercise the joined renderer/collider,
  the foliage source manifest is regenerated, and the artist study is confined
  to the complete 3D package. All four failures passed on rerun. The final
  targeted runs passed 92 distinct hedge, foliage, map-cache, catalog and
  packaging tests. Core regeneration checks, the asset audit and both Pages
  builds pass. Temporary review tabs and the registered review server were
  closed after capturing the editor/gameplay evidence.

A local CPU probe with 1,024 densely planted cells measured about 4.8 seconds
for a cold collision build, 0.17 ms per cached snapshot lookup, 0.0068 ms per
indexed sight ray and 120 MiB of retained collision/cache heap after collection.
This synthetic measurement ran alongside the regression suite; it is not an
FPS claim. Very large hedge fills still have a noticeable one-time preparation
cost. The gameplay test map has 68 cells. Future worker preparation or a more
compact collision representation can target that cold cost independently.

The user requested movement and sight blocking. This change does not introduce
new hedge destruction, regrowth, vaulting or damage rules.
