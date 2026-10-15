# Horse sitting — elbow direction and lower seats

October 9, 2026. Independent hostile reviewer: `strategic_sites_hostile`. **9/10 — approved for the corrected unarmed horse sit/rest/stand study across the four chairs. No blocking findings remain.** This is a new review of the user-requested corrections; the earlier sitting review is preserved as historical evidence.

Reviewed pending changes on `work/painted-chairs`, based on `86f0633`. Final SHA-256 values:

- `dist/tactics/horse-chair-motion.js`: `4b484ced73986f4936651c9e70ac4a3dbccd287ca4a98a03f136b05a5542e73f`
- `dist/tactics/painted-chairs.js`: `715606009a46c3450a9176015ea43e860a614dd6d18507b21b05e8860d4d20c8`

The elbows now fold backward relative to the torso throughout the movement. Their modest outward clearance preserves the forearm silhouettes beside the waist. The hands approach, rest over the thighs, and release without cutting through them. Fresh front, side, three-quarter and grey views confirm the anatomical direction; this conclusion does not rely only on the palm contact markers.

All four seat tops are uniformly lowered from 0.48 to 0.42 tile. Shorter legs and the desk column preserve floor contact, while the wingback upholstery extends into the lower cushion without reopening the earlier side or back gaps. The lowered arm rolls remain joined to the side panels. Back-top heights and the native horse scale remain unchanged. The same motion and contact parameters work across all four chairs, with no chair-specific offsets. Visible cloth rests on the seat, the soles stay planted, and the torso moves forward before the hips leave their support. The lower seat looks proportionate in both close and 58 px/tile views.

The gate was held during this review for two defects exposed by the height and elbow changes. First, the initial backward pole pushed forearms about 0.0413 tile into the overall waist, despite the glove-only test passing. Second, the lower-fabric correction snapped a vertex forward 0.0104 tile when it crossed the seat-height threshold. The final outward/backward pole and smoothly activated rim fold resolve both issues.

Independent verification of the final source:

- All **14 focused chair and motion tests passed**, including actual sole surfaces, native limb lengths, cloth contact and support transfer, all chair solids, hand and forearm clearance, reverse scrubbing, transformed placement and exact rig/buffer restoration.
- A separate forearm audit tested **137,466 posed vertices and triangle centroids over 63 times** against the actual overall surface. None were inside the waist. A further shirt audit found only one or two cuff-edge vertices overlapping the sleeve by at most 0.00295 tile; this remains a small joint seam, without visible waist penetration or lost arm silhouette. Sampled gloves remain clear, with nearest gaps around 0.007–0.008 tile.
- Independently measured both elbow hinges at 60 Hz and three headings. Their normalized dot product with projected torso-forward remained between **-0.707 and -0.497**. The revised angular test is appropriate: it measures bend direction independently of arm extension, unlike the previous absolute rearward-offset threshold. It still rejects a forward hinge.
- A 120 Hz scan of every visible mesh vertex found a maximum adjacent displacement of **0.004833 tile**, on the head during weight transfer. The previous cloth snap is absent. The new focused test also checks an infinitesimal interval around its former threshold.
- Regenerated 36 captures covering every chair in close side/three-quarter and gameplay views, the lowering/rising sequence, and front/rear/top grey checks. Two complete browser playback intervals ran without console or page errors. The expanded elbow pose clears the wingback sides as well as the other chair solids.

Evidence is in `artifacts/painted-chairs/review-elbows/`: `visual-review.json`, `geometry-audit.json`, `self-audit.json`, `final-clearance-audit.json`, their reproducible audit scripts, and the final capture set. The builder's broader browser/build results are separate from the checks independently repeated here.

Reviewer browsers PIDs 39344 and 25232 closed with exit code 0 and were verified absent. The existing preview on port 4476 was reused after validating its exact process identity; no server was launched or lifetime extended. Its original automatic shutdown remains October 9, 2026, 22:30 UTC (18:30 Eastern).

This approval covers the authored horse motion, lowered chairs and study presentation. The garment fold is a reversible mesh corrective, and the support estimate is not a dynamics simulation. Other species and gameplay integration remain outside this review. No implementation files were edited or committed by the reviewer.
