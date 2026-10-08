# Hand grenade and horse throwing study

## Naturalistic revision (Claude, 2026-10-08)

**Direction (the boss, 2026-10-07):** "im not totally happy with the animation here, can you try
and improve this action and make it more naturalistic."

Against the keyframes published at `44b956b`, the throw had five problems:
- The body stayed square to the target.
- Both fists rose into a boxing guard.
- The throwing arm cocked low, like a curl, and released as a push from in front of the face.
- The hand stopped dead after release.
- The recovery ended in two raised fists.

An inverse-dynamics audit (table below) also found that the weight transfer was carried, not pushed.

**The throw follows steps 1 to 6 of the standing throw in FM 3-23.30 (2009), §3-14 to 3-24.** The
free hand pulls the pin. The thrower stands side-on with the grenade shoulder high and the free arm
pointing at the target, throws overhand so the grenade arcs, and follows through. Where it departs from
the manual:
- Step 7, taking cover, is not animated.
- The grip is the study's palm-down chest hold, not the grip of §3-15.
- The free arm points about 35° above horizontal, not the 45° of the manual's figure.

| time (s) | phase | what moves |
|---|---|---|
| 0–0.30 | Ready | grenade held still, palm-down at the chest, ring lying on top of the fist |
| 0.30–0.72 | Pull pin | free index finger hooks the ring, twists it toward the body, pulls it along the pin (out at 0.50), carries it clear and drops it (0.70) |
| 0.72–1.32 | Turn & load | rear hoof drop-steps behind (0.84–1.14) and turns out 77°; hips close to 65° and chest to 79° off the throwing line; grenade drawn up and back; free arm points along the line (5–10° off it, 33–35° up) |
| 1.32–1.58 | Stride | lead hoof steps toward the target |
| 1.58–1.66 | Plant | lead hoof lands at 1.60 |
| 1.66–1.935 | Throw | hips open first (peak 4.0 rad/s at 1.785 s), then the chest (5.3 rad/s at 1.84 s); the elbow bends deepest (97°) at 1.80–1.84 s and from then on only opens; the forearm whips over the throwing shoulder |
| 1.94 | Release | hand at its top speed, 5.5 m/s, 13.6 cm ahead of and 31.5 cm above the throwing shoulder; elbow still bent 74°; launch 5.47 m/s at 25° |
| 1.945–2.40 | Follow through | the arm brakes to 72% of release speed within 40 ms, then only slows. It sweeps down in front of the lead thigh (7.5 cm past the centreline, 66 cm up) while the trunk stays bent over the lead leg and the chest turns on to 38° past square. The rear heel lifts and the hoof pivots on its inner corner (1.64–2.10); the free glove tucks beside the hip. |
| 2.40–4.60 | Recover | the arm swings back to the side like a pendulum as the trunk rises; the rear hoof steps forward (2.10–2.55) and the lead hoof back (3.10–3.45); the eyes follow the grenade, lead to its landing spot before it hits, and return; the body ends exactly in the neutral stance |

Where the loose parts end up:
- **Casing:** lands short of the tile centre, bounces twice and rolls onto its side, resting 0.12 m
  past the centre and 0.06 m to the side.
- **Pull ring:** dropped at 0.70 s; it rests 0.44 m forward and 0.24 m to the free side, clear of
  both hooves.
- **Safety lever:** flips off 25 ms after release; air drag on the light strip brings it down 1.95 m
  out and 0.65 m to the free side.

**Balance is computed, not keyed.** The pelvis's horizontal path comes from a linear inverted
pendulum running over a centre-of-pressure plan:
- The plan walks hoof to hoof.
- It includes the anticipatory push that real gait initiation shows: the pressure point first moves
  0.10 m toward the stepping hoof (peak at 0.52 s), which starts the body toward the stance hoof, then
  0.17 m onto the stance hoof.
- It folds in the arms' and trunk's angular momentum.

The pendulum is solved as a boundary-value problem on a 5 ms grid, so the body starts and ends at
rest. A 10 ms grid could not follow the arm braking just after release. The pelvis is then shifted
until the real segment centre of mass follows the path: 4 passes, 0.9 mm residual, about 250 ms when
the motion is created.

Measured with `phantom-wrench` and with the tests. `phantom-wrench` is an inverse-dynamics audit
with friction pyramids at the actual contacts; its rig is `rigs/grenade-throw.mjs` in
`Syntaxswine/phantom-wrench`. The rig gives the trunk 0.13 kg·m² of twisting inertia and leaves out
the grenade's 0.4 kg, so the mass stays constant across the release.

| | `44b956b` | this revision |
|---|---|---|
| peak phantom force | 1639 N (223% body weight), Load rear leg | 29 N (4%), Follow through; 44 N (6%) at friction 0.6 |
| audit gate (≤10% BW phantom; no impulses; no overlap > 2 cm; speeds; joint ranges) | FAIL: 0.91 s over; 4 capsule pairs over 2 cm, forearm 7.8 cm inside the trunk | PASS at friction 0.9 and 0.6 |
| required centre of pressure outside the hooves (Dempster masses) | up to 236 cm (sampled every 20 ms) | never, sampled every 5 ms and every 1 ms through the release; the closest sample is 2.0 cm inside |
| forearm or glove inside the torso mesh | not measured | at most 0.65 cm: the throwing glove resting on the chest in the opening hold |

Other mechanics:
- **Position curves are C2.** Pelvis, trunk angles, arm arcs, elbow poles and feet are quintic
  Hermite, so nothing jolts at a key. A cubic's acceleration steps at every key.
- **Hand orientations are C1.** They are cubic rotation-vector segments joined through the inverse
  left Jacobian of SO(3). Angular velocity is continuous; angular acceleration can step at a key.
- **Two-bone limbs carry twist.** The bend plane maps onto the rest bend plane, so there is no
  candy-wrapper at the hip or elbow when the trunk turns 85°.
- **Throwing palm.** It moves on arcs about the shoulder (azimuth, elevation, reach). After release
  the wrist is smoothly reach-limited.
- **Neutral ends.** Knees and elbows bend in the rig's own rest directions. The clip ends on the
  neutral pose, every bone within 2 mm, head included. It starts from the two-hand ready hold with the
  head neutral. The previous knee pole put the knees 2.5 cm off neutral.
- **Head.** It aims in world space, so it stays level as the trunk leans. Its turn from the chest is
  smoothly capped at 40°, easing in from 30°, because the skinned neck seam tears beyond that. The look
  blends in over the first 0.35 s and out from 3.95 to 4.45 s.

**Tests** (`tests/grenade-throw.test.mjs`, 21):
- **Codex's, kept as written (3):** scale, lengths and IK; deterministic scrubbing; prop semantics.
- **Codex's, edited (3):**
  - palm-to-flight continuity: the loop now runs to the release time, 1.94 s instead of 1.90;
  - gravity, bounce and rest: the floor check starts at the release, and the casing must rest on its side;
  - skinned soles: a hoof standing on its toe must touch the floor too.
- **Codex's, replaced (2):**
  - "each lifted hoof is preceded by weight shift" → the required centre of pressure stays under the
    soles;
  - "both planted hooves fixed through follow-through" → the lead hoof plants at least 0.25 s before
    release and holds, and the rear contact holds while it pivots.
- **New (13):**
  - no touching sole vertex slides, on either hoof, over the whole clip;
  - every accessor rejects non-finite time, and a disposed motion refuses time;
  - phase labels name the key frames;
  - ring and lever: the ring rides rigidly in the free hand, the pin is out before the hips turn 10°,
    the ring lies clear of the hooves, and the lever lands 0.5–3 m out;
  - the ring and lever meshes are drawn exactly where the motion reports them;
  - hips, then chest, then hand: top hand speed at the release, braking within 40 ms after it;
  - no lull in the hand's last 80 ms, and the elbow opens once over the whole stroke;
  - after release the hand only slows, and finishes low, across the body;
  - overhand release on a rising arc;
  - the head turns at most 40° from the chest;
  - while loading, the free arm points along the throw and the rear hoof is turned out;
  - neither arm passes into the torso, measured on the skinned meshes;
  - head neutral at both ends, and the stance neutral at the end.
- **Mutation check:** all 23 mutants killed. They cover:
  - balance: no planner, no anticipatory push, a 10 ms grid, a late plant;
  - the rear pivot: no inner roll, turning while flat, the hoof not turned out;
  - props: the casing not lying down, the ring kept to the turn, the ring mesh left behind, a lever
    without drag;
  - the arm: flat launch, chest before hips, accelerating after release, an elbow double pump, the old
    follow-through timing and path, the old free-hand tuck;
  - the free arm: hanging, or pointing high;
  - the head: no return, no blend-in, no neck cap.

**API changes:**
- **`createGrenadeThrow`:** `createGrenadeThrow(worker, grenade, {releaseArc, launchAngle})` takes
  an optional release arc and launch angle.
- **Returned object:** adds `ring(t)`, `lever(t)`, `palmAt(t)`, `release` and `balance`. `balance`
  holds `cop(t)` (the planned centre of pressure), `centre(t)` (the actual segment centre of mass),
  `residual` and `push`. It keeps `at`, `projectile`, `impacts`, `launch`, `releaseCenter` and
  `dispose`.
- **Time checks:** every time accessor clamps finite times to 0–4.6 s, throws on a non-finite time,
  and throws after `dispose`.
- **`GRENADE_THROW` and `GRENADE_KEYS`:** both are frozen. `GRENADE_THROW` adds `pin`, `drop` and
  `lever`. `release` moves from 1.90 to 1.94 s, and `plant` from 1.52 to 1.60 s.
- **`grenadePalmAt`:** the module-level export is gone. The palm now rides the planned trunk, so it
  exists only per rig, as `motion.palmAt(t)`.
- **`tools/check-grenade-study.mjs`:** reads the timing from the page (`window.grenadeStudy.timing`)
  and escapes the decimal point in its status pattern.

**Corrections after review round 1 (2026-10-08).** Review round 1 of 5 (one hostile subagent)
scored the first version of this section 7/10. It found these claims wrong; each is fixed above:
- **Follow-through.** "Swings down across to the free knee": it never crossed the body, and on the
  way back the forearm passed 5.6 cm into the overalls. It now sweeps 7.5 cm past the centreline in
  front of the lead thigh, and both arms stay out of the torso.
- **Centre of pressure.** "Never outside the hooves" held only on the 20 ms grid. Every 5 ms, it
  left them by 6.3 cm for a moment around 1.95 s. Planning on a 5 ms grid fixed it; the test now
  samples at that density.
- **Free glove.** "Grazes the fuse collar for 0.1 s": it went 1.0 cm into the casing and 1.6 cm into
  the other glove, and the free forearm 7 cm into the chest. Now 0, 0 and 0.4 cm.
- **Field manual.** The FM claim was too broad; it is narrowed above. The "Watch" row was not a phase
  of the motion, nor an FM step.
- **Curves.** "Quintic, so no acceleration steps" was true of positions only; hand orientations are C1.
- **Neutral pose.** "Opens and closes on the neutral pose": the head was pitched 12.5°, and the arms
  start in the ready hold. The head is now neutral at both ends.
- **Small numbers.** The knee-pole error was 2.5 cm, not 1.6. The anticipatory push of "0.18 m" was
  the bump amplitude; the pressure point moves 0.10 m.
- **Tests.** "Kept as written: six of eight": three were kept, three edited, two replaced.
- **Fixed in the motion as well:**
  - The 83° neck limit tore the skinned neck seam at 79°; the limit is now 40°.
  - The elbow pumped twice before release; it now opens once.
  - The release read early, the hand only 2.8 cm ahead of the shoulder; now 13.6 cm.

Review rounds 2–5 have not run yet.

**Still open:**
- **Horse only.** Each species needs its own rest geometry and a balance pass.
- **Local space, flat ground only.**
- **Contact depth.** In the opening hold, the throwing glove rests 0.65 cm into the shirt. While
  hooking the ring, the free glove sits 0.4 cm into the chest. Both are contact, not a pass-through.
- **Fixed effort.** The release speed suits the five-tile study; a gameplay range would scale the effort.
- **Integration.** Codex's integration list below is unchanged.

The section below is the original study's record.

## Review state

2026-10-07 — hostile subagent review **9/10**, approved as a horse motion study.
The previous workshop contained a small grenade model and carry pose, but no
dedicated throw. This branch replaces that prop with a painted **820-triangle,
five-mesh** model and adds a deterministic, scrubbable throwing study.

Open `tactics/grenade-throw-study.html`. The Study menu switches between the
animation, six keyframes, and the model beside the approved inventory drawing.
Side, front, rear, three-quarter and draggable views are available. Gameplay
inspection uses 130 CSS pixels per tile; model and horse dimensions are unchanged.
The weapon workshop also links to the study and uses the replacement grenade.

## Completed

- [x] Separate grenade prop with grip/release anchors and a painted surface.
- [x] Native horse preparation, rear-leg loading, forward step, release,
  follow-through and recovery.
- [x] Lateral pelvis transfer before each hoof lifts; forward hoof planted before
  the throwing stroke. Fixed bone lengths and skinned soles checked throughout.
- [x] Hand contact until release at **1.90 s**. Projectile position, linear
  velocity and spin continue from the held prop without a release teleport.
- [x] Gravity-driven flight, contact with the actual rotating prop surface,
  dissipative bounce, decelerating ground skid, rest within the five-tile target.
- [x] Reverse seeking/restart and resource cleanup; no accumulated simulation.
- [x] Packaged study/modules/texture and import closure; existing workshop,
  carry, stow/draw, fire and roof-mantle equipment regression checks.

## Validation

**223 tests pass**, including eight new throw tests and the related weapon,
horse mesh, equipment stow/draw, fire roster and roof-mantle weapon tests.
`tools/check-grenade-study.mjs` checks **36 browser configurations**, **363 seek
samples**, controls and stable GPU resource counts. No browser errors. The
reviewer independently checked all eleven supported mammal carry rigs and
verified explicit disposal clears tracked GPU geometries/textures.

`npm run build:tactics-3d` succeeds. Review images and browser report are in
`docs/tactics/hybrid-review/grenade-throw/`.

Commands:

```text
node --test tests/grenade-throw.test.mjs tests/weapon-models.test.mjs tests/horse-light.test.mjs tests/roof-mantle-weapons.test.mjs tests/painted-fire-roster.test.mjs tests/equipment-stow.test.mjs tests/equipment-draw.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-grenade-study.mjs
```

The browser checker requires `PLAYWRIGHT_PATH` pointing to an installed
Playwright package and a preview on port 4476 (or a URL argument).

## Integration and next passes

- [ ] Fit the throw to the other animals and outfits, with a separate hen pass.
- [ ] Add gameplay target/range/facing/obstruction handling. This proof aims at
  one flat-ground target; it is not a general projectile collision solver.
- [ ] Connect throw events to inventory/ammunition/AP spending and the existing
  grenade effect. No rules or gameplay attack implementation changed here.
- [ ] Add detonation and damage timing in gameplay; this viewer ends at landing.
- [ ] Optional close-up polish: brighter wear on the lever and the small rear
  sleeve/cuff seam. These were nonblocking at the scoped 9/10 review.

`createGrenadeThrow(worker, grenade)` operates on the horse rig in local +X
space and owns the study's bind-pose/foot-weight adjustments. It exposes `at(t)`,
`projectile(t)`, `impacts`, and `dispose()`. Dispose restores its foot weights;
the caller owns the character, grenade and textures. It does not restore an
arbitrary gameplay pose, choose a route, or handle world collisions.

## Texture provenance and preview lifetime

`dist/assets/equipment/painted-ui/grenade-surface.png` was generated with the
built-in imagegen skill for this task: a flat, tileable olive painted-metal
swatch with angular brushwork, warm ochre highlights and restrained wear.
The existing `grenade.png` drawing remains the visual reference. The skin is
mapped onto casing facets and reused as a desaturated brush layer on metal.

The read-only preview is `node tools/serve-grenade-study.mjs 4476`. It records
its PID/start/expiry and stop receipt under ignored `artifacts/grenade-throw/`,
honors that directory's `STOP` file, and self-stops after 24 hours. The retained
preview is registered with the workspace helper-lifecycle utility. Deliberate
restarts require fresh registration for the new process lifetime. Temporary
review browsers close through their owning Playwright server in `finally`.
