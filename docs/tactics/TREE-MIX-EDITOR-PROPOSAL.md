# Tree mixes in the editor

Coder handoff · 15 October 2026

Add the approved Brush-led, Mixed canopy and Tree-led compositions to the normal
foliage workflow. A map maker should be able to paint them, revise an existing
area, save the sector or a reusable block, and launch ordinary Playtest with the
same trees and physical cover. Include path visibility and rendering work in
this delivery so the fuller planting is usable during play.

The implementation baseline is canonical `d47005f`. The
[composition study and review](FOLIAGE-TREE-COMPOSITION-2026-10-15.md) contain the
approved assets, comparison images and measurements. At this revision the mixes
are private previews; the study's editor link opens the original planting.

## Editor workflow

Add a **Tree cover** selector to the existing Foliage tool for Dense thicket and
Dense wetland thicket. It applies across temperate, jungle, snow, dry grassland
and wetland habitats; species continue to follow the local environment.

| Setting | Result |
| --- | --- |
| Brush-led | Existing tree placement above the blocking undergrowth |
| Mixed canopy | More crowns, retaining the existing trees |
| Tree-led | The fullest approved canopy, retaining the Mixed canopy trees |

Keep Brush-led as the default for new brush strokes and for existing data with
no explicit setting. Tree-led is the preferred starting point for deliberately
dense jungle; it should be an authoring choice rather than a conversion of old
sectors. These labels describe relative composition, not percentage canopy
coverage or a fixed number of trees per sector.

For dense presets, label the existing percentage **Undergrowth density**. Explain
that this changes decorative growth while the impassable sight screen remains.
Tree cover, undergrowth density and the preset's movement/sight rules must be
distinct controls. Increasing tree cover adds matching solid trunks and branches;
it does not remove the brush beneath them.

Open woodland keeps its existing spaced-trunk behavior and **Woodland density**
control, whose help must still explain that it affects both trees and grass. The
new composition choices initially apply to the tested dense presets. A separate
open-woodland abundance rule would change walkable trunk positions and needs its
own integration review.

Support the existing round, square and rectangle brushes. Provide **Change tree
cover only** for repainting existing dense foliage: preserve its ground, habitat,
undergrowth percentage and passability. Skip bare ground and protected cells.
One completed stroke is one undo step. Selecting or sampling an existing cell
shows its saved tree mix; a selection containing several mixes displays
**Multiple values** until the author explicitly applies a choice.

The in-map preview must show the proposed composition at its actual positions,
including retained trees, removed trees and protected routes. It uses the same
deterministic placement as the committed stroke. Escape cancels without changing
the document. Update the affected area at a bounded rate during dragging rather
than rebuilding the entire sector for every pointer event.

Keep Trees only and Brush only as labelled editor inspection aids, with a
persistent **Visual inspection only; obstruction is unchanged** notice. Those
toggles reset or stay editor-local and do not alter exported gameplay.

## Saved data and shared placement

Store tree mix per foliage cell, so several compositions can coexist within one
sector or block. It must survive browser Save/Load, JSON export/import, undo/redo,
block extraction and placement, sector-library workflows, ordinary Playtest and
campaign encounter save/restore.

Recommended compact extension to the existing foliage tuple:

```js
// Existing cells retain their exact interpretation.
[65, true]
[65, true, 'thicket-v1']

// Proposed fourth field versions the additional tree-placement rule.
[65, true, 'thicket-v1', 'mixed-v1']
[65, true, 'wetland-v1', 'trees-v1']
```

Omitting the fourth field means Brush-led. This versions tree composition
separately from the existing v1 sight-screen presets. Freeze each shipped
placement version; reject unknown values or invalid preset/mix combinations with
a useful error. Opening and saving an old map must not silently reroll trees or
upgrade its generation rules. Clear the composition with its foliage when
erasing or replacing eligible ground.

Promote the study's pure placement logic into the ordinary saved-map path:

- `synchronizeFoliage`, the renderer, headless sight/projectile queries and
  Playtest consume the same authoritative tree descriptions. Keep physical bark
  aligned with the displayed model, variant, scale, position and supporting level.
- Preserve baseline trees before adding optional candidates. For unchanged
  eligible ground, increasing the mix retains existing tree identities. Use one
  deterministic potential population and filter its composition tiers per cell;
  switching a neighboring area's mix must not reshuffle other planted trees.
- Retain the study's three-tile blocked-ground placement margin and minimum
  2.6-tile spacing between added trunks, plus headroom, scenery, access-point and
  supporting-height exclusions. Check composition boundaries as well as uniform
  fills. No new trunk may enter a cleared path or landing.
- Preserve the finite sight screens and deadfall. Leaves block sight, substantial
  wood stops shots, and leaves alone remain penetrable. Camera position, zoom,
  visual quality and cutaways never select gameplay obstacles.
- Include composition in geometry, sight and rendering cache invalidation.
  Recompute after relevant map edits; pointer movement and camera rotation do
  not regenerate the physical population.

Reusable blocks carry their composition values with the authored foliage mask.
As in the existing system, moving a block can regenerate procedural detail from
its destination coordinates. Mask, composition, protected entrances and the
relationship between art and collision must remain correct. Handle any supported
rotation transform consistently; this task does not introduce a new block
rotation feature.

The uniform 96 × 96 study is a regression fixture: its 8,463 occupied cells yield
73, 201 and 393 trees for Brush-led, Mixed canopy and Tree-led respectively.
Those counts are fixture expectations, not quotas for other maps.

## Path visibility in the editor and game

The broad clearing is readable, but the normal low camera can conceal a one-tile
route and its character behind foreground brush. The route is physically open;
the presentation needs to make that usable space apparent without requiring a
camera rotation or a permanently enabled grid.

Implement an **automatic vegetation cutaway** in both editor and gameplay:

1. Keep the selected friendly character and its immediate standing tile readable
   through foreground vegetation. While moving, follow the displayed character
   position so the opening does not jump to its destination.
2. Reveal known ground beneath the cursor and the relevant part of a valid
   movement preview when foreground foliage covers it. Show a clear tile outline
   and route markers. In the editor, use the active brush footprint or selected
   area as the corresponding focus.
3. Affect only vegetation between the camera and that focus, on the relevant
   floor. Retain surrounding canopy and enough boundary or trunk indication to
   show where solid cover and impassable growth still exist. Supporting ground,
   cliffs and other buildings retain their existing rules.
4. Restore the vegetation smoothly when the focus moves away. Use a small,
   bounded region and stable transitions to avoid flicker while crossing tile
   edges. Keep the current manual floor and camera controls for awkward views.

A compact feathered or dithered opening is preferable to fading an entire forest
or making every leaf a separately sorted transparent object. Reuse the existing
cursor wall-reveal infrastructure where useful, but make its vegetation behavior
depth-aware and floor-aware. Verify that foliage shadows do not leave an opaque
patch over the route after its canopy is cut away.

Picking must still reach the intended ground tile through the visual opening.
An opaque mesh's original raycast must not capture the click after its pixels
have disappeared. Movement validation remains authoritative: an exposed blocked
tile is still blocked, and highlighting must make that distinction clear.

Terrain visibility and occupant visibility remain separate. Cutaways do not
mark unknown terrain explored, discover guards, expose unseen loot, change
target availability or change LOS. Never trigger an opening from the location
of an undiscovered enemy. Already-known terrain may be readable while hidden
occupants remain absent under the game's existing visibility rules. Test both
color rendering and shadows for information leaks.

## Rendering cost and measurement

The heavier composition has a real geometry cost. These are static clearing
views at 960 × 640, pixel ratio 1, 22 pixels per tile, reverse camera, with
shadows included, from the linked study:

| Habitat | Brush-led triangles | Mixed canopy triangles | Tree-led triangles |
| --- | ---: | ---: | ---: |
| Jungle | 441,537 | 595,825 | 799,985 |
| Wetlands | 644,977 | 892,681 | 1,253,717 |

The integrated packaged build independently reproduced the Tree-led numbers.
Wetlands almost doubles submitted geometry. This does not establish twice the
frame time, nor does the study's `gl.finish` timing establish playable FPS.

Build on the existing instancing, 24-tile chunks, distant tree silhouettes,
screen detail levels and nearby shadow limits. Preserve the approved nearby
silhouette and improve distant representation where measurements justify it.
Reuse current atlases and materials; extra tree instances should not need a
texture copy or a unique material each.

Treat visibility and performance as separate responsibilities. Discarding or
fading fragments for a cutaway can improve readability while still submitting
all geometry. Skip wholly unnecessary chunks or instances when this is safe;
preserve correct shadows, fog and selection. Do not use a larger cutaway as
evidence that occlusion culling is implemented.

Cache static placement and reusable geometry. Camera/selection changes update
visibility and cutaway parameters rather than rebuilding the map or re-baking
ground paint. Keep material variants, masks and shadow work bounded; dispose
replaced buffers, textures and workers. A graphics-quality setting may simplify
crowns and shadows, but must retain a visible representation of solid trunks
and the same authoritative gameplay cover.

Before delivery, profile **ordinary gameplay**, using the same machine, browser,
resolution, pixel ratio, seed, camera route and quality for each comparison.
Record those conditions. Use the three mixes, all five habitats, the study fill,
and a representative 240 × 240 sector containing buildings, moving units, combat
effects and local lighting. Include day/night, wide and close views, low and
elevated cameras, fog boundaries, and continuous hover/cutaway movement.

After ground painting settles, record at least 60 seconds per representative
performance scenario. Report median, p95 and p99 frame timing, draw calls,
submitted triangles including shadow/light passes, detailed/shadowed chunks,
texture and geometry estimates, load/rebuild time, and LOS/path-query cost.
Separate measured GPU timing where available from CPU submission and display
cadence. Keep first-load and editing stalls visible in a separate cold-run record.

The proposed normal-desktop target is smooth 60 FPS with a 16.7 ms frame budget
on the recorded reference setup. Demonstrate the frame-time distribution rather
than converting a short submission benchmark into an FPS claim. Old Brush-led
maps should retain performance within repeat-run noise. If a new mix misses the
target, tune presentation detail or document the measured limitation before
calling it ready; do not silently reduce the saved tree population.

Retain the corrected texture accounting. The packaged Tree-led wetland clearing
reports about **91.7 MB of estimated texture storage**, including **32.0 MB of
ground paint**. This is not total GPU memory: geometry buffers, driver allocation,
shadow targets and CPU paint copies need separate accounting. Repeat mix changes,
undo/redo, floor switches and playtest reloads to show that allocations stabilize
and workers/resources are retired.

## Integration order and acceptance

Deliver the saved-data and shared-placement path first, then editor controls and
preview, then gameplay/editor cutaways and performance tuning. Keep the study
available as a comparison. Once saved-map parity is verified, change its link to
open the selected composition through the normal editor loader.

Relevant entry points are `foliage-data.js`, `foliage-obstacles.js`,
`editor-foliage-brush.js`, `editor-3d-tools.js`, `editor-3d-controller.js`,
`biome-gameplay.js`, `biome-scene.js`, `biome-terrain.js`,
`foliage-screen-scene.js` and `wall-xray.js` under `dist/tactics/`.
Update core adapters and regenerate imported core modules through
`tools/sync-tactics-core.mjs`; do not hand-edit generated `core/` files. Update
applicable source manifests and packaged module lists with their checks intact.

The delivery is complete when these cases pass:

- Old maps and blocks retain their planting and gameplay behavior. Unknown or
  malformed mix data is rejected. All three new authoring choices survive real
  Save/Load, JSON, block, undo/redo, Playtest and encounter round trips.
- Adjacent differently painted areas, all five habitats, all supported outdoor
  levels and protected access points produce deterministic, matching art and
  cover. Increasing just tree mix preserves the existing population; clearing a
  route removes its foliage data and leaves it usable.
- A one-tile path can be found, clicked and traversed at the normal low camera
  with the grid off. The selected character stays readable. Test both camera
  directions, moving and stationary cursors, multiple units and floor changes.
- LOS, bullets, movement and discovery give identical results with cutaways on
  and off and across visual quality levels. Hidden enemies and items stay hidden
  despite exposed terrain; their shadows do not reveal them.
- The full relevant test suite, asset audit, core synchronization check and
  packaged Pages build pass. Exercise the actual editor Playtest handoff from
  the packaged output and check application, module and shader diagnostics.
- Supply before/after gameplay-size captures of the one-tile route, a short
  moving-camera/cutaway recording, reproducible performance results and the
  documented test setup. Treat the remaining repetitive undergrowth as a
  separate art-polish note; preserve the approved foliage shapes and snow paint.
