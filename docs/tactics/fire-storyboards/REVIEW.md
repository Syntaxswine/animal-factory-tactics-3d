# Independent hostile fire reviews

October 4, 2026. Reviewer: independent `fire_storyboard_hostile` agent.

**Firing sheet: 9/10. Engulfment/ash sheet: 9/10. No blocking issue for this bounded concept-art delivery.** These scores approve the illustrated direction only. They do not approve an implemented animation, combat rules, equipment changes, or catalog-wide coverage.

## Evidence inspected

- `flamethrower-storyboard-v1.png`
- `engulfed-to-ash-storyboard-v3.png`
- `README.md` and `PROMPTS.md`
- Existing equipment references `../hybrid-review/weapon-models/flamethrower-close.png` and `../hybrid-review/weapon-models/flamethrower-asset.png`
- Relevant current constraints in `dist/tactics/core/engine.js`, `dist/tactics/battle-combat.js`, and `art/flamethrower-animation.md` at the supplied source baseline `3d4a3a4`

## Findings

The firing sheet clearly separates carry, brace, ignition, sustain, cutoff, and recovery. Both hands keep their grips, the hose stays connected and clear of the hooves, and the tank mass stays attached to the torso. Visible support under both hooves makes the braced pose credible. The jet begins at the nozzle, and cutoff leaves a visible air gap while the last plume continues forward. There is no illustrated rifle-style kick. The drawing uses the detailed painted weapon as its visual reference; the README correctly prevents that from becoming an unrequested equipment-model redesign.

The revised hit sheet reads as full-body engulfment rather than a small clothing fire. The body and separate limbs remain legible through the fire. Tile 1 has a trailing airborne leg; tile 2 has an advancing knee and hoof with the supporting hoof beneath the hips. These are distinct gait keys, not duplicated running poses. The tile labels establish source 0 and three successive destinations. At tile 3 the body lowers toward knee/hand support before resolving into a grounded ash heap on the same tile. The rifle stays held through travel, releases during collapse, and lands beside the ash; this is a coherent visual proposal.

The documentation accurately separates that proposed terminal three-tile journey from the existing three-turn burning state, which can produce up to three legal panic steps per applicable event. It also identifies the illustrated rifle drop as a proposal with inventory behavior still undecided. No runtime success is claimed, and no runtime checks were run for this art review.

## Remaining implementation gates

- Define the authoritative terminal event and which hit/casualty outcomes invoke it. Resolve blocked or shortened routes, interruption, and the separate tank-explosion case.
- Decide equipment and loot behavior explicitly; preserve item conservation and keep final unit, ash, and loot positions consistent.
- Retain and animate actual legal path steps. The numbered poses must not become shortcuts through obstacles or one oversized stride per tile.
- Prove continuous hoof contact, weight transfer, hand grips, hose clearance, nozzle alignment, and the collapse in a deterministic scrub-able study. The static keys do not establish those transitions.
- Inspect close and gameplay views, both profiles and rear, reduced motion, low/high aim, other firing stances, and each supported species/outfit/weapon combination before claiming coverage.
- Obtain a separate independent hostile review of at least 9/10 on the actual animation and integration.

## October 4 clarification: area effect and painted textures

The same independent reviewer inspected the subsequent README-only change against the user's new direction. **9/10 for that bounded handoff-note delta, with no blocking issues.** It correctly defers the affected area and damage coverage to gameplay data, calls for painterly animated textures over simple supporting geometry, and preserves the established poses and ash outcome. It explicitly limits the earlier image review and makes no claim that an area-effect renderer, texture set or runtime animation has been delivered. No runtime tests were run for this documentation review.

## Implemented horse study: 9/10

October 4, 2026. The same independent hostile agent reviewed the actual implementation, tests and rendered evidence. **Final score: 9/10; no blocking issue within the declared standing, normal-outfit horse study with straight open, shortened or blocked routes.** This supersedes the initial implementation score of 8/10, not the separate gameplay-integration gate.

Corrections made during review:

- Fixed shooter root yaw so both planted hooves stay fixed while bracing.
- Kept the projector at its emission transform until the last emitted flame departs at 1.58 seconds; recovery finishes at 2.10 seconds.
- Lowered the collapsing body into actual left-hand surface support before breakup, with continuous rifle release and a gravity-driven, floor-clamped fall.
- Reused the established upper-pastern weighting to remove exposed ankle caps without deforming the rigid soles.
- Replaced the opaque, stretched ribbon appearance with shorter, moving painted billows, keeping the target readable and the incoming ray clipping intact.
- Kept fire covering the complete body breakup, then decayed it separately toward the ash; remaining fragments turn soot-coloured.
- Restored visibility on reverse seeks and explicitly refused unsupported cornered routes.

The reviewer independently reran **all 15 focused tests: passed**. The final browser run completed **72 configurations**, forward/reverse sample playback and reduced-motion startup without page or console errors. Geometry and texture counts remained stable at 74 and 15 across 200 extra seeks. The 3D build, module closure and asset validation passed.

The reviewer inspected rendered still sequences, code and reports, **not continuous WebM playback**. Normal-speed recordings and timestamped samples were generated separately. Selected evidence is retained below; the complete local recording and helper receipts remain under `artifacts/painted-fire/`. The browser checker is reproducible with `tools/check-painted-fire.mjs` against a served study.

- [Whole-scene spray](evidence/spray-three.png) and [side spray](evidence/spray-side.png)
- [Full-body fire](evidence/head-to-hoof.png)
- [Visible supporting hand](evidence/support-front.png)
- [Covered late dissolution](evidence/dissolve-front-3.85.png) and [final ash](evidence/ash-final.png)
- [Wall occlusion](evidence/wall-clipped.png) and [doorway occlusion](evidence/door-clipped.png)
- [Browser results and playback timestamps](evidence/browser-review.json)

Minor remaining art polish: the billows retain some repeated puff rhythm. Remaining integration gates: authoritative terminal/casualty/loot ownership, real scene transforms and visibility, turning or elevated routes, arbitrary aim, other animals/outfits/stances and actual combat interruptions. No gameplay approval or deployment is claimed by this study score.

## Thick black smoke refinement: 9/10

October 4, 2026. The independent reviewer approved this smoke-only refinement at **9/10**, with no code or visual blocker. Dense charcoal-black billows retain their painted lobes; flames, travel direction, collapse and the final ash/rifle remain readable. The existing atlas is shaded at runtime, with eighteen overlapping cards instead of twelve and slower painted-frame transitions. Character motion and gameplay behavior are unchanged.

The reviewer inspected the code diff, whole-scene frames at 1.2, 2.3, 3.6, 4.5 and 5.4 seconds, close views and the fresh browser report. Absolute-time births, retained world positions and complete material disposal preserve deterministic seeking and cleanup. The last full-route smoke expires at 5.36 seconds; the 5.4-second end frame is clear. This was a still-sequence review, not continuous GIF or video playback. The requested documentation correction to **2,128 effect triangles** is included.

All 15 focused tests, the build and asset check passed. The new browser run passed 72 configurations without errors; geometry and texture counts stayed at 74 and 15. The refreshed GIF decodes successfully at 960 × 540 with a 6.4-second infinite loop. Both temporary capture browsers closed and their recorded processes were verified exited; the existing user-review preview keeps its original expiry.

- [Black smoke trail](evidence/black-smoke-trail.png) and [close view](evidence/black-smoke-close.png)
- [Updated GIF](evidence/painted-fire-study.gif)
- [Fresh browser report](evidence/black-smoke-browser-review.json)

The earlier evidence images above remain the pre-refinement captures. This score approves the smoke change within the same horse-study scope; gameplay integration remains separate.

## More panicked burning run: 9/10

October 4, 2026. Independent hostile review approves the revised panic motion at **9/10** within the standing-horse, straight-route study scope. The three-tile run is 10% shorter in time (1.62 seconds), with uneven high steps, a startle, head/shoulder reactions and asymmetric face-protection, collar-swat and outward/downward-fling gestures. The rifle remains in the other hand until the existing supported collapse and drop.

The first pass received 8/10: its repeated high fist read like cheering, and its free arm snapped toward full extension during the startle. Authored protective/swatting gestures replaced that loop. A soft reach envelope preserves elbow bend before blending into the fitted ground-support pose. Independent measurements put the peak startle forearm angular speed at 23.1 rad/s, down from 87.1 rad/s in the rejected pass.

All **17 focused tests passed independently**. Additional 1 ms numerical sweeps covered blocked, one-, two- and three-step paths, plus diagonal straight routes; they found no unreachable joints, missing support, meaningful planted-foot drift or grip drift. The browser run passed 72 configurations with no errors and unchanged resource counts (74 geometries, 15 textures). Build and asset validation passed. The browser checker now preserves existing query parameters and derives support/dissolution captures from the current motion clock.

Evidence inspected: code, numerical sampling, the browser report, and rendered still sequences with effects on/off at close and gameplay sizes. Continuous WebM playback was generated but not independently watched by the reviewer. The refreshed 960 × 540 GIF decodes to a 6.4-second infinite loop, approximately 5.5 MB. Disposable capture browsers were closed and their recorded processes verified exited; the retained preview keeps its original expiry.

- [Protective reach](evidence/panic-protect.png) and [outward/downward swat](evidence/panic-fling.png)
- [Side-view support](evidence/panic-side.png)
- [Painted close view](evidence/panic-painted-full.png) and [gameplay size](evidence/panic-painted-game.png)
- [Fresh browser report](evidence/panic-browser-review.json) and [updated GIF](evidence/painted-fire-study.gif)

This is a refinement of the horse study. Other animals and gameplay integration are still separate work.
