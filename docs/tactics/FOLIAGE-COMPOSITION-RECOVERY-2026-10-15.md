# Foliage composition recovery

Follow-up on `work/foliage-canopy-polish`, replacing the raised-canopy direction in `50cf262`. The user and architect preferred the landscape composition in `85da0d8`: distinct vegetation, visible low ground and wetland water. The broader snow paint remains useful and is retained.

## Shape and composition

Temperate, jungle and dry thickets now use separate low shrub bases, overlapping leaf sprays and fine rooted stems. Jittered growing sites group several tiles into uneven clumps. The former continuous high roof and vertical perimeter are removed. Wetlands use curved reeds with visible water at their feet. Broad world-space colour groups break up the temperate fans without changing their alpha coverage.

Snow keeps the existing painted white patches and bough treatment. The underlying drifts now taper according to distance from the real occupied edge. Thin strips receive shallow drifts, while broad interiors can accumulate more snow. Inclined snowy branches explain the remaining tall sight obstruction. A regression test checks that concave shoulders render identically when cell iteration order changes.

The mixed tree collection and its deterministic selection remain unchanged. Substantial branches are visible at their existing cover locations, with darker weathered ends and fine connecting stems. In snow, upward-facing wood receives a painted snow coat while its sides and ends remain dark. The fine stems add no new collision or bullet cover.

This is a composition recovery, not a literal restoration of the old renderer. The old airy tree scatter did not represent the later physical cover rules. Every currently opaque tile still needs enough visible growth to justify blocked sight. Mandatory boundary boughs remain in all levels of detail; shader clipping keeps vegetation out of clear corridors and below the existing finite sight envelopes.

## Review scenes

The study now offers **One-tile strip + horse** and **Copse and clearing**, with all five habitats, three camera angles and the tile grid on or off. The horse uses the ordinary painted model at native scale. These are saveable map fixtures without special renderer-only collision or tree-placement overrides.

The copse deliberately contains blocked undergrowth, open woodland and a clear route. It is more useful for judging landscape composition than the older rectangular patches, which remain available for direct comparison.

| Temperate | Wetlands |
| --- | --- |
| ![Rooted temperate thicket around a clearing](images/foliage-composition-recovery-2026-10-15/copse-temperate-normal-grid0.jpg) | ![Reed stands and open wetland ground](images/foliage-composition-recovery-2026-10-15/copse-wetlands-normal-grid0.jpg) |

| Jungle | Dry grassland |
| --- | --- |
| ![Jungle copse with mixed trees](images/foliage-composition-recovery-2026-10-15/copse-jungle-normal-grid0.jpg) | ![Dry scrub around an open clearing](images/foliage-composition-recovery-2026-10-15/copse-dry-normal-grid0.jpg) |

| Snow copse | Snow strip beside the horse |
| --- | --- |
| ![Low snow drifts and grouped boughs](images/foliage-composition-recovery-2026-10-15/copse-snow-normal-grid0.jpg) | ![Native-scale horse beside a single-tile snowy screen](images/foliage-composition-recovery-2026-10-15/strip-snow-normal-grid0.jpg) |

[Elevated clearing with grid](images/foliage-composition-recovery-2026-10-15/copse-temperate-high-grid1.jpg) and [one-tile temperate strip with grid](images/foliage-composition-recovery-2026-10-15/strip-temperate-normal-grid1.jpg) show the occupied boundaries. The [60-view report](images/foliage-composition-recovery-2026-10-15/context-report.json) records camera, native horse scale, geometry cost and source fingerprints. The [24 affected views](images/foliage-composition-recovery-2026-10-15/final-paint-context-report.json) were refreshed after the last temperate/snow paint changes; the images above use that final paint. Neither matrix reported page or asset HTTP errors.

## Gameplay and rendering

Foliage presets, sight and projectile queries, tree selection, movement, saved overlay data and placement margins are unchanged. Leaves still obstruct sight; the existing substantial wood provides projectile cover. The intro is untouched.

Rendering retains 24 × 24 spatial chunks and finite per-fragment clipping. Entirely unknown screen chunks are now skipped using a summed-area summary of the existing fog mask. Partially known chunks retain the original exact fragment mask, including concealed interiors. Hidden chunks can become visible again when explored.

Nearby wood uses tapered six-sided geometry. Distant wood uses crossed tapered cards with the same branch count, transform and extent. Fine connecting stems disappear at distance. No new texture images or shadow casters were introduced.

## Representative battle comparison

The benchmark uses a generated, flat 240 × 240 wooded sector based on the tutorial study regions. It is **not the authored tutorial map**. Both versions use 43,947 saved foliage cells, 31,569 blocked cells, four squad members, Standard difficulty fog and the same camera. Seen tiles match within each comparison: 829 for temperate and 830 for snow. Each run goes through ordinary editor import, save, reload and Playtest. The editor closes before measurement.

| Habitat | Version | Submitted triangles | Draw calls | Median draw CPU | Median RAF interval |
| --- | --- | ---: | ---: | ---: | ---: |
| Temperate | `50cf262` | 569,654 | 421 | 59.9 ms | 66.8 ms |
| Temperate | Recovery | 496,894 | 350 | 66.9 ms | 100.3 ms |
| Snow | `50cf262` | 478,098 | 385 | 56.1 ms | 66.7 ms |
| Snow | Recovery | 428,558 | 302 | 60.3 ms | 66.9 ms |

Submitted triangles include shadows. In the final run, triangles fall about 13% for temperate and 10% for snow; draw calls fall about 17% and 22%. **This does not establish a frame-rate improvement.** CPU draw submission was slower, and the temperate RAF median was worse. This entire session was substantially slower and more variable than the earlier paired run: before the final RGB-only paint, temperate measured 20.1/21.9 ms CPU and snow 24.3/27.3 ms. Current geometry counts were identical across both runs. Retain both reports rather than attributing those large timing swings to the paint alone.

The [final battle report](images/foliage-composition-recovery-2026-10-15/final-paint-battle-report.json) includes all four runs and source hashes, which match the 24 final context captures. The [earlier paired report](images/foliage-composition-recovery-2026-10-15/battle-report.json) is retained for timing context. These are bounded headless Edge samples, not a sustained combat test. The existing fragment-fog boundary still cuts partly explored foliage into tile-shaped slivers; the baseline has the same presentation artifact.

## Validation and review

- `npm run check`: **2,452 passed, zero failed**, followed by a successful asset audit. After the final RGB-only paint changes, all **12 focused screen tests** passed again and the package was rebuilt successfully.
- The coverage regression traces real triangles and atlas alpha at near, far and distant detail. An independent five-seed expansion checked **2,025 cases without failures**. It allows isolated grazing rays at edges, while rejecting character-width holes through dense screens.
- Source and packaged editor save → reload → ordinary Playtest passed with four squad models and seven foliage regions. See the [integration report](images/foliage-composition-recovery-2026-10-15/integration-report.json). After rebuilding the final paint, both affected families also rendered cleanly from the packaged output; see the [packaged paint check](images/foliage-composition-recovery-2026-10-15/packaged-paint-report.json).
- Independent visual/code review: **9/10 for this rendering correction**, after the temperate grouping and snow-coated wood refinements. This is ready for architect review, not a claim of canonical integration.
- Warm CPU generation for the 1,157-cell comparison fixture measured **28.48 ms baseline / 12.00 ms recovery** across seven runs. This measures generation only; see the [build-cost report](images/foliage-composition-recovery-2026-10-15/build-cost.json).

The [validation summary](images/foliage-composition-recovery-2026-10-15/validation.json) records final source hashes and the scope of each check. The retained local preview on port 4476 has its existing automatic shutdown at **2026-10-15 23:23 UTC**. All diagnostic browser helpers have exited and have cleanup receipts. The feature branch does not publish Pages; the architect owns canonical integration.

## Reproduction

```powershell
npm run check
npm run build:tactics-3d
node tools/check-foliage-skins-integration.mjs recovery-integration
node tools/check-foliage-context.mjs recovery-context
node tools/benchmark-foliage-battle.mjs recovery-battle
node tools/check-foliage-canopy-cost.mjs 50cf262
```

Browser tools use the existing preview server on port 4476, with `REVIEW_URL` available as an override. `PLAYWRIGHT_PATH` selects the installed Playwright package. The battle benchmark defaults to baseline `50cf262`; `REVIEW_BASELINE_REF` overrides it. `REVIEW_FAMILIES`, `REVIEW_MODES`, `REVIEW_ANGLES` and `REVIEW_GRIDS` can narrow the context matrix. Temporary browser helpers record process identity and close in `finally` blocks.
