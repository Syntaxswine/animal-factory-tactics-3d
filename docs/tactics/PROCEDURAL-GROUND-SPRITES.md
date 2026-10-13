# Procedural ground sprites

This pass adds painted deadfall, branches and litter to the five-biome terrain study. The details sit in the existing fill material's albedo. They have no mesh, collision volume or separate shadow. The former small cylindrical landscape logs are removed; tree silhouettes, broad fill heights and nearby plants remain.

## Review

Open `tactics/biome-terrain-study.html?biome=temperate&frame=ground` on the local or built distribution. **Ground paint** hides the trees and frames a nearby painted patch. **Painted debris** compares the overlay against the existing base pattern without changing the camera or geometry. **Pattern A/B/C** uses saved seeds 173/829/1409. All five environments share the same mask and elevations. Corridor, cliff and clearing frames still show the native horse reference.

The art is still a study. The screenshot-derived blocked mask is not an authored game mask, and this does not register gameplay foliage, movement, cover or automatic biome selection.

## Assets and ingredients

`dist/assets/environment/biome-ground-sprites/` contains five transparent 2048 × 1024 PNG sheets plus `manifest.json`. Each sheet has 32 panels of 256 × 256 pixels, arranged eight columns by four rows:

- Panels 0–15: twelve tapered, split-ended deadfalls and four loose branch arrangements. Each panel covers an **8 × 8 tile** patch; upland main trunks are approximately 3.8–6.1 tiles long.
- Panels 16–31: leaf, needle, reed or straw litter and smaller twigs. Each panel covers **3 × 3 tiles**.
- Temperate: worn brown wood, moss and ochre/olive fallen leaves.
- Jungle: darker rotting wood, green litter and broad fallen leaves.
- Snow: pale irregular snow banks partly bury crooked wood; scattered needles and twigs remain visible.
- Dry grassland: bleached split wood, straw and dusty brush marks.
- Wetlands: shorter dark wood, scattered reed litter and subdued peat/algae marks. These are painted debris, not walkable bridges.

The drawings are deterministic Canvas paint recipes, not photographs or generated mesh textures. The manifest records each recipe, seed and SHA-256 of the output and source. Exported sheets use Pattern A; the study can generate the other patterns at runtime. A transparent gutter protects every panel from neighboring paint at the permitted mip levels.

## Integrating contract

The existing terrain factory enables the overlay by default:

```js
const terrain = createBiomeTerrain(plan, family, {
  ground, cliff, plantMaterials, obstacleMaterials, plantFactory,
  paintSeed: 173,
  groundSprites: true
});
terrain.groundSkin.setEnabled(false); // Compare paint, without rebuilding.
// Keep the existing terrain.update(camera, {focus, ppu, trees}) call.
terrain.dispose();
```

`biome-ground-sprite-layout.js` is renderer-independent. `createGroundSpriteLayout(plan,family,seed)` returns recipes, two placement maps, complete ink bounds and statistics. `biome-ground-sprites.js` paints the atlas and adds shader sampling to a terrain-owned material clone. `terrain.groundSkin` exposes the layout, Canvas, textures and estimated GPU allocation for inspection/export.

Important details for the integrating agent:

1. Keep the seed with the map, and supply the same full-map coordinate origin to every chunk. Large and small layouts are deliberately offset from tile/chunk boundaries; never restart them per 24-tile block or per tile.
2. All painted footprint cells must be blocked and at the same elevation. The current layout rejects a whole stamp if it crosses a path, cliff, map edge or clearing. For mixed biome maps, also include the intended ground family in the allowed-cell predicate; automatic family selection is still the integrating agent's work.
3. The shader uses **map-local** position, so translating the terrain root does not slide the overlay. It projects only onto the upper surface and fades down steep skirts. It does not project onto trees or raised shrub models.
4. One atlas and two tiny nearest-filtered placement textures are shared by all terrain blocks. There are no new draw calls or triangles for the paint. Estimated additional GPU storage is about **10.7 MiB** per active biome/seed including mipmaps, plus the CPU Canvas. Do not create a full paint sheet per chunk.
5. Mip selection uses derivatives before grid wrapping or divergent branches. Samples clamp to the safe panel mip range and fade at distant scale. The existing base texture remains underneath; transparent pixels do not replace it.
6. The terrain owns the generated textures and clears the Canvas on disposal. It still borrows the caller's base materials, atlases and plant factory. Grey forms retain the same placement metadata and inspection focus without allocating the paint textures.

## Checks and export

```text
node tools/export-biome-ground-sprites.mjs
node --test tests/biome-ground-sprites.test.mjs tests/biome-terrain.test.mjs tests/biome-obstacles.test.mjs tests/biome-foliage.test.mjs tests/foliage.test.mjs tests/painted-grass.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-biome-ground-sprites.mjs
```

Export and browser review reuse the existing localhost preview and close their temporary browser in `finally`. `BIOME_TERRAIN_URL` and `PLAYWRIGHT_PATH` override local defaults. Use `GROUND_SPRITE_REVIEW_OUTPUT` to retain captures elsewhere. Regenerate the checked-in sheets after editing either generator module; the source fingerprint test deliberately fails on stale exports.

Automated checks cover deterministic replay, several-tile lengths, render-block crossings, one-cell paths, stepped elevations, alpha asset packaging and unchanged map data. Browser checks cover shader compilation, visible paint toggle, A→B→A pixels, transparent gutters, stable memory on seed changes, single disposal and mobile layout. The independent review adds monolithic-versus-chunked and translated-root pixel comparisons and verifies no changed paint pixels in narrow clear corridors. Review evidence is in `hybrid-review/biome-ground-sprites/`.

The performance fixture uses the real battle render loop with four actors, shadows and temporary terrain visuals. It does not establish authored-map gameplay integration, movement rules or performance on slower hardware.

Final warmed measurements on the review desktop (RTX 3080, Edge/ANGLE, 1500 × 1080) are in [performance.json](../../hybrid-review/biome-ground-sprites/performance/performance.json). Study times complete GPU work and include shadows; battle times cover the real draw loop with the injected visual load. The unmodified battle baseline was 3.4 ms median draw time.

| Biome | Corridor completed redraw, median | Battle draw, median | Battle draw, p95 |
| --- | ---: | ---: | ---: |
| Temperate | 3.2 ms | 6.2 ms | 7.3 ms |
| Jungle | 2.9 ms | 5.8 ms | 7.3 ms |
| Snow | 2.1 ms | 4.8 ms | 5.8 ms |
| Dry grassland | 2.4 ms | 5.1 ms | 6.3 ms |
| Wetlands | 2.4 ms | 5.9 ms | 7.4 ms |

The final [independent review](../../hybrid-review/biome-ground-sprites/independent/FINAL-REVIEW.md) is **9/10 for art-study readiness**, with no remaining blocker. The first smooth-beam silhouettes were corrected before that score. The full related suite has 66 passing tests; the changed-source/export subset and browser checks were rerun after the art correction. These are study and rendering checks, not gameplay integration approval.

- [x] Five procedural transparent sheets and reusable generator.
- [x] Multi-tile paint layered onto the existing ground pattern.
- [x] Seed controls and before/after inspection.
- [x] Whole-footprint path and elevation protection.
- [x] No additional debris geometry or full-sector texture per chunk.
- [x] Independent 9/10 review and warmed battle rendering fixture.
- [ ] Integrating agent supplies authored masks and chooses family from the ground below.
- [ ] Gameplay playtest and performance review after that wiring.

The existing port 4476 preview remains on its original fixed shutdown deadline: **14 October 2026, 17:19 EDT / 21:19 UTC**. This pass does not restart it or extend its lifetime. Ownership/restart details remain in `artifacts/biome-refinement/preview-spec.json`.
