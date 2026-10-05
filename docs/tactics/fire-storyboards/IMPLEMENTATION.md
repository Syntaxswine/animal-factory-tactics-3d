# Painted fire: first 3D study

October 4, 2026. Open `tactics/painted-fire-study.html` in a served build, or follow **Painted fire** in the 3D gallery. This is a horse-first presentation study, separate from the combat agent's area-effect implementation.

[Download the looping GIF](evidence/painted-fire-study.gif): 960 × 540, 6.4 seconds, approximately 5.5 MB. It records the refined panic animation and thick black smoke at 20 samples per second, with short holds at the start and on the final ash pile. The GIF export changes no motion or gameplay behavior.

## What is implemented

- Approved horse dimensions and existing flamethrower, tanks, hose and grips. Carry → brace → spray → trailing cutoff → recover, with fixed supporting hooves and continuous hand contact.
- A full-body flame envelope, an urgent journey through three supplied adjacent tiles, a supported collapse, a visual rifle drop, and a grounded ash heap. The full-route run takes 1.62 seconds, with uneven high steps, a startled recoil, head/shoulder movement and a free-hand sequence that protects the face, swats across the collar and flings outward/downward. The other hand clutches the rifle until collapse. One-step and blocked routes demonstrate shorter endpoints.
- Three generated paintings: a four-frame flame atlas, a four-frame smoke atlas and an ash decal. The burst uses moving, irregular painted billows over a faint clipped core. The character envelope follows thirteen body regions. Eighteen overlapping smoke billows use charcoal-black shading while preserving the painted highlights. Their source lowers with the collapse; emitted smoke stays in world space, rises and fades over two seconds. The settled body breaks up beneath the fire before the ash remains.
- A scrubbable clock, four camera views, drag orbit, close/gameplay scales, shooter/target/whole-scene focus, and an effects toggle for inspecting support. Reduced-motion preferences start the study paused.
- Open ground, a full wall and an open doorway, using **captured results from the incoming gameplay `flameShape`**, including its original clipped rays. Protected targets stay unaffected in the wall demonstration.

The effect uses 2,128 triangles at its maximum open-ground allocation, including the simple ash mound; nearly all visible detail comes from paint. The two characters and their existing equipment are additional. Three texture PNGs total about 4.6 MB. No character subdivision or sculpt rebuilding was needed.

## Integration contract and limits

`painted-fire-motion.js` owns presentation only. It never changes unit health, position, inventory, ammunition or damage. Callers must supply the actual legal route, and must decide whether a terminal burn is authorized for the combat outcome.

The current fitted motion accepts **straight, same-height paths of up to three adjacent steps**. A turn is explicitly rejected rather than rotating a planted foot through a corner. Do not silently fall back to a straight shortcut. The study is standing, normal-outfit horse only. Other animals, outfits, kneeling/prone firing, arbitrary aim heights and actual combat interruptions remain fitting/integration work.

The sampled flame fixture is in `dist/tactics/fixtures/painted-fire-contract.json`, with a SHA-256 of the source module. `tools/capture-fire-contract.mjs INCOMING_CHECKOUT` regenerates it without editing that checkout. At capture, gameplay defined range 10 and mouth radius 3, with 37 clipped rays. The art module does not define damage, angle or range independently.

`flameSheetData` and the billow clipping shader currently render these world-map rays in a **shooter-relative ground-level frame**: subtract the recorded origin's map X/Y to get Three X/Z. The current study's shooter is at the local origin. A game adapter must map the real level height, actual muzzle and fog-of-war/visibility data into one consistent frame. A ray discontinuity is conservatively left unbridged, so decorative triangles and billboards cannot fill in the doorway's wall shadow. These checks are not a general visibility-system implementation.

The terminal proposal differs from the existing `burningTurns` rule. The existing game can apply burning over several turns; this study depicts one three-tile journey ending in ash. The gameplay agent must define eligibility, interruptions, shortened routes and final unit/casualty/loot state before enabling it in combat. The dropped rifle is a visual prop, not a newly created loot item.

## Physics and replay checks

The test suite measures actual skinned surfaces as well as bones. Planted soles remain at ground height and fixed in world space during their support intervals. The braced shooter does not rotate its root to follow a changing gun yaw. Limb segment lengths remain unchanged; unreachable IK targets throw rather than stretch the mesh.

The panicked steps always retain a supporting hoof, including on shortened and diagonal straight routes. A soft reach envelope preserves elbow bend during the free-hand gestures; it blends into the separately fitted collapse contact. Regression tests check the former startle extension snap and forward/reverse support on blocked, one-, two- and three-step routes.

The collapse reaches the left-hand surface before body breakup begins: measured minimum clearance is approximately **0.00028 tile**, with a 0.004-tile acceptance bound. The body lowers through flexed legs while the planted hand accepts support. The rifle releases continuously, accelerates downward at the study's gravity of 9.81 world units/s² and rests with its lowest vertex 0.006 tile above the floor. Its resting orientation settles before impact. This is a deterministic prop fall, not a general rigid-body engine.

The upper pastern uses the existing locomotion weighting toward the shin; sole vertices remain rigid. This prevents the bent ankle from exposing the mesh's capped top. Disposing the driver restores the original weights. Reverse seeks restore visibility, bones, grips, effect frames, smoke positions and equipment location without advancing a hidden simulation.

## Validation and evidence

- `node --test tests/painted-fire.test.mjs`: 17 focused tests passed and were independently rerun; results are recorded in REVIEW.md.
- `node tools/build-tactics-3d.mjs`: passed, including the new study's module closure and copied effect assets.
- Browser review: 72 combinations (4 views × 2 scales × 3 obstruction scenes × 3 route lengths), forward/reverse sampling, and separate reduced-motion startup. No console/page errors; 74 geometries and 15 textures remained stable across 200 additional seeks.
- Run `node tools/check-painted-fire.mjs STUDY_URL` with `PLAYWRIGHT_PATH` pointing to an installed Playwright package. Normal-speed canvas recordings and timestamped frames cover effects-off motion, painted whole-scene playback and gameplay size. The reviewer distinguishes inspected still sequences from continuous video playback.

The local capture/restart records live under `artifacts/painted-fire/`; selected portable evidence accompanies the final review. Texture prompts and provenance are in [TEXTURE-PROMPTS.md](TEXTURE-PROMPTS.md). Approval status is recorded separately in [REVIEW.md](REVIEW.md).

## Remaining checklist

- [x] User greenlight to build from the storyboard direction.
- [x] Create painted runtime textures and a scrub-able horse study.
- [x] Consume incoming clipped area geometry without changing its damage rules.
- [x] Fix bracing drift, ankle separation, supported collapse and rifle fall.
- [x] Independent implemented-study review 9/10; selected evidence is linked from REVIEW.md.
- [ ] Agree on the terminal combat event, interruption and inventory/loot behavior.
- [ ] Adapt real game transforms, visibility, aim and shortened/cornered routes.
- [ ] Fit other animals, outfits and firing stances.
- [ ] Exercise the final event through actual gameplay and review integration separately.

No gameplay files in the other agent's checkout were modified. This branch does not run the `main` Pages deployment.
