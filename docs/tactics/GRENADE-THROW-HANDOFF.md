# Hand grenade throwing study

## Current roster revision (2026-10-08)

Claude's approved `fc1573e` horse baseline now extends to all **12 animals and
25 outfits**, with a separate feather-cup toss for the hen. The hostile subagent
review passed at **9/10**. Native dimensions, the side-on loading action,
hip/chest/hand sequence, planted lead foot, rear-foot pivot, loose parts and
relaxed recovery are preserved.

See [the roster handoff and validation](GRENADE-ROSTER-HANDOFF.md) for the
species fits, remaining polish, checks and integration boundary. The sections
below retain the history of the two horse-only studies; their measurements
refer to those revisions rather than the current roster implementation.

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

**The throw now follows FM 3-23.30 (2009), §3-14 to 3-24.** The free hand pulls the pin. The
thrower stands side-on with the grenade shoulder high and the free hand pointing at the target, throws
overhand so the grenade arcs, and lets the arm follow through.

| time (s) | phase | what moves |
|---|---|---|
| 0–0.30 | Ready | grenade palm-down at the chest, ring lying on top of the fist |
| 0.30–0.70 | Pull pin | free index finger hooks the ring, twists it toward the body, pulls it along the pin, drops it |
| 0.70–1.24 | Turn & load | rear hoof drop-steps behind and turns out 77°; hips and shoulders close to side-on; grenade drawn up behind the ear; free arm points along the throwing line |
| 1.24–1.60 | Stride | lead hoof steps toward the target and plants |
| 1.60–1.92 | Throw | hips open first (peak 3.7 rad/s at 1.79 s), then the chest (5.6 rad/s at 1.86 s), then the forearm whips over the throwing shoulder |
| 1.92 | Release | hand at its top speed (5.5 m/s); elbow still bent 68°; launch 5.5 m/s at 30° |
| 1.92–2.12 | Follow through | arm decelerates hard (to half speed within 80 ms) and swings down across to the free knee; trunk bends over the lead leg; rear heel lifts, hoof rolls onto its inner corner and pivots on it |
| 2.10–3.85 | Recover | rear hoof steps forward, lead hoof steps back, body returns exactly to the neutral stance |
| 3.85–4.60 | Watch | eyes follow the grenade, lead to the landing spot before it hits, then return |

Where the loose parts end up:
- **Casing:** lands short of the tile centre, bounces twice and rolls onto its side, resting 0.11 m
  past the centre.
- **Pull ring:** falls clear of both hooves.
- **Safety lever:** flips off 25 ms after release and lands 1.9 m out.

**Balance is computed, not keyed.** The pelvis's horizontal path comes from a linear inverted
pendulum running over a centre-of-pressure plan:
- The plan walks hoof to hoof.
- It includes the anticipatory push toward the stepping hoof that real gait initiation shows (0.18 m).
- It folds in the arms' and trunk's angular momentum.

The pendulum is solved as a boundary-value problem, so the body starts and ends at rest. The pelvis
is then shifted until the real segment centre of mass follows the path: 4 passes, 0.8 mm residual,
about 170 ms when the motion is created.

Measured with `phantom-wrench` (inverse dynamics with friction pyramids at the actual contacts; the
rig is `rigs/grenade-throw.mjs` in `Syntaxswine/phantom-wrench`) and with the new balance test:

| | `44b956b` | this revision |
|---|---|---|
| peak phantom force | 1669 N (227% body weight), Load rear leg | 41 N (6%), Turn & load |
| audit gate (≤10% BW phantom; no impulses; no overlap > 2 cm; speeds; joint ranges) | FAIL: 0.92 s over, forearm 7.8 cm inside the trunk | PASS |
| required centre of pressure outside the hooves (Dempster masses, 20 ms) | up to 236 cm; 58 samples over 5 cm | never (worst sample 0.2 cm inside) |

Other mechanics:
- Curves are quintic Hermite (C2). A cubic's acceleration steps at every key, which reads as a jolt
  of force.
- Two-bone limbs carry twist: the bend plane maps onto the rest bend plane. There is no candy-wrapper
  at the hip or elbow when the trunk turns 85°.
- The throwing palm moves on arcs about the shoulder (azimuth, elevation, reach). After release the
  wrist is smoothly reach-limited.
- Knees and elbows bend in the rig's own rest directions, so the clip opens and closes on the neutral
  pose. The previous version's knee pole put the knees about 1.6 cm off it.
- The head aims in world space, so it stays level as the trunk leans, with a smooth 83° neck limit.

**Tests** (`tests/grenade-throw.test.mjs`, 12):
- **Kept as written (six of Codex's eight):**
  - scale, lengths and IK;
  - palm-to-flight continuity (the loop bound is now the release time; the casing must also rest on its side);
  - gravity, bounce and rest;
  - skinned soles on the floor;
  - deterministic scrubbing;
  - prop semantics.
- **Replaced with physical versions:**
  - "each lifted hoof is preceded by weight shift" → the required centre of pressure lies under the soles;
  - "both planted hooves fixed through follow-through" → the lead hoof stays fixed, and the rear
    contact stays fixed while it pivots.
- **New:**
  - ring and lever;
  - hips, then chest, then hand, with the top hand speed at release;
  - overhand release on a rising arc;
  - end in the neutral stance after starting from rest.
- **Mutation check:** 8 of 8 mutants killed:
  - no planner;
  - no anticipatory push;
  - pivot without the inner roll;
  - casing not lying down;
  - flat launch;
  - chest before hips;
  - ring kept to the turn;
  - arm accelerating after release.

**API changes:**
- **`createGrenadeThrow`:** `createGrenadeThrow(worker, grenade, {releaseArc})` takes an optional
  release arc.
- **Returned object:** adds `ring(t)`, `lever(t)`, `palmAt(t)`, `balance` and `release`. It keeps
  `at`, `projectile`, `impacts`, `launch`, `releaseCenter` and `dispose`.
- **`GRENADE_THROW`:** adds `pin`, `drop` and `lever`. `release` moves from 1.90 to 1.92 s, and
  `plant` from 1.52 to 1.60 s.
- **`grenadePalmAt`:** the module-level export is gone. The palm now rides the planned trunk, so it
  exists only per rig, as `motion.palmAt(t)`.
- **`tools/check-grenade-study.mjs`:** reads the timing from the page (`window.grenadeStudy.timing`).

**Still open:**
- **Horse only.** Each species needs its own rest geometry and a balance pass.
- **Local space, flat ground only.**
- **Glove contact.** The free glove grazes the fuse collar for about 0.1 s while hooking the ring.
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

- [x] Fit the throw to the other animals and outfits, with a separate hen pass
  (2026-10-08; see the roster handoff above).
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
