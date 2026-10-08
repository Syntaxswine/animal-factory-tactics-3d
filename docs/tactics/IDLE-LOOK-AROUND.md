# Idle: standing and looking around

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

**Direction (the boss, 2026-10-08, on the first draft):** "the necks need to bend forward like a heavy
branch if you want the heads to tilt down that far."

The draft tipped the head about its one joint, a stiff rod pivoting on the neck. Looking down jammed the
jaw into the chest: 2.8–5.8 cm into the clothes on most characters. The section on the neck below
answers this.

This is the second version (v2). Review round 1 of 5 scored the first 5/10; what it found and what changed
is in its own section near the end.

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

The buttons under the timeline jump to where each look lands. Time wraps. `window.idleStudy.set({...})`
takes any of the controls by name (a character is loaded, a seed rebuilt) and refuses an unknown control
or value.

The module is `dist/tactics/idle-motion.js`. The study page is `idle-study.html` / `.js` / `.css`.

## What moves, and why

The idle is authored where a person would author it and computed where physics decides it. Each seed
gives a **seamless loop** (30 s by default): `at(t)` wraps, and the same seed always replays the same loop.

**Looks.** A relaxed worker mostly rests the eyes ahead, and the rigs have no eye bones, so every change of
gaze is a turn of the head; the plan keeps those few.
- **Kinds.** Rests ahead of 4–9 s, now and then 9–13 s; drifts of 6–12° held 2–4.5 s; looks 28–50° to
  one side (or as far as the character can turn) held 1.5–3.5 s; glances at the ground in front, held
  1–2.2 s. A side look picks its side at random, leaning toward the side not looked at last.
- **A loop looks aside and down at least once**: a draft without both is drawn again, up to 12 times.
- **Every shift moves at least 6°**, the return to the opening look included. The loop opens and closes
  on the same look ahead, held across the seam.
- **Shifts** take 0.30 s plus 5.5 ms per degree, eased with minimum jerk.
- **Measured** over 5000 seeds (the horse's reach): a median of 12 gaze shifts a minute (5th–95th
  percentile 8–16); the head is shifting 9% of the time; the longest stillness in a loop has a median of
  9.3 s; 34% of consecutive side looks repeat a side; 3 loops in 5000 have no side look and 11 no glance
  down (the redraws give up after 12).

**Head, chest, hips.** The head leads.
- **Split.** The head keeps up to about 34° of a turn (34·tanh(yaw/34), or less where the character's
  clothes allow less, below). The trunk takes the rest: half in the chest, up to 12° or what the character
  allows, and the remainder in the hips, up to about 10° (10·tanh), turning at the hip joints; the knees
  follow 15% of the hips' turn, so they stay over the hooves.
- **Timing.** By default the chest starts 0.10 s after the head and takes 1.5× as long; the hips start
  0.16 s after and take 1.8× as long. A wide look takes the most relaxed of five trunk timings that keeps
  the head within 36° of the chest.
- **Neck limit.** The skinned neck seam allows 40°, so the head's turn from the chest is capped smoothly
  there.
- **Reach.** Each character only plans looks it can make with the head within 35° of the chest (or its
  fitted turn), its fitted nod and its fitted look up, so the eyes land on them. Looks aside reach up to 3° and drifts
  up to 4°, or level where a character cannot look up (the rabbit; the dog looks up at most 5°).
- **Tilt.** A quarter of the side looks tilt the head 1.5–4° into the turn, the crown toward the side
  looked to.
- **Gaze.** The head aims in world space, so it holds its target while the trunk turns under it.

**The neck bends like a heavy branch.** A branch loaded at its tip curves most at its base and not at all
at the tip.
- **The branch.** The neck is a branch from the shoulders to the head joint, three quarters of the rig's
  spine-to-head span (16.8 cm on most rigs, 20.9 cm on the pig foreman), with curvature
  κ(s) = κ₀(1 − s/ℓ). So the tangent turns as θ(2u − u²), and a tip tilted by θ moves ℓ·∫sin(θ(2u−u²))du
  out of line: 2/3·ℓθ for small angles, 5.75 cm at 30° on a 16.8 cm neck.
- **The bend** is square to the neck's own axis (which leans back 10° on these rigs), toward where the
  face points.
- **Looking down,** the branch takes the whole tilt, carrying the head joint forward so the head hangs
  out over the chest. **Looking up,** it bends back and takes half. The share eases through level
  (−pitch·(0.75 − 0.25·tanh(pitch/2°))), so the head joint has no kink where the pitch crosses zero.
- **Chest.** It rounds forward with the head: 30% of any look below −12°, or as much as the face cannot
  nod, whichever is more, up to 10°.
- **What the eye sees.** The rigs have no neck bone: the neck skin turns from the spine's weight to the
  head's inside the collar, so the bend reads as the head carried forward on a short visible neck rather
  than as a curve. Collars, neckerchiefs and a mane move with the neck skin under them (below).

**Breathing.** About 14 breaths a minute: breaths whose lengths add up to the loop, 3.6–5.0 s over 5000
seeds. The inhale is 38–45% of each breath, eased both ways; one breath per loop is a sigh, 2.8× as deep,
with a 32% inhale and a long exhale.
- **The shoulders shrug** 4 mm per unit of breath at the arm roots (11 mm in the sigh), and the chest
  opens half a degree per unit.
- **Measured** (shoulders against the hips, 8 seeds, all eleven): 1.6–5.0 mm on a breath, 9.3–13.5 mm on
  the sigh.

**Leaning toward one hoof.** The weight moves from both hooves toward one and holds 6–11 s, then moves
back (held 4–8 s) or across; each shift takes 1.2–1.7 s. Most loops lean once or twice; the square stance
is mostly the one across the seam (5000 seeds: 41 loops hold square inside the loop).
- **The pressure point** moves 4.5 cm toward the hoof (less on a narrow stance, so it stays 4.5 cm inside
  the soles; every rig here has the room). On the horse's 46 cm stance the nearer hoof then carries
  55–65% of the weight: a lean, not a stand on one leg. Both hooves stay planted flat, so a real weight
  shift onto one leg (70–80%) would need the feet closer or a heel lifted.
- **The hips** follow it 5.6–6.9 cm toward that hoof and hike: the pelvis rolls 4.5°, that hip up. The
  nearer knee holds its rest bend (21.0–22.9° against 21.3° at rest); the far leg, its hoof planted wide,
  straightens a little as a prop (16.8–21.1°). On the pig foreman (rest 30.1°) the nearer knee
  straightens to 27.2–27.9° and the far one bends to 29.4–32.1°.
- **The chest** bends back 6° on the pelvis, so the shoulders counter-tilt 1.5° the other way.

**Balance is computed, not keyed,** as in the throw.
- **Where it rests.** The pressure point rests under the rest pose's centre of mass, unless that is within
  4 cm of an edge of the soles; then it moves toward the middle of the soles until it is 4 cm clear. The
  rabbit and the dog stand on short digitigrade feet, and theirs moves 2.0 and 1.6 cm forward.
- **Pendulum.** The centre of mass rides a linear inverted pendulum over the pressure plan: the leans plus
  a few millimetres of postural sway. The plan folds in the angular momentum of the arms, head and trunk.
- **Loop.** It is solved round the loop as one cyclic system on a grid that divides the loop exactly, so
  there is no start or end to hold. The pelvis is then shifted until the real segment centre of mass
  follows: 4 passes, 0.21–0.37 mm residual.
- **Reach.** Built in: if a leg would stretch past 99.5% of its length anywhere in the loop, the lean is
  made gentler. Measured, the legs reach at most 99.15% (97.3% on the pig foreman).

**Arms.** They hang from the shoulders.
- **Heading.** They follow the hips plus half the chest's twist, a beat behind (a 2 Hz second-order lag;
  5 Hz where the chest cannot twist 10°).
- **Swing.** By default an arm keeps its rest hang. It swings out only where this character's clothes need
  it (fitted, below): as its hip juts toward it in a lean, and as the chest rounds. Nine characters need
  none; the dog's arms swing 2° as the chest rounds, the pig foreman's 2.5–3° in a lean and 2.5° as the
  chest rounds.
- **Elbows** bend 1.5° past their rest bend on average and ease ±1.5° over the loop (32.1–35.1° against
  32.2° at rest). **Hands** hang on from the forearms, the wrists easing up to 7°.

**Feet.** Both hooves stay planted, and the hoof bones never move. Each floor vertex is skinned entirely to
its hoof (or boot, or foot) bone, so the soles cannot slip.

## The clothes

Two corrections run while the idle does, and `dispose()` restores the rig's own weights.

- **The waist blend.** The rigs' own weights cut the torso cloth hard between the spine and the hips, so a
  few degrees of chest on pelvis tore a belt or a jacket hem open. The shirt, waistcoat or jacket, any belt
  or pouches, and the trousers or overalls take the smooth waist blend of the game's walk and aim motions
  (`animal-motion.js`): one blend from 8 to 24 cm above the hips, shared by every layer, each vertex
  keeping its own sleeve weights. Trousers more than 10–18 cm in front of the hip joints are round a belly,
  not a leg, and stay with the hips.
- **Neck cloth follows the skin.** The neck skin turns from the spine's weight to the head's inside the
  collar, so a bending neck carried it through a collar or neckerchief that kept to the spine, and lifted
  a mane (all head weight) off the nape. Each cloth vertex within 4.5 cm of the neck skin takes the head
  weight of the nearest neck-skin vertex (skin, not the head itself), in full within 1.5 cm and easing to
  none at 4.5 cm; a mane takes it in full.

## Fitted to each character

When a character's first loop is built, its limits are measured on its own skinned meshes and kept for its
later loops (a character's first loop takes 0.7–1.2 s to build; later ones about 0.15 s).

**The measure.** Skin goes through cloth where a head, forearm or glove triangle crosses a torso triangle,
an edge of either piercing the other. Triangles are sorted by the rig's own weights: every corner more than
half to the head, to one forearm, hand and fingers, or to the spine and hips. A sleeve rides with its arm
and does not count against it.
- **Rest crossings.** The rest pose already has some (neck skin under a collar, an arm a coat sits over),
  and moving slides them along. A crossing within two triangles, on both sides, of one in the rest pose is
  that crossing slid along, not a new one.
- **Grazes.** A crossing whose edge pokes through by 2 mm or less (about a pixel at the close-up scale) is
  a graze and is not counted.
- **Exact.** Both triangle lists sit in 4 cm cells by their bounds, so a pair that crosses always shares
  a cell.
- **A pose fails** on any other crossing. The largest passing angle in 5° steps is kept, less 5° in hand
  for the idle's other motions (a lean, a breath, a tilt the probe does not make); each probe runs 5° past
  its top so the margin holds there too.

**The probes.**
- **Head turn:** the head yawing on the chest each way, level or tilted 5° either way, up to the 40° seam.
- **Nod:** the head nodding with the neck bent as in the motion, straight, turned as far as 24° either way
  (or its turn), or tilted 5° either way.
- **Look up:** the same ways, looking up to 10°. Looking up drops the back of the skull toward the back of a collar.
- **Chest twist:** each way on the hips, the arms hanging as in the motion.
- **Arm swing:** leaning fully toward each hoof (the hips carried about 7 cm over and hiked) and with the
  chest rounded 10°, how far an arm must swing out to clear the clothes, in half degrees, plus 1° for
  what the probe does not do (the arm's heading lagging, the elbow easing).

| character | head turn L / R | nod | look up | chest twist L / R | arm swing in a lean R / L, rounding | reach L / R / down |
|---|---|---|---|---|---|---|
| Horse worker | 40° / 40° | 25° | 10° | 30° / 30° | 0 / 0, 0 | 52° / 52° / 35° |
| Goat worker | 40° / 40° | 35° | 10° | 30° / 30° | 0 / 0, 0 | 52° / 52° / 45° |
| Bull worker | 40° / 40° | 35° | 10° | 30° / 30° | 0 / 0, 0 | 52° / 52° / 45° |
| Cow worker | 40° / 40° | 20° | 10° | 30° / 30° | 0 / 0, 0 | 52° / 52° / 30° |
| Donkey worker | 40° / 40° | 20° | 10° | 20° / 15° | 0 / 0, 0 | 52° / 52° / 30° |
| Sheep worker | 40° / 40° | 5° | 10° | 15° / 10° | 0 / 0, 0 | 52° / 51° / 15° |
| Skunk worker | 40° / 40° | 35° | 10° | 30° / 30° | 0 / 0, 0 | 52° / 52° / 45° |
| Pig foreman | 40° / 40° | 10° | 10° | 0° / 0° | 2.5° / 3°, 2.5° | 44° / 44° / 20° |
| Pig director | 25° / 40° | 5° | 10° | 20° / 15° | 0 / 0, 0 | 40° / 52° / 15° |
| Rabbit worker | 30° / 40° | 15° | 0° | 30° / 30° | 0 / 0, 0 | 46° / 52° / 25° |
| Dog guard | 40° / 40° | 10° | 5° | 5° / 30° | 0 / 0, 2° | 49° / 52° / 20° |

The deep collars and neckerchiefs show: the sheep (wool against a tight neckerchief) and the pig director
(a high waistcoat collar) nod 5°, the pig foreman (jowls over his collar) and the dog 10°. Their glances
down are shallower (to 15–20°) and lean more on the chest.

## Measured

Everything below is v2 at the commit that carries this document. "All eleven" means the eleven mammal
workers.

| check | scope | result |
|---|---|---|
| skin through cloth (the measure above) | horse seed 1 every 0.1 s; all eleven, seeds 1–2, every 0.5 s (the test); all eleven, seeds 1–4, every 0.25 s (sweep) | 0 new crossings |
| cloth at the waist, garment on garment | all eleven, seeds 1–2, the 3 moments the chest turns most on the pelvis (the test) | 0 new crossings |
| the same, counted as round 1 did (`waist.mjs`) | all eleven, seeds 1–2, every 0.1 s | rest → worst: donkey 105 → 106, sheep 260 → 263, pig foreman 101 → 105, pig director 155 → 158, dog 519 → 519; the other six 0 |
| required centre of pressure (Dempster masses, independent of the motion's model; soles within 3 mm of the floor) | all eleven, seeds 1–2, every 20 ms (round 1's `copmargin.mjs` at 3 mm) | at least 2.9 cm inside the soles: rabbit and dog 2.9–3.1 cm (their feet are 10 cm long), the other nine 5.5–8.7 cm. At round 1's 1 mm the skunk and the pig foreman read 1.9–2.4 cm, because one boot heel is lost from the hull |
| required against planned pressure point, as the idle moves | all eleven, seeds 1–2 | within 6 mm |
| phantom-wrench (`rigs/idle.mjs`, exact contact, gate 0.5% body weight / 2 N·m) | all eleven, seed 1; the horse, seed 2 | 0 N, gate passes |
| its negative control: centre of mass 1 cm behind the heels | horse, rabbit, pig foreman, seed 1 | 5–12 N, gate fails (23–26 s of the 30 over it) |
| head turn from the chest | all eleven, seeds 1–8 | at most 35.7° (the timing aims for 36°; cap 40°) |
| head tilt on the chest | all eleven, seeds 1–8 | at most 4.0° |
| gaze on each landed look | all eleven, seeds 1–8 | within 2.4° |
| hips' turn | all eleven, seeds 1–8 | at most 8.4° |
| knee twist off its hoof | all eleven, seeds 1–8 | at most 1.5° |
| arm from its rest hang | all eleven, seed 1 (the test) | within the fitted swing + 1.5° |
| peak bone acceleration (2.5 ms tiles) | all eleven, seed 1 | 1.2–1.8 m/s² (a kink reads as tens) |
| leg reach | all eleven, seeds 1–8 | at most 99.15% of the leg |

**Tests** (`tests/idle-motion.test.mjs`, 20, about two and a half minutes):
- scale, bone lengths and legal IK over the whole loop, on all eleven and twelve horse seeds; the
  shoulders' shrug is the only joint that moves, up the chest, under 12 mm;
- hooves planted: no floor vertex moves, on all eleven;
- the required centre of pressure stays 2.5 cm inside the soles and follows the plan within 6 mm, on all
  eleven, seeds 1–2;
- the loop closes without a seam, in pose, velocity and acceleration, on all eleven and at 17.77 and
  30.01 s; time wraps;
- nothing snaps: no bone accelerates faster than 5 m/s², second differences tiled 1.25 ms apart, on the
  horse (seeds 1–4), the pig foreman and the dog;
- the same seed replays exactly; other seeds differ, the largest and smallest included;
- the head stays within 37° of the chest (the trunk turns in time; the seam allows 40°) and tilts at most 5°, into
  the turn, on all eleven;
- the eyes land on each look, on all eleven, seeds 1–4, and reach a wide look within 4° just after the shift;
- on wide looks the head leads, the chest follows, the hips come last; the hips stay within 10.5° and
  the knees within 4° of their hooves;
- the arms keep their rest hang within 1.5° on the horse and within the fitted swing on all eleven; the
  elbows ease more than 1°, within 5° of rest; the wrists within 8°; the arms' heading follows the
  trunk's more than 30 ms behind;
- looking down, the head joint is carried more than 3 cm forward and the chest rounds;
- leaning: the hips move 3 cm or more toward the hoof and hike 1 cm, the nearer knee within 3° of rest,
  labelled as a lean, on all eleven;
- breathing: rate, inhale shorter than exhale, one sigh, the shrug (3 mm a breath, 10 mm the sigh) and
  the shoulders' rise in the world;
- looks over 40 seeds: about a dozen shifts a minute, rests of 8 s or more, every loop looks aside and
  down, sides repeat sometimes, every shift at least 6°, tilts only on looks aside, 1.5–4° and into the turn;
- skin through cloth (the measure above, written apart from the module's own), the horse every 0.1 s and
  all eleven on two seeds;
- the waist, on all eleven;
- the fits are reused, and the looks stay within each character's reach;
- every character can still look about: down 15° or more and 39° or more each way, the horse down 30°;
- posed at its fitted limits (turned as far as it may, tilted, nodding or looking up while turned), each head
  crosses nothing new, by the test's own restatement of the neck;
- options, time validation, and `dispose` restoring the bones and the skin weights.

**Mutations.** 32 mutants of v2 (`mutate2.mjs` in the review scratchpad, each on an untracked copy deleted after): 30 are
killed. Two survive, and both are equivalent here: removing the 40° neck cap (the plan peaks at 35.7°, so the cap
never acts), and taking the module's own sole hull at 1 mm instead of 3 mm (on these rigs it places the resting
pressure point and sizes the lean the same).

**Browser** (`tools/check-idle-study.mjs`, preview on port 4486): 35 configurations and 866 seeks with no errors; GPU
resources stable across repeated seeking; the look buttons work. Review images are in
`docs/tactics/hybrid-review/idle/`: `close-three`, `gameplay`, `surroundings`, `looks-horse` (every look of seed 1),
`glance-down-profile` (six characters' deepest glance down in loops 1–8, beside the loop's opening look), `cast`
(all eleven on one look), `compact`, and `neck-before-after` (v1's pivot against the branch).

## What was tried and dropped

- **A nearest-vertex depth measure for skin in cloth.** It failed three ways: neck skin inside a collar
  flips sign when the nearest collar vertex changes; beside a hem the normal points along the cloth; an arm
  can pierce a big jacket triangle with no torso vertex near it. Triangle crossings replaced it.
- **Counting crossings, or allowing only the rest pose's own pairs.** Neck skin already under a collar at
  rest slides as the head moves, so a strict pair baseline failed every rig at 5° (five rigs fitted no nod
  at all), and a count stays level while the crossing moves somewhere new. The two-triangle neighbourhood
  and the 2 mm graze filter replaced both.
- **Sorting triangles by mesh** (skin meshes against cloth meshes). The skull mesh's neck runs under the
  collar, so the rest crossings were hundreds and their neighbourhoods let the pig foreman's jowls slide
  into his collar unnoticed. Sorted by weight they are caught.
- **Sorting triangles by the corrected weights.** Collar triangles that take head weight leave the torso
  set and stop being counted at all; the measure now sorts by the rig's own weights.
- **A neck-cloth correction taken from the nearest skull vertex.** It matched collar vertices to the jaw
  above them and made the rabbit and the dog worse. It now takes only neck skin.
- **Longer neck branches** for the short-necked rigs (the full spine-to-head span, and 1.3×). The sheep
  and the pigs nodded no deeper, and the rabbit and the dog less. Three quarters stayed.
- **A 4° look-up probe folded into the head-turn fit.** The rabbit's skull meets the back of its neckerchief as it
  looks up, whatever the turn, so the fit cut its turn left to 5°. Looking up has its own fit, and the plan bounds
  looks by it. (The sweep found it: the rabbit, seed 4, crossed 2.1 mm looking left and 1.7° up.)
- **A depth limit on crossings that slid** (deeper than the rest crossing by 3 mm). On coarse cloth
  triangles the edge depth reads the triangle's size, not the penetration.
- **Floor vertices within 1 mm.** One of the skunk's and the pig foreman's boot heels sits 1.4–2.1 mm up
  in the mesh, so the sole hull lost a heel and ran diagonally under the boots. 3 mm keeps the heels and
  stays under the toe spring (3.5 mm).
- **A lean sized by the nearest edge of the soles** (any edge). On short feet the front and back edges are
  nearer than the sides, and every short-footed rig got no lean at all. It is sized by the soles' width
  at the pressure point.
- **A fixed 1.5° arm swing in every lean.** The pig foreman's hip still drove his hand 14.6 mm into his
  trousers, and the dog's rounded chest drove its forearm into its jacket. The swing is fitted per rig.
- From v1: a strong S-curve (5.5° against a 3.5° pelvis roll) pushed the sheep's shirt through its vest
  before the waist blend; arms hanging with the pelvis's tilt swung the free hand into the hip; a sinking
  weight shift buckled the bearing knee from 21° to 30°; abs() and max() of the weight snapped the hand
  and the centre of mass.

## Review round 1 of 5 (5/10), and what changed

| finding | change | measured now |
|---|---|---|
| M1 clothes tear at the waist on 4 of 11 | the waist blend; belly trousers stay with the hips | the waist test, 0 new; `waist.mjs` within +3 of rest on the five that cross at rest |
| M2 jaw, jowls and chin into collars | the head set is every head-weighted triangle (> 0.5); the neck cloth follows the skin; head turn, nod (turned and tilted) refitted | 0 new crossings, all eleven (scope above) |
| M3 balance ignores small feet; the audit cannot fail | the pressure point rests 4 cm inside the soles; exact contact in the audit with a strict gate and a negative control | at least 2.9 cm inside (rabbit, dog); the control fails |
| M4 doc claims | this document, each claim with its scope | — |
| S1 too busy, strictly alternating | calmer plan, biased random sides, loops look aside and down | 12 shifts a minute; 9% moving; 34% repeats |
| S2 breathing invisible | the shoulders shrug | 1.6–5.0 mm a breath, 9.3–13.5 mm the sigh |
| S3 weight shift a 55–65% lean | relabelled "Leaning toward the … hoof"; shoulders counter-tilt 1.5° | knee angles above, as measured |
| S4 arms held out 9–12°, elbows frozen, wrists bent | no permanent swing; fitted swing only where needed; elbows ease; hands follow the forearms | 9 of 11 never swing; elbows 32.1–35.1° |
| S5 pelvis swivels 14–23° | hips ≤ 10·tanh; side looks ≤ the reach; knee pole 0.15 | hips ≤ 8.4°; knees ≤ 1.5° |
| S6 head-joint velocity kink | the bend eases through level | 1.2–1.8 m/s² peak |
| S7 neck reads as a shear; mane lifts | per-rig branch; bend square to the neck's axis; mane follows the nape | the rigs have no neck bone (open, below) |
| S8 unreachable looks | per-rig reach | gaze within 2.4° |
| S9 build time | fits cached per rig | 0.7–1.2 s first loop, about 0.15 s after |
| S10 options and seams | length 12–600 s, finite; integer seeds 0–2³²−1 mixed by a bijection; grid divides the loop; build-time leg reach | tested |
| S11 13 surviving mutants | new tests, including the fitted limits posed directly | 32 mutants of v2: 30 killed; 2 survive and are equivalent here (below) |
| nits | head tilts into the turn; roll probed; `set({species})`; margin at the top; toe and heel per rig | — |

## API

`createIdle(worker, {seed = 1, length = 30})`. `seed` is a whole number 0–4294967295; `length` a finite
number of seconds from 12 to 600. It returns:
- `at(t)`: poses the rig, and returns the phase (look label), look, stance, weight, breath, feet, hips
  and chest;
- `gaze(t)`: eye, direction, target point and the planned look;
- `schedule`: `{looks, stances, breaths}`;
- `balance`: `{residual, rest, cop(t), centre(t)}`;
- `fitted`: `{nod, up, yaw, twist, swing, reach, neck, lean}`;
- `length`, `seed`, `diagnostics()` and `dispose()`.

Every time accessor wraps finite times, throws on a non-finite one, and throws after `dispose`. `IDLE` is
frozen: `{length, gravity, neck}`. `lookLabel` names a look.

The motion works in local +X space on any of the eleven mammal rigs. Like the throw, it owns the pose and
two skin corrections while it runs; `dispose` returns the rig to its neutral pose and its own weights.

## Still open

- **No neck bone.** The neck skin blends between the spine and the head inside the collar, so the branch
  reads as the head carried forward, not as a curve. A runtime neck bone (inserted between the spine and
  the head, with the neck skin weighted along it) would show the bend; it touches every skinned part and
  the skeleton the game shares.
- **Deep collars.** The sheep and the pig director nod 5° before their faces reach their collars; their
  glances down are shallow. A collar that gives way (cloth, or a corrective shape) would let them look
  down further.
- **The pig foreman's arms** swing out 2.5–3° in a lean and 2.5° as the chest rounds (up to 6.5° when both
  coincide), because his hand hangs against his belt.
- **Shared body model.** Six characters share one skeleton, and every one balances with the same segment
  masses, so the pot-bellied pigs balance like the horse.
- **Integration.** Units in `battle-3d` do not idle yet; a transition is needed to and from other motions.
  The fits cost 0.7–1.2 s on a character's first loop; a game would precompute them per rig.
- **Targets.** Looks are random directions. The game would supply real ones: a sound, a teammate, a
  threat.
- **No eyes or ears to animate.** The heads have no eye or ear bones, so all looking is done by turning.
