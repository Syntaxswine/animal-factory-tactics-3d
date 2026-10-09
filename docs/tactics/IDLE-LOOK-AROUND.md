# Idle: standing and looking around

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

**Direction (the boss, 2026-10-08, on the first draft):** "the necks need to bend forward like a heavy
branch if you want the heads to tilt down that far."

The draft tipped the head about its one joint, a stiff rod pivoting on the neck. Looking down jammed the
jaw into the chest: 2.8–5.8 cm into the clothes on most characters. The section on the neck below
answers this: the idle gives the rigs a neck bone and bends it.

This is the fifth version (v5). Review rounds 1–4 of 5 scored the first four 5/10, 6.5/10, 7.5/10 and 7/10, and round 5 scored v5 8/10 (its findings are open, and v5's
transferable corrections went to a handoff on `main`);
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
or value, and a gaze line that is not `true` or `false`. A new seed builds in 0.23–0.41 s, and switching
character takes 0.71–1.19 s with its model and paint (in Node an idle builds in 0.5–1.1 s), measured while
other test suites shared the machine (v4 measured 0.15–0.22, 0.33–0.81 and 0.17–0.28 s on a quieter one; the new
neck glue takes 0.1–0.3 s of a build): the fitted limits ship with the module (below).

The module is `dist/tactics/idle-motion.js`, the fitted limits `dist/tactics/idle-fits.js`, and the study
page `idle-study.html` / `.js` / `.css`.

## What moves, and why

The idle is authored where a person would author it and computed where physics decides it. Each seed
gives a **seamless loop** (30 s by default): `at(t)` wraps, and the same seed always replays the same loop.
The seed is mixed with the rig's names (its parts' and bones'), so the cast on one seed do not share one choreography,
and a fix to a character's meshes or weights keeps its loops.

**Looks.** A relaxed worker mostly rests the eyes ahead, and the rigs have no eye bones, so every change of
gaze is a turn of the head; the plan keeps those few.
- **Kinds.** Rests ahead of 4–9 s, now and then 9–13 s; drifts, the gaze moving 6–12° in yaw and a little in
  pitch (6.0–19.8° all told), held 2–4.5 s; looks 28–50° to one side (or as far as the character can turn)
  held 1.5–3.5 s; glances at the ground in front (no further aside than the character can turn, less 3°), held
  1–2.2 s. A side look picks its side at random,
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
  have no side look and 11 no glance down (the redraws give up after 12). The gaze is below 12° down for
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
  hold its head looks with its trunk: the pig director's chest and hips carry his looks 9° each way.
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
  nod, whichever is more, up to the character's fitted rounding (10° on seven of them).

**Breathing.** About 14 breaths a minute: breaths whose lengths add up to the loop, 3.5–5.1 s over 5000
seeds. The inhale is 38–45% of each breath, eased both ways; one breath per loop is a sigh, 2.8× as deep,
with a 32% inhale and a long exhale.
- **The shoulders shrug** 5 mm per unit of breath at the arm roots (14 mm in the sigh), times the
  character's fitted shrug, and the chest opens half a degree per unit.
- **Measured** (shoulders against the hips, 8 seeds): 2.3–6.7 mm on a breath (a typical one 4.6–5.2 mm,
  1.3–2.1 px at the study's close-up scale) and 12.2–14.6 mm on the sigh, on the nine characters that
  shrug in full; 0.9–1.3 and 3.0–3.1 mm on the pig foreman (a quarter); the sheep's shoulders do not rise,
  and its chest opens alone. A quiet breath is small in life too; the sigh is the one that reads.

**Leaning toward one hoof.** The weight moves from both hooves toward one and holds 6–11 s, then moves
back (held 4–8 s) or across; each shift takes 1.2–1.7 s. Most loops lean once or twice; the square stance
is mostly the one across the seam (5000 seeds: 42 loops hold square inside the loop). The lean is the
character's fitted share of a full lean: full on eight, three quarters on the sheep and the pig director, a quarter on
the pig foreman.
- **The pressure point** moves 4.5 cm times that share toward the hoof (less on a narrow stance, so it
  stays 4.5 cm inside the soles; every rig here has the room). On the horse's 46 cm stance the nearer hoof
  then carries 55–65% of the weight: a lean, not a stand on one leg. Both hooves stay planted flat, so a
  real weight shift onto one leg (70–80%) would need the feet closer or a heel lifted.
- **The hips** follow it 5.3–7.0 cm toward that hoof at a full lean (at three quarters, the sheep and the pig
  director 4.3–5.1 cm; the pig foreman 1.1–1.8 cm) and hike: the pelvis rolls 4.5° (times the share), that hip up. The nearer knee holds its rest
  bend (20.4–22.8° against 21.3° at rest; the pig foreman 28.9–29.8° against 30.1°); the far leg, its hoof
  planted wide, straightens a little as a prop (15.7–21.5°).
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
  made gentler. Measured, the legs reach at most 99.14% (96.99% on the pig foreman).

**Arms.** They hang from the shoulders.
- **Heading.** They follow the hips plus half the chest's twist, a beat behind (a 2 Hz second-order lag;
  5 Hz where the chest cannot twist 10° either way: the two pigs).
- **Swing.** An arm keeps its rest hang, swinging out only where its character's clothes need it (fitted,
  below): the pig foreman's 1.5° as he leans, and the sheep's right arm the same, their forearms by their
  clothes.
- **Easing.** The elbows bend 1.5° past their rest bend on average and ease ±2° over the loop (32.0–35.4°
  against 32.2° at rest); the hands hang on from the forearms, the wrists easing up to 8.0°, and the fingers
  curl a little. All of it times the character's fitted ease: full on nine; the sheep's and the pig
  foreman's arms do not ease, their forearms resting on their clothes (below).

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
- **The forearm's weight stays on the sleeves.** The rigs weight some cloth beside the forearms to them: the
  side of a shirt at the waist, beside a hanging hand, moves 35–75% with the forearm (the donkey's, the
  bull's), so the hip tore it as the weight shifted. The forearm's weight stays on cloth within 10 cm of the
  forearm's bone (elbow to wrist), fading out by 12 cm, and goes to the cloth's own blend beyond. The upper
  arm keeps the weight the rig gave it: a sleeve round a stout upper arm (the pigs') lies up to 20 cm from
  the bone. (v4 measured from the whole arm and took the upper arm's weight off the pigs' sleeves too.)
- **The neck.** The neck skin is weighted along the neck bone by height above the branch's base (u, in
  branch lengths): of the weight not on the head, the neck bone takes smooth((u + 0.15)/0.6), so the neck
  bends most at its base; the skin keeps the head weight the rig gave it, and the head itself (vertices the
  rig gives wholly to it) is left alone. **Every layer on the neck** (a collar, a neckerchief with its knot
  and ends, the tops of a shirt, waistcoat, bib or braces) **takes the weights of what it lies on**, in one
  field: in full within 3 cm of the neck's median radius, easing to the layer's own weights 13 cm out, and
  from the neck's base up, fading in from a tenth of the branch below the base to a tenth above it, so the
  chest's cloth keeps the chest's weights.
  - **Layer on layer.** The layers are taken in order, from the inside out: a shirt, trousers or overalls,
    a waistcoat or jacket, a collar, belt, pouch or cap, then a neckerchief's wrap, knot and ends. Where a
    layer lies within 1.5 cm of one taken before it, it takes in full the weights of that layer's nearest
    point; elsewhere it takes the skin's, as far as the field reaches. A bib over a shirt so moves with the
    shirt, not with a skin point of its own (round 4 found v4's shirt and bib taking different skin points
    and sliding against each other, up to 13 mm).
  - **The skin under a layer** is the nearest point of the skull's surface no higher up the neck than the
    layer is, with 1 cm (about a triangle) to spare, the height read at that point itself: the nearest point
    outright put the rabbit's neckerchief's top edge on its jaw, and the band folded as the head turned.
    Cloth with no skin that low under it keeps its own weights. (v4 read the height at a triangle's lowest
    corner, and fell back to the nearest point outright.)
  - **Hair**, which nothing lies on (a mane, the goat's beard), takes in full the weights of the skin it
    grows from, at the nearest point.
- **A sleeve's end round a forearm** takes the weights of the skin under it, in full within 1 cm of it and
  easing to its own 3 cm away. The rigs weight the inside of a sleeve at the elbow about half to the chest
  (the dog's 48–58%), so a twist of the chest slid the forearm out through it, 7–16 mm on the dog, the pig
  director and the sheep.

## Fitted to each character

Each character's limits are measured on its own skinned meshes, by two tests on every part of the rig:

- **Sinking.** The points tested are every vertex, and points 4 mm apart across every triangle that crosses
  another part's surface or has a corner inside it (i/m and j/m of the way along two of its edges, m its
  longest edge at rest over 4 mm, rounded up), carried between its skinned corners as the GPU draws them. The
  meshes' edges run 1–11 cm (a median of 13–45 mm), so a triangle's middle can go under while its corners
  stay out; and a triangle that neither crosses a part's surface nor has a corner inside it lies wholly
  outside it, so the others need no points. A point that shows at rest (outside every other part, or less
  than 0.5 mm into one) may go no more than 3 mm deeper into another part than it lay at rest: a pixel at the
  study's close-up scale (280–400 px a metre as the window allows; the game draws at 130).
  - **Deeper only beside what was already covered.** Where layers overlap, an edge slides over what it
    covers: a bib's top edge over the shirt, a sleeve's cuff over a forearm. A point may go further in where,
    within 6 mm of it at rest (on its own triangle or one sharing a corner with it), its own part lay hidden
    under the same stretch of the other part: as deep as that hidden point lay (to 2 cm), and 3 mm more. The
    same stretch: the point of the other part's surface nearest the point now, taken back to where it rests,
    lies within 1 cm of the point of it nearest the hidden one at rest. A part that comes in over another
    from anywhere else (a shirt's hem over a forearm that lay in its sleeve) is held to 3 mm. This bounds how
    deep a point goes, within a 6 mm zone, not how far an edge travels: an edge may advance any distance
    while what it covers sinks 3 mm or less. Through loops, review round 5 measured edges advancing 15–18 mm
    over what they cover (5–6 px at the close-up) on the sheep (its neckerchief over its neck, its left
    forearm over its shirt) and the pig foreman (his trousers over his hands), 14 mm on the dog's knot and
    5–7.3 mm on the other loops it audited; none reads as a tear in its renders. (Corrected after round 5:
    this doc had said an edge "may advance 6 mm ... and no further".)
  - **Inside.** Every part of these rigs is a closed surface (each edge, its corners welded to 0.1 mm, shared
    by exactly two triangles, once zero-area slivers are set aside; the donkey's mane also holds two loose
    two-triangle slivers inside it), so a point is inside a part where a ray from it crosses the part an odd
    number of times, and as deep as it is far from the part's surface.
  - **Hidden at rest.** A point half a millimetre or more inside another part at rest is not followed: it is
    drawn behind that part's surface, and what shows of it going deeper is the surface beside it, which
    showed, and which is sampled every 4 mm.
  - A moving vertex is tested against every part round it; a still one against the parts that move within
    3 cm of it, all that one of a probe's steps can bring.
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
- **The limit** of each is the largest angle, in steps of 2.5°, that clears in every way it is probed (a turn
  level and tilted each way, say), both there and 2.5° past it: those 2.5° are kept in hand for the idle's
  other motions. Each way is bisected (5° steps, then the half step before the first that fails, or past
  the top), and the least of them is then confirmed in every way, at the limit and past it, a step lower
  each time one does not clear. So the census below poses exactly what the fit confirmed. (v4 kept 5° in
  hand in 5° steps, so a pose that cleared at 5° read as a limit of 0.)
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

**The table.** The fits depend only on the rig, not the seed. They take 7–50 s a character on a loaded machine (the pig foreman's the longest), and the eleven ship in `idle-fits.js`, keyed by `rigKey(worker)`: a hash of the rig's bones (names, rest places, turns
and scales), and of its parts' names, every vertex in order (to 0.1 mm), the triangles, each vertex's skin
weights (whatever slots they sit in) and the bones those name. An edited rig misses the table and is fitted
afresh, and so is one the game's motion has weighted afresh; while an idle runs, `rigKey` gives the key it read
before it began. `node tools/fit-idle-rigs.mjs` writes the table (about 5 minutes); `createIdle(worker, {refit:
true})` fits afresh; `tests/idle-fits.test.mjs` checks that every mammal has its row and refits all eleven.

| character | turn L / R | nod | up | tilt | twist L / R | weight shift | ease | shrug | rounding | reach L / R / down |
|---|---|---|---|---|---|---|---|---|---|---|
| Horse worker | 40° / 27.5° | 25° | 10° | 5° | 30° / 30° | 1 | 1 | 1 | 10° | 53° / 44° / 35° |
| Goat worker | 40° / 40° | 12.5° | 10° | 5° | 12.5° / 22.5° | 1 | 1 | 1 | 10° | 53° / 53° / 22.5° |
| Bull worker | 40° / 40° | 12.5° | 10° | 5° | 10° / 22.5° | 1 | 1 | 1 | 5° | 52° / 53° / 17.5° |
| Cow worker | 40° / 40° | 12.5° | 10° | 5° | 22.5° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 22.5° |
| Donkey worker | 40° / 40° | 30° | 10° | 5° | 27.5° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 40° |
| Sheep worker | 20° / 10° | 2.5° | 2.5° | 2.5° | 10° / 10° | ¾ | 0 | 0 | 0° | 34° / 21.5° / 2.5° |
| Skunk worker | 40° / 40° | 27.5° | 10° | 5° | 15° / 12.5° | 1 | 1 | 1 | 7.5° | 53° / 53° / 35° |
| Pig foreman | 40° / 40° | 15° | 10° | 5° | 0° / 2.5° | ¼ | 0 | ¼ | 0° | 45° / 47° / 15° |
| Pig director | 2.5° / 2.5° | 0° | 10° | 0° | 7.5° / 7.5° | ¾ | 1 | 1 | 10° | 12° / 12° / 10° |
| Rabbit worker | 40° / 40° | 15° | 10° | 5° | 22.5° / 30° | 1 | 1 | 1 | 10° | 53° / 53° / 25° |
| Dog guard | 40° / 40° | 25° | 10° | 5° | 17.5° / 15° | 1 | 1 | 1 | 10° | 53° / 53° / 35° |

Against v4, measured as the eye sees it (surface, not vertices), the nods of the goat, the bull and the cow fell
from 25–35° to 12.5°, and six characters' chest twists by 7.5–17.5°: the shirt sliding under the bib or the
braces as the neck bends or the chest turns, which v4 could not see (round 4 found it 11–13 mm deep on the horse
and the bull). The horse's nod rose from 15° to 25° and the donkey's from 15° to 30°. Where each limit comes from,
at the next step past it:

- **The horse's turn right (27.5°):** at 32.5–35° its shirt goes 4.3–7.5 mm under the bib's top edge, at the
  front right of the neck.
- **The goat's, the bull's and the cow's nods (12.5°):** at 15–20° the shirt goes 3.0–5.7 mm under the bib (the
  bull's in front, the cow's at the side), or the braces 4.0–7.7 mm into the shirt behind (the goat's).
- **Their chest twists:** the shirt and the overalls into each other at the waist, 4.0–8.3 mm.

Only two characters' arms swing out: the pig foreman's 1.5° as he leans (a half degree, and one for the heading's
lag), and the sheep's right arm the same.

**Held by their clothes.** Two characters' heads are still held where moving would push skin under cloth,
and two characters' arms; each limit is clear 2.5° past it in every way it is probed, and what fails is the
step after (5° past a head's limit, the next quarter of a share), so each is the clothes', not the fit's
rounding:
- **The sheep's head.** Its wool ruff overhangs a neckerchief tied tight on it: 5° past its turns the
  neckerchief goes 3.0–4.0 mm into the wool, and over 3 mm on a 7.5° tilt, or a 7.5° nod with the head turned
  20° left (a 5° tilt or nod is clear). So it turns its head 20° left
  and 10° right, and nods, tilts and looks up 2.5°. (v4 let it turn 40° left: round 4 found the neckerchief
  5.9 mm into the wool there.)
- **The pig director's head.** His jowls rest on his collar (their contact line shows at rest): 5° past his
  turns the collar goes 3.1–4.4 mm into the jowls, and a 2.5–5° nod 3.4–11.2 mm. So his head turns 2.5° each way,
  looks up 10°, and does not nod or tilt; he looks about with his chest and hips, 9° each way. The
  rest of him moves: three quarters of the lean (a full one folds his trousers through themselves at the knee,
  3.1–3.6 mm), the arms' ease and the shrug in full, and 10° of rounding.
- **The sheep's and the pig foreman's arms.** Their forearms rest against their clothes: the sheep's on its
  shirt and waistcoat at the waist, where the full ease standing square presses the forearm 4.8 mm into the
  shirt, and a quarter of it in the lean 4.2 mm; the pig foreman's by his shirt's hem and his waistband, which
  in a lean of a half or more press 4–7 mm into his forearms, however far up to 4° his arms swing out (round 4's
  renders showed the hem cutting them). So their elbows and wrists do not ease
  (no swing out up to 4° frees them), the sheep leans three quarters and shrugs none, and the pig foreman leans a
  quarter and shrugs a quarter, does not round his chest, and twists it 2.5° one way.

A neckerchief tied lower or looser, a collar set lower or further out from the jowls, and a shirt hem higher
or sleeves cut wider would free them: those are changes to the characters, so they are the boss's call (Still
open). Everything else on all four moves.

## Measured

Everything below is v5 at the commit that carries this document. "All eleven" means the eleven mammal
workers. The measuring ran while another agent's test suites shared the machine, so the times are upper bounds.

| check | scope | result |
|---|---|---|
| sinking and new self-crossings, by a census written apart from the module (its own skinning, sampling, broad phase, nearest points and rays, along x), to the same rule | every one on its own seed every 2 s and at its widest look, deepest nod, highest look, the chest's three widest turns, its fullest leans, deepest rounding and the top of its sigh (the test) | none |
| each fitted head limit, and 2.5° past it, by the census | all eleven, every way the fit probes it (the test) | none; and 5–10° further it finds what the fit found (the horse's shirt 7.5 mm under its bib at a 35° turn right; the pig foreman's shirt 3.3 mm into his jowls at a 25° nod) |
| the same census through the loops | all eleven, seeds 1–2, every 0.5 s (1,320 frames) | none |
| round 4's surface census (`sdepth.mjs`: 3 mm points, ray parity along a diagonal, its own rule, which has no slide) | the same 1,320 frames | at most 5.9 mm (the goat's braces into its shirt behind on a glance down; the sheep's waistcoat hem into its shirt); the pig foreman's forearms 4.8 mm (round 4: 16.2); a point over 5 mm in 19 of the 1,320 frames, over 3 mm in 333; the donkey none, the pig director at most 3.8 mm. The census (the row above) finds every one of those frames clean: each is an edge sliding within 6 mm of where it covered at rest |
| required centre of pressure (Dempster masses, independent of the motion's model; soles within 3 mm of the floor) | all eleven, seeds 1–6, every 20 ms | at least 2.8 cm inside the soles (the dog; the rabbit 2.9 cm); the other nine 5.3–8.5 cm |
| phantom-wrench (`rigs/idle.mjs`, exact contact, gate 0.5% body weight / 2 N·m) | all eleven, seeds 1 and 2 | 0 N and 0 N·m in every phase; the gate passes |
| its negative control: centre of mass behind the heels | all eleven, seed 1, at 1 cm and 0.5 cm | fails on every one: at 1 cm over the gate 13.8–29.9 s of the 30, at 0.5 cm 2.8–21.4 s |
| head turn from the chest | all eleven, seeds 1–8 | at most 36.0° (the sheep 20.5°, the pig director 5.4°; the timing aims for 36°; cap 40°) |
| head tilt on the chest | all eleven, seeds 1–8 | at most 4.8° |
| gaze on each landed look | all eleven, seeds 1–8 | within 2.7° |
| hips' turn | all eleven, seeds 1–8 | at most 8.6° |
| knee twist off its hoof | all eleven, seeds 1–8 | at most 1.4° |
| arm out from its rest hang, in the chest's frame | all eleven, seeds 1–8 | at most 4.2° (the pig director); the others at most 3.9° |
| wrist | all eleven, seeds 1–8 | at most 7.8°; the sheep and the pig foreman do not ease theirs |
| peak bone acceleration (2.5 ms tiles) | all eleven, seed 1 | 0.51–2.42 m/s² (a kink reads as tens) |
| leg reach | all eleven, seeds 1–8 | at most 99.14% of the leg |
| cloth the rig weights wholly to the chest, above the waist blend, against the chest bone (round 4's `dragloop2.mjs`) | the six whose deepest glance down passes 14° (horse, bull, goat, skunk, rabbit, cow), into it, seed 1 | 0.6–4.3 mm within 3 cm below the neck's base (the horse 4.3 mm), none further down (round 4: 8.1–15.9 mm) |
| sleeve cloth on the forearms | all eleven, seed 1, every 0.5 s | within 1 mm of the forearm point it lay on (the test) |
| builds | all eleven, 30 each: 20 seeds across the 32-bit range, 0 and 2³²−1, and loops of 12–600 s | no failures and no NaN; balance residual at most 0.41 mm; seam velocity jump at most 0.04 mm/s; no look past the reach; the head at most 36.3° from the chest |

**Renders** (the study's own renderer at the close-up, rest beside the moment; in `docs/tactics/hybrid-review/idle/`):
`clothes-foreman-leans` (the pig foreman's forearms at rest and at the leans of seeds 1 and 2 where the strict census
reads 4.8 and 4.6 mm: the shirt's edge barely moves on them), `clothes-slides` (the four deepest strict-census
frames: the goat's braces behind, the sheep's waistcoat hem, the horse's bib top, the skunk's waist) and
`clothes-bib-glances` (six characters' bib tops at rest and at their deepest glance down of seed 1: the
neckerchiefs' ends move over the bib; the bib's top edge shows a light sliver at rest as in the glance, the asset).

**Liveliness** (`lively.mjs`, round 3's measure, seeds 1–4; v4 in brackets):

| character | head turns °/min | yaw range | pitch range | hips sway | breath rise | elbow ease |
|---|---|---|---|---|---|---|
| sheep | 234 (225) | 29.1–45.0° (15.3–59.3) | 1.7–3.7° (1.7–4.3) | 5.3–10.1 cm (3.8–6.8) | none (none) | none (0.5–0.7°) |
| pig director | 142 (140) | 8.9–18.5° (10.1–14.1) | 0.9–9.7° (2.3–5.8) | 5.3–10.1 cm (6.8–13.2) | 4.9 mm (4.9) | 2.2–2.5° (2.4–2.9) |
| pig foreman | 368 (339) | 38.8–74.9° (39.3–72.1) | 10.2–14.8° (7.5–9.5) | 2.5–4.1 cm (5.8–10.3) | 1.1 mm (1.1) | none (1.1–1.3°) |
| the other eight | 307–441 (273–470) | 33.6–95.6° (34.8–94.2) | 11.0–28.0° (10.6–27.5) | 6.8–13.8 cm (6.8–13.6) | 4.6–5.2 mm (4.6–5.1) | 2.1–2.9° (1.9–2.7) |

**The sweeps** (round 4's S2). Each local number changed alone, all eleven refitted under the same measure; the
total is every character's head and chest range summed (turn both ways, nod, look up, tilt, twist both ways and
rounding, in degrees) with each share (ease, shrug, weight shift) as 10° a whole. The sweeps ran before the
lean probes bent the knees, which took a quarter of the pig director's lean, so their base sums 1,822.5; the
shipped table sums 1,820.

| number | values tried (total) | what moves | criterion |
|---|---|---|---|
| the zone beside what a part lay covered at rest, in which a point may go as deep as the covered point lay | 4 mm (1,677.5), **6 mm** (1,822.5), 8 mm (1,907.5), 10 mm (1,980) | everything, steadily: at 10 mm the horse turns 40° right and the goat, the bull and the cow nod 20° | not range: what shows. The zone is 6 mm (two pixels at the close-up); the edges themselves travel further (15–18 mm on the sheep and the pig foreman, review round 5). The range a larger zone buys is more slide on screen: the boss's call (Still open) |
| the same stretch: how near the covering point must rest to where it covered | 5 mm (1,697.5), **1 cm** (1,822.5), 2 cm (1,827.5) | 5 mm costs every character; 2 cm frees the bull's rounding 2.5° and the director's turn right 2.5° | about a triangle of these meshes; the total is flat from 1 to 2 cm |
| the neck glue's height margin | 0 (1,795), 0.5 cm (1,822.5), **1 cm** (1,822.5), 1.5 cm (1,825), 2 cm (1,825) | nods trade 5–10° between characters from 0.5 to 2 cm (the skunk's, the goat's, the horse's); 0 costs the horse 12.5° of turn each way | about a triangle; the total is flat from 0.5 to 2 cm |
| where the forearm's weight starts fading from the cloth beside it | 8 cm (1,755), **10 cm** (1,822.5), 12 cm (1,750) | 8 cm costs the pig director his ease, shrug, lean and rounding and the skunk its ease and rounding; 12 cm costs the donkey its twist (27.5°/30° to 7.5°/7.5°), ease, shrug and rounding | where the sleeves end and the cloth beside the hand begins: the tightest sleeves (the sheep's, the pig foreman's, the dog's) lie 95% within 8.7–9.5 cm of the forearm's bone, while on every rig 5–23 vertices of the cloth the forearm drags (weighted 1–50% to it) lie 10–12 cm out and 3–66 beyond; and the only value of the three that costs no character anything |
| how near a layer must lie to take the weights of the layer under it | 1 cm (1,805), **1.5 cm** (1,822.5), 2 cm (1,810) | 1 cm costs the horse 15° of nod; 2 cm costs three characters 7.5° of turn | the largest total of the three |

The fit is no longer knife-edged by where vertices fall (round 4's M1); what remains knife-edged is a single
character's nod against a glue number, and the totals are flat round each choice but the zone.

**Tests**: three files.
- `tests/idle-motion.test.mjs` (33):
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
  - on wide looks the head leads, the chest follows, the hips come last (but on a look so wide that the trunk
    starts with the head); the hips stay within 10.5° and the knees within 4° of their hooves; the chest's own
    twist on the hips peaks after the head's turn and before the hips';
  - the documented constants, restated apart from the module: the drift 0.45° / 0.30° rms in yaw and pitch;
    the head keeping 34·tanh(yaw/34) of a turn (or its fitted turn), the chest half the rest (to 12°) and the
    hips the remainder (10·tanh), exactly, on every settled look of six horse seeds; the chest rounding 30% of
    a look below −12°, exactly; the arm roots rising 5 mm a unit of breath, exactly;
  - the arms keep their rest hang within 2° on the horse and within the fitted swing and 2° on all eleven;
    the elbows ease more than 1°, within 5° of rest; the wrists within 8°; the arms' heading follows the
    trunk's more than 30 ms behind; at 5 Hz on the rigs whose chest twists less than 10°, at 2 Hz on the
    rest, and sooner at 5;
  - looking down (the donkey, whose clothes let it look deepest), the head joint is carried more than 3 cm
    forward and the chest rounds; the chest never rounds further than its fitted rounding, on all eleven
    over four seeds each;
  - the neck: the neck bone at the branch's base and the head joint at its tip, bent by the branch's chord
    toward the face, restated apart from the module and posed on all eleven; the skin with it: on a 25° nod
    the nape travels forward more the higher it is, 2 cm or more three quarters of the way up and 3 cm or
    more at the top, on all eleven; and the skin's weights: the neck bone's share smooth((u + 0.15)/0.6) of
    what the head does not take, in the field's reach, restated and checked on every skull vertex of all
    eleven;
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
    more, its hips sway 3 cm or more (the pig foreman 2 cm), its elbows ease; all but the two held heads
    reach 40° or more each way and 10° or more down; the two held heads, the two held pairs of arms and the
    foreman's quarter lean are named with what they reach;
  - the clothes rules: no cloth more than 12 cm from a forearm's bone moves with that forearm (the rigs
    weight hundreds of such vertices to it), and nine tenths of the cloth the rigs weight to an upper arm
    keeps nine tenths of that weight; sleeve cloth on a forearm stays within 1 mm of the point it lay on; no
    trouser vertex round a belly takes a thigh or a shin;
  - each character gazes from its own catalog eye point, carried by the head;
  - options (seed, length, eye within 0.5 m of the head, refit, no other keys, an object) and time
    validation; `dispose` restores the bones, the skin weights and the skeleton each part had, also on the
    bull under its game motion, in either order of disposal, and an idle can be made again; the rig key
    holds while an idle runs; the hen is refused before anything on it changes.
- `tests/idle-clothing.test.mjs` (2): the census above, through each mammal's loop (the top of its sigh
  among the moments) and at its fitted head limits and 2.5° past them, in every way the fit probes them.
- `tests/idle-fits.test.mjs` (4): every mammal has its row in `idle-fits.js` and reads it; every limit is a step
  of 2.5° within its probe's top and every share a quarter; a refit of all eleven matches; the key changes with a vertex, two vertices swapped or nudged apart, a skin weight, a
  bone's rest place, turn or scale, a part bound to another skeleton, or a triangle's winding, and not with
  the same weights in other slots.

**Mutations.** 37 mutants of this revision, each on an untracked copy of the module and of the test files that should catch it (`mutate-v5.mjs` in the session's scratchpad), three at a time and every copy deleted in a `finally` block. A mutant of the fit gets its own fits table, refitted under it, so that only the property tests can kill it (the census for the measure, the key test for the key, the limits test for the steps); the others read the shipped table. 33 are killed, each by the property test it names (`mut-v5-results-final.json`): the measure's by the census (the graze at 6 mm, a 2 cm slide, no same-stretch test, vertices only, no crossing trigger, no self-crossing test, no breath in the arm probes); the weights' by the census and the weight tests (no layer glue, no height cap, the band reaching further down, hair on its own weights, the forearm's weight left beside it, the upper arm's stripped, no sleeve glue, the neck share starting lower, the neck skin off the neck bone); the five documented constants by the constants test; the key's three by the key test; no 2.5° in reserve by the limits test (it put turns 2.5° past the 40° seam); the rest by the tests of the API, the seed, disposal and the belly rule. Four survive. Three are equivalent on these rigs, each one's refitted table the shipped one: no trigger for a triangle with a corner inside another part (here such a triangle also crosses it, or its corner fails first), no confirmation of the limit (no limit here needed one) and no test of still vertices (as in v4). The fourth, points up to 5 mm inside another part at rest counted as showing, makes the fit stricter (the summed range falls 115°): no test that looks for clipping can see a fit that holds back more.

**Browser** (`tools/check-idle-study.mjs`, preview on port 4486): 35 configurations and 866 seeks with no errors; GPU resources do not grow across repeated seeking (20 geometries and 8 textures before, 11 and 6 after); the look buttons work; unknown controls and values, and a gaze line that is not on or off, are refused. Review images are in
`docs/tactics/hybrid-review/idle/`: `close-three`, `gameplay`, `surroundings`, `looks-horse` (every look of
seed 1), `glance-down-profile` (six characters' deepest glance down in loops 1–8, beside the loop's opening
look), `cast` (all eleven at one moment) and `compact`.

## What was tried and dropped

In v5:
- **The strict surface rule** (round 4's fix as written: no point deeper than it lay at rest by more than
  3 mm, a slide or not). The layers of these clothes overlap everywhere, and an inner layer's edge region
  goes a few millimetres further under the outer one at almost any motion; nods fell to 0–5° and chest twists
  to 2.5–15°, most characters staring ahead.
- **Any covering at all** (a point may go as deep as its part lay hidden within 2 cm of it, under whatever
  covers it now). The pig foreman's shirt edge then slid 15 mm down his forearms in his leans, the very
  defect round 4 found, since his forearms lie under the shirt at rest close by. Asking for the same stretch
  of the covering (a hem is not the sleeve) did not catch it: the stretch over his forearms is the same
  shirt edge, sliding. Allowing the extra depth only within 6 mm of where the part lay covered does (his
  forearms then sink at most 4.8 mm on round 4's strict census); it bounds depth, not how far the edge
  travels (review round 5).
- **Occlusion for garments only, then skin under hair excused**: special cases, and the pig director's head
  could not turn at all; the 6 mm zone treats every part alike.
- **Treating points up to 3 mm under as showing**, the threshold round 4 suggested for "visually at the
  surface". The layers' edge regions all lie 0.5–3 mm under at rest, so every nod and twist sank them.
- **An outward swing at rest** for arms their clothes hold (as little as lets the elbows ease), for the sheep
  and the pig foreman: no swing up to 4° lets their elbows ease in full standing square.
- **The sweeps** (Measured): the 6 mm zone at 4, 8 and 10 mm, the same stretch at 5 mm and 2 cm, the height
  margin at 0–2 cm, the forearm strip at 8 and 12 cm, the layer reach at 1 and 2 cm.

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

## Review round 5 of 5 (8/10): open, and where v5 went

One independent reviewer, October 9, 2026, on `4a819dc`; its report, whole, is
[IDLE-REVIEW-ROUND-5.md](IDLE-REVIEW-ROUND-5.md). 8/10 (round 4: 7/10; the target is 9), no MUST-FIX. Round
five is the last the standing rule allows without asking, so none of its findings is fixed in the code; this
doc's text is corrected where the review showed it wrong (listed below the table).

| finding | what the review measured | status |
|---|---|---|
| S1 the fit never probes what the loop combines | the census test's own census on seeds 5–10, every 0.5 s: 3 of 3,960 frames over the rule by 0.1–0.8 mm, on the pig foreman (a wide look with his hips turned 8.1° in a lean; the sigh's top in a lean) and the sheep (its arm lagging a chest twist), none visible in its renders; the probes never turn the hips, lag the arms or take a sigh inside a lean | open: probe those, or keep the plan from combining them on the held characters |
| S2 the 6 mm zone bounds depth, not travel | edges advance 15–18 mm over what they cover on the sheep and the pig foreman (14 mm on the dog's knot, 5.0–7.3 mm on the other loops audited), none reading as a tear at the close-up; round 4's strict census on seeds 5–6 finds at most 6.5 mm (the horse's shirt under its overalls) | the description corrected; the boss's question restated with these numbers (Still open) |
| S3 the depth rule cannot tell a natural slide from clipping | one step past their limits the horse, the bull and the cow fail in the natural direction (the shirt under the overalls' bib, 3.0–7.5 mm, unseen at 2,100 px a metre), the goat in the clipping one (braces into its shirt, 6.9–7.2 mm, on a side never seen); the bull's glances at the ground go 12.6–16.4° down | open: a directional rule by the neck glue's layer order, then refit |
| S4 the tests do not pin the trunk and arm fits | of 11 mutants, 5 survive: the knee fix reverted (the director's trousers fold through themselves at the knee again, seed 2), the arm probes without their millimetre in hand (five rows loosen), the key hashing only the first part, the glances at the ground unclamped, the knees not following the hips; v5's own pass had no mutant that loosens a trunk or arm fit | open: census the held three every 0.5 s on 3–4 seeds, seed 2 among them; a key edit on a later part; the reach test on the director |
| S5 the key hashes the current pose | a worker another motion left posed misses its row and refits on the main thread for 22–37 s: the horse after `pose('carry')` 33.3 s, a dog mid-walk 22.6–23.3 s (a new key each pose) | open: hash the rest pose |
| nits | the director's glances at the ground go only 5.1–8.9° down; fresh samples pass three sample maxima (seam 0.056 mm/s on 88 builds, leg reach 99.17% on seeds 9–12, strict census 6.5 mm); "arm out at most 4.2°" is one component (the full angle reaches 8.0°, the cow); the game's tail stays frozen during an idle on a game-driven worker; the horse's shirt back stretches 55% on a glance down (17% on the rig's own weights), the goat's beard 53% | noted |

Corrected in this doc after the review: the slide rule (The clothes, the sweeps, What was tried and dropped,
round 4's table, Still open) bounds depth within a 6 mm zone, not how far an edge travels; what fails past a
held limit is 5° past it (2.5° past is confirmed clear), and the sheep's tilt and nod fail at 7.5°, not 5°
(measured again: clean at 5°, over 3 mm at a 7.5° tilt and at a 7.5° nod with the head turned 20° left); the
sweeps' base, 1,822.5, is the module before the knee fix (the shipped table sums 1,820); and round 4's M1 row
no longer says the census finds nothing "through every loop".

**Where v5 went.** The independent integration review of October 9 did not merge v5. It wrote a handoff on
`main` for the visual builder,
[IDLE-SKINNING-V5-HANDOFF.md](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/main/docs/tactics/IDLE-SKINNING-V5-HANDOFF.md)
(`b546dfb`): v5's clothing and skinning corrections to carry into the current models and controllers, with
this branch at `4a819dc` as the reference. Round 5's findings that bear on a port (S1, S2, S3, S5) are offered
to the handoff in a docs pull request against `main`.

## Review round 4 of 5 (7/10), and what changed

| finding | change | measured now |
|---|---|---|
| M1 the sinking rule measures vertices, not surfaces; through loops the pig foreman's forearms go 16 mm into his shirt hem, the horse's shirt 11–13 mm under its bib | points 4 mm apart across every triangle that meets another part, in the fit and in the census (both written afresh, the census apart from the module); a point may go deeper only within 6 mm of where its part lay covered at rest (a bound on depth, not on how far an edge travels: round 5); the layers on the neck move with the layer under them; the fits bisected to 2.5° and refitted | the census finds none in the loops it ran (seeds 1–2, every 0.5 s) or at any limit (the tests), though on seeds 5–10 round 5 found 3 of 3,960 frames over, by 0.1–0.8 mm; round 4's surface census (`sdepth.mjs`, 3 mm points, its rule with no slide) finds at most 5.9 mm through loops 1–2 (6.5 mm on seeds 5–6, round 5; the foreman's forearms 4.8 mm), every case within 6 mm of where the same part lay under the same stretch at rest; the renders in Measured |
| (M1, fix 2) bound each hidden point by its rest depth | not taken as such: a point half a millimetre or more under another part at rest is drawn behind it, and what shows of it going deeper is the surface beside it, which now has points every 4 mm, each bounded; the slide rule bounds a showing point next to a hidden one by how deep that one lay | round 4's own check of points 0.5–3 mm under at rest (`shallow.mjs`), the pig foreman, seed 1: the forearm vertex 2.8 mm into his shirt at rest goes 4.1 mm in (round 4: 18.5 mm); the deepest such, 2.5 to 5.0 mm |
| S1 the sheep's hold is partly the fit's rounding | 2.5° steps, 2.5° in hand, and the limit confirmed in every way the fit probes it, at the limit and past it; the census poses exactly those; the doc names what fails 5° past each held limit (2.5° past is confirmed clear) | the sheep nods, tilts and looks up 2.5° (from 0, 0, 5) and turns 20° / 10° (from 40° / 10°: the neckerchief went 5.9 mm into the wool at 40°); the director's turn is 2.5° / 2.5° (from 5° / 0°); each held limit fails 5° on, on the clothes |
| S2 the fits are knife-edge functions of local numbers chosen by their outcome | the sweeps, below, each with its criterion; the surface measure no longer depends on where the vertices fall | the summed range is flat round every local number but the 6 mm zone: 1,822.5 at the sweeps' base (1,820 shipped, after the knee fix), 1,795–1,827.5 over the margins, the same-stretch radius and the layer reach, 1,750–1,755 for the forearm strip either side of 10 cm, and 1,677.5–1,980 over a 4–10 mm zone |
| S3 the neck glue: a loose height cap, an undocumented fallback, drag below the neck, two layers on two skin points | the height read at the skin point itself; no fallback (cloth with no skin that low keeps its own weights); the field fades in from a tenth of the branch below the neck's base; each layer takes the weights of the layer under it within 1.5 cm | cloth the rig weights wholly to the chest moves 0.6–4.3 mm on six characters' deepest glance down of seed 1 against the chest bone (round 4: 8.1–15.9 mm) |
| S4 the arm strip takes the upper arm's weight off the pigs' sleeves | the strip measures from the forearm's bone only and takes only the forearm's weight; the upper arm keeps what the rig gave it | the director's upper sleeve moves up to 15.7 mm (on the rig's own weights 11.5 mm) against his upper arm through a loop (round 4: 31 mm; the rig's own weights 7–11 mm); a test keeps nine tenths of the upper arm's weight on nine tenths of the cloth the rigs weight to it |
| S5 tests: five documented constants unpinned, no bone moved in the key test, no sigh in the census, the mutation pass on an older revision | tests restate the drift (0.45° / 0.30° rms), the head's share and the trunk's split, the chest's rounding, the shrug, and the neck share on the skull's weights; the key test moves a bone, rebinds a part to another skeleton, swaps two vertices and nudges two apart; the census samples the top of the sigh; the mutation pass runs on this revision, fit mutants each with its own refitted table | 37 mutants of this revision, each on an untracked copy of the module and of the test files that should catch it (`mutate-v5.mjs` in the session's scratchpad), three at a time and every copy deleted in a `finally` block. A mutant of the fit gets its own fits table, refitted under it, so that only the property tests can kill it (the census for the measure, the key test for the key, the limits test for the steps); the others read the shipped table. 33 are killed, each by the property test it names (`mut-v5-results-final.json`): the measure's by the census (the graze at 6 mm, a 2 cm slide, no same-stretch test, vertices only, no crossing trigger, no self-crossing test, no breath in the arm probes); the weights' by the census and the weight tests (no layer glue, no height cap, the band reaching further down, hair on its own weights, the forearm's weight left beside it, the upper arm's stripped, no sleeve glue, the neck share starting lower, the neck skin off the neck bone); the five documented constants by the constants test; the key's three by the key test; no 2.5° in reserve by the limits test (it put turns 2.5° past the 40° seam); the rest by the tests of the API, the seed, disposal and the belly rule. Four survive. Three are equivalent on these rigs, each one's refitted table the shipped one: no trigger for a triangle with a corner inside another part (here such a triangle also crosses it, or its corner fails first), no confirmation of the limit (no limit here needed one) and no test of still vertices (as in v4). The fourth, points up to 5 mm inside another part at rest counted as showing, makes the fit stricter (the summed range falls 115°): no test that looks for clipping can see a fit that holds back more. |
| nit: the director's looks are one-sided | his reach is now 12.3° each way, and his glances at the ground stay within it (below) | over 60 seeds his looks go 97 left, 89 right, and he gazes more than 5° left 15% of the time, right 13% (round 4: 138 left, 60 right; 19% and 9%) |
| nit: the pig foreman's "glances at the ground" are 5–9° down | his reach down is now 15° | over 60 seeds his glances at the ground go 10.0–14.0° down (a median of 11.7°) |
| nit: disposing in the wrong order corrupts the rig | dispose restores only the parts still bound to the idle's skeleton; last in, first out documented | the bull disposed with its game motion first ends on its own skeleton and weights (a test) |
| nit: `rigKey` sums positions | it hashes every vertex in order, and every weight | two vertices swapped or nudged apart change the key (a test) |
| nit: loops depend on the asset bytes | the seed is mixed with the rig's names (its parts' and bones'), not its key | a mesh or weight fix keeps a character's loops; the eleven still draw their own (a test) |
| nit: `eye[2]` silently ignored | documented: the gaze starts on the rig's midline, at the eye's height and depth | — |
| nit: which twist share was tried | documented: about the neck's axis, on the neck bone alone | — |
| nit: timings over the stated ranges; seam jump over 0.06 mm/s | measured again, with the machine's load named | as in The study: measured while other test suites shared the machine; the seam's velocity jump at most 0.04 mm/s |
| (found in v5's own runs) glances at the ground went up to 15° aside whatever the reach: the pig director's, now his reach is 12.3°, went 13–14.7° aside on 11 of 30 builds | a glance's yaw is held to the reach, less 3°, as a drift's is (characters that can turn 18° or more either way draw the same loops) | none of his 30 builds plans a look past his reach |
| (found in v5's own runs) the arm and trunk probes leaned the hips without bending the knees to the planted hooves | they pose the legs as the motion does | the pig director's trousers crossed themselves 3.1–3.6 mm at the knee in a full lean (the census, seed 2): he now leans three quarters, and no other fit changed |

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
catalog's `eye`; the horse's by default), within 0.5 m of the head joint (its height and depth: the gaze starts on
the rig's midline, whatever its third coordinate); `refit` fits the character afresh
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
skeleton its parts had and their weights. Dispose last in, first out: an idle made on a worker the game's motion
drives goes before that motion. A part some later owner has rebound (the game's motion disposed first, which puts
the rig's own weights and skeleton back) is left as it is.

## Still open

- **How far an edge may slide** (the boss's call, being what the eye should forgive). v5 lets a point go
  deeper only within 6 mm of where its part already lay covered. That bounds depth, not how far an edge
  travels: through loops, edges advance up to 15–18 mm over what they cover (5–6 px at the close-up) on the
  sheep and the pig foreman, none reading as a tear in review round 5's renders. The range the fits find
  grows with that zone and with nothing else (the sweeps): at 10 mm the horse turns its head 40° right (27.5°
  now), the goat, the bull and the cow nod 20° (12.5°), most chest twists grow 5–15°, and the sheep shrugs;
  at 4 mm nearly everything shrinks. What the eye sees is in the renders (Measured). Round 5 proposes a
  better measure before a larger zone: tell an inner layer going under an outer one (a bib's edge covering
  more shirt, which is natural) from an outer layer going into an inner one (braces into a shirt, which is
  clipping) by the neck glue's layer order; the natural case is what holds the horse, the bull and the cow.
- **Two heads and two pairs of arms their clothes hold** (the boss's call, being the characters' design).
  The sheep's wool ruff overhangs a neckerchief tied tight on it, so its head turns 20° left and 10° right and
  nods, tilts and looks up 2.5°; the pig director's jowls rest on his collar (their contact line shows at
  rest), so his head turns 2.5° each way and does not nod, and he looks about with his trunk. The sheep's
  forearms lie on its shirt and waistcoat, and the pig foreman's by his shirt's hem and waistband, so neither's
  elbows ease, and the foreman leans a quarter. A neckerchief tied lower or looser, a collar set lower or out
  from the jowls, a hem higher and sleeves cut wider would free them; refitting is one command. Everything
  else on all four moves.
- **The collar's pull on the shoulders.** The neck glue reaches 13 cm out from the neck, so the shirt beside a
  collar moves partly with the neck: on the horse's deepest glance down, its shoulder top next to the collar
  goes 21.5 mm against its upper arm (on the rig's own weights 2.3 mm), and the pig director's upper sleeve
  15.7 mm through a loop (v4: 31 mm; the rig's own 11.5 mm). The cloth stretches between the collar and the
  shoulder; at the close-up it does not read as a tear, but a narrower glue would only move the stretch
  inward.
- **Cloth that gives.** A collar or a neckerchief that deformed under the jaw (cloth, or a corrective shape)
  would let a head turn and nod further than any weighting does.
- **The goat's throat** shows the red of its collar through the skin at rest (round 3's close-up): the asset,
  not the motion. The bibs' top edges show a light sliver at rest on several characters (`clothes-bib-glances`): the
  assets too.
- **Shared body model.** Six characters share one skeleton, and every one balances with the same segment
  masses, so the pot-bellied pigs balance like the horse. The audit's shoulder girdle (a rigid segment
  from the chest to the shoulder) lengthens up to 2.97% as the shoulders shrug: the shrug moves the arm's
  root, which the rigs have no clavicle for.
- **Build time.** A loop is built when it is made: 0.5–1.1 s for 30 s and 15–27 s for the longest (600 s), measured while other test suites shared the machine (v4, on a quieter one: 0.17–0.28 s and 8–13 s); the neck glue takes 0.1–0.3 s of it.
- **Integration.** Units in `battle-3d` do not idle yet; a transition is needed to and from other motions.
- **Targets.** Looks are random directions. The game would supply real ones: a sound, a teammate, a
  threat.
- **No eyes or ears to animate.** The heads have no eye or ear bones, so all looking is done by turning.

## Independent integration review — October 8, 2026

Reviewed `0ab4372` and the subsequent `6d1fba7` revision. Approved as a separate animation study with the viewer correction below; this does not enable battle idles. The restored neck bend and restrained weight shifts read well on the horse and donkey. The latest sheep can turn much farther left, and the pig director has more body movement; their remaining head restrictions are documented clothing limitations.

All 39 focused tests passed on the latest revision: idle motion, clothing, cached fits, distribution module graph and Pages file coverage. This includes refitting all eleven mammals. Independently inspected the packaged horse, donkey, sheep and pig director across the two revisions, plus character/seed changes during playback. The earlier 30-test suite also passed before the revision arrived.

Found and reproduced a viewer failure: play the study, then select the rabbit. While its paint loads, the old `cast()` cleared `motion`; the next frame read `motion.length`, threw, and stopped scheduling frames. The correction keeps the previous actor alive until a complete replacement is ready, ignores superseded loads, disposes unadopted actors and respects page disposal. Repeated character changes and a seed change now keep the timeline advancing, including through its wrap, with no new console errors. Syntax and the rebuilt Pages module checks also pass.

Before gameplay integration, choose how this unarmed study and the armed idle share pose ownership, and test transitions to movement, aiming, climbing, damage and death. Their current local-space controllers reset the root transform and must not be applied directly to world-positioned battle actors.
