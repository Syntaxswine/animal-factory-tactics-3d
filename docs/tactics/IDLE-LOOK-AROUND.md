# Idle: standing and looking around

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

**Direction (the boss, 2026-10-08, on the first draft):** "the necks need to bend forward like a heavy
branch if you want the heads to tilt down that far."

The draft tipped the head about its one joint, a stiff rod pivoting on the neck. Looking down jammed the
jaw into the chest: 2.8–5.8 cm into the clothes on most characters. The section on the neck below
answers this: the idle now gives the rigs a neck bone and bends it.

This is the third version (v3). Review round 1 of 5 scored the first 5/10 and round 2 the second 6.5/10;
what each found and what changed are in their own sections near the end.

## The study

Open `tactics/idle-study.html`. It shows the **eleven mammal workers**. The hen has wings, not arms and
hands, and is left out, as in the all-animal motion study.

| control | what it does |
|---|---|
| Character | picks the worker |
| Loop | picks a seed (1–8); each seed is its own loop |
| View | three-quarter, side, front, rear |
| Scale | close-up, surroundings, gameplay |
| Gaze line | shows where the eyes point, from the character's own eyes |
| Speed | playback speed |

The buttons under the timeline jump to where each look lands. Time wraps. `window.idleStudy.set({...})`
takes any of the controls by name (a character is loaded, a seed rebuilt) and refuses an unknown control
or value, and a gaze line that is not `true` or `false`. A character loads in about 0.15–0.2 s: its
fitted limits ship with the module (below).

The module is `dist/tactics/idle-motion.js`, the fitted limits `dist/tactics/idle-fits.js`, and the study
page `idle-study.html` / `.js` / `.css`.

## What moves, and why

The idle is authored where a person would author it and computed where physics decides it. Each seed
gives a **seamless loop** (30 s by default): `at(t)` wraps, and the same seed always replays the same loop.

**Looks.** A relaxed worker mostly rests the eyes ahead, and the rigs have no eye bones, so every change of
gaze is a turn of the head; the plan keeps those few.
- **Kinds.** Rests ahead of 4–9 s, now and then 9–13 s; drifts of 6–12° held 2–4.5 s; looks 28–50° to
  one side (or as far as the character can turn) held 1.5–3.5 s; glances at the ground in front, held
  1–2.2 s. A side look picks its side at random, leaning toward the side not looked at last. After a
  glance down the gaze rests ahead (70%) or drifts back up 6–10°, never below 10° under level.
- **A loop looks aside and down at least once**: a draft without both is drawn again, up to 12 times.
- **Every shift moves at least 6°**, the return to the opening look included, or a third of what the
  character's gaze can span where that is less (a head its clothes hold: the pig director's 3.5°). The
  loop opens and closes on the same look ahead, held across the seam.
- **Shifts** take 0.30 s plus 5.5 ms per degree, eased with minimum jerk.
- **Measured** over 5000 seeds (the horse's reach): a median of 12 gaze shifts a minute (5th–95th
  percentile 8–16); the head is shifting 9% of the time; the longest stillness in a loop has a median of
  9.5 s; 34% of consecutive side looks repeat a side; 26% of side looks tilt the head; 4 loops in 5000
  have no side look and 10 no glance down (the redraws give up after 12). The gaze is below 12° down for
  at most 2.75 s at a stretch, a median of 7% of a loop (95th percentile 14%, at most 24%: three glances).

**Head, chest, hips.** The head leads.
- **Split.** The head keeps up to about 34° of a turn (34·tanh(yaw/34), or less where the character's
  clothes allow less, below). The trunk takes the rest: half in the chest, up to 12° or what the character
  allows, and the remainder in the hips, up to about 10° (10·tanh), turning at the hip joints; the knees
  follow 15% of the hips' turn, so they stay over the hooves.
- **Timing.** By default the chest starts 0.10 s after the head and takes 1.5× as long; the hips start
  0.16 s after and take 1.8× as long. A wide look takes the most relaxed of five trunk timings that keeps
  the head within 36° of the chest, or within a degree of its fitted turn.
- **Neck limit.** The skinned neck seam allows 40°, so the head's turn from the chest is capped smoothly
  there.
- **Reach.** Each character only plans looks it can make: the head within 35° of the chest (or its
  fitted turn, with half a degree for the hips' eased turn), down by its fitted nod and its chest's fitted
  rounding, up by its fitted look up, and tilted no more than its fitted tilt. One that cannot turn its
  head 14° either way drifts instead of looking aside; one that cannot look 8° down drifts instead of
  glancing at the ground; and every pitch the plan draws stays within its reach.
- **Tilt.** A quarter of the side looks tilt the head 1.5–4° into the turn, the crown toward the side
  looked to.
- **Gaze.** The head aims in world space, so it holds its target while the trunk turns under it.

**The neck bends like a heavy branch.** A branch loaded at its tip curves most at its base and not at all
at the tip.
- **A neck bone.** The rigs have none: their neck skin blends straight from the chest bone to the head
  bone, so a bending neck could only shear. While the idle runs it adds one, `idle neck`, a child of the
  chest bone at the branch's base, binds every part to a skeleton that includes it, and weights the neck
  skin and the cloth round it along it (the clothes, below); `dispose()` removes it and rebinds the rig's
  own skeleton and weights. The game's walk adds tail bones the same way.
- **The branch.** The neck is a branch from the shoulders to the head joint, three quarters of the rig's
  spine-to-head span (16.8 cm on most rigs, 20.9 cm on the pig foreman), with curvature
  κ(s) = κ₀(1 − s/ℓ). So the tangent turns as θ(2u − u²), and a tip tilted by θ moves ℓ·∫sin(θ(2u−u²))du
  out of line: 2/3·ℓθ for small angles, 5.67 cm at 30° on a 16.8 cm neck. The neck bone turns by the
  chord of that bend, so its tip, the head joint, lands on the branch's tip; the head on it takes the rest
  of its nod and all of its turn and tilt.
- **The bend** is square to the neck's own axis (which leans back 10° on these rigs), toward where the
  face points.
- **Looking down,** the branch takes the whole tilt, carrying the head joint forward so the head hangs
  out over the chest. **Looking up,** it bends back and takes half. The share eases through level
  (−pitch·(0.75 − 0.25·tanh(pitch/2°))), so the head joint has no kink where the pitch crosses zero.
- **Chest.** It rounds forward with the head: 30% of any look below −12°, or as much as the face cannot
  nod, whichever is more, up to the character's fitted rounding (10° on eight of them).

**Breathing.** About 14 breaths a minute: breaths whose lengths add up to the loop, 3.5–5.1 s over 5000
seeds. The inhale is 38–45% of each breath, eased both ways; one breath per loop is a sigh, 2.8× as deep,
with a 32% inhale and a long exhale.
- **The shoulders shrug** 5 mm per unit of breath at the arm roots (14 mm in the sigh), times the
  character's fitted shrug, and the chest opens half a degree per unit.
- **Measured** (shoulders against the hips, 8 seeds): 2.5–6.4 mm on a breath and 11.8–15.7 mm on the sigh
  for the eight characters that shrug in full; 0.4–1.8 and 3.0–3.1 mm for the two pigs (a quarter); the
  sheep's shoulders do not rise (its forearms rest in its waistcoat, below).

**Leaning toward one hoof.** The weight moves from both hooves toward one and holds 6–11 s, then moves
back (held 4–8 s) or across; each shift takes 1.2–1.7 s. Most loops lean once or twice; the square stance
is mostly the one across the seam (5000 seeds: 42 loops hold square inside the loop). The lean is the
character's fitted share of a full lean: full on eight, half on the sheep, a quarter on the two pigs.
- **The pressure point** moves 4.5 cm times that share toward the hoof (less on a narrow stance, so it
  stays 4.5 cm inside the soles; every rig here has the room). On the horse's 46 cm stance the nearer hoof
  then carries 55–65% of the weight: a lean, not a stand on one leg. Both hooves stay planted flat, so a
  real weight shift onto one leg (70–80%) would need the feet closer or a heel lifted.
- **The hips** follow it 5.9–6.8 cm toward that hoof at a full lean (the sheep 2.6–3.3 cm, the pigs
  1.2–2.1 cm) and hike: the pelvis rolls 4.5° (times the share), that hip up. The nearer knee holds its rest
  bend (21.0–22.8° against 21.3° at rest; the pig foreman 28.9–30.1° against 30.1°); the far leg, its hoof
  planted wide, straightens a little as a prop (16.8–20.2°).
- **The chest** bends back 6° (times the share) on the pelvis, so the shoulders counter-tilt the other way.

**Balance is computed, not keyed,** as in the throw.
- **Where it rests.** The pressure point rests under the rest pose's centre of mass, unless that is within
  4 cm of an edge of the soles; then it moves toward the middle of the soles until it is 4 cm clear, or as
  clear as the soles allow. The rabbit and the dog stand on short digitigrade feet, and theirs moves 2.8
  and 2.5 cm forward; the dog's sole is 7.9 cm long and can be at most 3.9 cm clear.
- **Pendulum.** The centre of mass rides a linear inverted pendulum over the pressure plan: the leans plus
  a few millimetres of postural sway. The plan folds in the angular momentum of the arms, head and trunk.
- **Loop.** It is solved round the loop as one cyclic system on a grid that divides the loop exactly, so
  there is no start or end to hold. The pelvis is then shifted until the real segment centre of mass
  follows: 4 passes, at most 0.36 mm residual.
- **Reach.** Built in: if a leg would stretch past 99.5% of its length anywhere in the loop, the lean is
  made gentler. Measured, the legs reach at most 99.14% (96.97% on the pig foreman).

**Arms.** They hang from the shoulders.
- **Heading.** They follow the hips plus half the chest's twist, a beat behind (a 2 Hz second-order lag;
  5 Hz where the chest cannot twist 10° either way: the sheep and the two pigs).
- **Swing.** An arm keeps its rest hang, swinging out only where its character's clothes need it (fitted,
  below); on these rigs none does.
- **Easing.** The elbows bend 1.5° past their rest bend on average and ease ±2° over the loop (32.1–35.4°
  against 32.2° at rest); the hands hang on from the forearms, the wrists easing up to 7°, and the fingers
  curl a little. All of it times the character's fitted ease: full on eight, a quarter on the two pigs,
  none on the sheep.

**Feet.** Both hooves stay planted, and the hoof bones never move. Each floor vertex is skinned entirely to
its hoof (or boot, or foot) bone, so the soles cannot slip.

## The clothes

Two corrections run while the idle does, and `dispose()` restores the rig's own weights.

- **The waist blend.** The rigs' own weights cut the torso cloth hard between the spine and the hips, so a
  few degrees of chest on pelvis tore a belt or a jacket hem open. The shirt, waistcoat or jacket, any belt
  or pouches, and the trousers or overalls take the smooth waist blend of the game's walk and aim motions
  (`animal-motion.js`): one blend from 8 to 24 cm above the hips, shared by every layer, each vertex
  keeping its own sleeve weights. Trousers more than 10–18 cm in front of the hip joints are round a belly,
  not a leg, and stay with the hips. The trouser legs take the blend down to the knee and keep the rig's
  own weights below it, so the cuffs ride the hooves.
- **The neck in rings.** The neck skin and the cloth round it are weighted along the neck bone by height
  above the branch's base (u, in branch lengths): of the weight not on the head, the neck bone takes
  smooth((u + 0.15)/0.6), so the neck bends most at its base. Everything round the neck takes the ring at
  its height, the neck skin and every layer of cloth on it alike (a collar, a neckerchief with its knot and
  ends, the tops of a shirt, waistcoat, bib or braces), in full within 3 cm of the neck's median radius and
  easing to its own weights 13 cm out: one smooth field for every part, so the layers on the neck and the
  shoulders move as one instead of folding through each other. The neck skin keeps the head weight the rig
  gave it, and cloth takes none, so the head's own turn and nod do not drag the layers against each other;
  the head itself (vertices the rig gives wholly to it) is left alone. A mane, which nothing lies on, takes
  in full the weights of the skin it grows from, at the nearest point of the skull's surface.

## Fitted to each character

Each character's limits are measured on its own skinned meshes, by two tests on every part of the rig:

- **Crossings, everything against everything.** Skin through cloth, cloth through cloth and a part through
  itself all count: two triangles cross where an edge of either passes through the other (triangles that
  share a corner aside; two held rigidly by one bone cannot cross anew and are not tested). Both lists sit
  in 4 cm cells by their bounds, so a pair that crosses always shares a cell.
- **New.** The rest pose already has crossings (neck skin under a collar, an arm a coat sits over), and
  moving slides them along: a crossing within two triangles, on both sides, of one in the rest pose is that
  crossing slid along, not a new one.
- **Deep.** A crossing goes as deep as the shallower of the two triangles pokes through the other's plane
  (the lesser of their overlaps along each one's normal), so two that meet nearly flat, a coarse band on the
  skin it wraps, read the sliver they cross in, not their size. More than 3 mm fails: a pixel at the study's
  close-up scale (280–400 px a metre as the window allows; the game draws at 130).
- **Covered skin.** Every garment here is a closed solid. A vertex of a forearm, a hand or the head (by the
  rig's own weights, over half) that shows in the rest pose may not go more than 3 mm into any garment.
  Its depth in one is its distance from that garment's nearest point, inside where it lies behind that
  point by the angle-weighted pseudo-normal (Bærentzen and Aanæs; exact for a closed surface). Each garment
  is first wound consistently, triangle by triangle across its edges and turned outward: a few welded-on
  parts are wound against their neighbours (298 edges of the pig foreman's trousers, belt and braces). Skin already
  inside the cloth at rest is hidden there, however deep it goes; any sinking shows where the skin beside
  it, which showed, goes under.

**The probes**, in order:
- **Tilt:** the head tilting each way, up to the 5° a side look tilts it.
- **Turn:** the head yawing on the chest each way, level or tilted that far either way, up to the 40° seam.
- **Nod:** with the neck bent as in the motion, straight, turned as far as 24° either way (or its turn), or
  tilted either way. **Look up:** the same ways, up to 10° (the back of the skull drops toward a collar).
- **Chest twist:** each way on the hips, the arms hanging as in the motion.
- The head and the chest keep the largest passing angle in 5° steps, less 5° in hand for the idle's other
  motions; each probe runs 5° past its top so the margin holds there too.
- **The arms and the trunk,** each the most (in quarters) that clears with those fitted before it:
  **weight shift**, the share of a full lean toward each hoof (the hips carried about 7 cm over and hiked),
  with the arms still; **ease**, the share of the arms' easing, standing square and leaning that far; **shrug**,
  the share of the shoulders' rise, a sigh standing and an ordinary breath leaning; and **rounding**, how far
  the chest rounds (2.5° steps up to 10°), standing and leaning. Each of these probes poses the arms at
  every extreme their easing reaches over a loop (the elbow 3.5° past its rest bend or half a degree short
  of it; the wrist 9° and the fingers 8°, one way and then the other) and keeps a millimetre in hand. An
  arm that crosses the clothes in a lean or a rounded chest swings out as little as clears them, in half
  degrees, plus 1° for its heading's lag; where no swing up to 4° clears, the share is smaller.

**The table.** The fits depend only on the rig, not the seed. They take 10–25 s a character, so the eleven
ship in `idle-fits.js`, keyed by `rigKey(worker)`: a hash of the rig's bone rest places and its parts'
names, sizes and vertex sums, so an edited rig misses the table and is fitted afresh.
`node tools/fit-idle-rigs.mjs` writes the table (about three minutes); `createIdle(worker, {refit: true})`
fits afresh; `tests/idle-fits.test.mjs` checks that every mammal has its row and refits three of them
(all eleven with `IDLE_FITS_ALL=1`).

| character | turn L / R | nod | up | tilt | twist L / R | weight shift | ease | shrug | rounding | reach L / R / down |
|---|---|---|---|---|---|---|---|---|---|---|
| Horse worker | 40° / 40° | 20° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 30° |
| Goat worker | 40° / 40° | 35° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 45° |
| Bull worker | 40° / 40° | 35° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 45° |
| Cow worker | 40° / 40° | 15° | 0° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 25° |
| Donkey worker | 40° / 40° | 25° | 10° | 5° | 25° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 35° |
| Sheep worker | 10° / 10° | 0° | 0° | 0° | 0° / 0° | ½ | 0 | 0 | 0° | 17° / 17° / 0° |
| Skunk worker | 40° / 40° | 30° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 40° |
| Pig foreman | 40° / 40° | 15° | 10° | 5° | 0° / 0° | ¼ | ¼ | ¼ | 0° | 45° / 45° / 15° |
| Pig director | 5° / 0° | 0° | 0° | 0° | 0° / 0° | ¼ | ¼ | ¼ | 2.5° | 11° / 6° / 2.5° |
| Rabbit worker | 40° / 40° | 15° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 25° |
| Dog guard | 40° / 40° | 25° | 10° | 5° | 25° / 10° | 1 | 1 | 1 | 2.5° | 53° / 52° / 28° |

No arm swings out on any of them.

**Held by their clothes.** Three characters' clothes hold them at rest, and the fits keep them still where
moving would push skin under cloth or cloth through cloth:
- **The sheep.** Its neckerchief sits tight on its wool, high on the neck: a turn of 20° slides the wool
  through it, and looking up 10° drops the back of its head 1 cm into it, so it turns its head 10°, no
  more, and does not nod, look up or tilt. Its forearms rest in its waistcoat, so they do not ease, its
  shoulders do not rise, and it leans half as far. It looks 9–15° each way, drifts, and does not look
  down.
- **The pig director.** His jowls rest on his collar, so his head turns 5° left and none right, and does not
  nod or look up. His forearms rest
  in his coat. His gaze drifts 3.5–12°.
- **The pig foreman.** His head moves freely, but his forearms rest in his waistband: a quarter of the ease, the shrug and the lean, and no rounding of the
  chest.

Freeing them needs the clothes, not the motion (Still open).

## Measured

Everything below is v3 at the commit that carries this document. "All eleven" means the eleven mammal
workers.

| check | scope | result |
|---|---|---|
| new crossings and covered skin, by a census written apart from the module (its own skinning, broad phase, and inside test by ray parity) | all eleven, seeds 1–2, every 1 s; every one on its own seed every 2 s and at its widest look, deepest nod, highest look, the chest's three widest turns, its fullest leans and deepest rounding (the test) | none |
| each fitted head limit, and 5° past it, by the census | all eleven (the test) | none |
| required centre of pressure (Dempster masses, independent of the motion's model; soles within 3 mm of the floor) | all eleven, seeds 1–2, every 20 ms | at least 3.0 cm inside the soles (rabbit, dog); the other nine 5.3–8.7 cm |
| phantom-wrench (`rigs/idle.mjs`, exact contact, gate 0.5% body weight / 2 N·m) | all eleven, seed 1; the rabbit and the dog, seed 2 | 0 N, gate passes |
| its negative control: centre of mass behind the heels | horse, rabbit, dog, pig foreman, seed 1 | 1 cm: over the gate 16–19 s of the 30; 0.5 cm: 4.9–6.3 s; fails |
| head turn from the chest | all eleven, seeds 1–8 | at most 35.5° (the sheep 11.0°, the pig director 5.9°; the timing aims for 36°; cap 40°) |
| head tilt on the chest | all eleven, seeds 1–8 | at most 3.8° |
| gaze on each landed look | all eleven, seeds 1–8 | within 2.4° |
| hips' turn | all eleven, seeds 1–8 | at most 8.5° |
| knee twist off its hoof | all eleven, seeds 1–8 | at most 1.5° |
| arm out from its rest hang, in the chest's frame | all eleven, seeds 1–8 | at most 4.4° |
| wrist | all eleven, seeds 1–8 | at most 7.1° (the pigs 1.8°, the sheep 0°) |
| peak bone acceleration (2.5 ms tiles) | all eleven, seed 1 | 0.76–1.55 m/s² (a kink reads as tens) |
| leg reach | all eleven, seeds 1–8 | at most 99.14% of the leg |
| builds | all eleven, seeds 1–16 and loops of 12, 12.37, 47.3 and 120 s | no failures; balance residual at most 0.36 mm; seam velocity jump at most 0.04 mm/s |

**Tests**: three files, about five minutes on parallel workers.
- `tests/idle-motion.test.mjs` (21):
  - scale, bone lengths and legal IK over the whole loop, on all eleven and twelve horse seeds; the
    shoulders' shrug is the only joint that moves, up the chest, under 15 mm;
  - hooves planted: no floor vertex moves, on all eleven;
  - the required centre of pressure stays 2.5 cm inside the soles and follows the plan within 6 mm, on all
    eleven, seeds 1–2;
  - the loop closes without a seam, in pose, velocity and acceleration, on a 1 ms stencil, on all eleven and
    at 17.77 and 30.01 s; time wraps;
  - nothing snaps: no bone accelerates faster than 5 m/s², second differences tiled 1.25 ms apart;
  - the same seed replays exactly; other seeds differ;
  - the head stays within 37° of the chest and tilts at most 5°, into the turn, on all eleven;
  - the eyes land on each look, on all eleven, seeds 1–4, and reach a wide look within 4° just after the
    shift;
  - on wide looks the head leads, the chest follows, the hips come last; the hips stay within 10.5° and the
    knees within 4° of their hooves;
  - the arms keep their rest hang within 1.5° on the horse and within the fitted swing and 2° on all eleven;
    the elbows ease more than 1°, within 5° of rest; the wrists within 8°; the arms' heading follows the
    trunk's more than 30 ms behind;
  - the arms follow at 5 Hz on the rigs whose chest twists less than 10°, at 2 Hz on the rest, and sooner
    at 5;
  - looking down, the head joint is carried more than 3 cm forward and the chest rounds; the chest never
    rounds further than its fitted rounding, on all eleven over four seeds each;
  - the neck: the neck bone at the branch's base and the head joint at its tip, bent by the branch's chord
    toward the face, restated apart from the module and posed on all eleven;
  - leaning: the hips move toward the hoof and hike as far as the fitted share of a full lean, the nearer
    knee within 3° of rest, labelled as a lean, on all eleven;
  - breathing: rate, inhale shorter than exhale, one sigh, the shrug (3 mm a breath, 10 mm the sigh) and
    the shoulders' rise in the world;
  - looks over 40 seeds: about a dozen shifts a minute, rests of 8 s or more, every loop looks aside and
    down, sides repeat sometimes, every shift at least 6°, tilts only on looks aside, 1.5–4° and into the
    turn;
  - glances over 60 seeds: the gaze comes back up after one, below 12° down at most 4 s at a stretch and a
    quarter of a loop;
  - the fits are reused, and the looks stay within each character's reach;
  - every character but the two named as held looks about: 39° or more each way and down 15° or more, the
    horse down 30°; the sheep and the pig director turn their heads 10° or less;
  - options (seed, length, eye, refit) and time validation; `dispose` restores the bones and the skin
    weights.
- `tests/idle-clothing.test.mjs` (2): the census above, through each mammal's loop and at its fitted head
  limits and 5° past them.
- `tests/idle-fits.test.mjs` (3): every mammal has its row in `idle-fits.js` and reads it; a refit of the
  horse, the rabbit and the pig foreman matches; a rig's key changes when the rig does.

**Mutations.** 23 mutants of v3, each on an untracked copy of the module and of the test files that should
catch it (`mutate-v3.mjs` in the session's scratchpad), across the measure (the graze, the crossing's grade,
covered skin, the garments' winding), the neck and its cloth, the fitted shares, the plan's rules, the fit
margins and the table's key. A mutant in the fit code shows only through a refit, since the fits ship in a
table. All are killed but two: "the chest's rounding not fitted", which a new test (the chest never rounds
further than its fit) now kills; and "no knife-edge rule", which changed no character's fit, so the rule was
dropped (below).

**Browser** (`tools/check-idle-study.mjs`, preview on port 4486): 35 configurations and 866 seeks with no
errors; GPU resources stable across repeated seeking; the look buttons work; unknown controls and values,
and a gaze line that is not on or off, are refused. Review images are in `docs/tactics/hybrid-review/idle/`:
`close-three`, `gameplay`, `surroundings`, `looks-horse` (every look of seed 1), `glance-down-profile` (six
characters' deepest glance down in loops 1–8, beside the loop's opening look), `cast` (all eleven at one
moment) and `compact`.

## What was tried and dropped

In v3:
- **The nearer end's distance from the plane as a crossing's depth** ("edge depth"). It reads the
  triangles' size: on the cow's nape a neckerchief triangle 0.2 mm off the skin at rest moved less than 1 mm
  against it as the head turned 10°, and read 9.5 mm. The overlap along both normals reads 0.6 mm.
- **The nearest cloth face's own normal, for covered skin,** with the skin's own sleeve left out by weight
  group. A vertex deep in a sleeve read 0 by a face's edge and 12–56 mm by the face beside it, so a 5°
  twist "sank" the dog's elbows 5 cm. The pseudo-normal, with the garments wound consistently, is
  continuous there; no group is left out.
- **Skin up to 1 cm inside the cloth at rest, measured for sinking deeper.** The sheep's and the pigs'
  forearms rest 2–10 mm inside their waistcoats, coats and waistbands, so every breath and elbow ease "sank"
  them, though they are hidden there whatever they do. Only skin that shows at rest counts.
- **Cloth on the neck taking the weights of the skin it lies on,** three ways: the skin's weights at the
  nearest point of the skull's surface in full; the same easing off with distance from the skin; one
  smooth field by height and bearing round the neck, skin and cloth alike. Coarse neckerchief triangles
  over finely weighted skin, a knot and its ends projected onto different skin, and the outer layers'
  own weights each made new crossings; the rabbit, the cow and the dog lost their turns. Only the mane, with
  nothing on it, keeps it.
- **A knife-edge rule** (a point by a thin band's rim, its faces 145° or more apart, counts as outside): no
  character's fit changed without it.
- **Neck skin the cloth holds losing its head weight.** The cow lost its turn left; the sheep and the pig
  director gained nothing.
- **Swinging held arms further out** (to 10°): the sleeves crossed the shirts at the armpits before the
  forearms cleared the waistbands.
- **A millimetre in hand on the head's probes too:** the rabbit's and the cow's nods fell from 15° to 5° for
  a 0.2 mm excess on one sheep seed, which turned out to be a look pitched past the sheep's reach (a planner
  bug, fixed).
- **Probing a lean with a sigh's shrug,** and **ease before the lean:** each cost the held characters their
  whole weight shift, and the dog three quarters of its. A lean is probed with an ordinary breath, and fitted
  before the arms' ease.

In v2 and v1:
- **A nearest-vertex depth measure for skin in cloth.** Neck skin inside a collar flips sign when the
  nearest collar vertex changes; beside a hem the normal points along the cloth; an arm can pierce a big
  jacket triangle with no torso vertex near it. Triangle crossings replaced it.
- **Counting crossings, or allowing only the rest pose's own pairs.** Neck skin already under a collar at
  rest slides as the head moves, so a strict pair baseline failed every rig at 5°, and a count stays level
  while the crossing moves somewhere new. The two-triangle neighbourhood replaced both.
- **Measuring only head and arm triangles against torso triangles** (v2). It could not see cloth through
  cloth, or the neck skin, which belongs to neither set; round 2 found the v2 neck cloth folding 10–24 mm
  through itself and the skin. Everything is now measured against everything.
- **Longer neck branches** for the short-necked rigs (the full spine-to-head span, and 1.3×). The sheep
  and the pigs nodded no deeper, and the rabbit and the dog less. Three quarters stayed.
- **Floor vertices within 1 mm.** One of the skunk's and the pig foreman's boot heels sits 1.4–2.1 mm up
  in the mesh, so the sole hull lost a heel. 3 mm keeps the heels and stays under the toe spring (3.5 mm).
- **A lean sized by the nearest edge of the soles** (any edge): every short-footed rig got no lean. It is
  sized by the soles' width at the pressure point.
- From v1: a strong S-curve pushed the sheep's shirt through its vest before the waist blend; arms hanging
  with the pelvis's tilt swung the free hand into the hip; a sinking weight shift buckled the bearing knee
  from 21° to 30°; abs() and max() of the weight snapped the hand and the centre of mass.

## Review round 2 of 5 (6.5/10), and what changed

| finding | change | measured now |
|---|---|---|
| M1 the neck-cloth correction makes crossings no fit or test can see | the fit and the test measure everything against everything; the neck in rings, cloth without head weight; the mane takes the skin's weights | the census finds none, all eleven |
| M2 the neck does not bend | a runtime neck bone, the skin and cloth weighted along it | the neck geometry is pinned by a test |
| S1 a slid crossing may sink without limit; the arm fit clears a rule | covered skin, with an inside test for closed garments; weight shift, ease, shrug and rounding fitted per character | the census finds none; the pig foreman's forearm is held, not sunk |
| S2 glances become stares at the floor | after a glance the gaze rests ahead or drifts up | at most 2.75 s below −12° a stretch; a median 7% of a loop (at most 24%) |
| S3 test gaps | limits posed and 5° past them, by an independent census; the neck pinned; a 1 ms seam stencil; the 5 Hz arms; the all-pairs census; each character on its own seed; glance statistics | 26 tests in three files; 22 of 22 mutants killed |
| S4 doc claims | this document: the rabbit's and the dog's 2.8 and 2.5 cm, the dog's 7.9 cm sole, 5.67 cm, the residual and the head turn measured afresh; the equivalence claims and the old neck image gone | — |
| S5 breaths barely visible | the shrug is 5 mm a unit (from 4) | 2.5–6.4 mm a breath on eight characters |
| nits | the gaze from each character's own eyes; `set({gaze})` takes only true or false; a second idle on one rig is refused; the trouser cuffs documented; characters on their own seeds in the tests; a character loads in 0.15–0.2 s; phantom-wrench prints its 0.5% gate as 0.5% | — |

## Review round 1 of 5 (5/10), and what changed

| finding | change |
|---|---|
| M1 clothes tear at the waist on 4 of 11 | the waist blend; belly trousers stay with the hips |
| M2 jaw, jowls and chin into collars | the head measured against the clothes; head turn, nod (turned and tilted) fitted |
| M3 balance ignores small feet; the audit cannot fail | the pressure point rests 4 cm inside the soles; exact contact in the audit, a strict gate and a negative control |
| M4 doc claims | each claim with its scope |
| S1 too busy, strictly alternating | calmer plan, biased random sides, loops look aside and down |
| S2 breathing invisible | the shoulders shrug |
| S3 weight shift a 55–65% lean | relabelled "Leaning toward the … hoof"; the shoulders counter-tilt |
| S4 arms held out 9–12°, elbows frozen, wrists bent | no permanent swing; elbows and wrists ease |
| S5 pelvis swivels 14–23° | hips ≤ 10·tanh; side looks within the reach; knee pole 0.15 |
| S6 head-joint velocity kink | the bend eases through level |
| S7 neck reads as a shear; mane lifts | the neck bone (v3) |
| S8 unreachable looks | per-character reach |
| S9 build time | fits shipped in a table (v3) |
| S10 options and seams | length 12–600 s; integer seeds 0–2³²−1; a grid that divides the loop |
| S11 surviving mutants | new tests |

## API

`createIdle(worker, {seed = 1, length = 30, eye = null, refit = false})`. `seed` is a whole number
0–4294967295; `length` a finite number of seconds from 12 to 600; `eye` the world point between the eyes on
the rest pose (the catalog's `eye`; the horse's by default); `refit` fits the character afresh instead of
reading `idle-fits.js`. A rig already running an idle is refused until that one is disposed. It returns:
- `at(t)`: poses the rig, and returns the phase (look label), look, stance, weight, breath, feet, hips
  and chest;
- `gaze(t)`: eye, direction, target point and the planned look;
- `schedule`: `{looks, stances, breaths}`;
- `balance`: `{residual, rest, cop(t), centre(t)}`;
- `fitted`: `{nod, up, tilt, yaw, twist, swing, ease, shrug, weightShift, rounding, reach, neck, neckRadius,
  lean, armLag}`;
- `poseHead(yaw, nod, roll)`: for checking the fit, the rest pose with the head turned, nodded and tilted
  (degrees) as the fit poses it; the next `at()` poses the idle again;
- `length`, `seed`, `diagnostics()` and `dispose()`.

Every time accessor wraps finite times, throws on a non-finite one, and throws after `dispose`. `IDLE` is
frozen: `{length, gravity, neck}`. `lookLabel` names a look; `rigKey(worker)` keys a rig in `IDLE_FITS`.

The motion works in local +X space on any of the eleven mammal rigs. Like the throw, it owns the pose, the
neck bone and two skin corrections while it runs; `dispose` returns the rig to its neutral pose, its own
skeleton and its own weights.

## Still open

- **Clothes that hold.** The sheep's neckerchief on its wool, the pig director's collar under his jowls, and
  the three characters' forearms resting inside their waistcoats, coats and waistbands hold them nearly
  still. The fix is in the clothes: a looser neckerchief and collar, and arms hung clear of the waistbands.
  Refitting is one command.
- **Cloth that gives.** A collar or a neckerchief that deformed under the jaw (cloth, or a corrective shape)
  would let a head turn and nod further than any weighting does.
- **Shared body model.** Six characters share one skeleton, and every one balances with the same segment
  masses, so the pot-bellied pigs balance like the horse.
- **Integration.** Units in `battle-3d` do not idle yet; a transition is needed to and from other motions.
- **Targets.** Looks are random directions. The game would supply real ones: a sound, a teammate, a
  threat.
- **No eyes or ears to animate.** The heads have no eye or ear bones, so all looking is done by turning.

## Independent integration review — October 8, 2026

Reviewed `0ab4372`. Approved as a separate animation study with the viewer correction below; this does not enable battle idles. The restored neck bend and restrained weight shifts read well on the horse and donkey. The limited sheep and pig-director motion remains a documented clothing limitation.

All 30 focused tests passed: idle motion, clothing, cached fits, distribution module graph and Pages file coverage. Independently inspected the packaged horse, donkey and pig director, plus character/seed changes during playback.

Found and reproduced a viewer failure: play the study, then select the rabbit. While its paint loads, the old `cast()` cleared `motion`; the next frame read `motion.length`, threw, and stopped scheduling frames. The correction keeps the previous actor alive until a complete replacement is ready, ignores superseded loads, disposes unadopted actors and respects page disposal. Repeated character changes and a seed change now keep the timeline advancing, including through its wrap, with no new console errors. Syntax and the rebuilt Pages module checks also pass.

Before gameplay integration, choose how this unarmed study and the armed idle share pose ownership, and test transitions to movement, aiming, climbing, damage and death. Their current local-space controllers reset the root transform and must not be applied directly to world-positioned battle actors.
