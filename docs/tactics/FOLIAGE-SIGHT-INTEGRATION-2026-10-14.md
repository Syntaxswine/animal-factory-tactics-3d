# Foliage sight and collision integration — 14 October 2026

Implemented on `work/editor-3d`, based on `85da0d8`. Current canonical `84a87d9` was already an ancestor; no conflicting merge was needed.

## Player and editor behavior

- The bog remains a ground texture, including water, mud and unsafe land patches. Existing blocked wetland overlays now carry a dense willow/reed screen and woody cover, following the user's clarification.
- Open woodland preserves spaced, deterministic trunk locations and walkable gaps. A trunk intersecting a sight ray or shot stops it.
- Dense thicket and Dense wetland thicket are impassable and opaque at character height, even with minimal decorative density. Leaves block sight; substantial trunks/deadfall stop shots. Leaves alone are not bulletproof. Vegetation has finite height, allowing real views over or around it.
- The Foliage tool offers the three named presets, density and movement controls. Outdoor upper floors and cliff ledges use their actual supporting height. Roads, access points, props and tree headroom retain placement protections.

## Data and rule contract

`foliage-data.js` accepts `[densityPercent, blocksWalking]` and `[densityPercent, blocksWalking, presetId]`. The validated v1 IDs are `woodland-v1`, `thicket-v1`, `wetland-v1` and reserved `bog-v1`. The future open-bog ID remains hidden from the editor list. Water or unrelated impassable ground does not gain opacity.

Legacy open overlays derive `woodland-v1`; legacy blocked wetland derives `wetland-v1`; other blocked woodland derives `thicket-v1`. Old open-tree positions are retained. Existing blocked regions remain blocked; their visible dense vegetation is revised to explain the new sight rule. No schema migration rewrites saved map files. Keep the v1 generation rules stable; use a new preset version for future obstacle-layout changes.

`foliage-obstacles.js` builds headless deterministic descriptions of solid bark beams, finite leaf masses and visible deadfall. Neither camera state, texture loading nor LOD chooses gameplay geometry. Core and hybrid queries use these descriptions; sight is an explicit query purpose that excludes bodies and includes leaf screens. Terrain discovery remains separate from current unit/item visibility.

Eight-tile spatial buckets are traversed in ray order, stopping after the nearest blocker. Cache signatures include ground, upper floors, scenery, foliage, environment seed/origin and access data. Simulation refresh, terrain visibility and renderer rebuilds synchronize the cache; individual rays do not scan a sector. Generated-tree grounding offsets are baked alongside the pure plant parts by `node tools/export-biome-manifest.mjs` and checked against the actual model factory.

Presets survive map and encounter serialization, editor undo/redo and translated reusable blocks. Authored variant rotation remains disabled in the existing sector-library UI. Prop and character rotations leave the foliage mask unchanged; this change does not introduce whole-map or block rotation. New procedural obstacle details are regenerated from the destination coordinates when a block is relocated, while its authored mask and access routes stay intact.

## Rendering and measurements

The five families reuse their painted materials. Low-poly masses and woody cover are instanced in 24-tile chunks. Interior lower masses and buried logs are omitted from rendering; their gameplay volumes remain. Painted caps close cut faces at clearings. Existing tree LOD and fog masking remain active, and the dense sight screen stays present at distant views.

Same 240×240 biome fixture, seed 173, 960×640 canvas, pixel ratio 1, shadows enabled. Mixed view: focus (123,0,117), 14 px/tile. Dense wetland view: focus (153,1.8,102), 32 px/tile. Both versions used the same camera angles. Baseline modules came from `85da0d8`.

| View / version | Draw calls | Triangles | Resident textures | Render submission median ms | Synchronized frame median ms | Sight query µs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mixed / before | 156 | 214,612 | 33 | 2.10 | 3.10 | 35.90 |
| Mixed / after | 178 | 292,128 | 39 | 1.30 | 1.90 | 34.70 |
| Dense / before | 77 | 160,596 | 21 | 2.70 | 5.20 | 33.75 |
| Dense / after | 84 | 178,200 | 24 | 0.60 | 1.10 | 33.05 |

Known image storage is approximately 32.2 MiB in both versions, excluding driver allocation, shadow targets and shader-only textures. The new 240×240 single-channel screen masks add 56.25 KiB per rendered family/level (six in this fixture, 337.5 KiB total). Texture counts above include only textures actually used in that view. These estimates are not direct GPU-memory readings.

Synchronized frame time measures submission plus `gl.finish`, excluding browser compositing and display refresh. Independent GPU timer queries were unavailable, so no GPU-only timing or FPS claim is made. CPU load varied during the checks; timing differences are smoke measurements, not a speedup claim. A separate headless 14,400-cell wetland patch built 44,276 volumes in about 177 ms and resolved indexed sight queries in about 17 µs each on this host.

Local captures, measurement JSON, logs and benchmark source/restart instructions are preserved under `artifacts/foliage-sight/`. The temporary public benchmark files and packaged-build junction were removed after testing.

## Validation

- Full `npm run check`: 2,348 tests passed, including the asset audit. The first run found a stale biome manifest; it was regenerated and the full check passed.
- After final ray/visual optimizations: 82 focused foliage, geometry, compatibility, renderer visibility and biome tests passed. Coverage includes generated/manual trunks, all five dense families, every aimed body zone and stance, tile seams, elevated heads, cache edits, ground/seed/origin changes, scene exclusions, undo, blocks, map/encounter round trips, exact model grounding and indexed-versus-brute-force rays.
- `node tools/sync-tactics-core.mjs --check` passed. Adapter changes and regenerated core/manifest are included.
- The base Pages build and the 3D wrapper build passed with module-closure checks. All five procedural ground assets and their actual atlas dependencies are audited; orphan and missing-file checks remain strict.
- Browser review: source editor → ordinary Playtest and packaged editor → ordinary Playtest both loaded the biome fixture with the new screens. Inspected mixed, close, reversed and elevated views; preset controls and gameplay HUD loaded. No application/module/shader errors were reported. The in-app browser emitted its own Electron sandbox startup warnings on new playtest tabs; rendering and playtest handoff still worked.

Publication from this branch does not deploy canonical Pages: the workflow runs on `main`. The architect can review and merge the branch separately.
