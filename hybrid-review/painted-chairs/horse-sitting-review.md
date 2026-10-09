# Horse sitting motion — independent hostile review

October 9, 2026. Reviewer: `strategic_sites_hostile`. **9/10 — approved for the unarmed horse sit/rest/stand study across all four accepted chairs. No blocking findings remain.**

Reviewed the pending implementation on `work/painted-chairs`, based on `2c94899`. The reviewed `horse-chair-motion.js` SHA-256 is `06227b101e619b614cfb78ea8a0b2da8fe8a9487a1da2c3d421fab042d534233`.

The horse lowers onto visible trouser/seat contact, rests with its hooves planted, shifts its upper body forward before leaving the cushion, and returns to standing. Native proportions and bone lengths are preserved. One motion function and identical contact parameters serve the wingback, wooden, metal and desk chairs; there are no chair-specific pose offsets. The approved chair geometry remains unchanged.

The initial review held the gate at 8/10 because the hand markers reached the thighs while actual gloves penetrated the trousers by approximately 0.045–0.066 tile. The corrected palm orientation and measured glove width remove that defect. An independent posed-triangle parity/nearest-surface audit found zero glove vertices inside the trousers at 17 sampled approach, contact and release times. At the sampled supported poses, the small visible clearance measures approximately 0.007–0.010 tile. The gloves now retain their silhouettes and read as resting over the thighs.

The cloth correction compresses the loose overalls onto the common 0.48 seat and folds them around its front edge. Fresh close grey side views at 1.8, 2.0, 2.2, 6.4 and 6.6 seconds show a continuous garment contour without the former diagonal cut through the rim. This is a reversible garment corrective, not a bone or chair scaling workaround. Maximum reported vertical compression is about 0.067 tile; total displacement including the forward fold is about 0.101 tile.

Independent verification:

- Repeated the 36-view capture set covering all four chairs in close side/three-quarter and 58 px/tile gameplay views, plus front/rear/top grey inspection and descent/rise samples throughout the 9.2-second cycle. Five additional close seat-edge views were inspected. Two complete live playback intervals produced no browser errors.
- Sampled every visible mesh vertex at 120 Hz across the full cycle. Largest adjacent displacement was 0.004833 tile, on the head during forward weight transfer; no cloth or limb pop was found.
- Ran all 11 focused chair and motion tests successfully. These cover actual sole surfaces, limb lengths, clothing support, estimated mass transfer, all chair solids using convex checks or triangle parity as appropriate, glove clearance, deterministic reverse scrubbing, transformed placement and exact buffer/rig restoration.
- Exercised actual keyframe, restart, pause and repeated chair-selection controls. Warm resources remained at 35 geometries and 7 textures over the final repeated selections. Double viewer teardown completed successfully.
- Reviewed resource ownership: the temporary motion skeleton, restored original rig, paint input, chair atlas, cached chair resources and renderer each retain explicit cleanup ownership.

Independent evidence is under `artifacts/painted-chairs/review/`, including `visual-review.json`, `geometry-audit.json`, the four chair capture sets and `seat-edge-*.png`. The builder separately reports 59 focused/regression tests and 80 view/finish/scale plus 80 keyframe configurations; those broader totals are not presented as independently rerun here.

All reviewer browser owners closed with exit code 0. PIDs 45028, 5564, 13440 and 40624 were verified absent. The existing port 4476 preview was preserved with its original October 9, 2026, 22:30 UTC shutdown deadline; the reviewer launched no server.

This approval covers the authored horse motion and study viewer. The mass check is an animation support estimate, not a dynamics simulation. Other species, weapon handling and gameplay integration remain outside this review.
