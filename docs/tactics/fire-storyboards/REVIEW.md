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

## Full roster and equipment study: 9/10

October 5, 2026. Independent hostile review approves the standalone roster extension at **9/10**, with no blocking findings. Scope: standing, straight, same-height routes; 25 character/outfit variants, 289 supported target loadouts and 22 flamethrower operators. The hen and donkey guide remain unarmed. This does not approve gameplay integration, other firing stances or turning/elevated paths.

Corrections during fitting and review:

- Shortened the hen's catching steps to stay within her leg reach; retained her wing/toe rig and low collapse.
- Fit the pigs' torso lean and real supporting palm surfaces instead of accepting an arm clamped above the ground.
- Preserved the HMG's fitted closed glove through release, updated its cuff after the final arm pose and carried the authored contact offset/elbow pole continuously into the collapse.
- Preserved and blended the pig rifle's release elbow pole, eliminating a discontinuity that anchor-proximity tests missed.
- Let the flamethrower pack and lance fall and rest independently, keeping the hose attached. The pack now settles on both parallel cylinders.
- Included long tails, hats, ears, horns and wings in the painted envelope and complete body breakup; restored them on reverse seeks.
- Varied spray stroke timing, spacing, aspect and rotation, with more overlap and the same incoming occlusion boundaries.
- Fixed failed outfit loads leaking already-created paint targets/layers, including textures that finish after a sibling request fails.

The reviewer independently reran **75 motion/equipment tests** and separately injected horse/hen texture failures and late completion. All passed. Those failure cases are now committed as three additional regression tests: the builder's final focused run passed **78 tests**, plus **40 related motion/paint/outfit tests**. Asset validation and the 3D build/module-closure check passed.

The final browser matrix passed **289 target loadouts and 22 operators**, with **121 captures**, no console/page errors, and stable counts across six repeated variant switches (95 geometries / 21 textures for the final isolated skunk setup). The earlier roster browser run also passed the existing 72 view/scale/obstruction/route configurations and reduced-motion startup. Resource counts vary by species, equipment and which actors are visible; the meaningful check is stability for the same setup.

Evidence reviewed: code, dense numerical support and continuity probes, reports, and rendered still sequences. The reviewer did **not** independently watch continuous playback. The skunk's upper tail curl can briefly peek through the flame from the side; this was judged optional art polish, not a blocking coverage defect. The approved horse GIF remains the prior horse revision rather than a recording of this extension.

- [Revised overlapping spray](evidence/roster/spray-three.png)
- [Pig HMG supported collapse](evidence/roster/pig-director-hmg-three-3.18.png) and [pig operator](evidence/roster/operator-pig-director-three.png)
- [Hen reaction without effects](evidence/roster/hen-red-hats.png), [hen engulfment](evidence/roster/engulf-hen-side.png) and [rabbit engulfment](evidence/roster/engulf-rabbit-side.png)
- [Skunk fire coverage](evidence/roster/engulf-skunk-side.png), [pack fit behind the plume](evidence/roster/operator-skunk-rear.png) and [settled pack/lance](evidence/roster/skunk-flamethrower-side-5.4.png)
- [Full browser matrix](evidence/roster/browser-review.json)

No files or processes were changed by the reviewer. Disposable builder capture browsers closed through their owning API. The previously retained preview keeps its original automatic expiry; no new unbounded server was started. No changes were made to the other agent's gameplay checkout.

## Canonical integration review — 2026-10-05 UTC

Approved `7b94117` as a standalone full-roster fire animation study. This approval does not enable the separate live-battle integration branch.

The revised overlapping spray reads more coherently than the previous repeating rows. Browser inspection covered the hen's Red Hats outfit, pig director with an HMG, skunk firing and dropped flamethrower assembly, unarmed donkey guide, and rabbit on a blocked route. Key poses were scrubbed with effects on and off, including reverse seeking; wall and doorway clipping were checked at gameplay scale. No browser warnings or errors appeared in these checks.

The main remaining visual request is a clearer hen collapse. At the settled collapse pose she remains mostly upright in a crouch before dissolving. A more visible loss of balance and lower chest/head would help sell the terminal reaction without rebuilding the rig. This is a polish follow-up for the study, not a reason to hold the rest of the roster.

Validation: 78 fire/roster/paint-lifecycle tests and 40 related motion/paint/outfit tests passed. The 3D Pages build and asset validation passed. The build-script merge preserves the canonical ballistic module and missing-module checks while copying all new roster modules. Live-battle survivor reactions and terminal death handling need separate integration validation; the study always demonstrates the terminal sequence.

## Hen collapse refinement: 9/10

October 4, 2026 (America/New_York; October 5 UTC). Independent hostile review approves this focused study correction at **9/10**, with no blocking findings. Both original and Red Hat hens now buckle, tip sideways over a toe edge and settle onto a folded wing before the body dissolves. The grounded silhouette replaces the previous crouch. Character dimensions, the panic route and the approved spray remain unchanged.

The first pass scored **8/10** because only the rigid apron hem touched the floor; calling that flank support hid a real gap. The corrected lower wing opens to catch the fall, then folds beneath the body. Actual wing skin reaches the floor and the apron remains clear. Feet explicitly release their planted contract during the roll. The support test now checks the identified surface, rather than assuming every fallen character must keep a foot planted.

The sideways fall also exposed a detached blob shadow and an ash pile growing at the old foot position. The shadow now follows the pelvis ground projection. A pure historical sampler supplies smoke birth positions and the settled ash anchor without altering the live pose or logical route endpoint. This is a presentation offset for the lying body, not another movement step.

Validation:

- **85 fire/lifecycle tests passed**, including seven new hen regressions for real surface support on blocked/short/full routes, rotated headings and uniform raised floors; a side-resting pose before disappearance; continuous joints; reverse playback; complete rig restoration; and smoke/ash history. **40 related motion, paint and outfit tests passed**.
- The reviewer independently reran **82 fire/motion tests**, all passing. The builder's 85 also include the three existing paint-load lifecycle tests.
- **48 browser configurations passed** across two outfits, three route lengths, four views and two scales, with no page or console errors. Thirty-six effects-off keyframes plus additional painted breakup, ash and gameplay-size captures were generated.
- Asset validation and the packaged 3D build passed. The capture browser closed via its owning API, and its exact process lifetime was confirmed exited. The retained preview preserves its original October 5, 1:17 a.m. Eastern automatic expiry.

Evidence:

- [Before buckling](evidence/hen-collapse/normal-three-2.56.png), [tipping](evidence/hen-collapse/normal-three-2.9.png), [wing catch](evidence/hen-collapse/normal-three-3.02.png), [settled side pose](evidence/hen-collapse/normal-three-3.18.png)
- [Front contact and shadow](evidence/hen-collapse/normal-front-3.18.png), [Red Hat contact](evidence/hen-collapse/red-hats-front-3.18.png)
- [Painted breakup](evidence/hen-collapse/normal-painted-front-3.6.png), [ash beneath the fallen body](evidence/hen-collapse/normal-painted-three-5.4.png), [Red Hat at gameplay size](evidence/hen-collapse/red-hats-painted-game-3.18.png)
- [Browser report](evidence/hen-collapse/review.json)

The reviewer inspected code, skin measurements, tests and still sequences; they did not independently watch continuous WebM playback. A normal-speed local capture is retained at `artifacts/painted-fire/hen-collapse/hen-motion.webm`. This approval remains for the animation study, not gameplay integration. No gameplay checkout or deployment branch was modified.

Canonical follow-up review: `d1f20f4` resolves the upright-crouch concern recorded above. Independent browser inspection confirmed the buckle, sideways fall, folded-wing contact, lower head, ash alignment and restoration after reverse seeking, with original and Red Hats outfits checked. The 85 fire/lifecycle tests and 40 related motion/paint/outfit tests passed again, as did the 3D build and asset validation. Approved for the standalone study; live-battle integration remains a separate review.
