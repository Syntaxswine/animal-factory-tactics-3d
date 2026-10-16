# Trees versus brush — October 15, 2026

The user meant **the amount of tree canopy relative to brush** when asking to test higher density. The preceding density study tested the editor's existing sampling percentage instead. In impassable thickets that percentage changes decorative growth but leaves the tree population fixed. This follow-up makes the intended comparison explicit.

## Open the study

`tactics/foliage-skins-review.html?view=composition&family=jungle&mix=trees&frame=clearing&angle=reverse`

Choose **Brush-led · current**, **Mixed canopy**, or **Tree-led**. Habitat, camera, frame and grid controls work across all five environments. The same 96 × 96 fill contains 8,463 blocked cells after its clearing, cross paths and one-tile side route are erased. The native-size horse provides scale.

| Tree cover | Trees in the entire fill |
| --- | ---: |
| Brush-led · current | 73 |
| Mixed canopy | 201 |
| Tree-led | 393 |

These are relative composition choices, not percentages of occupied ground. Existing trees retain their locations, models and variants as the population grows. Existing mature tree assets provide the extra crowns; none were enlarged or rebuilt.

The **Inspect** control isolates trees or brush. It leaves the ground and horse visible and displays a persistent warning that full obstruction remains. This is visual inspection, not an alternative playable state.

## What the brush was hiding

The jungle's current 73 trees comprise 36 canopy trees, 22 palms and 15 broadleaf trees. The brush's finite envelope is 2.20–3.19 units high. Mature jungle canopy trees reach 5.40 units, with crowns starting at 3.64; palms reach 5.06 with lower fronds around 2.60; broadleaf trees reach 4.54 with crowns starting around 2.57. Brush conceals trunks and some lower foliage, but it does not completely bury the jungle canopy. The main issue was a sparse, fixed tree population above continuous tall brush.

- [Original planting](images/foliage-composition-2026-10-15/jungle-clearing-reverse-grid0-current-both.jpg)
- [Original trees with brush hidden](images/foliage-composition-2026-10-15/jungle-clearing-reverse-grid0-current-trees.jpg)
- [Mixed canopy](images/foliage-composition-2026-10-15/jungle-clearing-reverse-grid0-mixed-both.jpg)
- [Tree-led jungle](images/foliage-composition-2026-10-15/jungle-clearing-reverse-grid0-trees-both.jpg)
- Tree-led [temperate](images/foliage-composition-2026-10-15/temperate-clearing-reverse-grid0-trees-both.jpg), [wetlands](images/foliage-composition-2026-10-15/wetlands-clearing-reverse-grid0-trees-both.jpg), [dry grassland](images/foliage-composition-2026-10-15/dry-clearing-reverse-grid0-trees-both.jpg), and [snow](images/foliage-composition-2026-10-15/snow-clearing-reverse-grid0-trees-both.jpg).

## Integration boundary

**This is an art study. It does not change saved editor density or gameplay defaults.** The editor link explicitly opens the original planting. The private preview obstacle set is not written into the map or installed in the ordinary gameplay cache. Choosing a preview mix is not yet a saveable map-maker operation.

`buildFoliageObstacles` accepts an optional `denseTreeMix`, defaulting to the unchanged current placement. The preview keeps every baseline tree, then samples a ranked three-tile candidate grid. Added trunks require at least 2.6 tiles of separation from existing trunks. Crowns may overlap. The same three-tile blocked-ground margin, supporting height, headroom, object and access exclusions apply to every candidate. Mixed is a strict subset of Tree-led.

`biomePlans` can consume that explicit obstacle set; `BiomeScene` has an optional plan provider. The study uses these together so **added tree art and solid trunk/branch cover share one placement set**. Existing opaque screens, deadfall, approved surface hollows, fog treatment and movement masks remain unchanged. Added trees necessarily add matching solid wood; leaves do not become bulletproof.

If this direction is selected for the map maker, a later implementation should give tree abundance its own explicit saved control, separate from undergrowth density and passability. Save/reload, undo, block placement, ordinary Playtest and representative-sector performance would then need integration checks. No such new saved rule is claimed here.

## Visual limits and cost

The fuller mix makes the canopy substantially more prominent without losing the broad clearing or cross paths. A brush collar remains beside routes because trees retain their placement margin.

The **one-tile passage is obscured by foreground vegetation from the normal low camera**, especially in wetlands. This occurs in the previous baseline as well; added crowns can increase occlusion. It is not a tree footprint entering the route. The [normal jungle view](images/foliage-composition-2026-10-15/jungle-corridor-normal-grid0-trees-both.jpg), [elevated view](images/foliage-composition-2026-10-15/jungle-corridor-high-grid0-trees-both.jpg), and [elevated grid view](images/foliage-composition-2026-10-15/jungle-corridor-high-grid1-trees-both.jpg) make the distinction visible. This study does not establish universal path readability from every camera angle.

Static clearing captures at the same reverse camera and 22 pixels per tile submit these triangles, including shadows:

| Habitat | Current | Mixed | Tree-led |
| --- | ---: | ---: | ---: |
| Jungle | 441,537 | 595,825 | 799,985 |
| Temperate | 494,813 | 675,937 | 923,137 |
| Dry grassland | 488,765 | 625,745 | 834,085 |
| Wetlands | 644,977 | 892,681 | 1,253,717 |
| Snow | 420,599 | 604,079 | 901,795 |

The wetland whole-fill overview rises from 556,398 to 970,870 submitted triangles. Existing spatial chunks, tree detail switching and nearby shadow limits remain in use; no new textures are added. These are geometry measurements in a study with the full map revealed, not sustained battle frame-rate approval.

## Verification

- **176 focused tests pass**, including eight new composition cases: nested stable populations, matching physical wood, preserved screens/routes, object/access/headroom exclusions, deterministic placement and cache isolation.
- Asset audit, all 20 shared-core synchronization checks, and `npm run build:tactics-3d` pass.
- **48 final browser captures**: 15 habitat/mix clearings; six jungle isolation views; 20 one-tile route views across five habitats, two angles and grid on/off; two wetland whole-fill overviews; five packaged clearing views. No recorded application or asset-loading errors. The packaged five-biome pass also checks console errors, including shader diagnostics, and records none. Art/physical tree identity and completed ground painting are checked in every capture.
- An independent hostile subagent review rates the isolated study **9/10**, with no blocking implementation findings. Its qualifications are low-camera route occlusion and the increased rendering cost; this is not gameplay-integration approval.

`tools/check-foliage-composition.mjs` reproduces the browser checks with `REVIEW_FAMILIES`, `REVIEW_MIXES`, `REVIEW_FRAMES`, `REVIEW_ANGLES`, `REVIEW_GRIDS`, `REVIEW_LAYERS` and `REVIEW_URL`. Source hashes and measurements are retained in the [clearing report](images/foliage-composition-2026-10-15/composition-final-report.json), [isolation report](images/foliage-composition-2026-10-15/composition-isolation-report.json), [normal-route report](images/foliage-composition-2026-10-15/composition-routes-report.json), [elevated-route report](images/foliage-composition-2026-10-15/composition-routes-high-report.json), [overview report](images/foliage-composition-2026-10-15/composition-overview-report.json), and [packaged report](images/foliage-composition-2026-10-15/composition-packaged-report.json).

Diagnostic browsers close in `finally` and retain local close receipts. The existing registered preview on port 4476 is retained for user review until its original fixed expiry, October 16 at 7:19 p.m. Eastern. Its deadline has not been extended.
