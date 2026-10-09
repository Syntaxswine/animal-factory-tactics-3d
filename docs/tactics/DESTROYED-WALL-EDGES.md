# Destroyed wall edges

Removing a wall segment now leaves a rough edge on each surviving side. Adjacent missing segments join into one larger, clear opening. No posts, stumps or extra collision remain in the deleted segments.

The visuals come from `7734034` on `work/destroyed-wall-edges` and are integrated into `work/editor-3d` after the structure-HP implementation `e01322e`. The new shapes are used by the live encounter renderer as well as the comparison study.

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

`wall-breaches.js` compares the encounter's original `definition.edges` with its current `edges`. It also reads optional authored `breaches.edges` records created by **Walls → Break wall** in the editor. Ordinary erasure does not acquire fake damage. Authored openings survive map/block saving and playtesting; repainting a wall repairs the opening, while Erase boundary removes the damage styling. See `DESTROYED-FLOOR-EDGES.md` for the shared authoring contract.

At each endpoint of a destroyed wall/frame, a lone surviving masonry segment receives a rough end. Two surviving branches meeting at a corner or junction retain their connected joint. Explicit zero-level edge aliases and perimeter coordinates are normalized before comparison. Floors remain independent.

`wall-breach-geometry.js` creates connected, capped geometry inside the surviving segment's original footprint. It retains the existing world-aligned wall textures, with a narrow exposed-edge strip. The shared environment renderer selects these shapes automatically after existing explosive transactions remove edges. Replacement map definitions also invalidate the presentation cache, even when the surviving geometry is identical.

Damage, blast radius, resistance, navigation, cover and AP rules remain authoritative in the existing simulation. Brick and concrete have 200 HP, and corrugated metal has 100 HP. Only destruction opens a passage; a wall at 1 HP still blocks movement and shots. Surviving neighbors acquire the broken ends when that passage opens. These three assets depict breached edges, not progressive cracks at intermediate HP values. Fences, trellises and surviving door leaves retain their existing models.

The HP system's existing floor collapse removes unsupported upper walls, including broken ends. Hand-grenade presentation restores intact walls until detonation, then reveals the breach. No additional damage state or save migration is needed. Both the base and 3D distributions include the new geometry dependencies, with the missing-module checks retained.

## Gameplay integration verification

October 8, 2026, on `work/editor-3d`:

- **116 focused tests pass**, including the original visual coverage plus HP thresholds for all three materials, both wall axes and all three playable levels, collision through breaches, saved damage, grenade fuse timing, unsupported-wall cleanup, X-ray, editor rendering and distribution packaging.
- **51 browser configurations pass**; repeated warmed previews keep GPU counts at 53 geometries and 12 textures.
- Three real RPG attacks create walkable openings of **2 brick, 2 concrete and 3 corrugated segments**, following the new material HP rather than the older destruction threshold. Each attack spends 7 AP and one round. Each opening has exactly two broken outer ends.
- All six visible broken ends receive X-ray outlines using their real geometry. Unseen scenery creates no visible chunks. No browser errors were reported.
- Evidence is under `artifacts/wall-breaches/`; `tools/check-wall-breaches.mjs` exercises the current gameplay integration. Set `WALL_BREACH_REVIEW_URL=http://127.0.0.1:4364` for the retained builder preview.

## Review

Open `tactics/wall-breach-study.html`. It offers material, opening width, separated gaps, corners, windows, direction, floor, four views and gameplay/close scales. Each square is one tile and the horse is native size. Widen Opening and Restore Wall show how adjoining breaches merge. Drag to orbit.

Its demolition-range link opens `tactics/battle-3d.html?study=wall-breaches`, with four valid squad starts and brick, concrete and corrugated walls.

Source-study validation on October 8, 2026 (before integration with material HP):

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

## Independent review, October 8: `ae6569f`

The wall feature is approved on the integration branch. No blocking wall defect was found in this review. This is not approval to replace canonical with the whole `work/editor-3d` branch: its outstanding integration conflicts are recorded in [the integration review](INTEGRATION-REVIEW-2026-10-06.md#october-8-wall-damage-review-ae6569f).

- **160 relevant tests passed** in two disjoint runs: 100 covering structure HP, wall breaches, grenade damage/presentation, encounter and campaign persistence, renderer visibility and both deployment graphs; 60 covering projectiles, explosives, fuel barrels, combat presentation, environment models and X-ray. This was not a full repository test run.
- Asset validation, generated-core verification and the packaged 3D build passed.
- Independently inspected brick, concrete beside a window, and corrugated metal with separated gaps, at gameplay scale. The openings are readable, and their broken edges stay attached to the surviving wall sections.
- In the packaged demolition range, used the ordinary right-click planner to fire an RPG at visible ground beside the brick wall. The shot spent one round and 7 AP, destroyed one segment and left neighboring sections at 11/200 and 4/200 HP. The selected character then walked through the opening to the far side.
- Quicksaved, restarted to verify that the wall was intact again, then quickloaded. The breach and the character's far-side position both returned. No browser errors or warnings were recorded.
- The previous blocked campaign-arrival reproduction also now waits coherently and remains saveable. Both Pages dependency checks pass; those earlier release defects are resolved on this branch.

These are destruction visuals, not progressive cracking: a surviving 1-HP wall keeps its intact silhouette and collision. Ordinary floor-collapse injury damage remains deferred as already documented. Neither point is a blocker for this pass.

Review evidence is local under `artifacts/oct08-wall-damage/`, including the test logs and `breach-restored.png`. The independent preview is disposable and is stopped after review; this does not change the builder preview's retention deadline below.

## Delivery and retained preview

Integrated delivery branch: `work/editor-3d`. Source branch: `work/destroyed-wall-edges`. Canonical integration/publication remains a separate step; Pages deploys only `main`.

The existing builder preview on port 4364 is retained for active user review without extending its lifetime. It self-stops October 9, 2026 at 07:32 UTC (3:32 a.m. Eastern); `artifacts/grenade-integration/preview.mjs` preserves its restart source, and `artifacts/grenade-integration/STOP` stops it gracefully. Its exact process identity is registered with the shared helper lifecycle utility. No additional preview server was started for this integration. The source task's separate port 4476 preview is outside this task's ownership.
