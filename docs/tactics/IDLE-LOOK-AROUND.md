# Idle: standing and looking around

For transferable corrections from the later draft v5, see the
[clothing and skinning handoff](IDLE-SKINNING-V5-HANDOFF.md). That handoff does
not change the v4 implementation documented here.
Since October 9 the characters fit the cloth on their necks themselves
([clothing and skinning](CLOTHING-SKINNING.md)). The idle sets that fit aside while it runs and fits
the cloth to its own neck bone as described here, and its rig key reads the weights the cloth's names
give it (the character keeps them for the vertices it fitted), so every rig's key, fitted limits and
loops are as verified below.

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

**Direction (the boss, 2026-10-08, on the first draft):** "the necks need to bend forward like a heavy
branch if you want the heads to tilt down that far."

The draft tipped the head about its one joint, a stiff rod pivoting on the neck. Looking down jammed the
jaw into the chest: 2.8–5.8 cm into the clothes on most characters. The section on the neck below
answers this: the idle gives the rigs a neck bone and bends it.

This is the fourth version (v4). Review rounds 1–3 of 5 scored the first three 5/10, 6.5/10 and 7.5/10;
what each found and what changed are in their own sections near the end.

## The study

Open `tactics/idle-study.html`. It shows the **eleven mammal workers**. The hen has wings, not arms and
hands, and is left out, as in the all-animal motion study (`createIdle` refuses it, saying so).

| control | what it does |
|---|---|
| Character | picks the worker |
| Loop | picks a seed (1–8); each seed is its own loop, and each character draws its own loop from it |
| View | three-quarter, side, front, rear |
| Scale | close-up, surroundings, gameplay |
| Gaze line | shows where the eyes point, from the character's own eyes |
| Speed | playback speed |

The buttons under the timeline jump to where each look lands. Time wraps. `window.idleStudy.set({...})`
takes any of the controls by name (a character is loaded, a seed rebuilt) and refuses an unknown control
or value, and a gaze line that is not `true` or `false`. A new seed builds in 0.15–0.22 s, and switching
character takes 0.33–0.81 s with its model and paint (in Node an idle builds in 0.17–0.28 s): the fitted limits
ship with the module (below).

The module is `dist/tactics/idle-motion.js`, the fitted limits `dist/tactics/idle-fits.js`, and the study
page `idle-study.html` / `.js` / `.css`.

## What moves, and why

The idle is authored where a person would author it and computed where physics decides it. Each seed
gives a **seamless loop** (30 s by default): `at(t)` wraps, and the same seed always replays the same loop.
The seed is mixed with the rig's key, so the cast on one seed do not share one choreography.

**Looks.** A relaxed worker mostly rests the eyes ahead, and the rigs have no eye bones, so every change of
gaze is a turn of the head; the plan keeps those few.
- **Kinds.** Rests ahead of 4–9 s, now and then 9–13 s; drifts, the gaze moving 6–12° in yaw and a little in
  pitch (6.0–18.2° all told), held 2–4.5 s; looks 28–50° to one side (or as far as the character can turn)
  held 1.5–3.5 s; glances at the ground in front, held 1–2.2 s. A side look picks its side at random,
  leaning toward the side not looked at last. After a glance down the gaze rests ahead (70%) or drifts back
  up 6–10°, never below 10° under level.
- **A loop looks aside and down at least once**: a draft without both is drawn again, up to 12 times.
- **Every shift moves at least 6°**, the return to the opening look included, or a third of what the
  character's gaze can span where that is less (a head its clothes hold tight; on these rigs none now
  needs it). The loop opens and closes on the same look ahead, held across the seam.
- **Shifts** take 0.30 s plus 5.5 ms per degree, eased with minimum jerk.
- **Between looks the head never rests perfectly still**: slow noise drifts the gaze 0.45° rms in yaw and
  0.30° in pitch, so in a hold of 2 s or more the head strays 0.2–2.2° from where it landed, about a degree
  as a rule.
- **Measured** over 5000 seeds (the horse's reach): a median of 12 gaze shifts a minute (5th–95th
  percentile 8–16); the head is shifting 9% of the time; the longest stillness in a loop has a median of
  9.5 s; 33% of consecutive side looks repeat a side; 26% of side looks tilt the head; 4 loops in 5000
  have no side look and 10 no glance down (the redraws give up after 12). The gaze is below 12° down for
  at most 2.75 s at a stretch, a median of 7% of a loop (95th percentile 14%, at most 24%: three glances).

**Head, chest, hips.** The head leads.
- **Split.** The head keeps up to about 34° of a turn (34·tanh(yaw/34), or less where the character's
  clothes allow less, below). The trunk takes the rest: half in the chest, up to 12° or what the character
  allows, and the remainder in the hips, up to about 10° (10·tanh), turning at the hip joints; the knees
  follow 15% of the hips' turn, so they stay over the hooves.
- **Timing.** By default the chest starts 0.10 s after the head and takes 1.5× as long; the hips start
  0.16 s after and take 1.8× as long. A wide look takes the most relaxed of five trunk timings that keeps
  the head within 36° of the chest, or within a degree of its fitted turn; on the widest the trunk starts
  with the head.
- **Neck limit.** The skinned neck seam allows 40°, so the head's turn from the chest is capped smoothly
  there.
- **Reach.** Each character only plans looks it can make: the head within 35° of the chest (or its
  fitted turn, with half a degree for the hips' eased turn), down by its fitted nod and its chest's fitted
  rounding, up by its fitted look up, and tilted no more than its fitted tilt. One that cannot turn its
  head 14° either way drifts instead of looking aside; one that cannot look 8° down drifts instead of
  glancing at the ground; and every pitch the plan draws stays within its reach. A character whose clothes
  hold its head looks with its trunk: the pig director's chest and hips carry his looks 9–14° each way.
- **Tilt.** A quarter of the side looks tilt the head 1.5–4° into the turn, the crown toward the side
  looked to. The head stays level in the world as the chest counter-tilts in a lean, so on the chest it
  tilts up to 5.5°.
- **Gaze.** The head aims in world space, so it holds its target while the trunk turns under it.

**The neck bends like a heavy branch.** A branch loaded at its tip curves most at its base and not at all
at the tip.
- **A neck bone.** The rigs have none: their neck skin blends straight from the chest bone to the head
  bone, so a bending neck could only shear. While the idle runs it adds one, `idle neck`, a child of the
  chest bone at the branch's base, binds every part to a skeleton that includes it (the skeleton the parts
  were bound to, plus this bone: the rig's own, or the game motion's with its tail bones), and weights the
  neck skin and the cloth round it along it (the clothes, below); `dispose()` removes it and rebinds the
  parts to the skeleton they had, with their own weights.
- **The branch.** The neck is a branch from the shoulders to the head joint, three quarters of the rig's
  spine-to-head span (16.8 cm on most rigs, 20.9 cm on the pig foreman), with curvature
  κ(s) = κ₀(1 − s/ℓ). So the tangent turns as θ(2u − u²), and a tip tilted by θ moves ℓ·∫sin(θ(2u−u²))du
  out of line: 2/3·ℓθ for small angles, 5.68 cm at 30° on a 16.8 cm neck. The neck bone turns by the
  chord of that bend, so its tip, the head joint, lands on the branch's tip; the head on it takes the rest
  of its nod and all of its turn and tilt.
- **The skin follows the bend**: on a 25° nod the nape is carried forward more the higher up the neck it is,
  3–7 mm at the branch's base, 29–39 mm three quarters of the way up and 38–53 mm at the top (left on the
  rig's own weights, 0–2 mm and 1–11 mm).
- **The bend** is square to the neck's own axis (which leans back 10° on these rigs), toward where the
  face points.
- **Looking down,** the branch takes the whole tilt, carrying the head joint forward so the head hangs
  out over the chest. **Looking up,** it bends back and takes half. The share eases through level
  (−pitch·(0.75 − 0.25·tanh(pitch/2°))), so the head joint has no kink where the pitch crosses zero.
- **Chest.** It rounds forward with the head: 30% of any look below −12°, or as much as the face cannot
  nod, whichever is more, up to the character's fitted rounding (10° on six of them).

**Breathing.** About 14 breaths a minute: breaths whose lengths add up to the loop, 3.5–5.1 s over 5000
seeds. The inhale is 38–45% of each breath, eased both ways; one breath per loop is a sigh, 2.8× as deep,
with a 32% inhale and a long exhale.
- **The shoulders shrug** 5 mm per unit of breath at the arm roots (14 mm in the sigh), times the
  character's fitted shrug, and the chest opens half a degree per unit.
- **Measured** (shoulders against the hips, 8 seeds): 2.3–6.9 mm on a breath (a typical one 4.6–5.1 mm,
  1.3–2.0 px at the study's close-up scale) and 11.9–14.4 mm on the sigh, on the nine characters that
  shrug in full; 0.4–1.4 and 2.5–3.6 mm on the pig foreman (a quarter); the sheep's shoulders do not rise,
  and its chest opens alone. A quiet breath is small in life too; the sigh is the one that reads.

**Leaning toward one hoof.** The weight moves from both hooves toward one and holds 6–11 s, then moves
back (held 4–8 s) or across; each shift takes 1.2–1.7 s. Most loops lean once or twice; the square stance
is mostly the one across the seam (5000 seeds: 42 loops hold square inside the loop). The lean is the
character's fitted share of a full lean: full on nine, three quarters on the pig foreman, half on the sheep.
- **The pressure point** moves 4.5 cm times that share toward the hoof (less on a narrow stance, so it
  stays 4.5 cm inside the soles; every rig here has the room). On the horse's 46 cm stance the nearer hoof
  then carries 55–65% of the weight: a lean, not a stand on one leg. Both hooves stay planted flat, so a
  real weight shift onto one leg (70–80%) would need the feet closer or a heel lifted.
- **The hips** follow it 5.6–7.1 cm toward that hoof at a full lean (the pig foreman 4.2–5.3 cm, the sheep
  2.8–3.5 cm) and hike: the pelvis rolls 4.5° (times the share), that hip up. The nearer knee holds its rest
  bend (20.7–23.0° against 21.3° at rest; the pig foreman 27.9–28.5° against 30.1°); the far leg, its hoof
  planted wide, straightens a little as a prop (15.7–21.0°).
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
  follows: 4 passes, at most 0.39 mm residual.
- **Reach.** Built in: if a leg would stretch past 99.5% of its length anywhere in the loop, the lean is
  made gentler. Measured, the legs reach at most 99.22% (97.16% on the pig foreman).

**Arms.** They hang from the shoulders.
- **Heading.** They follow the hips plus half the chest's twist, a beat behind (a 2 Hz second-order lag;
  5 Hz where the chest cannot twist 10° either way: the sheep and the two pigs).
- **Swing.** An arm keeps its rest hang, swinging out only where its character's clothes need it (fitted,
  below): the pig foreman's, 3–3.5° as he leans, his forearms by his waistband.
- **Easing.** The elbows bend 1.5° past their rest bend on average and ease ±2° over the loop (32.0–35.3°
  against 32.2° at rest); the hands hang on from the forearms, the wrists easing up to 7.9°, and the fingers
  curl a little. All of it times the character's fitted ease: full on nine, half on the pig foreman, a
  quarter on the sheep.

**Feet.** Both hooves stay planted, and the hoof bones never move. Each floor vertex is skinned entirely to
its hoof (or boot, or foot) bone, so the soles cannot slip.

## The clothes

The rigs' own weights were made for the game's walk and aim, and four corrections run while the idle does;
`dispose()` restores the rig's own weights.

- **The waist blend.** The rigs' own weights cut the torso cloth hard between the spine and the hips, so a
  few degrees of chest on pelvis tore a belt or a jacket hem open. The shirt, waistcoat or jacket, any belt
  or pouches, and the trousers or overalls take the smooth waist blend of the game's walk and aim motions
  (`animal-motion.js`): one blend from 8 to 24 cm above the hips, shared by every layer, each vertex
  keeping its own sleeve weights. Trousers more than 10–18 cm in front of the hip joints are round a belly,
  not a leg, and stay with the hips. The trouser legs take the blend down to the knee and keep the rig's
  own weights below it, so the cuffs ride the hooves.
- **The arms' weight stays on the sleeves.** The rigs weight some cloth beside the arms to them: the side
  of a shirt at the waist, 13–15 cm from the arm's bones beside a hanging hand, moves 35–75% with the
  forearm (the donkey's, the bull's), so the hip tore it as the weight shifted. The arm's weight stays on
  the sleeve, fading out from 10 to 12 cm from the arm's bones (shoulder to elbow to wrist), and goes to the
  cloth's own blend beyond. Sleeves themselves lie 7–9 cm from those bones.
- **The neck.** The neck skin is weighted along the neck bone by height above the branch's base (u, in
  branch lengths): of the weight not on the head, the neck bone takes smooth((u + 0.15)/0.6), so the neck
  bends most at its base; the skin keeps the head weight the rig gave it, and the head itself (vertices the
  rig gives wholly to it) is left alone. **Every layer on the neck** (a collar, a neckerchief with its knot
  and ends, the tops of a shirt, waistcoat, bib or braces) **takes the weights of the skin under it**, in
  full within 3 cm of the neck's median radius and easing to its own weights 13 cm out: one smooth field,
  so the layers and the skin they lie on move as one, and nothing on the neck slides through anything as
  the head turns, nods or tilts. The skin under a layer is the nearest point of the skull's surface no
  higher up the neck than the layer is, with 1 cm (about a triangle) to spare: the nearest point outright
  put the rabbit's neckerchief's top edge on its jaw, the band's head weight jumped from 0.20 to 0.59 across
  one triangle, and the band folded through itself as the head turned. **Hair**, which nothing lies on (a
  mane, the goat's beard), takes in full the weights of the skin it grows from, at the nearest point.
- **A sleeve's end round a forearm** takes the weights of the skin under it, in full within 1 cm of it and
  easing to its own 3 cm away. The rigs weight the inside of a sleeve at the elbow about half to the chest (the dog's 48–58%),
  so a twist of the chest slid the forearm out through it, 7–16 mm on the dog, the pig director and the sheep.

## Fitted to each character

Each character's limits are measured on its own skinned meshes, by two tests on every part of the rig:

- **Sinking.** A vertex of any part that shows in the rest pose (outside every other part, or less than
  0.5 mm into one) may go no more than 3 mm into another part: a pixel at the study's close-up scale
  (280–400 px a metre as the window allows; the game draws at 130). Every part of these rigs is a closed
  surface (each edge, its corners welded to 0.1 mm, shared by exactly two triangles, once zero-area slivers
  are set aside; the donkey's mane also holds two loose two-triangle slivers inside it), so a point is
  inside a part where a ray from it crosses the part an odd number of times, and more than 3 mm deep where,
  inside, no triangle of the part comes within 3 mm of it. A vertex the rest pose already hides (neck skin
  under a collar, a shirt under the trousers' waist, a forearm up its sleeve) is hidden however deep it
  goes: what shows of any sinking is a vertex beside it, which showed, going under. A moving vertex is
  tested against every part round it; a still one against the parts that move within 3 cm of it, all that
  one of a probe's steps can bring.
- **A part through itself** (a sleeve into its own shirt, a mane folding, an ear into its skull), which no
  inside test can see. Two of its triangles that share no corner cross where an edge of either passes
  through the other; a crossing is new unless the rest pose has it, or one within two triangles of it on
  both sides (the same crossing slid along), or it goes 3 mm deep or less: as deep as the shallower of the
  two triangles pokes through the other's plane, so two that meet nearly flat read the sliver they cross in,
  not their size. Two triangles held rigidly by one bone cannot cross anew and are not tested.

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
  with the arms still; **ease**, the share of the arms' easing, standing square and leaning that far;
  **shrug**, the share of the shoulders' rise (none, if need be), a sigh standing and an ordinary breath
  leaning, the chest opening on each in full as the motion opens it; and **rounding**, how far the chest
  rounds (2.5° steps up to 10°), standing and leaning. Each of these probes poses the arms at every
  extreme their easing reaches over a loop (the elbow 3.5° past its rest bend or half a degree short of it;
  the wrist 9° and the fingers 8°, one way and then the other) and keeps a millimetre in hand. An arm that
  crosses the clothes in a lean or a rounded chest swings out as little as clears them, in half degrees,
  plus 1° for its heading's lag; where no swing up to 4° clears, the share is smaller.

**The table.** The fits depend only on the rig, not the seed. They take 1.4–5.8 s a character, and the
eleven ship in `idle-fits.js`, keyed by `rigKey(worker)`: a hash of the rig's bones (rest places, turns and
scales), and its parts' names, sizes, vertex sums, triangles, skin weights (whatever slots they sit in) and
the bones those name. An edited rig misses the table and is fitted afresh, and so is one the game's motion
has weighted afresh; while an idle runs, `rigKey` gives the key it read before it began.
`node tools/fit-idle-rigs.mjs` writes the table (about 30 s); `createIdle(worker, {refit: true})` fits
afresh; `tests/idle-fits.test.mjs` checks that every mammal has its row and refits all eleven.

| character | turn L / R | nod | up | tilt | twist L / R | weight shift | ease | shrug | rounding | reach L / R / down |
|---|---|---|---|---|---|---|---|---|---|---|
| Horse worker | 40° / 30° | 15° | 5° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 46° / 25° |
| Goat worker | 40° / 40° | 35° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 45° |
| Bull worker | 40° / 40° | 25° | 10° | 5° | 25° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 35° |
| Cow worker | 40° / 40° | 25° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 5° | 53° / 53° / 30° |
| Donkey worker | 40° / 40° | 15° | 10° | 5° | 25° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 25° |
| Sheep worker | 40° / 10° | 0° | 5° | 0° | 15° / 5° | ½ | ¼ | 0 | 2.5° | 53° / 20° / 2.5° |
| Skunk worker | 40° / 40° | 35° | 10° | 5° | 15° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 45° |
| Pig foreman | 40° / 40° | 10° | 10° | 5° | 0° / 5° | ¾ | ½ | ¼ | 0° | 45° / 49° / 10° |
| Pig director | 5° / 0° | 0° | 10° | 0° | 5° / 5° | 1 | 1 | 1 | 5° | 14° / 9° / 5° |
| Rabbit worker | 40° / 40° | 20° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 30° |
| Dog guard | 40° / 40° | 20° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 7.5° | 53° / 53° / 28° |

Only the pig foreman's arms swing out: 3–3.5° as he leans, his forearms by his waistband.

**Held by their clothes.** Two characters' heads are still held where moving would push skin under cloth:
- **The sheep.** Its wool ruff overhangs a neckerchief tied tight on it: a 20° turn right sinks the wool
  3.4 mm into the neckerchief, a 10° nod 3.1 mm, a 10° tilt the neckerchief 5.2 mm into the wool. So it turns
  its head 40° left and 10° right, looks up 5°, and does not nod or tilt. The rest of it moves: it leans
  half, its elbows ease a quarter, its chest twists 15° and 5° and rounds 2.5°, and its chest opens on each
  breath, though its shoulders do not rise.
- **The pig director.** His jowls rest on his collar (their contact line shows at rest): a 5° nod presses
  the collar 9.7 mm into them, a 5° tilt 3.6–4.4 mm, a 10–15° turn 4.4–4.7 mm. So his head turns 5° left and
  none right, looks up 10°, and does not nod or tilt; he looks about with his chest and hips, 9–14° each way.
  The rest of him moves in full: the lean, the arms' ease, the shrug, and 5° of rounding.

A neckerchief tied lower or looser, and a collar set lower or further out from the jowls, would free them:
that is a change to the characters, so it is the boss's call (Still open). The pig foreman's head moves
freely; his forearms by his waistband give him three quarters of the lean, half the ease, a quarter of the
shrug and no rounding.

## Measured

Everything below is v4 at the commit that carries this document. "All eleven" means the eleven mammal
workers.

| check | scope | result |
|---|---|---|
| sinking and new self-crossings, by a census written apart from the module (its own skinning, broad phase and rays, along x) | all eleven, seeds 1–2, every 1 s; every one on its own seed every 2 s and at its widest look, deepest nod, highest look, the chest's three widest turns, its fullest leans, deepest rounding and deepest breath (the test) | none |
| each fitted head limit, and 5° past it, by the census | all eleven (the test) | none |
| required centre of pressure (Dempster masses, independent of the motion's model; soles within 3 mm of the floor) | all eleven, seeds 1–6, every 20 ms | at least 2.7 cm inside the soles (the dog; the rabbit 2.9 cm); the other nine 5.4–8.9 cm |
| phantom-wrench (`rigs/idle.mjs`, exact contact, gate 0.5% body weight / 2 N·m) | all eleven, seed 1; the rabbit and the dog, seed 2 | 0 N and 0 N·m in every phase; the gate passes |
| its negative control: centre of mass behind the heels | horse, rabbit, dog, pig foreman, seed 1 | 1 cm: over the gate 13.4–27.9 s of the 30; 0.5 cm (horse, rabbit, dog): 6.2–14.1 s; fails |
| head turn from the chest | all eleven, seeds 1–8 | at most 35.8° (the sheep 32.0°, the pig director 6.4°; the timing aims for 36°; cap 40°) |
| head tilt on the chest | all eleven, seeds 1–8 | at most 5.5° (a look's 3.9° tilt and the chest's counter-tilt in a lean) |
| gaze on each landed look | all eleven, seeds 1–8 | within 2.6° |
| hips' turn | all eleven, seeds 1–8 | at most 8.5° |
| knee twist off its hoof | all eleven, seeds 1–8 | at most 1.4° |
| arm out from its rest hang, in the chest's frame | all eleven, seeds 1–8 | at most 4.6° |
| wrist | all eleven, seeds 1–8 | at most 7.9° (the sheep 1.7°, the pig foreman 3.5°) |
| peak bone acceleration (2.5 ms tiles) | all eleven, seed 1 | 0.54–2.01 m/s² (a kink reads as tens) |
| leg reach | all eleven, seeds 1–8 | at most 99.22% of the leg |
| round 3's every-vertex census (`vdepth.mjs`, its own code and rays) | all eleven, seeds 1–2, every 1 s | no vertex that shows at rest goes more than 3 mm into another part; hidden ones go at most 15.7 mm deeper than at rest (more than 10 mm: the horse's shirt in its overalls, the pig director's forearms and waistcoat, the pig foreman's forearms in his shirt), none of them showing |
| sleeve cloth on the forearms | all eleven, seed 1, every 0.5 s | within 0.3 mm of the forearm point it lay on (left on the rig's weights, the dog's, the director's and the sheep's drift 7–16 mm) |
| builds | all eleven, 30 each: 20 seeds across the 32-bit range, 0 and 2³²−1, and loops of 12–600 s | no failures and no NaN; balance residual at most 0.39 mm; seam velocity jump at most 0.06 mm/s; no look past the reach; the head at most 36.1° from the chest |

**Liveliness** (`lively.mjs`, round 3's measure, seeds 1–4; v3 in brackets):

| character | head turns °/min | yaw range | pitch range | hips sway | breath rise | elbow ease |
|---|---|---|---|---|---|---|
| sheep | 225 (160) | 15.3–59.3° (19.6–29.3) | 1.7–4.3° (1.0–1.2) | 3.8–6.8 cm (3.8–7.1) | none (none) | 0.5–0.7° (0) |
| pig director | 140 (116) | 10.1–14.1° (9.2–12.5) | 2.3–5.8° (1.9–3.6) | 6.8–13.2 cm (3.7) | 4.9 mm (1.1) | 2.4–2.9° (0.6–0.7) |
| pig foreman | 339 (283) | 39.3–72.1° (29.2–61.4) | 7.5–9.5° (12.7–14.5) | 5.8–10.3 cm (2.6–4.1) | 1.1 mm (1.1) | 1.1–1.3° (0.5–0.7) |
| the other eight | 273–470 (303–314) | 34.8–94.2° (29.7–66.8) | 10.6–27.5° (14.8–25.0) | 6.8–13.6 cm (7.2–13.4) | 4.6–5.1 mm (4.5) | 1.9–2.7° (2.1–2.8) |

**Tests**: three files.
- `tests/idle-motion.test.mjs` (30):
  - scale, bone lengths and legal IK over the whole loop, on all eleven and twelve horse seeds; the
    shoulders' shrug is the only joint that moves, up the chest, under 15 mm;
  - hooves planted: no floor vertex moves, on all eleven;
  - the required centre of pressure stays 2.5 cm inside the soles and follows the plan within 6 mm, on all
    eleven, seeds 1–2;
  - the loop closes without a seam, in pose, velocity and acceleration, on a 1 ms stencil, on all eleven and
    at 17.77 and 30.01 s; time wraps;
  - nothing snaps: no bone accelerates faster than 5 m/s², second differences tiled 1.25 ms apart;
  - the same seed replays exactly; other seeds differ; each of the eleven draws its own looks from one seed;
  - the head stays within 37° of the chest and tilts at most 6° on it, into the turn, on all eleven, seeds
    1–4;
  - the eyes land on each look, on all eleven, seeds 1–4, and reach a wide look within 4° just after the
    shift;
  - on wide looks the head leads, the chest follows, the hips come last; the hips stay within 10.5° and the
    knees within 4° of their hooves; the chest's own twist on the hips peaks after the head's turn and
    before the hips';
  - the arms keep their rest hang within 2° on the horse and within the fitted swing and 2° on all eleven;
    the elbows ease more than 1°, within 5° of rest; the wrists within 8°; the arms' heading follows the
    trunk's more than 30 ms behind; at 5 Hz on the rigs whose chest twists less than 10°, at 2 Hz on the
    rest, and sooner at 5;
  - looking down (the goat, whose clothes let it look deepest), the head joint is carried more than 3 cm
    forward and the chest rounds; the chest never rounds further than its fitted rounding, on all eleven
    over four seeds each;
  - the neck: the neck bone at the branch's base and the head joint at its tip, bent by the branch's chord
    toward the face, restated apart from the module and posed on all eleven; and the skin with it: on a 25°
    nod the nape travels forward more the higher it is, 2 cm or more three quarters of the way up and 3 cm or
    more at the top, on all eleven;
  - leaning: the hips move toward the hoof and hike as far as the fitted share of a full lean, the nearer
    knee within 3° of rest, labelled as a lean, on all eleven;
  - breathing: rate, inhale shorter than exhale, one sigh, the shrug (3 mm a breath, 10 mm the sigh) and
    the shoulders' rise in the world;
  - looks over 40 seeds: about a dozen shifts a minute, rests of 8 s or more, every loop looks aside and
    down, sides repeat sometimes, every shift at least 6°, tilts only on looks aside, 1.5–4° and into the
    turn; glances over 60 seeds: the gaze comes back up after one, below 12° down at most 4 s at a stretch
    and a quarter of a loop; between looks the head strays, at least 0.15° in every hold of 2 s or more and
    0.6° in a typical one (the horse, the sheep, the pig director, ten seeds each);
  - the fits are reused, and the looks stay within each character's reach;
  - every character looks about over four of its loops: its head turns 120°/min or more and sweeps 9° or
    more, its hips sway 3 cm or more, its elbows ease; all but the two held heads reach 44° or more each way
    and 10° or more down, and the two are named with what they reach;
  - the clothes rules: no cloth more than 12 cm from an arm's bones moves with that arm (the rigs weight
    hundreds of such vertices to it); sleeve cloth on a forearm stays within 1 mm of the point it lay on;
    no trouser vertex round a belly takes a thigh or a shin;
  - each character gazes from its own catalog eye point, carried by the head;
  - options (seed, length, eye within 0.5 m of the head, refit, no other keys, an object) and time
    validation; `dispose` restores the bones, the skin weights and the skeleton each part had, also on the
    bull under its game motion, and an idle can be made again; the rig key holds while an idle runs; the hen
    is refused before anything on it changes.
- `tests/idle-clothing.test.mjs` (2): the census above, through each mammal's loop and at its fitted head
  limits and 5° past them.
- `tests/idle-fits.test.mjs` (3): every mammal has its row in `idle-fits.js` and reads it; a refit of all
  eleven matches; the key changes with a vertex, a skin weight, a bone's rest turn or scale, or a triangle's
  winding, and not with the same weights in other slots.

**Mutations.** 24 mutants of v4, each on an untracked copy of the module and of the test files that should
catch it (`mutate-v4.mjs` in the session's scratchpad): across the measure (the graze; what counts as
showing at rest; the self-crossing test and its slid exemption; the still vertices; the rays), the weight
corrections (the neck layers' head weight and their height margin; hair; the arms' weight beside the arms;
the sleeves; the neck skin on the neck bone), the breath in the probes, the seed, the rig key (skin weights;
a key that changes while the idle runs), options and the eye, the drift, the chest's timing, the rebinding on
dispose and the belly rule. A mutant in the fit code shows through the refit of all eleven. All are killed
but one: without the test of still vertices against the parts moving past them, no character's fit changes,
since on these rigs a moving part that swallows a still vertex sinks into it too, so a moving vertex fails at
the same angle; the census still tests every vertex. (The rebinding mutant first ran the test file out of
memory, as a failing comparison of two skeletons had the test runner print both; the test now compares them
as a yes or no, and fails in half a second.)

**Browser** (`tools/check-idle-study.mjs`, preview on port 4486): 35 configurations and 866 seeks with no
errors; GPU resources stable across repeated seeking (13 geometries and 6 textures before and after); the look
buttons work; unknown controls and values, and a gaze line that is not on or off, are refused. Review images are in
`docs/tactics/hybrid-review/idle/`: `close-three`, `gameplay`, `surroundings`, `looks-horse` (every look of
seed 1), `glance-down-profile` (six characters' deepest glance down in loops 1–8, beside the loop's opening
look), `cast` (all eleven at one moment) and `compact`.

## What was tried and dropped

In v4:
- **Smoothing the weights a layer takes from the skin** over the layer's own surface (4 and 10 rounds of
  averaging with its neighbours), to soften the neckerchief's jump to the jaw. The layers then slid on the
  skin again: at 4 rounds the horse's nod fell from 15° to 5°, the donkey's turn from 40°/40° to 10°/20°,
  the dog's to 25°/25° and the rabbit's to 25°/15°; at 10, worse on all of them.
- **The skin under a layer along the line out from the neck's axis.** It restored the rabbit (40°/40°), but
  the horse's nod fell from 20° to 0°: on the horse's chest the lines through the shirt and through the
  overalls over it met the skin at points far apart, so the two layers took different skin's weights and
  parted (the shirt 4.5 mm into the overalls on a 10° nod). Counted only where it meets the skin within 2–5 cm
  of the vertex, it changed no fit at all.
- **The neck bone taking a share of the head's turn** (round 3's suggestion), 0.3 and 0.5 of it. The sheep and
  the pig director gained nothing: what holds them is the wool on the neckerchief and the jowls on the collar,
  where the head's own turn moves the skin. The others lost: at 0.3 the cow's nod fell from 25° to 20° and the
  dog's from 20° to 15°; at 0.5 the horse, the cow, the rabbit and the dog each lost 10° of a turn and 5–10° of
  nod.
- **No height margin, or 2 cm,** for the skin under a layer: none cost the horse its nod (15° to 0°) and the
  cow most of its (25° to 10°); 2 cm cost the rabbit its turn right (40° to 15°). With 1 cm no character
  loses anything. The margin is a local number, about one triangle of these meshes.
- **The v3 measure.** Its triangle crossings between parts let a crossing slide along without limit, and
  its covered skin counted only a forearm, a hand or the head (round 3 found the donkey's shirt 10.4 mm into
  its trousers on a lean, and the goat's beard 6.8 mm into its throat on a turn, both excused). The rule
  now is sinking for every vertex of every part, and crossings only for a part through itself; with it the
  pseudo-normal inside test, and the re-winding it needed, went too (ray parity needs neither).
- **v3's "cloth on the neck taking the weights of the skin it lies on", dropped then, is the rule now.** Under
  v3's measure, cloth without head weight read better, since the skin's slide under it was excused as a
  crossing slid along; under v4's, that slide sank the neck skin 3.1–6.2 mm into eight characters' collars
  on a tilt, a turn or a nod, and the goat could turn only 10°/5°. Taking the skin's weights, with the
  height margin, every character but the sheep and the pig director regained its range.

From v3:
- **The nearer end's distance from the plane as a crossing's depth** ("edge depth"). It reads the
  triangles' size: on the cow's nape a neckerchief triangle 0.2 mm off the skin at rest moved less than 1 mm
  against it as the head turned 10°, and read 9.5 mm. The overlap along both normals reads 0.6 mm; it
  grades a part's crossings of itself still.
- **Skin up to 1 cm inside the cloth at rest, measured for sinking deeper.** The sheep's and the pigs'
  forearms rest 2–10 mm inside their waistcoats, coats and waistbands, so every breath and elbow ease "sank"
  them, though they are hidden there whatever they do. Only what shows at rest counts.
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
  jacket triangle with no torso vertex near it.
- **Counting crossings, or allowing only the rest pose's own pairs.** Neck skin already under a collar at
  rest slides as the head moves, so a strict pair baseline failed every rig at 5°, and a count stays level
  while the crossing moves somewhere new.
- **Measuring only head and arm triangles against torso triangles** (v2). It could not see cloth through
  cloth, or the neck skin, which belongs to neither set.
- **Longer neck branches** for the short-necked rigs (the full spine-to-head span, and 1.3×). The sheep
  and the pigs nodded no deeper, and the rabbit and the dog less. Three quarters stayed.
- **Floor vertices within 1 mm.** One of the skunk's and the pig foreman's boot heels sits 1.4–2.1 mm up
  in the mesh, so the sole hull lost a heel. 3 mm keeps the heels and stays under the toe spring (3.5 mm).
- **A lean sized by the nearest edge of the soles** (any edge): every short-footed rig got no lean. It is
  sized by the soles' width at the pressure point.
- From v1: a strong S-curve pushed the sheep's shirt through its vest before the waist blend; arms hanging
  with the pelvis's tilt swung the free hand into the hip; a sinking weight shift buckled the bearing knee
  from 21° to 30°; abs() and max() of the weight snapped the hand and the centre of mass.

## Review round 3 of 5 (7.5/10), and what changed

| finding | change | measured now |
|---|---|---|
| M1 the sheep and the pig director do not stand and look around | the clothes corrections, under the new measure: the layers on the neck take the skin's weights, the arms' weight stays on the sleeves, the sleeves' ends take the forearms'; the fits refitted; a floor test for everyone; the two heads still held are named, with what holds them, for the boss (Still open) | the director: elbows ease 2.4–2.9° (0.6–0.7), hips sway 6.8–13.2 cm (3.7), shoulders rise 4.9 mm on a typical breath (1.1), head 140°/min (116); the sheep: turns its head 40° left (10), head 225°/min (160), elbows 0.5–0.7° (0) |
| S1 a slid crossing has no depth limit outside the arm and head skin | sinking measured for every vertex of every part against every other part, in the fit and the census; crossings only for a part through itself | the census finds none: all eleven, seeds 1–2, every 1 s, and each at its limits |
| S2 which crossing grade is right | between parts, depth by vertex; the overlap grade stays only for a part through itself | — |
| S3 nine characters play one loop per seed | the seed is mixed with the rig's key | each of the eleven draws its own looks on seed 1 (a test) |
| S4 test gaps | tests for the drift, the chest's own delay, rebinding on dispose (and on the game's motion), the belly rule, each character's eyes, the nape's bend, the arms' weight on the sleeves, the sleeves on the forearms, one loop per character, the rig key's reach, the hen refused | 23 of 24 mutants killed; the survivor changes no fit |
| S5 `rigKey` misses edits the fits depend on | the key hashes the skin weights (whatever slots), the bones' rest turns and scales, the triangles and the bones the parts are bound to; it holds while an idle runs | a test edits each and sees the key change |
| S6 ordinary breaths about a pixel | the probes open the chest on a breath as the motion does; the rise is measured and said | a typical breath 4.6–5.1 mm on the nine that shrug in full (1.3–2.0 px at the close-up scale), the sigh 11.9–14.4 mm; the sheep breathes with its chest alone |
| S7 `createIdle` throws on a worker the game's motion drives; the hen throws a TypeError | built on the skeleton the parts are bound to now; a rig without arms is refused, saying which bones it lacks | the bull on its game motion idles and returns to that skeleton (a test); the hen is refused (a test) |
| nits | the counts, times and margins measured afresh (below); unknown options, a null options object and an eye more than 0.5 m from the head joint are refused; the refit test's time; the goat's throat and the build time of a 600 s loop noted; one loop per character, so seed 1 is no longer one sparse loop for nine of them | — |

## Review round 2 of 5 (6.5/10), and what changed

| finding | change | measured then |
|---|---|---|
| M1 the neck-cloth correction makes crossings no fit or test can see | the fit and the test measure everything against everything; the neck in rings; the mane takes the skin's weights | the census found none, all eleven |
| M2 the neck does not bend | a runtime neck bone, the skin and cloth weighted along it | the neck geometry pinned by a test |
| S1 a slid crossing may sink without limit; the arm fit clears a rule | covered skin for the forearms, hands and head; weight shift, ease, shrug and rounding fitted per character | v4 extends it to every vertex |
| S2 glances become stares at the floor | after a glance the gaze rests ahead or drifts up | at most 2.75 s below −12° a stretch; a median 7% of a loop (at most 24%) |
| S3 test gaps | limits posed and 5° past them, by an independent census; the neck pinned; a 1 ms seam stencil; the 5 Hz arms; each character on its own seed; glance statistics | — |
| S4 doc claims | measured afresh | — |
| S5 breaths barely visible | the shrug is 5 mm a unit (from 4) | — |
| nits | the gaze from each character's own eyes; `set({gaze})` takes only true or false; a second idle on one rig is refused; the trouser cuffs documented; phantom-wrench prints its 0.5% gate as 0.5% | — |

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

`createIdle(worker, {seed = 1, length = 30, eye = null, refit = false})`. The options are an object, and any
other key is refused. `seed` is a whole number 0–4294967295 (each rig draws its own loop from it); `length` a
finite number of seconds from 12 to 600; `eye` the world point between the eyes on the rest pose (the
catalog's `eye`; the horse's by default), within 0.5 m of the head joint; `refit` fits the character afresh
instead of reading `idle-fits.js`. The worker must have the mammal bones (hips, spine, head, and both arms and
legs down to the fingers and hooves), every part bound to one skeleton (the rig's own, or one a motion such as
the game's walk has made); a rig already running an idle is refused until that one is disposed. It returns:
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
neck bone and its weight corrections while it runs; `dispose` returns the rig to its neutral pose, the
skeleton its parts had and their weights.

## Still open

- **Two heads their clothes hold** (the boss's call, being the characters' design). The sheep's wool ruff
  overhangs a neckerchief tied tight on it, so its head turns 40° left and only 10° right, and does not nod
  or tilt; the pig director's jowls rest on his collar (their contact line shows at rest), so his head turns
  5° left and none right and does not nod, and he looks about with his trunk. A neckerchief tied lower or
  looser, and a collar set lower or out from the jowls, would free them; refitting is one command. Everything
  else on both now moves.
- **Cloth that gives.** A collar or a neckerchief that deformed under the jaw (cloth, or a corrective shape)
  would let a head turn and nod further than any weighting does.
- **The goat's throat** shows the red of its collar through the skin at rest (round 3's close-up): the asset,
  not the motion.
- **Shared body model.** Six characters share one skeleton, and every one balances with the same segment
  masses, so the pot-bellied pigs balance like the horse. The audit's shoulder girdle (a rigid segment
  from the chest to the shoulder) lengthens up to 2.97% as the shoulders shrug: the shrug moves the arm's
  root, which the rigs have no clavicle for.
- **Build time.** A loop is built when it is made: 0.17–0.28 s for 30 s, 8–13 s for the longest (600 s).
- **Integration.** Units in `battle-3d` do not idle yet; a transition is needed to and from other motions.
- **Targets.** Looks are random directions. The game would supply real ones: a sound, a teammate, a
  threat.
- **No eyes or ears to animate.** The heads have no eye or ear bones, so all looking is done by turning.

## Independent integration review — October 8, 2026

Reviewed `0ab4372` and the subsequent `6d1fba7` revision. Approved as a separate animation study with the viewer correction below; this does not enable battle idles. The restored neck bend and restrained weight shifts read well on the horse and donkey. The latest sheep can turn much farther left, and the pig director has more body movement; their remaining head restrictions are documented clothing limitations.

All 39 focused tests passed on the latest revision: idle motion, clothing, cached fits, distribution module graph and Pages file coverage. This includes refitting all eleven mammals. Independently inspected the packaged horse, donkey, sheep and pig director across the two revisions, plus character/seed changes during playback. The earlier 30-test suite also passed before the revision arrived.

Found and reproduced a viewer failure: play the study, then select the rabbit. While its paint loads, the old `cast()` cleared `motion`; the next frame read `motion.length`, threw, and stopped scheduling frames. The correction keeps the previous actor alive until a complete replacement is ready, ignores superseded loads, disposes unadopted actors and respects page disposal. Repeated character changes and a seed change now keep the timeline advancing, including through its wrap, with no new console errors. Syntax and the rebuilt Pages module checks also pass.

Before gameplay integration, choose how this unarmed study and the armed idle share pose ownership, and test transitions to movement, aiming, climbing, damage and death. Their current local-space controllers reset the root transform and must not be applied directly to world-positioned battle actors.
