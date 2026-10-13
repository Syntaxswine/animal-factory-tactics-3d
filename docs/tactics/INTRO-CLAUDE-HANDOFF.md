# Intro animation — handoff to Claude

Prepared October 12, 2026. Animation baseline: **934911b** on **work/utility-helicopter**.

## Read this first

**The user has not accepted the current visual composition.** After the separate-sector revision, their latest feedback was: “this is missing the mark still. i'm wondering if it would be better done as animated sprites.” They asked for this handoff so Claude can take a pass.

The existing 9/10 independent reviews and passing tests describe the mechanical study. They do **not** override that feedback or establish final art approval. Treat the 3D sequence as reusable motion/reference work. The immediate work is a composition and art-direction pass, with layered animated sprites under consideration.

**What exists:** two painted six-panel storyboard sheets, a playable 35-second 3D study, a full WebM recording, component studies, regression tests and review evidence. **What does not exist yet:** the proposed new three-keyframe sprite proof, transparent sprite layers, a sprite animation player, final audio or gameplay integration. The storyboard PNGs are flattened illustrations, not animation-ready sprite sheets.

## Suggested brief to start the next pass

Review the marked map and both storyboard sheets, then watch the current motion test. Explore a layered sprite version of the descent and crash. First compose three painted keyframes: descent past the plateau, impact in the marked lower clearing, and the settled survivable wreck. Make the terrain shape, scale, forest cover and location read correctly before spending effort on in-between animation. Present those compositions to the user before extending that approach across the whole intro.

This is the suggested next step discussed in the chat; a complete switch to sprites has not yet been implemented or visually approved.

## Start with these files

| Material | Purpose and status |
| --- | --- |
| [Marked crash-sector map](intro-storyboard/crash-sector-reference.png) | Primary placement reference. The white circle marks the approximate crash clearing on lower ground, beneath the curved plateau edge. |
| [Storyboard 01–06](intro-storyboard/01-approach-and-ambush-v2.png) | Painted approach, overseas hen, radar, SAM activation and volley. Preserve the story beats; its nearby-site geography is superseded. |
| [Storyboard 07–12](intro-storyboard/02-hit-and-landing-v3.png) | Painted hit, descent, flare, ground contact, rotor break and wreck. Preserve the action ideas; the relay shown over the crash is incorrect. |
| [Revised shot plan](intro-storyboard/README.md) | Twelve-shot structure, suggested sound cues and corrected separate-sector requirement. |
| [Full animation test — 35-second WebM](../../hybrid-review/intro-animation/sequence-playback.webm) | Current 3D motion test at 934911b. Useful mechanics; current composition remains unaccepted. |
| [Current closing frame](../../hybrid-review/intro-animation/shot-12.png) | Shows the latest 3D interpretation that still missed the user's target. Do not use it as an approved composition. |
| [Current descent frame](../../hybrid-review/intro-animation/shot-08.png) | Mechanical/camera reference for the drop. |
| [Aircraft design sheet](../../dist/assets/environment/utility-helicopter/reference-v1.png) | Established painterly helicopter identity. The rendered truck comparison is the actual scale reference. |
| [Helicopter asset notes](UTILITY-HELICOPTER.md) | Intact, destroyed and survivable forms; scale, damage, opening and smoke contracts. |
| [Existing generation prompts](intro-storyboard/PROMPTS.md) | Provenance and earlier revisions. Historical prompts may contain superseded geography. |

All links in this document retain their repository layout in the portable handoff folder.

## User requirements to preserve

- The helicopter is a stylized Bell UH-1-like utility aircraft, scaled against the existing truck. Painterly surfaces and simple silhouettes are the established visual language.
- The hen is **outside the country**, guiding the mercenaries over the radio. She is not a passenger. Her mission line is: **“Your mission is to take out the central relay station.”**
- Show the helicopter approaching, the hen briefing, then a return to the aircraft. **Radar detection belongs between that return and SAM activation.**
- The SAM wakes, turns/elevates and fires a series of missiles. The current two-rail study shows two staggered launches. One hits the tail/control surfaces; the other misses.
- The missile's fins form four equally spaced arms: two planes meeting at **90 degrees** through the central cylinder. A + and an X are the same construction seen at different roll angles. Preserve this in sprite reference drawings too.
- After the hit, show a rapid descent past the cliffs, followed by a rough landing in the clearing. The airframe takes two distinct damage events: **tail/control damage from the hit, then broken skids and rotor from ground impact**.
- The crash is survivable: keep a recognizable upright cabin, attached damaged tail, clear doorway and space for the squad to emerge. A little residual smoke works; do not replace this with a total fireball wreck.
- **Crash site, SAM site and central relay station are in three separate map sectors.** Use cutaways to the remote SAM. Neither installation belongs beside the crash or on the rim behind it.
- The marked example is a rough **240 × 240, two-tier plateau** map. The circled clearing sits on the lower land, bordered by woodland, below an undulating/curved cliff edge. There should be more trees around the helicopter than in the early illustrations, while the actual landing/exit space stays open.
- Ordinary game cliff segments are the same height as walls. The latest 3D set uses two 2-unit tiers. The earlier nine-wall-high cinematic backdrop is superseded. Do not treat the latest generic ellipse/forest placement as the exact playable map.

## What needs improvement

The user's direct finding is that the latest result still misses the mark; they raised animated sprites as a possible better medium. My diagnosis is that the current composition reads as a generic forest clearing rather than the particular landscape supplied. That diagnosis is an interpretation, not an additional user instruction.

Changing the rendering medium should be accompanied by reworking the composition. Establish recognizable landmarks in the approach/descent, preserve their relationships through impact, and make the final clearing read as the circled part of the map. Avoid inheriting the incorrect nearby relay from the old painted sheets or using the technically passing 3D overview as the target image.

The painted storyboards are useful for palette, character, story and action. They still need corrected geography, consistent aircraft proportions/damage, and proper separate layers before they can be animated.

## Proposed sprite proof — check off as it progresses

- [x] Inspect the marked map, the two painted sheets and current recording together.
- [ ] **Keyframe A — descent:** establish the curved plateau edge, upper/lower ground and wooded landing pocket; show the damaged helicopter rapidly descending toward that pocket. *Round 1 drafted 2026-10-12, awaiting the user: [INTRO-SPRITE-PROOF.md](INTRO-SPRITE-PROOF.md).*
- [ ] **Keyframe B — impact:** use the same landmarks and screen direction; plant/buckle the skids before the rotor strike, with dust reinforcing contact. *Round 1 drafted 2026-10-12, awaiting the user: [INTRO-SPRITE-PROOF.md](INTRO-SPRITE-PROOF.md).*
- [ ] **Keyframe C — settled wreck:** preserve that exact location, readable damage, open exit and surrounding forest; keep a modest landing pocket instead of a large empty pasture. *Round 1 drafted 2026-10-12, awaiting the user: [INTRO-SPRITE-PROOF.md](INTRO-SPRITE-PROOF.md).*
- [x] Check the three compositions with the user before producing a full sprite sequence. *2026-10-12, the user: "this version of the crash resolves a lot of my conflicts with it."*
- [ ] If that direction is accepted, split terrain/trees into useful depth layers and separate the fuselage, main/tail rotors, damaged parts, missile, smoke, flash, dust and debris. Keep pivots and occlusion order consistent. *Partly: one static plate, whole-aircraft frames from the rig and 2D effects. Depth bands and per-part aircraft sprites are not done yet.*
- [x] Animate a short A → B → C proof. Use modest parallax/camera movement, readable downward acceleration, a brief flare, compression/slide and supported settling. *Round 1 built 2026-10-12, playback awaiting the user: [proof.html](../../dist/tactics/intro-sprites/proof.html), [recording](intro-sprites/proof-playback.webm), [INTRO-SPRITE-PROOF.md](INTRO-SPRITE-PROOF.md#animated-proof).* *Round 2 aesthetics 2026-10-12, after the user's direction to speak the sprites' visual language and point at the storyboard's painterly realism: the game's own foliage and ground paintings, inked forms, and a warm/cool split tone measured against the storyboard. Awaiting the user.* *Round 3 2026-10-12, after the user's notes on round 2 (oversimplified, small cliffs; a zoomed-in prior shot; haze to push the cliff behind the aircraft; the aircraft lost against the trees) and on the first close-up ("low poly ... should look fairly realistic"): a perspective close-up of the drop past a butte (cliff stretched 4× there and 1.6× in the wide shots, at the user's direction), realistic rock from a signed-distance relief with soft shadows and occlusion, atmospheric haze. Awaiting the user.*
- [ ] Review normal-speed playback as well as keyframes. Confirm the trees reveal rather than obscure the crucial impact/exit action. *Recorded at 1×. Trees ring the clearing and never cross the aircraft (tests/intro-sprites.test.mjs). The user's review is pending.*
- [ ] Apply the accepted treatment to approach, overseas briefing, radar and the remote SAM cutaway.
- [ ] Add the sound pass and decide the eventual gameplay handoff separately.

The existing models can supply proportion, contact and rotation reference renders. There is no requirement to retain the current 3D scenery, camera angles or exact 35-second pacing if the new composition needs adjustment.

## Existing timing and reusable motion

| Time | Current implemented beat |
| --- | --- |
| 0–4 s | Aircraft approach. |
| 4–9 s | Overseas hen briefing. |
| 9–12 s | Return to aircraft. |
| 12–14 s | Radar contact. |
| 14–17 s | Separate SAM sector; rails turn and elevate. |
| 17–19.4 s | Volley; launches at 17.4 and 17.95 s. |
| 19.4–21.5 s | Cut back to aircraft; tail hit at 20.5 s. |
| 21.5–24.5 s | Rapid descent. |
| 24.5–26 s | Brief nose-up flare. |
| 26–28 s | Ground contact, skid compression and forward slide. |
| 28–30 s | Rotor-tip contact at 28.25 s, fragment separation and settling. |
| 30–35 s | Door and bench clear the exit, smoke continues, camera pulls back. |

The same rigid cabin is retained throughout. Ground contact uses actual skid vertices. The rotor loses a separate section continuously, and that fragment lands rather than disappearing. Smoke is sampled at emission and remains in world space. Rewinding restores the scene. These are useful motion lessons for a sprite pass; they are not a real flight/survivability simulation.

## Tests, recordings and what they establish

| Evidence | Coverage |
| --- | --- |
| [14 intro tests](../../tests/intro-animation.test.mjs) | Fin construction, mounted release/roll continuity, rail clearance, tail-hit alignment, deterministic sampling, rigid cabin/rotor deceleration, skid support, doorway clearance, fragment contact/rewind, smoke transforms, tier/ground checks, terrain ownership/disposal and remote sector routing. |
| [11 helicopter tests](../../tests/utility-helicopter.test.mjs) | Existing truck scale, finite/low-poly geometry, paint bounds, intact/destroyed/survivable forms, contacts, exit space, grey mode and resource ownership. |
| [2 distribution tests](../../tests/tactics-3d-deployment.test.mjs) | Full-project Pages build, import closure, dynamic assets and missing-module detection. These require the full checkout, not just the portable subset. |
| [Browser check record](../../hybrid-review/intro-animation/browser-checks.json) | 24 desktop captures plus mobile; 60 actual scene-submission checks; controls, replay, reduced motion, load failure and teardown. |
| [Independent review data](../../hybrid-review/intro-animation/independent-review.json) | Fresh playback and hashes; terrain sampling and scene-cut continuity. |
| [Review notes](../../hybrid-review/intro-animation/REVIEW.md) | Historical technical scope and the subsequent user visual hold. |

The last implementation run passed **27 tests** (14 + 11 + 2). The portable package can run the **25 model/motion tests**; project-wide packaging verification belongs in the full repository. Earlier counts of 11 intro / 24 total refer to the previous geography revision.

Fresh independent playback reached 35 seconds in 35.06 seconds. A 60 Hz audit sampled 7,522,468 actor vertices; minimum terrain clearance was about 0.002 tile. The builder's fully warmed renderer stayed at 258 geometries / 21 textures. These measurements establish the specific mechanical checks, **not artistic approval of the composition or success of an unbuilt sprite version**.

## Code and workspace

Full active checkout:

`C:/Users/baals/Local Storage/AI/GTP/AnimalFactory3D/animation-studies/grenade-throw`

GitHub: [work/utility-helicopter](https://github.com/Syntaxswine/animal-factory-tactics-3d/tree/work/utility-helicopter). The animation baseline is [934911b](https://github.com/Syntaxswine/animal-factory-tactics-3d/commit/934911b5db0b0b3150056ad19fcb16080c228c33). The handoff documentation follows it on the same branch. This branch does not deploy Pages.

| Module | Useful starting point |
| --- | --- |
| [intro-study.js](../../dist/tactics/intro-study.js) | Viewer, scene selection, cameras and review API. |
| [intro-timeline.js](../../dist/tactics/intro-timeline.js) | Shot timing, motion and continuous projectile tracks. |
| [intro-helicopter.js](../../dist/tactics/intro-helicopter.js) / [support sampler](../../dist/tactics/intro-ground-contact.js) | Airframe, contact, rotor failure and exit actions. |
| [intro-effects.js](../../dist/tactics/intro-effects.js) | Painted smoke, dust and impact pools. |
| [intro-geography.js](../../dist/tactics/intro-geography.js) / [environment](../../dist/tactics/intro-environment.js) | Current separate-sector staging; composition may be replaced. |
| [sam-missile.js](../../dist/tactics/sam-missile.js) / [launcher](../../dist/tactics/intro-launcher.js) | Missile construction and release reference. |
| [intro-radio-room.js](../../dist/tactics/intro-radio-room.js) / [radar](../../dist/tactics/intro-radar.js) | Briefing and detection inserts. |

In the full checkout, with Node.js 22 or later:

```powershell
Set-Location -LiteralPath 'C:/Users/baals/Local Storage/AI/GTP/AnimalFactory3D/animation-studies/grenade-throw'
node --test tests/intro-animation.test.mjs tests/utility-helicopter.test.mjs tests/tactics-3d-deployment.test.mjs
```

The optional [browser capture tool](../../tools/capture-intro-study.mjs) uses Playwright and Edge. Its current default Playwright path is machine-specific; set `PLAYWRIGHT_PATH` when necessary. It writes fresh files under `hybrid-review/intro-animation/`, so preserve this handoff's baseline evidence before replacing it. The browser owner wrapper closes its sessions in `finally`.

## Preview and portable package

- [Play the current study](http://127.0.0.1:4476/tactics/intro-study.html?play&revision=934911b).
- [Inspect the closing view](http://127.0.0.1:4476/tactics/intro-study.html?time=34.7&revision=934911b).
- [Missile fin construction](http://127.0.0.1:4476/tactics/intro-study.html?module=missile&view=three&section=1).
- [Contact without trees/effects](http://127.0.0.1:4476/tactics/intro-study.html?module=crash&time=28.25&trees=0&effects=0).

The current read-only preview is retained for review until **October 13, 2026, 1:37 p.m. Eastern**, with an actual automatic shutdown timer. Do not silently extend it. At handoff preparation it was PID 49636, Windows creation FILETIME 134363002733560803, owner task 01a0b02d-63dc-7810-b02c-35f4aa80f344. Verify both PID and creation time before any lifecycle action. Its records are in `artifacts/intro-animation/server/`; its graceful stop marker is that directory's `STOP` file. Creating it stops this specific preview.

The portable folder/ZIP includes both storyboards, the marked map, recording, captured frames, source dependencies, paint/data assets, two viewers, model/motion tests, full-project test references and this handoff. Start with its `START-HERE.md`. It is a focused snapshot, not another canonical repository or a full game distribution. No secrets, Git metadata, dependencies installed on this machine, or private helper logs are included.

After the current preview expires, deliberately start a new server from the desired checkout/package with `node tools/serve-intro-study.mjs PORT`. Check that the port is free first. The server creates fresh local records and a 24-hour stop timer. A stale `STOP` marker belongs to the prior lifetime; preserve its receipt before preparing a new lifetime. Any server retained for review must be registered using `C:/Users/baals/Local Storage/AI/GTP/helper-lifecycle/cleanup.py register SPEC.json` under the adjacent README schema, with its actual new PID, owner, expiry and restart records. No server is automatically started by unpacking the handoff.

## Completion conditions for the next pass

- [ ] The user recognizes the intended crash-sector composition in the new keyframes.
- [ ] Crash, SAM and relay remain separate places, and the overseas hen/radar sequence stays clear.
- [ ] Impact and damage read convincingly at normal speed, with a survivable cabin and clear exit.
- [ ] The chosen sprite/3D approach and unresolved gaps are recorded explicitly.
- [ ] Technical tests and any independent 9/10 review are reported separately from the user's art approval.
