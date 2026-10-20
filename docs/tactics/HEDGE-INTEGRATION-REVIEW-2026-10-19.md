# Hedge art approval and integration handoff

Reviewed artist commit `e806fce` from `work/painted-hedges`, merged for validation with canonical `0c67c86`. Approved for inclusion as an asset study. Editor and battle integration remain outstanding; this approval does not certify playable cover.

## Appearance

The low clipped hedge has a clear silhouette beside the native horse at gameplay scale. The tall hedge reads as a deliberately planted boundary. Corners, T junctions, crosses, rounded ends and the low-to-tall transition join without obvious gaps. The one-tile opening remains visibly usable.

The tall hedge's smooth, continuous sides still look more manicured than a wild country hedgerow. More variation in the crest and a few outward leaf clusters would improve that distinction. This is optional polish, within occupied tiles, rather than a reason to rebuild the asset. Keep the low hedge's clipped appearance and preserve the clear path openings.

## Work for the coder

1. **Editor and storage.** Add distinct low and tall choices with a live placement preview. Store occupied cells, height kind, floor/elevation and deterministic seed in a validated, versioned representation. Support paint, erase, undo/redo, copy/rotate blocks, save/load and editor playtest. Reuse `hedge-layout.js` for cardinal connections. Omitted cells must remain openings; a whole-run bounding rectangle is not an occupancy mask. Different elevations must not connect. Keep existing maps and foliage presets unchanged.

2. **Sight and bullets.** Export a finite, pure-data sight shape derived from the same connected hedge plan, including rounded ends and mixed heights. The current contract supplies only a prose sight instruction and wooden beam descriptors; it is not a ready-made gameplay collider. Use the established foliage broad phase and tracing paths, with consistent results for terrain fog, unit detection, shot preview and projectile travel. Avoid render-mesh raycasting or rebuilding geometry for every sight query. Convert horizontal coordinates and vertical units explicitly: the art uses x/z for the ground plane, while simulation cells use x/y and a separate floor index. Existing world/simulation height conversions still apply.

3. **Define what “cover” means.** The artist separates dense leaf screening from solid wooden stems. Leaves alone should not silently become an invisible bulletproof wall. Conversely, do not label the low hedge as dependable ballistic cover if most shots pass between its stems. If that stronger protection is intended, provide matching substantial wood or an earth bank and its collision shape. This mapping needs an explicit gameplay decision; the study does not make it. Preserve the established impassable-thicket rules while adding these separate hedge types.

4. **Movement.** Assign an explicit movement rule to each height. A conservative initial mapping is to block ordinary walking through planted cells and route through the openings; any low-hedge vaulting needs the existing action/pathing system and clear landing space. Do not infer traversability from a decorative gap between leaves, or close an omitted gate cell with a run-wide collider.

5. **Visibility and rendering.** Connect hedges to the game's existing fog and camera cutaway handling. A nearer tall hedge must not make a selectable path unreadable, and cutting away its art must not reveal an undiscovered unit or remove its tactical obstruction. Keep spatial chunks, cached geometry and shared textures. Camera movement, selection and turns must not reconstruct the hedge plan. Edits should rebuild affected chunks and any neighboring join boundaries. Leaf sprays already omit shadow casting; retain that saving.

## Acceptance checks for playable integration

Exercise low and tall hedges in the real editor and battle, not only this study. Cover straight runs, corners, mixed heights, an erased one-tile gate, chunk boundaries, raised ground and multiple floors. Save, reopen and playtest the same map, including a rotated/copied block.

Test standing, kneeling and prone observers/targets using actual combat eye and muzzle heights, with shots both above and through the hedge. The study's selected horizontal rays are useful geometry checks but do not establish all-species posture or combat behavior. Check both directions, elevated fire, fog discovery and wooden-stem impacts. Verify that movement can traverse the entire opening and that concealed enemies remain undiscovered when the render cutaway is active.

## Independent validation and cost

- **203/203 relevant tests passed** on the combined tree: the 12 new hedge checks, related foliage/biome checks and Pages packaging/dependency checks. The latter ran the 3D build, including missing-module validation.
- Asset audit and all **20 shared-core synchronization checks** passed. No merge conflicts or whitespace errors.
- Live browser inspection covered both heights, standing/kneeling references, a one-tile opening, top-view junctions and the mixed-height transition. No captured browser warnings or errors.
- Independently reproduced counts: 14-tile comparison = 4,098 triangles / 12 meshes; 16-tile gate fixture = 4,760 / 6; 32-tile tall row = 9,428 / 9 across three spatial chunks. These are asset counts, excluding characters, shadows and additional lighting passes.
- No new raster assets: hedges reuse the approved foliage atlases with their own materials. This is a modest standalone asset cost, not a measured whole-sector frame-rate guarantee. Benchmark a representative populated map after wiring, including shadow/light passes and repeated editor edits.

Artist API and study instructions: [PAINTED-HEDGES-2026-10-19.md](PAINTED-HEDGES-2026-10-19.md). Published study path: `tactics/painted-hedges-study.html`.
