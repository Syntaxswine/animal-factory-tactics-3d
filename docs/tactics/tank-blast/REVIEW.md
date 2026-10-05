# Independent hostile review

October 4, 2026 (America/New_York). Reviewer: `fire_storyboard_hostile`.

**9/10. No blocking findings remain for the standalone standing fatal-event study.** This approves the study's worn-tank rupture, surrounding fire and supported wearer reaction, not gameplay integration or a new authoritative ash outcome.

## Corrections made during review

The initial implementation received 8/10. Ground flames had visibly straight clipped bases and rectangular edge strips, and the newly enabled real shadows did not initially share the body's breakup shader.

Ground cards now soften vertically and toward the inside of the supplied fire-cell boundary. The strict dry-cell mask remains in place. Body and cap shadow depth passes now use the same bind-space discard as their colour materials. The final pixel check found **zero changed pixels** between a fully dissolved visible-root actor and a hidden actor, proving no solid ghost shadow remains.

Close rear, side and three-quarter samples immediately before/after rupture confirmed that the burst starts at the actual worn tanks for the horse, pig director and skunk. The projector, tanks and hose disappear together; no intact duplicate is left behind. Fragment surfaces meet the floor, and the wearer collapses in place with the approved supporting contacts. Fine arm-continuity probes found no reach failure or straight-arm flip.

## Evidence and limits

- Reviewer independently reran **101 tank/fire/roster/hen/lifecycle tests**, all passing. Another **40 related motion/paint/outfit tests** passed in the builder's run.
- [Full browser matrix](evidence/browser-review.json): **352 configurations**, 80 captures, no errors, five stable repeated GPU-memory samples.
- [Final polish report](evidence/polish-review.json): **66 captures**, reduced-motion startup, shadow comparison, startup-failure reporting and stable repeated resources. These samples follow the final edge/shadow correction; the earlier full matrix establishes the unchanged roster, motion and equipment behavior.
- [Horse worn-pack rupture](evidence/horse-rupture-rear-0.56.png), [pig rupture](evidence/pig-director-rupture-side-0.65.png), [skunk rupture](evidence/skunk-rupture-three-0.65.png).
- [Open-ground aftermath](evidence/horse-blast-three-1.6.png), [water exclusion](evidence/water-fire.png), [late body/shadow breakup](evidence/horse-breakup-side-2.15.png).
- [Normal-speed captured loop](evidence/tank-blast.webm). The independent review used sampled sequences, code and tests; it did **not** claim continuous video viewing.

All 22 supported wearers were loaded and sampled. Still sequences and numerical tests do not establish every intermediate visual from every camera. Hen/guide tank use, other stances, terrain changes, live damage, visibility and interruptions are outside this study. The ash endpoint and preview-compressed ground-fire lifetime remain explicit integration decisions.

Capture browsers close in `finally`; helper identity/closure receipts and complete local captures are retained under `artifacts/tank-blast/`. The existing preview server is reused under its original registered expiry rather than creating another service.

## Skunk versus Red Hat pig GIF

The independent hostile reviewer approved the requested [combined GIF](evidence/skunk-vs-red-hat-pig.gif) at **9/10** as a staged illustration. Flame visibly reaches the Red Hat pig foreman before his tanks rupture, the burst stays at the worn pack, no intact equipment remains, and the worker skunk stays outside the surrounding ground fire. No meaningful framing issue was found.

The reviewer independently decoded all **112 GIF frames**, confirming 960 × 540, seven seconds and infinite looping. Source keyframes, palette-converted samples and deterministic capture diagnostics were inspected; continuous playback viewing was not claimed. The capture's 121 time samples also verify grip contact, worn origin, equipment-removal timing and reverse replay without browser errors. The capture browser exited and its exact process identity was verified absent. These checks do not convert the illustration into an authoritative gameplay replay.
