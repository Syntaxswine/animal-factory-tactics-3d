# Female shepherd dog guard prototype

Branch: `dog-guard-study`, isolated from the approved rabbit at `79d4206`.

An adult female shepherd guard with golden/sable fur, upright ears, a tapered muzzle, an olive work jacket, brown trousers, paired leather utility pouches and a relaxed hanging tail. This is a new character with a new turnaround, rather than an existing sprite conversion.

## Assets and preview

- Author mesh: **29,850 triangles** in `dist/tactics/dog-guard-author-data.json`.
- Reduced mesh: **10,446 triangles**, derived from that author, in `dist/tactics/dog-guard-10k-data.json`.
- Seventeen closed connected surfaces, seventeen weighted bones, separate 480-triangle rifle.
- New reference: `dist/assets/characters/model-references/dog-woman-turnaround-v1.png`.
- Registered model painting and local eye/fur detail: `dog-woman-model-paint-v1.png` and `dog-eye-detail-v1.png` under `dist/assets/characters/lowpoly-proof/`.
- Existing `cow-neck-detail-v1.png` supplies painted red cloth. Exact image prompts, inputs and selected outputs are in `DOG-GUARD-PROMPTS.md`; all raster generation used built-in ImageGen.

Run `PORT=4427 node tools/serve.mjs` (PowerShell: `$env:PORT='4427'; node tools/serve.mjs`) and open `http://127.0.0.1:4427/tactics/dog-guard.html?mesh=10k`. Append `&stage=grey` for the geometry view. The character reference gallery links both.

The comparison uses the approved prototype camera and **58 CSS pixels per world unit**; close view uses 300. The 1.95-unit texture-registration frame adds padding around ears without changing gameplay scale. Left is the author mesh; right is the selected mesh. Neutral and rifle carry are available.

## Construction and paint

The jacket, trousers, head, tail and paws are species-specific surfaces. Hands retain the accepted shared worker baseline. The jacket hem has a continuous torso transition and rounded lower edge. Closed lapels conform to the jacket; the belt follows its waist contour. Rounded tapered pouches and belt bind to the pelvis; the lower jacket cannot follow the arm bones when raising the rifle.

One local tangent mapping owns each eye so turning cannot combine front/profile irises. Local throat fur and continuous red cloth separate the scarf from the underlying garment. Hidden cuff, garment and equipment edges borrow bounded regions of their own paint. Coverage mode distinguishes direct projection (green), borrowed/local paint (blue) and flat fallback (magenta); it does not measure artistic correctness or exhaustive surface coverage.

`neutral-paint-reference.png` records the exact input to the selected painting. After painting, a small wrap-clearance adjustment prevents intersections with the jacket/head; its explicit cloth mapping is independent of the original projection. `neutral-current-grey.png` records the final geometry. All other approved shapes remain unchanged.

## Verification

- **69 focused and related tests pass**, including five dog tests: closed connected manifold surfaces, outward winding, reduction provenance, species landmarks, normalized weights, neutral restoration, fixed feet and actual hand-surface proximity to the separate rifle grips at six headings.
- **64 grey and 64 painted browser combinations**: both meshes, neutral/carry, eight headings and both display scales, with no browser errors.
- **20 DPR2 close-up combinations** and **five DPR2 character regressions**: horse, goat, bull, cow and rabbit.
- Author and reduced JSON rebuild byte-for-byte with `node tools/build-dog-guard.mjs`.
- Local 3D distribution builds with `node tools/build-tactics-3d.mjs`, including the new viewer, model, paint and reference assets.

Evidence and machine-readable browser results: `docs/tactics/hybrid-review/dog-guard/`.

## Independent hostile review

Reference **9/10**, grey sculpt **9/10**, final painted static prototype **9/10**. The grey review required smoothing the jacket waist/hem and improving collar/pouch joins. The painted review required one readable iris per orbit and clean scarf/throat ownership. The final review found no blocking issue in the shared helper changes or author/reduced comparison at native size.

## Limits

This is a static presentation and rifle-carry study. Locomotion, firing, other equipment, facial motion, tail/ear animation and gameplay integration remain unproven. The scarf folds are simple; hands retain the shared baseline. The branch is for architectural review, with no canonical merge or published 3D deployment included.


## Production follow-up — 28 October 2026

Both outfits, native portraits, equipment fitting, animation coverage, placement
and recruitment are covered by the [production completion delivery](BULL-RABBIT-DOG-INTEGRATION-2026-10-28.md).
The original scope and measurements above describe the earlier model delivery.
