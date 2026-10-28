# Female rabbit worker prototype

Branch: `rabbit-worker-study`, isolated from `cow-worker-study` at `e523d1d`.

New adult female rabbit worker: warm brown-grey fur, leaf ears, short muzzle, cream shirt, olive bib overalls, red scarf, broad furry hind feet and a compact rooted tail. This species has no original game sprite; the viewer compares the reduced model with its author mesh and displays the new turnaround below.

## Assets and scope

- `dist/tactics/rabbit-author-data.json`: 29,972 triangles.
- `dist/tactics/rabbit-10k-data.json`: 10,156 triangles, reduced from the stored author mesh.
- Twelve closed connected surfaces, seventeen weighted bones, independent 480-triangle rifle.
- `dist/assets/characters/model-references/rabbit-woman-turnaround-v1.png`: corrected four-view character reference.
- `dist/assets/characters/lowpoly-proof/rabbit-woman-model-paint-v1.png`: painting registered to the actual neutral model render.
- `dist/assets/characters/lowpoly-proof/rabbit-eye-detail-v1.png`: local painted eye/fur patch.
- Existing `cow-neck-detail-v1.png` supplies painted cream fur/red cloth through rabbit-specific coordinates.

All new raster painting used the built-in ImageGen tool. Exact prompts and source/output relationships are in `RABBIT-WORKER-PROMPTS.md`.

The user's marked forehead-to-muzzle contour is preserved by removing raised orbital/brow volumes. Eyelids and irises come from local paint on the connected skull. `neutral-paint-reference.png` preserves the actual input used for the original full-body painting; `neutral-current-grey.png` records the final grey mesh after that localized contour correction. The local eye painting replaces the affected region.

## Preview

Serve this worktree with `PORT=4426 node tools/serve.mjs` (PowerShell: `$env:PORT='4426'; node tools/serve.mjs`). Open `http://127.0.0.1:4426/tactics/rabbit-worker.html?mesh=10k`; append `&stage=grey` for the geometry study. The reference gallery also links this character.

The prototype retains the established isometric camera and 58 CSS pixels per world unit. Close view uses 300 CSS pixels per unit. Only the texture registration cameras use a taller 1.95-unit frame to leave padding around the ear tips; this does not rescale the character or gameplay camera.

## Verification

- Five rabbit geometry/rig tests: manifold connectivity, ear/foot/tail landmarks, normalized weights, neutral restoration, foot planting, actual hand proximity to separate rifle grips, and reduction provenance.
- Twenty-one related horse/cow/goat/bull geometry/rig regression tests.
- Sixty-four grey and sixty-four painted combinations: author/reduced, neutral/carry, eight headings, native/close scale.
- Twenty additional DPR2 close-up combinations and three DPR2 character regression checks.
- Local 3D distribution build.

Browser evidence and machine-readable results are under `hybrid-review/rabbit-worker/`. Paint coverage diagnostics distinguish directly projected paint from borrowed/local paint; they measure visible screen coverage, not an exhaustive UV bake or artistic correctness.

## Independent hostile review

Final score: **9/10 for the bounded painted static prototype**, after separate 9/10 reference and grey gates. The reviewer confirmed angular cloth strokes without the prior hip banding, a smooth face contour, single readable eyes, consistent scarf/ear painting, and author/reduced similarity at native scale. Shader inspection found no blocking issue. Front/profile eyes retain normal oblique foreshortening; the shared hands remain a known limitation.

## Limits

This is a presentation and rifle-carry prototype. Locomotion, firing, other equipment, facial animation, ear/tail secondary motion and gameplay integration are unproven. Hands retain the accepted shared worker baseline. The author/reduced comparison proves reduction consistency, not a production-ready character pipeline.

No canonical merge or published 3D deployment is part of this change.


## Production follow-up — 28 October 2026

Both outfits, native portraits, equipment fitting, animation coverage, placement
and recruitment are covered by the [production completion delivery](BULL-RABBIT-DOG-INTEGRATION-2026-10-28.md).
The original scope and measurements above describe the earlier model delivery.
