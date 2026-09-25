# Cardinal cliff ramps

Sixteen ramp props: four uphill directions, each with grass, sand, asphalt
(road) or concrete finish. Each is one tile wide with a four-tile run and a
continuous two-metre rise. Adjacent parallel ramps can form wider approaches.

## Editor placement

1. Place the high landing as a full cliff-ledge tile on the lower level.
2. Paint its floor on the next logical level up.
3. Choose Prop and ramp-<finish>-<direction>, with Rotate unchecked. The anchor
   is the northwest tile of the four-cell footprint; the named direction points
   uphill. Leave one clear lower approach tile and the adjoining upper landing.

Placement validates the footprint and landing. Missing floors, blocked
approaches, a rotated prop or a ramp on the highest level are rejected. Undo,
JSON export/import and complete reusable blocks preserve ramps. Erasing the
ramp leaves the independently authored landing intact. A block containing a
ramp but omitting its required upper landing cannot be captured as valid.

## Gameplay and geometry

Ramp cells have continuously sampled support heights, including unit aim,
projectiles and explosions through the shared unit-height path. The ramp solid
has an analytic ray intersection used by projectile, sight and tactical light
occlusion. Rendered slopes have the same two-metre rise, with a thin surface
finish. Side entry/drop-offs are blocked. Aligned neighboring lanes allow lateral and diagonal walking; isolated ramps follow the ramp axis.

Ascending and descending use ordinary stance-based walking AP, not the 8 AP
cliff climb action, and do not request a climbing animation. Ramps connect to
full ledges, not curved crags or arbitrary building floor heights. Units use
existing walking presentation; dedicated slope foot placement is not added.

Review: tactics/cliff-ramp-study.html. This is the cardinal ramp implementation;
diagonal river/cliff contour extensions remain separate work.

## Cliff-to-ramp bank set

Select a ramp, choose Dirt/Grass/Sand under Ramp bank surface, then click
Add banks to selected ramp. This atomically places four one-cell transition
pieces on each side. Existing props are never overwritten. The eight tiles
are solid and cannot be walked on; the centre ramp keeps its ordinary walking
route. Add full cliff ledges along the outer edge and at the high end to form
the surrounding plateau, as illustrated by the updated ramp study.

Bank steps 0–3 match the ramp elevation at their inner edges and rise through
a curved deposited-material profile to the two-metre cliff top. Left/right
pieces and all four uphill directions share matching seams. Individual bank
pieces are also available as rampbank props. The rendered triangles are reused
for tactical ray occlusion. Editor undo, blocked placement and block export
are covered by regression tests. This is the first visual pass on the join.


## Broad ramp integration — 2026-09-24

User direction: ramps are normally **6–10 tiles wide**, and are a **break in a continuous cliff wall**. The study now defaults to a long impassable crag front with a central eight-wide opening and plateau ground behind it. The banks return into the continuous front on both sides. The wall does not wrap an isolated little ramp platform.

### Placement

Use **Cut broad cliff ramp** in the 3D editor. Choose width 6, 8 or 10, uphill direction, finish and bank surface. Click the leftmost lower toe, looking uphill; width extends to the right. The preview includes all four rows, eight outer-bank cells and each upper landing. Placement is one undoable transaction.

The cut replaces only full cliff tiles and removes the upper floors above the slope/banks. Every lane must already end at a full cliff tile; the tool retains that tile as a flat ledge and supplies its upper landing floor. Lower approaches must be clear. Characters, other props, walls, fences, stairs and authored climb connections cause rejection, not silent deletion. Move these first. Curved edge tiles cannot be cut by this tool. Both supported logical base levels and all cardinal directions are covered.

For already-authored adjacent strips, **Add outer banks to ramp group** finds the complete contiguous, aligned group and adds banks only on the two outside edges. It does not put blocked ridges between lanes. Bank placement still rejects occupied cells atomically.

### Appearance and physical joins

Ramp and bank caps now join the existing cliff mesh before the exterior skirts and rim paint are generated. This removes internal lane seams, buried walls and false rim lines. The surface meets the landing at exactly 2 m; the old elevated thick surface box is gone. Crag vertices at the bank join share its height and ease back into the crag crown. This is a geometry connection, not an overlay hiding a crack.

The slope uses the cliff meadow/sand recipe. Exposed earth on banks fades into meadow at the crest and slope edge; asphalt and concrete retain distinct finishes. The bank has a smooth cross-section, and the same eight subdivisions per cell drive its rendered and tactical occlusion triangles. Banks and crags remain inaccessible; the central lanes support ordinary walking, including lane changes between aligned neighboring strips. There is no new slope-specific foot animation in this pass.

Fog is filtered per discovered cell after welding. Discovering a ramp's high end does not require seeing its anchor, nor reveal neighboring lanes. Scenery and core catalog checks now compare rule data and validate the actual terrain mesh owner. Both Pages build manifests include the shared terrain dependencies.

### Verification and review

- Final hostile subagent gate: **9/10**, including the continuous crag-wall composition.
- **37 focused tests passed**: broad cuts, level/direction coverage, save/reload/undo, walking, outside bank blocking, seam heights, ray agreement, fog, catalog and build dependencies.
- **114 browser configurations** passed before the final composition-only change (widths, directions, finishes, cliff families, bank finishes, view and scale). The continuous-wall layout received a fresh visual review.
- Real editor workflow passed: pointer preview and placement, undo/redo, IndexedDB save, page reload, load saved map, UI-launched playtest. Uphill walking was then exercised through the core API in that actual playtest state.
- Pages distribution builds successfully. Review tools: `tools/check-cliff-ramps.mjs` and `tools/check-cliff-ramp-editor.mjs`; configure `PLAYWRIGHT_PATH` and optionally `RAMP_URL`.
- The broader 935-test run initially had six failures. Five catalog/build assertions were corrected or updated for the terrain ownership change and pass in the focused rerun. One unrelated existing hen/wooden-spotlight-tower tail collision (0.0067036543 m) was reproduced identically in the source editor worktree. It remains open; this is not a claim that the entire regression suite is clean.

Integration branch: `work/cliff-ramp-refinement`, based on editor ramp commit `7d5b154`. No merge to canonical is part of this delivery.
