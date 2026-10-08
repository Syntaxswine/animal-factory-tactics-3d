# Idle: standing and looking around

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

**Direction (the boss, 2026-10-08, on the first draft):** "the necks need to bend forward like a heavy
branch if you want the heads to tilt down that far."

The draft tipped the head about its one joint, a stiff rod pivoting on the neck. Looking down jammed the
jaw into the chest: 2.8–5.8 cm into the clothes on most characters. The section on the neck below
answers this.

## The study

Open `tactics/idle-study.html`. It shows the **eleven mammal workers**. The hen has wings, not arms and
hands, and is left out, as in the all-animal motion study.

| control | what it does |
|---|---|
| Character | picks the worker |
| Loop | picks a seed (1–8); each seed is its own loop |
| View | three-quarter, side, front, rear |
| Scale | close-up, surroundings, gameplay |
| Gaze line | shows where the eyes point |
| Speed | playback speed |

The buttons under the timeline jump to where each look lands. Time wraps.

The module is `dist/tactics/idle-motion.js`. The study page is `idle-study.html` / `.js` / `.css`.

## What moves, and why

The idle is authored where a person would author it and computed where physics decides it. Each seed
gives a **seamless 30 s loop**: `at(t)` wraps, and the same seed always replays the same loop.

**Looks.** The eyes go:
- mostly to small scans and back to straight ahead;
- sometimes 46–66° to one side, the sides alternating;
- sometimes to the ground in front.

Rules:
- A scan from far to one side usually drifts back toward the middle.
- A new look always moves at least 6°.
- Fixations last 0.6–3.8 s, depending on the kind of look.
- A gaze shift takes 0.30 s plus 5.5 ms per degree, eased with minimum jerk.
- The loop opens and closes on the same look ahead, held across the seam.

**Head, chest, hips.** The head leads.
- **Split.** The head keeps up to about 30° of a turn (30·tanh(yaw/30)). The trunk takes the rest:
  45% in the chest, up to the twist that character allows (below), and the remainder in the hips, up
  to about 28° on planted hooves.
- **Timing.** By default the chest starts 0.10 s after the head and takes 1.5× as long; the hips start
  0.16 s after and take 1.8× as long.
- **Wide looks.** These cannot wait that long, or the head would stall against the neck's limit
  mid-turn. Each look takes the most relaxed of five trunk timings that keeps the head within 36° of the
  chest.
- **Neck limit.** The skinned neck seam allows 40°, so the head's turn from the chest is capped
  smoothly there.
- **Gaze.** The head aims in world space, so it holds its target while the trunk turns under it.

**The neck bends like a heavy branch.** A branch loaded at its tip curves most at its base and not at all
at the tip.
- **The branch.** The neck is a 17 cm branch from the shoulders to the head joint, with curvature
  κ(s) = κ₀(1 − s/ℓ). So the tangent turns as θ(2u − u²), and a tip tilted by θ moves ℓ·∫sin(θ(2u−u²))du
  out of line. That is 2/3·ℓθ for small angles, and 5.75 cm at 30°.
- **Looking down,** the branch takes the whole tilt, carrying the head joint forward and down so the
  head hangs out over the chest. **Looking up,** it bends back and takes half.
- **Chest.** It rounds forward with the head: 30% of any look below −12°, plus whatever the face cannot
  nod (below), up to 10°. Beyond that, the shirt's waist swings back into the hanging arms, because it
  rides the same spine bone.

**Breathing.** About 14 breaths a minute: breaths of 3.8–4.8 s that add up to the loop. The inhale is
38–45% of each breath, eased both ways. One breath per loop is a sigh, 1.8× as deep. The chest extends
1.8° per unit of breath; the head stays on its target.

**Weight shifts.** The weight moves from both hooves onto one and holds for 6–11 s. Then it moves back
(held 4–8 s on both hooves) or across. Each shift takes 1.2–1.7 s.

For a stance this wide (46 cm between the hooves):
- The pressure point moves 4.5 cm toward the bearing hoof, and the hips follow it.
- The hips hike: the pelvis rolls 4.5°, bearing hip up, so the bearing leg stands straight (its knee
  stays at its rest bend) instead of buckling.
- The free leg, its hoof planted wide, reaches out as a prop.
- The chest bends 3° back on the pelvis, which keeps the shoulders nearly level.

**Balance is computed, not keyed,** as in the throw.
- **Pendulum.** The centre of mass rides a linear inverted pendulum over the pressure plan: the weight
  shifts plus a few millimetres of postural sway. The plan folds in the angular momentum of the arms,
  head and trunk.
- **Loop.** It is solved round the loop as one cyclic system, so there is no start or end to hold.
- **Pelvis.** It is then shifted until the real segment centre of mass follows: 4 passes, 0.33 mm
  residual.

**Arms.** They hang from the shoulders like damped pendulums.
- **Heading.** They follow the hips plus half the chest's twist, a beat behind (2 Hz). Arms that hang
  close to a thick coat or belly follow stiffly (5 Hz) and cannot swing behind the trunk.
- **Weight shifts.** Each arm swings out a little: 5° on the free side past the dropping hip, 8° on the
  bearing side past the coat that rides up on the rising hip. The ramp is max(0, x) with its corner
  rounded, so the arm never snaps as the weight crosses over.

**Feet.** Both hooves stay planted, and the hoof bones never move. On every character, each floor vertex
is skinned entirely to its hoof (or boot, or foot) bone, so the soles cannot slip.

## Fitted to each character

When the motion is built, three limits are measured on the character's own skinned meshes. The test is a
face, forearm or glove triangle crossing a torso triangle. Torso triangles have every corner weighted over
half to the spine and hips. Sleeves ride the arms and do not count.

- **Nod limit.** How far the face (head-weighted, 8 cm or more in front of the head joint) can tip down,
  with the neck bent as in the motion and turned up to 24° either way. A face that cannot nod far
  glances less deep.
- **Twist limit.** How far the chest can twist on the hips each way, the arms hanging as in the motion,
  before a hand meets the body.
- **Arm clearance.** Some coats sit over the hanging arms in the rig's own rest pose. Such an arm is held
  out by the least whole-degree angle that clears it, plus 2°.

The nod and twist limits keep 5° in hand for the idle's other motions (a lean or a tilt the probe does
not make). Values for seed 1, with the time to build the motion:

| character | nod limit | twist left / right | arms held out right / left | build |
|---|---|---|---|---|
| Horse worker | 45° | 30° / 30° | 0° / 0° | 474 ms |
| Goat worker | 30° | 30° / 30° | 0° / 0° | 409 ms |
| Bull worker | 45° | 30° / 30° | 0° / 0° | 360 ms |
| Cow worker | 45° | 30° / 30° | 0° / 0° | 377 ms |
| Donkey worker | 45° | 30° / 30° | 10° / 9° | 382 ms |
| Sheep worker | 45° | 10° / 5° | 9° / 9° | 405 ms |
| Skunk worker | 45° | 30° / 30° | 0° / 0° | 370 ms |
| Pig foreman | 30° | 15° / 30° | 12° / 12° | 518 ms |
| Pig director | 15° | 20° / 30° | 0° / 0° | 308 ms |
| Rabbit worker | 45° | 30° / 30° | 0° / 0° | 352 ms |
| Dog guard | 45° | 0° / 20° | 0° / 0° | 354 ms |

**The rest poses of three costumes put arms through their own clothes.** Counting forearm and glove
triangles crossing the torso in the neutral pose:

| character | crossings at rest | in the idle |
|---|---|---|
| Donkey | 16 | 0 |
| Sheep | 54 | 0 |
| Pig foreman | 106 | 0 |

The idle holds those arms clear. The neutral pose itself is unchanged.

## Measured

- **Cloth.** On every one of the 11 characters, over 8 seeds every 0.1 s, no face, forearm or glove
  triangle crosses the clothes.
- **Audit.** `phantom-wrench` (inverse dynamics with friction pyramids, same 74.9 kg body as the throw
  rig) reads the phantom force through every look phase as 0 N, at friction 0.9. The gate passes for
  every character on seed 1. The rig is `rigs/idle.mjs` in `Syntaxswine/phantom-wrench`, with
  `ID_SPECIES` and `ID_SEED`.
- **Pressure point.** With independent Dempster segment masses, sampled every 20 ms, the required centre
  of pressure stays more than 3 cm inside the soles.
- **Smoothness.** On the horse (seeds 1–3), no bone accelerates faster than 2.9 m/s² anywhere in the
  loop. The audit's first run
  found two kinks (below); a kink reads as tens of m/s².
- **Neck.** On the horse (seeds 1–8), the head turns at most 36.4° from the chest; the cap is at 40°.
- **Gaze.** It lands within 3° of each planned look.
- **Order.** On wide looks the head peaks first, then the chest, then the hips.
- **Reach.** Leg reach keeps at least 4.7 mm in hand on every character.

**Tests** (`tests/idle-motion.test.mjs`, 16):
- scale, bone lengths and legal IK over the whole loop, for twelve seeds;
- hooves planted: no floor vertex moves;
- the required centre of pressure stays well inside the soles;
- the loop closes without a seam, in pose, velocity and acceleration, and time wraps;
- nothing snaps: no bone accelerates faster than 5 m/s²;
- the same seed replays exactly, and other seeds differ;
- the head stays within 40° of the chest;
- the eyes land on each look;
- on wide looks the head leads, the chest follows, the hips come last;
- looking down, the neck bends like a branch: the head joint is carried more than 3 cm forward;
- weight onto one hoof: the hips over it and hiked, the bearing knee at its rest bend, the free leg
  straighter;
- breathing rate, inhale shorter than exhale, one sigh;
- looks vary: fixation times spread, both sides visited, no re-fixation under 6°;
- no face or arm through the clothes on the horse, seeds 1–3;
- every mammal: planted feet, neck within 40°, face and arms out of their clothes;
- time validation, dispose, option checks.

**Browser** (`tools/check-idle-study.mjs`, preview on port 4486):
- 35 configurations and 866 seeks, with no errors;
- GPU resources stable across repeated seeking;
- the look buttons work.

Review images are in `docs/tactics/hybrid-review/idle/`:
- `close-three`, `gameplay`, `surroundings`;
- `looks-horse` (every look of seed 1);
- `glance-down-profile` (six faces before and after a glance down);
- `cast` (all eleven on one look);
- `compact`.

## What was tried and dropped

- **A nearest-vertex depth measure for skin in cloth.** It failed three ways:
  - neck skin inside a collar flips sign when the nearest collar vertex changes;
  - beside a garment's hem the normal points along the cloth and calls open air "inside";
  - an arm can pierce a big jacket triangle with no torso vertex near it.

  Triangle crossings replaced it, in the fits and in the tests.
- **A strong S-curve** (chest bent 5.5° against a 3.5° pelvis roll). It pushed the sheep's shirt through
  its vest. Now 3°, with the shoulders nearly level.
- **Arms hanging with the pelvis's tilt.** That swung the free hand into the jutting free hip. Now they
  hang plumb and swing out instead.
- **A sinking, buckling weight shift.** The pelvis sank 1 cm with a 2.5° roll, and the bearing knee bent
  from 21° to 30°: weight onto a leg made it give way. Now the hips hike, as above.
- **abs() and max() of the weight in the posture.** The audit found two velocity snaps where the weight
  crossed zero, a 0.28 m/s hand snap and a 1.5 cm/s jump in the centre of mass. Now w² and a rounded
  ramp. The no-snap test guards it.

## API

`createIdle(worker, {seed = 1, length = 30})` returns:
- `at(t)`: poses the rig, and returns the phase (look label), look, stance, weight, breath, feet, hips
  and chest;
- `gaze(t)`: eye, direction, target point and the planned look;
- `schedule`: `{looks, stances, breaths}`;
- `balance`: `{residual, cop(t), centre(t)}`;
- `fitted`: `{nod, twist, armsOut}`;
- `length`, `seed` and `dispose()`.

Every time accessor wraps finite times, throws on a non-finite one, and throws after `dispose`. `IDLE` is
frozen: `{length, gravity, neck}`. `lookLabel` names a look.

The motion works in local +X space on any of the eleven mammal rigs. Like the throw, it owns the pose
while it runs; `dispose` returns the rig to its neutral pose.

## Still open

- **Integration.** Units in `battle-3d` do not idle yet. A transition is needed to and from other
  motions. The throw starts in a two-hand hold and ends neutral; three characters' idle arms are held out
  a few degrees.
- **Targets.** Looks are random directions. The game would supply real ones: a sound, a teammate, a
  threat.
- **No eyes or ears to animate.** The heads have no eye or ear bones, so all looking is done by turning.
- **Build cost.** 0.3–0.5 s per character and seed. A game would cache a few loops and offset their
  start times.
- **Review rounds** have not run yet.
