# Destroyed wall edges

Removing a wall segment now leaves a rough edge on each surviving side. Adjacent missing segments join into one larger, clear opening. No posts, stumps or extra collision remain in the deleted segments.

This branch starts at `955a411`, the approved shared grenade/RPG/launcher explosion work. The new shapes are used by the live encounter renderer as well as the comparison study.

## Delivered

- [x] Brick: stepped, chipped courses with exposed terracotta edges.
- [x] Concrete: uneven broken faces and lighter exposed corners.
- [x] Corrugated metal: irregular torn and folded ends.
- [x] One to five adjacent deletions in the study; arbitrary consecutive deletions in gameplay.
- [x] Separate openings, a remaining segment chipped on both ends, and merging openings when that segment is removed.
- [x] Both wall directions, upper floors, negative map-boundary coordinates, and corners.
- [x] Window sills and lintels retain their opening while their exposed end is damaged.
- [x] Existing visibility and cursor X-ray apply to the actual broken geometry.
- [x] Saved encounters and campaign restoration preserve the rough ends.
- [x] Hand-grenade scenery rewind preserves intact walls until the fuse finishes.
- [x] Lazy shared meshes, deterministic variation, complete disposal, and stable repeated-preview resource counts.
- [x] Independent hostile review: **9.2/10, no blocking findings**.

## Integration

`wall-breaches.js` compares the encounter's original `definition.edges` with its current `edges`. The original map already persists in encounter saves, so there is no new damage field or save version. An editor erasure on an ordinary authoring map does not acquire fake damage.

At each endpoint of a destroyed wall/frame, a lone surviving masonry segment receives a rough end. Two surviving branches meeting at a corner or junction retain their connected joint. Explicit zero-level edge aliases and perimeter coordinates are normalized before comparison. Floors remain independent.

`wall-breach-geometry.js` creates connected, capped geometry inside the surviving segment's original footprint. It retains the existing world-aligned wall textures, with a narrow exposed-edge strip. The shared environment renderer selects these shapes automatically after existing explosive transactions remove edges. Replacement map definitions also invalidate the presentation cache, even when the surviving geometry is identical.

Damage, blast radius, resistance, navigation, cover and AP rules remain authoritative in the existing simulation. This pass changes the visible aftermath; it does not add a wall-collapse animation, falling floors, flying rubble, or revised blast-cover timing. Fences, trellises and surviving door leaves retain their existing models.

## Review

Open `tactics/wall-breach-study.html`. It offers material, opening width, separated gaps, corners, windows, direction, floor, four views and gameplay/close scales. Each square is one tile and the horse is native size. Widen Opening and Restore Wall show how adjoining breaches merge. Drag to orbit.

Its demolition-range link opens `tactics/battle-3d.html?study=wall-breaches`, with four valid squad starts and brick, concrete and corrugated walls.

Validation on October 8, 2026:

- **86 focused tests pass**, including all 162 capped mesh variants, physical movement through real explosive breaches, encounter restoration, grenade timing, shared materials/geometry, X-ray and distribution packaging.
- **51 browser configurations pass** with no errors. Repeating the warmed configurations leaves GPU resources unchanged: 53 geometries and 12 textures.
- **Three actual RPG attacks** create continuous 8-, 7- and 9-segment walkable openings in brick, concrete and corrugated walls respectively. Each has exactly two broken outer ends, and each shot spends the expected AP/ammunition.
- X-ray uses all six fractured chunks' actual edge geometry; completely unseen terrain renders no environment chunks.
- The reviewer independently checked 19 tests, a campaign save/load round trip, nine study screenshots and three live battle screenshots. The initial negative-coordinate and widening-control defects were corrected before the final **9.2/10** gate.
- The Pages distribution build and module dependency closure pass.

Reproduce the focused checks:

```text
node --test tests/wall-breaches.test.mjs tests/environment-models.test.mjs tests/hybrid-materials.test.mjs tests/hybrid-world.test.mjs tests/hybrid-geometry.test.mjs tests/editor-3d.test.mjs tests/wall-xray.test.mjs tests/encounter-save.test.mjs tests/grenade-integration.test.mjs tests/grenade-blast.test.mjs tests/tactics-explosives.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-wall-breaches.mjs
```

The browser script takes `PLAYWRIGHT_PATH` for an installed Playwright package and optional `WALL_BREACH_REVIEW_URL` for the server origin (default `http://127.0.0.1:4476`). Screenshots and its report are local under `artifacts/wall-breaches/`. Browser helpers close in `finally`; their close receipts and exact process identities were verified.

## Delivery and retained preview

Delivery branch: `work/destroyed-wall-edges`. Canonical integration/publication remains a separate step; Pages deploys only `main`.

The existing read-only port 4476 preview is retained for review, without extending its lifetime. It self-stops October 9, 2026 at 22:30 UTC (6:30 p.m. Eastern). Its restart sources and exact process identity are registered with the shared helper lifecycle utility. The local `artifacts/grenade-blast/server/STOP` marker also stops it gracefully. No additional preview server was started for this task.
