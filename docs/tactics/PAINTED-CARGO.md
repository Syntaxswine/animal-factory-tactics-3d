# Painted crates and drums

Open `tactics/painted-cargo.html` in the `environment-painted-study` worktree.
The collection extends the approved painted direction into **12 forms × four
family-specific finishes = 48 combinations**. It remains on the separate study
branch. The existing wall comparison, horse model and gameplay rules are intact.

| Crate form | Footprint | Pieces |
| --- | --- | --- |
| Braced crate | 1×1 | 1 |
| Long supply crate | 1×2 | 1 |
| Tall shipping crate | 1×2 | 1 |
| Banded freight crate | 1×2 | 1 |
| Two-crate stack | 1×1 | 2 |
| Pallet of four crates | 2×2 | 4 |

| Drum arrangement | Footprint | Pieces |
| --- | --- | --- |
| Single drum | 1×1 | 1 |
| Two-drum stack | 1×1 | 2 |
| Three-drum row | 1×2 | 3 |
| Horizontal pyramid | 2×1 | 6 |
| Mixed horizontal/upright pile | 2×2 | 4 |
| Two-level compact block | 2×2 | 18 |

Crate finishes: honey timber, weathered wood, chipped cream, olive paint.
Drum finishes: worn blue, oxide red, ochre steel, cream steel. Six newly painted
material swatches supply separate wear patterns instead of recoloring one texture.
The existing honey wood and blue steel atlas remains in use as well.

## Construction and inspection

Long crates add boards and braced sections rather than stretching a square box.
All sides and lids are modeled; the banded form has steel wraps and buckles. The
pallet has supporting runners and deck slats. Vertical stacks meet at the lids.

Drums retain a .8-unit height and .328-unit hoop envelope radius in every form.
They have closed top/bottom caps, a painted shell, shoulder shape, a slight dent,
rolled rims, reinforcing hoops and a bung. Horizontal pyramids use hexagonal
packing with aligned support hoops; the mixed pile adds a separate upright drum.
Axial rotations and bounded atlas crops vary visible wear within arrangements.

The gallery offers orbit, tile footprint outlines, the unchanged approved horse,
four-finish comparison, wireframe, responsive fit and explicitly fixed 58/110
CSS px/unit views. Footprints describe the model library's dimensions; no map
occupancy, cover, collision, loot or editor placement rules are added by this study.

`createCargoLibrary` owns shared geometry/material caches; each arrangement
borrows them. Removing a model does not dispose shared resources. Disposing the
library releases every cached geometry, material and texture wrapper once.
Precise vertex bounds are used for footprint validation because a rotated square
bounding box overestimates a cylindrical drum's true extent.

## Validation

- Final required checks: **465 tests passed**, asset validation passed, and
  `npm run build:tactics-3d` passed with the new modules and atlas included.
- All 48 combinations fit their declared tile footprint and are grounded.
- Horizontal stacked drums have two aligned supporting drums; elevated upright
  drums have matching supports below them.
- Repeated complete construction cycles reuse the same resource cache; invalid
  family/skin combinations and builds after disposal fail explicitly.
- Browser acceptance performs 144 selection/render operations over three full
  catalog cycles, without page/console errors or retained-resource growth.
- Recorded cache after warm-up: 47 geometries, 47 materials, 44 texture wrappers;
  gallery GPU memory counters: 57 geometries and eight texture allocations,
  including horse, ground, footprint lines, shadows and paint projection.

Independent review: **9/10 for this isolated collection/gallery**, no blocking
findings. The reviewer independently rendered all 48 combinations at both native
and close scale (96 views), orbited to the opposite side, checked screenshots
and passed the three focused tests. Distinct finishes, readable 1×2 forms and
credible stack/pile support were accepted. Repeated grain in stacked copies and
uniform hoop/band wear remain minor polish. This does not approve gameplay
integration or broader catalog changes.

Evidence and the reproducible browser results are in `painted-cargo-review/`.
Run `node --test tests/painted-cargo.test.mjs`, `npm run check`, and
`npm run build:tactics-3d`. The browser driver is
`tools/painted-cargo-review.mjs`, using Playwright/Edge and localhost:4329.

## Optional labels and stickers

The gallery's **Labels & stickers** selector offers no labels (the default),
freight tickets, fragile-glass markings, caution diamonds, and factory-store
stamps. Each option works across all 48 form/finish combinations. Library callers
can pass a third argument to `build(form, skin, label)` using `shipping`,
`fragile`, `hazard`, `stores`, or `none`.

Artwork is editable Canvas 2D drawing code: warm paper, muted ink, deterministic
abrasion and chipped edges. It needs no extra image downloads. Crate tickets sit
on clear plank panels below the framing; drum stickers follow the curved shell,
and horizontal drums also carry an end-cap ticket. Labels borrow cached geometry,
materials and textures from the library and are disposed with it.

`tools/painted-label-review.mjs` checks all 240 label/form/finish combinations
twice (480 renders), label presence/removal, tile bounds, browser errors and
stable resource counts. Evidence is in `painted-label-review/`. All 465 existing
tests, asset validation and the distribution build pass.

Independent label review: **9/10**, no blocking findings after moving long-crate
side tickets clear of braces and straps. The reviewer rendered all 240
combinations at native and close scale (480 views), with zero browser errors
and stable resource counts. Approval covers this isolated gallery collection.

## Painted material provenance

The new atlas was generated with the **built-in imagegen tool**, with the existing
material atlas and approved horse paint as style references. Saved runtime asset:
`dist/assets/environment/painted-study/cargo-materials-v1.png` (1536×1024 RGB).
Its six cells form three columns and two rows; each runtime material crops within
one cell. The asset checker validates its dimensions and channels. The exact
prompt is in `painted-cargo-review/texture-prompt.md`.
