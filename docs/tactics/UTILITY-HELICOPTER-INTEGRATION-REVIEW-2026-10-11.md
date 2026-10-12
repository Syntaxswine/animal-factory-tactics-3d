# Tutorial helicopter visual and release review

Reviewed October 11, 2026. Source branch: `work/utility-helicopter`, commits `dee1459`, `cf8cbdf` and `98adf13`. Integrated onto canonical `587a95a` as `5723b5e`, `4878633` and `76696ad`.

**Approved as a visual asset and standalone study for the tutorial.** The survivable crash is a useful opening-scene baseline. This approval does not claim that the tutorial, editor or navigation already uses it.

## Visual assessment

- The olive paint, worn surfaces and simplified forms fit the existing canvas truck and animal characters. Comparison uses their native scales.
- The largely upright cabin, attached damaged tail, crushed skids and broken rotor communicate a rough landing while preserving a believable place for the squad to emerge. The destroyed variant reads as a distinctly more severe outcome.
- At the study's 58 px/tile gameplay scale, the light plume marks the recent crash without obscuring the doorway or character. Grey front and painted side views expose the shape and ground contact clearly.
- The doorway and cleared space are a useful starting point for evacuation. They suggest a crouched exit and step down; they do not yet prove that the full squad can spawn, animate and path through the opening.

No further sculpt or paint pass is required before integration begins.

## Release fixes

The initial focused checks found two omissions:

1. The new paintings were absent from the asset audit's registered assets. The audit rejected the atlas as unattached. Both source paintings are now registered with their actual dimensions and PNG color format; the orphan-file check remains enabled.
2. The base Pages manifest copied the truck study, which links to the helicopter study, without copying that destination. The manifest now includes the new viewer/model/smoke files and their painted-fire dependencies. The missing-module and link checks remain enabled.

The 3D distribution already copied the new viewer and paintings. These fixes complete release packaging without adding gameplay behavior.

## Fresh verification

- `node --test tests/utility-helicopter.test.mjs tests/tactics-3d-deployment.test.mjs tests/tactics-pages-files.test.mjs`: **15/15 passed**, including actual 3D build, copied assets, and base-manifest closure.
- `node tools/check-assets.mjs`: passed.
- `node tools/sync-tactics-core.mjs --check`: passed for all 20 shared modules.
- Browser inspection: painted survivable crash at fit and gameplay scales, native truck/horse comparison, side view, grey front view, and survivable/destroyed comparison. Smoke play/pause and grey-form controls worked; no captured browser warnings or errors.
- The artist's running preview supplied the visual inspection. Its four helicopter source/viewer files match the integrated files after normalizing line endings, and the atlas matches byte-for-byte.

The author's broader browser matrix is recorded in [the asset documentation](UTILITY-HELICOPTER.md); it was not independently repeated in this review. Full repository checks run in the canonical deployment workflow.

## Work for the tutorial coder

1. Place the survivable variant in the tutorial sector and connect its persistence to the intended opening sequence. The SAM strike, landing cinematic and squad emergence remain separate work.
2. Add ground occupancy and cover for the cabin, skids, tail and relevant debris. Use physical components rather than the full rotor-span bounding rectangle. Ground scrapes and smoke must not block movement.
3. Transform the model-local exit marker with the placed aircraft, then validate actual tile occupancy and traversable space. The marker is not a spawn volume or a complete clearance test.
4. Test the intended squad size and character types exiting or spawning beside the door without overlap, trapped units or blocked onward paths. Choose a crouched exit/step-down sequence if emergence is animated.
5. Attach the smoke effect to the placed aircraft, preserve pause/reduced-motion behavior, and dispose instance resources on sector unload. Shared textures remain caller-owned.
6. Check the final crash site in the tutorial's terrain, camera, lighting and fog-of-war conditions. Editor placement and campaign wiring still need their own acceptance checks.

The review browser was closed. No new server was started or retained by this review; the artist-owned preview keeps its existing shutdown deadline.
