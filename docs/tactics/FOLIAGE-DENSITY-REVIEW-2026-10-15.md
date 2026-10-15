# Higher-density foliage review — October 15, 2026

This study tests the map maker's existing density rules at larger scale. It is based on canonical `ee8308b`, including the approved foliage composition. It does not change tree spacing, model selection, foliage physics, fog or gameplay density rules.

## Open the comparison

`tactics/foliage-skins-review.html?view=density&family=temperate&density=100&frame=clearing`

Choose 35%, the editor default of 65%, 85% or 100%; all five habitats are available. Whole fill, clearing and narrow-route frames use the same map and seed. The narrow-route frame shows the **one-tile** side passage. The horse is at native size. Angle and tile-grid controls remain available.

“Open this fill in the editor” opens an ordinary editable map. The fixture uses `paintFoliage`, the same rectangle and eraser implementation used by the editor. The automated integration test also paints the rectangle with the actual mouse-drag UI before checking undo/redo, save/reload and ordinary Playtest.

## What the percentages mean

The initial rectangle measures **96 × 96 tiles**. Erasing two three-tile cross routes, a round clearing and a one-tile side route leaves **8,463 foliage cells**. This is a large fill within a 240 × 240 map, not a fully wooded 240 × 240 sector and not the authored tutorial map.

| Open-woodland density | Trees in the complete fill |
| --- | ---: |
| 35% | 54 |
| 65% | 102 |
| 85% | 127 |
| 100% | 143 |

Counts are the same across habitats because location eligibility is shared; tree models differ by habitat. Increasing density retains the existing tree positions, variants and physical cover. Rendered and physical tree counts are checked together.

The percentage is a sampling threshold, **not canopy coverage**. Open woodland allows one eligible tree candidate per seven-tile block, with placement margins around routes and objects. At 100% it still reads as open woodland. Small ground plants also become more numerous as density increases.

Impassable thickets have a different contract: tree spacing and required opaque screens stay fixed as decorative density changes. This fixture has **73 thicket trees** at every density. Its dense leaf/reed screens continue to block sight; substantial wood supplies bullet cover. Leaves do not become bulletproof.

## Visual findings

- The existing mix of actual tree models gives the higher-density fills useful silhouette and colour variety. No new tree assets are needed to evaluate these percentages.
- Clearings and reserved paths remain legible. A higher percentage does not move trees into an already clear route.
- At maximum density, the most conspicuous repetition is in the **small plants between trees**, especially the wetland reeds and brown tufts on snow. They form a regular speckled carpet. Tree locations also retain a loose seven-tile rhythm when seen across the entire fill.
- A future art pass should group the understory into broader patches with quiet ground between them. Preserve the exact saved movement/sight/wood contracts and the approved breathing spaces in thickets. If denser tree crowns are desired, that is a separate placement-design decision; this study does not silently multiply trees or enlarge them.

## Preview correction

The old static review could render before its background-painted ground detail arrived. It first requested visible ground pages inside a synchronous render loop, then never redrew after the worker reply. The review now updates the scene, awaits `groundSkin.whenReady()` with a bounded timeout, and only then captures measurements. Captures require zero pending pages and no paint error.

## Validation and evidence

The check scripts record source hashes or exact saved overlays, browser errors, tree counts, drawing measurements and helper-close receipts under `artifacts/foliage-skins/`.

- `tools/check-foliage-density.mjs`: five habitats, four percentages, fixed cameras; separate grid and thicket comparisons through environment options.
- `tools/check-foliage-density-editor.mjs`: actual rectangle drag, UI undo/redo, route erasure through the editor controller, save/reload and source/packaged Playtest. The timing sample waits for the sector loading screen to close and all requested ground pages to finish.
- `tests/foliage-density-fixture.test.mjs`: monotonic placement, stable physical tree choices, passable routes/reference positions, map validation, export/reload and actual editor history equivalence; fixed thicket cover at low/high density.

The focused foliage/build suite passes **168 tests**. Asset audit and `npm run build:tactics-3d` pass. All six source/packaged editor workflows pass with no recorded console, asset-loading or application errors. Maximum open woodland and thickets pass actual rectangle painting, undo/redo, save/reload and Playtest. Source Playtest additionally compares open wetlands at 65% and 100%.

**57 final density captures** pass: 40 habitat/density/overview-clearing comparisons, 10 one-tile route views with grid on/off, five maximum-density thickets and two grid on/off wetland-thicket route views. All requested ground pages are complete, tree counts agree with physical cover, and no browser errors are recorded. The pre-existing wetland strip and copse also render successfully after the paint-readiness correction. The nine fixture/packaging checks were rerun after the final camera changes and pass.

An independent subagent review gives the completed study **9/10**, with no remaining concrete blockers. This approves the comparison and its findings; it does not approve sustained performance of arbitrary full sectors or resolve the understory art targets below.

Selected evidence:

- [65% temperate clearing](images/foliage-density-2026-10-15/woodland-temperate-clearing-normal-grid0-65.jpg) and [100% clearing](images/foliage-density-2026-10-15/woodland-temperate-clearing-normal-grid0-100.jpg).
- [Whole 100% fill](images/foliage-density-2026-10-15/woodland-temperate-overview-normal-grid0-100.jpg).
- [One-tile route](images/foliage-density-2026-10-15/woodland-temperate-corridor-normal-grid0-100.jpg) and [the same route with grid](images/foliage-density-2026-10-15/woodland-temperate-corridor-normal-grid1-100.jpg).
- [Wetland understory at 100%](images/foliage-density-2026-10-15/woodland-wetlands-clearing-normal-grid0-100.jpg), [snow at 100%](images/foliage-density-2026-10-15/woodland-snow-clearing-normal-grid0-100.jpg), and [the separate thicket treatment](images/foliage-density-2026-10-15/thicket-wetlands-clearing-normal-grid0-100.jpg).
- [Density report](images/foliage-density-2026-10-15/density-final-report.json), [route report](images/foliage-density-2026-10-15/density-routes-report.json), [thicket report](images/foliage-density-2026-10-15/density-thickets-report.json), [thicket route report](images/foliage-density-2026-10-15/density-thicket-route-report.json), and [six editor/Playtest cases](images/foliage-density-2026-10-15/density-editor-final-report.json).

### Drawing cost

Maximum-density **static clearing views** submit the following triangle counts, including shadows. These views expose the whole fill without gameplay fog, at 22 pixels per tile:

| Habitat | 100% submitted triangles |
| --- | ---: |
| Temperate | 1,459,408 |
| Jungle | 2,084,092 |
| Dry grassland | 1,431,808 |
| Wetlands | 4,952,348 |
| Snow | 706,608 |

The wetland maximum is largely a small-plant problem: the wider overview hides low plants below 9 pixels per tile and is much cheaper. Open woodland is spatially batched into 24 × 24 blocks, but its authored tree models do not yet use the simplified distant tree silhouettes used by dense terrain. Both are follow-up considerations before increasing detail.

The **ordinary live battle** uses four squad models, standard fog and an unchanged camera. Each case records 90 draw samples after loading/warm-up. Results are from headless Edge at 1500 × 1000; RAF intervals are a short scheduling observation, not guaranteed sustained combat FPS.

| Source Playtest | Submitted triangles | Draw CPU median / p95 | RAF median / p95 |
| --- | ---: | ---: | ---: |
| Temperate woodland, 100% | 978,736 | 12.2 / 14.4 ms | 16.7 / 16.8 ms |
| Wetland woodland, 65% | 2,068,284 | 12.4 / 13.8 ms | 16.7 / 16.8 ms |
| Wetland woodland, 100% | 3,106,416 | 12.2 / 13.3 ms | 16.7 / 16.8 ms |
| Wetland thicket, 100% | 719,776 | 13.8 / 15.2 ms | 16.7 / 16.9 ms |

The packaged temperate/thicket runs reproduce their source geometry counts, four units and clean diagnostics. Higher density can change how far standard sight reveals the map, so these are ordinary gameplay measurements, not a fixed-visible-cell GPU microbenchmark. No other diagnostic browser was rendering during these live samples.

The first timing attempt began before the sector loading screen had finished preparing paint. Its low sample count was rejected. The corrected check waits for loading to close and requested paint pages to finish; it retains the sample-count assertion.

### Next work suggested by the comparison

- Group grass/reeds into less uniform patches, keeping the open-woodland movement and concealment contracts honest.
- Reduce distant or excessive reed detail before raising vegetation budgets. Retain spatial batches and nearby shadow limits.
- If a much denser tree canopy is wanted, design that placement change explicitly and keep visible trees and physical branches synchronized.
- Measure the actual authored wooded sector with a squad before claiming sustained sector performance. This 96 × 96 fill is a bounded comparison.
