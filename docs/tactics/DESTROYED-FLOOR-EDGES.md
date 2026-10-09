# Destroyed upper-floor edges

Missing structural floor tiles now leave a continuous jagged perimeter on the surviving slab. Adjacent missing tiles join into one open hole. Chipped concrete, splintered wood and asphalt examples use the original floor height, thickness and surface paint.

Visual source: `fe4af77` on `work/destroyed-floor-edges`, based on the approved wall edges `7734034`. Integrated with material HP, collapse and editor authoring on `work/editor-3d`.

## Completed

- [x] Track removed upper-floor tiles using original `definition.upper` versus current `upper`.
- [x] Generate only the perimeter on surviving tiles, including rows, blocks, L shapes, diagonal/separate holes, islands and cuts reaching the outer edge.
- [x] Keep every rim inside its surviving tile footprint. Shared intact joins meet exactly.
- [x] Close the top, fractured side and underside with correct outward normals.
- [x] Preserve native 0.12-tile slab thickness and 2.12-tile floor spacing.
- [x] Keep original authored voids and stairwells clean. Exclude original/current roof-module and cliff-support footprints, ground terrain, and decorative canopy level 3.
- [x] Preserve the floor's material and world texture coordinates, including wooden planks, grass, woodland and diagonal road paint.
- [x] Reuse gameplay/editor rendering, visibility, selected-level X-ray cutaway, and owned geometry/material disposal.
- [x] Detect replacement original floor definitions even when current surviving geometry is unchanged.
- [x] Preserve the visible damage across encounter save/load and restore intact slabs during a pending grenade's scenery rewind.
- [x] Supply a comparison with both upper floors and above, below, top and side views.
- [x] Independent hostile review: **9.1/10, no blockers**.

## Gameplay and editor integration

The game uses the existing structure HP transaction from `e01322e`: wood has 75 HP, light floors 100 HP and concrete 200 HP. A floor reaching zero HP leaves a real hole; occupants fall to supported space below, and unsupported objects and access links are resolved by the existing collapse handler. The rim appears on surviving neighboring tiles. Adjacent holes join automatically.

Hand-grenade scenery receipts preserve the original floor until the fuse finishes. The original intact slab still shields occupants below from that blast. Encounters and campaign checkpoints retain the resulting holes and rim appearance.

Existing navigation and projectile queries already understand absent upper tiles. Rendering adds no support or collider inside a hole. Roof modules retain their own models and are deliberately excluded from this ordinary-floor treatment.

In the editor:

- **Walls → Break wall:** click an existing brick, concrete or corrugated edge and drag along it. Surviving sections acquire the broken ends.
- **Tiles → Break floor:** select level 2 or 3, then choose a single cell or drag rectangle across structural flooring. Wood, ordinary floors, concrete, tile, asphalt and bridge decking retain their paint.
- Characters, props and access connections must be moved before breaking their supporting tile. Roof modules and natural cliff tops are skipped. Unsupported wall segments are removed with their floor.
- Paint an intact wall or floor into an opening to repair it. Use the corresponding ordinary erase tool to remove damage styling while leaving a clean opening.
- Preview is reversible; a gesture is one undo/redo step. Save/reload, export/import, block capture/placement and playtest preserve authored ruins.

`breaches: {edges: {}, upper: [{}, {}]}` is optional map/block metadata recording the kinds of deliberately removed sections. Rendering combines it with runtime destruction inferred from `definition`. Ordinary erasure never creates this metadata, and authored stairwells stay clean. References are validated and translated when reusable blocks are placed. Invalid or overlapping references are rejected on import and encounter loading. Existing maps need no migration.

`core-breach-adapter.mjs` preserves these fields in the generated gameplay core. Regenerate with `tools/sync-tactics-core.mjs`; do not edit the generated modules directly. The base distribution includes the shared floor geometry and metadata modules, and dependency-closure checks remain enabled.

## Files and review

`floor-breaches.js` resolves the perimeter masks and preserves material identity. `floor-breach-geometry.js` creates shared closed meshes. The ordinary environment pipeline selects those shapes automatically, and both battle and editor material paths retain painted grass/road shaders under the damage prefix.

Open `tactics/floor-breach-study.html`. Size widens the selected layout; Restore Floor returns to its original state. The small clean opening is an authored stairwell. The underside cutaway hides lower floor surfaces and adds inspection lighting. The horse stays on a supported tile, including the one-tile island.

Builder integration verification (October 8, 2026):

- **156 distinct focused tests passed** across editor authoring, saves, blocks, validation, actual structure damage and collapse, campaign persistence, grenade integration, rendering and packaging. The two runs contained 133 and 30 passing tests with seven shared cases.
- The real editor controls create a joined wall opening and a 2×2 floor hole; undo/redo, browser save/reload and exported map reload preserve both. No browser or scene errors.
- An actual grenade attack removes wood flooring at fuse completion, creates 14 rim tiles, and drops the upper occupant to ground level. The intact slab shields the occupant underneath from that blast. The action spends one grenade and 5 AP; both queued presentations finish.
- Repeated the **72 browser configurations** on the integrated branch: no errors, stable 54 geometries / 13 textures, correct X-ray, fog, paint shaders and original-definition replacement.
- Generated core freshness and the full 3D Pages distribution/dependency closure pass. This builder branch does not deploy Pages directly.

Original visual-study validation (before HP/editor integration):

- **61 focused tests passed**, including floor/wall geometry, shared rendering, saves, existing grenade presentation, X-ray, wood floor paint and distribution packaging.
- All **135** possible rim mesh variants are closed, bounded and outward-facing. Rays hit surviving slab tops and undersides at the exact prototype heights; removed tile centers remain clear.
- The hostile reviewer independently completed **1,156 visual, collision and grenade-volume clearance probes** across 48 cases, plus 14 fresh images.
- **72 browser configurations passed** with no errors. Repeating the warmed cases keeps GPU resources unchanged at 54 geometries and 13 textures.
- A paused live encounter renders all eight damaged tiles around a 2×2 hole, preserves X-ray level materials, hides unseen scenery, and rebuilds correctly after replacing the original floor definition.
- Special grass, woodland and diagonal-road materials retain their painted atlas and shader path.
- Pages distribution build and dependency-closure checks passed.

Reproduce:

```text
node --test tests/floor-breaches.test.mjs tests/wall-breaches.test.mjs tests/hybrid-materials.test.mjs tests/environment-models.test.mjs tests/hybrid-world.test.mjs tests/hybrid-geometry.test.mjs tests/editor-3d.test.mjs tests/wall-xray.test.mjs tests/encounter-save.test.mjs tests/painted-environment.test.mjs tests/wood-plank-floor.test.mjs tests/grenade-blast.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-floor-breaches.mjs
```

Set `PLAYWRIGHT_PATH` to an installed Playwright package. `FLOOR_BREACH_REVIEW_URL` optionally overrides the default origin, `http://127.0.0.1:4476`. Local reports and screenshots are in `artifacts/floor-breaches/`.

Integration checks include `tests/editor-breaches.test.mjs` for editor transactions, block coordinates, validation, real grenade damage, falling occupants, blast shielding and fuse timing. `tools/check-editor-breaches.mjs` exercises the real editor controls, browser save/load, and an occupied-floor grenade attack. Set `BREACH_REVIEW_URL` to the server origin. Evidence is saved under `artifacts/editor-breaches/`.

Temporary browser helpers close in `finally` and record exact identity and exit receipts. This integration reuses the registered builder preview on port 4364 for active user review. Its unchanged automatic shutdown is October 9, 2026 at 07:32 UTC (3:32 a.m. Eastern). The graceful stop marker is `artifacts/grenade-integration/STOP`; restart source is `artifacts/grenade-integration/preview.mjs`. The source task's port 4476 preview is outside this task's ownership.

Canonical merge and publication remain separate. The Pages workflow deploys only `main`.
