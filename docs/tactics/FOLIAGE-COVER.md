# Painted foliage cover

In the 3D editor, choose **Foliage cover** under Build and drag a rectangle. Release to paint the eligible ground in one undoable edit. Escape cancels. **Clear foliage** removes woodland cover in a rectangle and restores ordinary grass; it does not recover a previously painted dirt/gravel texture. Undo restores the exact original terrain.

The brush accepts yard, grass, dirt and gravel on the ground floor. It skips existing foliage, water, void, bridges, floors, paving, complete prop footprints, stairs and roof-climb endpoints. Starts and guards can stand inside the painted cover. The preview reports the affected tile count. Canonical woodland remains the saved terrain value, so export/import, saved designs, blocks and playtests retain existing format compatibility.

Cover grass uses the approved painted grass atlas with a distinctly darker green tint in both the editor and battle. Deterministic, instanced undergrowth supplies a dense waist-height silhouette. Existing woodland terrain receives the same treatment. Cargo footprints are excluded even when the cargo models are rendered through their separate library. Foliage instances retain their source cells for terrain-knowledge and floor filtering.

This uses the existing shared woodland rules: the exact length of a sightline through foliage reduces identification range and detection chance. Deep patches can hide people beyond them, while nearby people can still be seen. Woodland is traversable; these visual shrubs add no solid collision or bullet protection. Sneak and low stances retain their separate concealment benefits. The shared core is unchanged.

## Validation

All 581 tests, asset validation, the 3D build and the twenty-module shared-core verification passed. Three dedicated tests cover protected cells and full prop footprints, single-stroke undo/redo and canonical round trips, actual traversal/concealment, darker grass and unchanged collision data.

`tools/foliage-cover-review.mjs` exercises real rectangle painting, reverse-direction clearing, Escape, undo/redo, saving and playtest handoff. Evidence is under `artifacts/foliage-cover/`. A 64×64 patch retained 106 geometries and 34 textures across four clear/repaint cycles. The full editor scene submitted about 1.69 million triangles in 341 calls; measured CPU draw submission was 2.1–2.7 ms locally, not a GPU frame-rate guarantee. Separate browser checks confirmed fog filtering, hidden upper floors and unchanged collision volumes.

The independent hostile review scored this bounded change **9/10**, with no blocking findings. Dense patches show repeated shrub forms; low characters can be visually obscured and remain accessible through squad controls and selection rings. No universal performance claim is made for covering the entire map.
