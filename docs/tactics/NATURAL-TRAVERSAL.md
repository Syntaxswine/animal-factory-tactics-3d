# Natural traversal: windows, low walls and walls

Branch `anim/natural-motion`, worktree `AI/animal-factory-tactics-3d-motion`, off `main` 0c67c86.

## Direction (the user, 2026-10-19)

> i want to revisit the animation for going through the windows and climbing over other low objects
> because it looks a bit like the characters are floating through the window. for windows the window
> is so small compared to the character that you basically have to roll through it head first to have
> any sort of movement that make sense for ending on the tile on the other side of the window. for low
> barriers like short walls it makes more sense to do a side vault over them. there is a physics tool
> that we made in another Claude chat that might be useful.

Asked the same day: the walls the new climb crosses are 2.0 m, above the characters' heads, so what
should the side vault go over? The user chose **"Waist-high wall"**:

> I build the side vault for a ~1 m wall and show it in a study scene. Adding that wall type to the
> game (cover, sight, art, editor) goes to Codex as a handoff. The 2 m wall gets its own climb-over
> animation.

A second question followed the same day. These characters cannot tuck the chin far enough for a
straight forward roll: the nod limit measured for the idle (`idle-fits.js`) is 0 to 35 degrees, and the
pig director and the sheep have 0. A roll needs 60 to 90, and past the limit the jaw goes into the collar.
The user chose **"Shoulder roll"**:

> The real technique (parkour and military rolls go over a shoulder, never the head): one hand and
> forearm down, the head turned away, roll diagonally across the back from shoulder to opposite hip,
> come up on one knee on the next tile, then stand. The trunk does most of the turning, so the
> stiff-necked pig director and sheep still clear.

So there are three motions:
1. **Window:** a head-first entry and roll that ends on the next tile.
2. **Waist-high wall (new, about 1 m):** a side vault.
3. **2 m wall:** a climb-over.

The physics tool is [phantom-wrench](https://github.com/Syntaxswine/phantom-wrench), an inverse-dynamics
audit of authored motion. It reports the force and torque that no contact in the scene supplies.

## What floats now

Codex's climbing work adds `dist/tactics/simple-traversal.js`:
"Lightweight presentation for ordinary tile ladders, windows, wall vaults and slips". It was uncommitted when it was measured
here, and was committed unchanged the same day (sha1 `40779bf`, in 1c99850 on Codex's `work/editor-3d`, not yet on `main`).
Codex's notes there call these motions "candidates for an artist pass".

| kind | duration | root path | body |
|---|---|---|---|
| `window` | 1.8 s | straight line, tile to tile, plus `0.75 sin(pi t)` up | blends to prone and back |
| `wall` | 3.0 s | straight line, plus `2.12 sin(pi t)` up (a whole floor) | blends to a 0.6 kneel |

Nothing in the scene pushes the body along either path. The root is carried on a curve, and the pose
is a blend laid over it. That is the float: *carried, not propelled*. The same defect showed up in the
2026-09-28 review of the weighted-window study (`GTP/WEIGHTED-WINDOW-REVIEW-FOR-CODEX.md`), which is
where phantom-wrench came from.

Codex's rules in that work (`climbing.js`, `climbing-routes.js`): a `window` route crosses any window
edge (skill 20, 4 to 2 AP). A `wall` route crosses a wall edge with nothing above either tile (skill 90,
12 to 8 AP). This branch does not touch those rules. It supplies the animation.

## The sizes (measured, world units = metres)

From `hybrid-world.js` `DIMENSIONS` and the rest pose of every mammal worker:

| | value |
|---|---|
| tile | 1.0; tile centres 1.0 apart, the edge halfway |
| wall | 2.0 tall, 0.16 thick |
| window | sill top 0.85, opening top 1.55: **0.70 tall**, the full tile wide, no side posts |
| low cover props | 0.8 (crates, sandbags: whole tiles, not crossable) |
| character height | 1.60 to 1.76 (ears) |
| hip joint | 0.80 (pig foreman 0.71) |
| shoulder | 1.19 |
| arm reach, shoulder to palm | about 0.52 |
| leg, hip joint to ankle | 0.67 (pig foreman 0.59) |

Consequences:
- **Window.** The sill sits at hip height and the opening is 0.70 m tall, so a standing body can only
  pass lying along the opening: head first, as the user said.
- **The arms are short.** With the hips on the sill the shoulders hang only 0.39 m lower, and the palms
  reach 0.52 m below that. The hands cannot reach the far floor until the hips are past the sill's far
  edge. So the body has to go over the sill as a seesaw: the trunk goes down on the far side while the
  legs rise behind.
- **A roll travels.** From the upper back to standing, a tucked forward roll moves the centre of mass
  about 0.65 m (back length plus the feet's place in the squat). The tightest contact for the upper back
  is about 0.2 m past the wall face. A roll straight to the feet would therefore stand about 1.2 m past
  the wall plane: 0.2 m beyond the next tile's centre. Ending on the knees, with the feet tucked behind
  them, then rocking back onto the feet puts the stand over the feet, at the tile centre.
- **2 m wall.** The top is 0.35 m above the head, and the standing palm reach is about 1.71 m. Getting
  over takes a jump to catch the top, then a pull-up and a leg over: a climb, not a vault.

## What the window roll has to satisfy (found while building it)

- **The head is the problem, not the back.** With the hands on the floor, the horse's head reaches the
  floor about as soon as the hands do: the head extends about 0.5 m past the shoulders, and the palms reach
  0.52 m. A roll clears only if the **chest lands flat on its back** with the neck lying back along the floor,
  the spine curled about 40 degrees and the pelvis above. Rolled forward from there in the explorer, the back
  of the neck touches first, and the head is 8 cm clear a quarter of the way through, 17 to 21 cm later.
- **So the head points back at the window,** and the roll must run **along the wall** (68 degrees from straight
  on), or the head hits the wall's far face. Rolling along the wall also keeps a 0.65 m roll on the tile, and
  brings the character up out of the window's line.
- **Coming down, the head turns about 35 degrees, and only one way.** Turned the other way, the long muzzle
  runs into the wall's far face.
- **The roll is computed, not keyed.** From the chest-flat start pose, the body turns step by step about
  the point of its skinned surface that touches the floor. That is rolling, so it cannot slide or float,
  as long as nothing else touches. (A first audit read 0 N through the roll. The committed version does not:
  the right forearm sinks into the floor mid-roll. See the evening audit below.)
- **The short arms set the descent.** The hands reach the floor only once the shoulders are within
  about 0.5 m of it. Hand targets come from where the shoulders really are at each key, so no arm is ever
  asked past its reach (checked every 5 ms).

## The motions (plan)

### Window: head-first entry and shoulder roll

Step up to the left part of the window and put the hands on the sill. Hop onto it on the belly and slide
over head first while the hands reach down the far side. Then a **seesaw**: the trunk goes down and the
legs rise behind, with the centre of mass kept over the sill until the hands reach the floor. On the way down
the head turns away from the wall and the body twists toward the roll. The arms take the weight and bend.
The upper back lands with the chest flat and the spine curled, and the body **rolls along the wall** across
the tile, over the shoulder and down the back to the hip. It comes up on one knee, then stands on the next
tile's centre, turning to face on. (The first plan was a tucked forward roll straight ahead, ending on both
knees and rocking back. The neck limits ruled it out; see above.)

### Waist-high wall: side vault

Step in, plant the near hand on the wall top, jump. The legs swing over sideways together, with the
body passing beside the planted hand. Land on the far foot first, then step to the tile centre.

### 2 m wall: climb-over

Step in and jump to catch the top. Hang, then walk the feet up the face and pull up until the forearms
are over the top. Swing a leg over to straddle it, bring the other over and lower down the far face.
Drop the last few centimetres, absorb, and step to the tile centre.

## How "natural" is checked

- **phantom-wrench rigs per motion and species.** Contacts come from the geometry (floor, sill, wall
  top and faces), not from the motion's own claims. Each rig carries a negative control that must be
  seen to fail. The floating `simple-traversal.js` is measured as the baseline.
- **Collisions with the obstacle:** the body's capsules against the sill, lintel and wall.
- **The clothing census** (`tools/clothing-census.mjs`) through the extreme poses: tuck, inverted.
- **Photographs from the real renderer**, in the game camera and close up.

## Progress

### 2026-10-19, first pass of the window (horse), work in progress

The motion is `dist/tactics/window-dive.js`. It sits on `traversal-pose.js`, which holds the posing, limbs,
the audit's mass model and the exact skinned surface probe. The battle adapter is `natural-traversal.js`.
The study page is `tactics/traversal-study.html`, drawn by the game's renderer with the real brick window.
`tools/photo-traversal.mjs` makes strips and videos of the study.

phantom-wrench `rigs/traversal.mjs` per phase (max phantom force, share of body weight):

| phase | force | |
|---|---|---|
| Step in | 21% | no balance planning yet |
| Hands on the sill | 10% | |
| Hop onto the sill | 0% | |
| Slide over | 142% | the body is not resting on the sill |
| Reach for the floor | 73% | |
| Hands to the floor | 71% | |
| Back to the floor | 0% | computed contact |
| Roll | 0% | computed contact |
| Roll onto the hip | 20% | |
| Up on one knee | 918% | the get-up keys, and the hooves flip where a limb changes frame |
| Stand on the tile | 170% | |

Also open:
- Velocity jumps where the keyed descent meets the computed roll (0.96 m/s at 2.40 s), and at its end.
- The roll table is joined by straight lines.
- The elbows reach 160 degrees and the left knee 168, past the rig's 150 and 155.
- The thighs sink up to 8 cm into the sill during the hop.
- The right sleeve brushes the wall's far face coming down.

### 2026-10-19 (afternoon): the window roll is physics-paced; side vault and climb-over, first passes

**Window.** The roll is no longer keyed:
- From the chest-flat start, the curled body rolls about its floor contact. Its pace comes from energy
  (1/2 I_P w^2 about the contact, plus gravity).
- Where the contact jumps (mane, upper back, seat), the landing part takes an impact: angular momentum about the
  new contact is kept, and the impact is softened over 40 ms.
- A squat tuck (heels under the seat) brings the hooves to 0.7 cm off the floor as it sits up. The roll therefore
  lands **in a crouch on both feet** and rises from there. This departs from the "up on one knee" in the chosen
  option: catching on one foot needed the legs to unfold in 0.15 s, 4,667 N·m from a single seat contact.
- Roll direction 78 degrees ends the roll on the tile centre with nothing in the wall.
- Audit: back to the floor and the roll read 0%. The tip over the sill edge (a short fall onto the hands) and the
  rise from the crouch do not pass yet. **Corrected the same evening:** the committed version reads over the gate from
  the hands to the floor through the rise. See below.

**Side vault** (`wall-vault.js`), over the proposed 1.0 m wall:
- Both palms go on the top. The trunk pitches about 40 degrees and leans over the supporting left arm. The knees
  tuck up, and the legs sweep over beside the right hand. It drops down the far side, lands and settles onto
  the centre.
- Seen from the far side, it reads as a side vault.
- Open: the trailing thigh brushes up to 7 cm into the top. No balance planning yet.

**Climb-over** (`wall-climb.js`), 2 m wall:
- Jump to catch the top, hang with the hooves on the face (knees out), walk up, chest over, knee up, straddle the
  16 cm top, other leg over while turning to face the wall, lower down the far face, let go, drop, turn onto the
  tile.
- The short arms are at their limit in the hang: the shoulders must be within about 0.2 m of the face to reach
  a top 0.35 m above the head. The horse's long muzzle turns 40 degrees whenever it faces the wall up close.
- Open: the legs still cut 6 to 8 cm into the top during the straddle, and the arms are 5 to 12 cm short at
  the catch and hang. No balance planning yet.

The study page has an obstacle selector. The waist-high wall is the game's own brick wall on that line, with its
instanced boxes cut to 1.0 m.

### 2026-10-19 (evening): full-rate audit of all three (horse)

This is the instrument of record, run on the committed code (2beb2a4) through the battle contract:
`node bin/phantom-wrench.mjs rigs/traversal.mjs --gate` (1 ms scan, 5 ms wrench sweep) and `bin/collisions.mjs`.
The rig builds the battle's own model, with battle posture and locomotion. `natural-traversal.js` routes only the
window, so the vault and the climb went through a scratch adapter with the same contract.

| | window (3.68 s) | side vault (2.40 s) | climb (4.85 s) |
|---|---|---|---|
| gate | fails 7 of 8 checks | fails 6 of 8 | fails 7 of 8 |
| phantom wrench over the limit | 1.77 s | 0.92 s | 1.20 s |
| limb speed (limit 8 m/s) | right elbow whips round at 72 m/s (2.45 s) | as the right hand lets go (1.0 s): the right elbow flips twice within 1 ms (up to 522 m/s); right knee 136 m/s | 25 flips within 1 ms: knees up to 416 m/s and elbows up to 553, at the catch, straddle, lowering, drop and stand |
| position pops | palms 7.7 cm landing on the sill (0.73 s); legs 2.3 cm at the roll start (2.40); right palm 8.3 cm (2.47); head 3 cm at the sit-up (2.68) | right palm 1 cm | palms 6 to 7.5 cm at the catch and the drop |
| body through itself | right upper arm 18.5 cm into the chest (2.39 s) | legs through the right arm, 11 cm (1.03 s) | thighs through each other, 15 cm, standing up (4.27 s) |
| into the obstacle or the floor | right hoof 6.9 cm into the lintel (1.86 s); right forearm 8.6 cm into the floor mid-roll | seat and legs 7.8 cm into the top (0.94 s) | seat and legs 8.0 cm into the top (2.69 s) |
| joint range (elbow 150, knee 155) | left elbow 160 | inside | elbows 165 and 162, right knee 159 |
| reach | every limb reaches | right arm 1.4 cm short (1.0 s) | arms up to 12.5 cm short of the top (catch to walk-up); legs up to 13.6 cm short (lowering, drop) |

Clean so far: the window's hop onto the sill, and the vault's load, spring and settle. The climb's hang, walk-up,
chest-over, knee-up and lowering also read 0%, but they are not evidence yet. The hands are up to 12.5 cm short of
the top there, and the rig lets any hand that touches the wall grip and pull.

**The afternoon's 0% for the window roll was wrong for the committed code.** The roll fails at 20 ms and at 5 ms, with
and without the battle posture. The right forearm sinks into the floor, so the body has no support there.

There is also a side finding. `createBattlePosture` re-skins the horse's shirt (the tucked hem) when the battle sets
up, and that moves the computed roll by 24 ms (3.707 s on a bare worker, 3.683 s in battle). So the motions must be
tuned on the battle's model, as the rig builds it, and numbers are quoted only from the instrument of record.

Next, in order:
1. **Window right arm.** Keep the right arm out of the chest and the floor, without the whip. Then re-audit the roll.
2. **Window joins.** Make the joins continuous: the palms onto the sill, the roll start and the sit-up. Then tip over
   the sill as a pivot about its edge, keep the hooves under the lintel, and rise over the feet.
3. **Vault.** Fix the release flip and route the legs outside the right arm, clear of the top. Then add flight from
   the push-off to the landing.
4. **Climb.** Fix the limb poles (the 25 flips), the reach at the catch and the lowering, and the legs over the top.
   Then a ballistic jump and drop.
5. **Tests.** Write these checks into the repo (gate, collisions, reach, joint range) so nothing regresses unseen.

### 2026-10-19 (night): every mammal fitted

The user chose to fit every species before the physics pass ("Let's translate it to all species"). Ten of the eleven
mammals share the horse's skeleton exactly. The pig foreman has shorter legs (hips 0.71 against 0.80, legs 0.59 against
0.67). What differs is the surface, measured at rest:

| | |
|---|---|
| tails | nine species: bull, cow, donkey, sheep, skunk, both pigs, rabbit, dog (the skunk's plume reaches 0.66 m behind) |
| heads | the donkey's and the rabbit's ears stand 9 to 11 cm taller; sheep, cow, bull, goat and pig director spread ears or horns wider |
| torso | the pigs' bellies reach 16 to 19 cm further forward, and they are 9 to 12 cm wider |

As they were, the horse's keys put tails 14 to 23 cm into the floor in the roll, heads into the floor and sill, the pigs'
bellies through the sill and walls, and the pig foreman's boots 6 cm off the floor at the end.

`dist/tactics/traversal-fit.js` fits each crossing to the character as it is built (0.2 to 1.3 s):
- **Keys scaled to the body.**
  - A key held up by the legs scales to the character's legs.
  - A key hanging from the hands keeps the shoulders where the horse's were.
  - A deeper body stands back, feet and all, while it faces the obstacle, and lies higher on a sill.
  - A wider body rolls farther from the wall.
- **Clearance against the real, skinned surface.** Where the trunk, head or tail would go into the floor or the
  obstacle, the least correction takes it out:
  - The head turns within the neck, one turn per stretch of contact, with its eases checked too.
  - The body bows from the hips for what the neck cannot clear.
  - The trunk moves: straight back while approaching, the nearest way out over the obstacle, on once past it, and
    down from under a lintel.
  - The tail bends about its root. It follows from moment to moment, forward from the start and backward from the end,
    so it leaves and rejoins the battle's own tail.
- **Push-offs.** A foot or hand pushing off may leave its mark as the trunk rises (`lift`), a toe-off or a hand letting
  go early.
- **Tails given back.** Tails bend the way the game's tower tuck does, and are given back exactly when the crossing ends
  or is cut short.

What is left of species-specific contact, per the fit's own 20 ms check (trunk, head and tail; the horse's own defects
are untouched for the physics and polish pass):

| | window | side vault | climb |
|---|---|---|---|
| clean | horse, goat, bull, cow, sheep, skunk | all eleven | nine |
| left | donkey and rabbit ears graze the lintel at the hop for about 20 ms (8 and 5 cm); the dog's ears 2 cm; the pigs' bellies 2.5 to 2.7 cm on the sill; a single 10 ms frame of the bull's and cow's tails in the sill and floor | | both pigs: their bellies keep them off the face, so their arms fall 24 to 27 cm short of the top. A pig needs its own hang. The dog's utility belt goes through the top as its legs go over |

`tests/natural-traversal.test.mjs` builds every crossing on every mammal the way the battle builds a model. It checks
that each one:
- starts in the character's own stance and ends on the next tile's centre;
- keeps the trunk, head and tail within about a centimetre of clear, with the gaps above named and capped so they can
  only shrink;
- gives the tail back exactly when cut short.

A mutant that skips the tail restore fails it.

The hen has no traversal skeleton (wings, no hands, no hips bone), so she has her own crossings (below). The battle
adapter builds all three crossings for every character: `window`, `low-wall` and `wall`.

Next, in addition to the list above:
1. **A pig hang** for the 2 m wall.
2. **Long ears** under the lintel at the hop.

### 2026-10-19 (late): the hen's own crossings

The user: "Give the hen its own crossings: a wing-assisted hop up onto the sill or wall and down the other side."

`dist/tactics/hen-crossing.js` builds them on the rig the hen's ladder and roof mantle already use
(`createHenLadderMotion`). That rig adds thighs, gives the wings and legs IK, and can gather the tail fan and draw the
apron and waist tie in. `hen-ladder-motion.js` now also exports `apron`, `tie` and `toes`.

| | |
|---|---|
| window (2.72 s) | Crouch, then a wing-assisted hop with the head going in low and early. She lands on the sill sitting flat, the way a hen sits a perch: legs folded under, tail fan gathered, apron drawn in. She ducks through, leans over, launches off still flat, flies clear, comes upright once her rump has passed the far face, lands, folds her wings and settles. |
| waist-high wall (2.70 s) | Crouch, hop up beating, perch upright on the top, hop off, flutter down clear of the wall, land. |
| 2 m wall (3.44 s) | Crouch, spring, beat up the face, over the top, perch, hop off, clear the wall, glide down, flare and land. |

Her height decides the window. She is 1.65 m to the comb, the comb is 0.88 above her pelvis, and the opening is 0.70
tall: standing on the sill, her head would be at 2.05. Flat, she spans 0.86 to 1.54 between the sill (0.85) and the
lintel (1.55). Her rump trails 0.3 to 0.5 m behind her, so on the way down she moves out from the wall before she drops
below its top.

Measured every 10 ms, her whole surface against the floor and the obstacle:
- **Window:** her legs are 3.5 cm into the sill for 10 ms as she flies clear.
- **Walls:** only the tail fan, in the last 0.2 s. As it spreads back to her standing pose it reaches 0.54 m behind
  her, into the wall; any hen standing with her back to a wall does the same.

The wings beat at 5 Hz during the hops. The test builds all three crossings on the hen. It checks the start and end
stance, keeps her within 4 cm of clear (the tail fan's last 0.3 s excepted), and checks she is given back exactly when a
crossing is cut short. A mutant that lifts her body on the sill fails it.

Not done for the hen: the physics audit. A flapping bird needs the wings' push on the air in the rig.

### 2026-10-19 (polish): limb flips, joins and clipping, every mammal

The user: "Start the physics and polish pass: the window roll's right arm, the joins, the limb flips in the vault and
climb, and the shared clipping, across all species."

Most of the pops came from the shared solver, not the keys, so most of the fixes are in
`dist/tactics/traversal-pose.js` and `traversal-fit.js`:

| defect | cause | fix |
|---|---|---|
| knees and elbows thrown 2 to 3 cm in a millisecond (14 to 21 m/s) as a limb straightens or unstraightens | a two-bone bend grows as the square root of the distance short of full reach | soft IK: within 1.5 cm of full reach the limb straightens asymptotically (at most 5.5 mm short there, exact closer in) |
| a hanging hand snapping 80 degrees (12 m/s) | its palm blend slerped between two palm-down turns 180 degrees apart; the short way switched sides | the blend is a yaw angle; its way round is kept continuous like the turns' |
| a released hand spinning the long way (to 280 degrees) | the way round was kept continuous from a first sample taken at 180 degrees | where a switch is cheap (360 x min(w, 1-w) under 4 degrees) the short way is taken again |
| a 47 m/s hand snap | the turn pre-pass read palm targets without their yaw reference, so it kept the wrong way for the live pose | turn records carry the short way; the pre-pass runs twice, the second time on the unwrapped palm targets |
| gripping hands dragged 5 to 30 cm off a top, feet off the face; arms folded to 159 degrees | the limb fit moved a planted end by its forearm's or shin's contact, and, unable to fix that, grew round on round to 21 cm | a planted contact (a palm, or a hoof marked `plant` with its surface's normal) takes only the part of an offset out along that normal; while planted only the end's own points count, and its need is projected the same way |
| no say in where an elbow bends | arms had a fixed rule (back, down and out, or toward world `elbowAway` while a palm is planted) | per-key `elbow` direction in the chest frame, as knees already had |
| an elbow swinging 6 cm in 8 ms as its arm straightens | near full reach the bend side caught up at up to 45 degrees per 5 ms, and soft IK leaves a 3.7 cm bend there | the catch-up is capped at 15 degrees per 5 ms |

**Window.**
- **The right arm** went 18.5 cm into the chest as the body lay back onto its hands. The sill's world-forward elbow
  rule folded it across a body upside down at 58 degrees.
- **The right shoulder** is 7 to 11 cm off the wall face there. Its hand now goes under it and the elbow bends back
  along the body, a narrow push-up (a search over 20 hand spots and elbow directions found the only clean pair).
- **The left elbow** bends up and out to the open side.
- **The roll** starts 8 cm farther from the wall, so the right sleeve stays off it.
- **Release and tuck.** Both hands leave the floor over 0.18 s, and the tuck's elbows point out.

**Side vault.**
- **The right hand** used to drop to the hip after its push, through the right thigh (11.8 cm). It now lets go as the
  spring starts and lifts out to the side at shoulder height, a balancing arm wide of the chest, while the legs pass
  under it.
- **The planted elbows** bend back and out, as in a dip. Bent down, the bigger bodies' forearms crossed the near edge,
  and the bull's elbow whipped at 27 m/s.
- **The spring** is 10 cm higher (6 cm at "Legs up and out"), so the deeper bodies' legs clear the near corner (bull
  4.3 to 2.5 cm, skunk 5.6 to 2.0).

**Climb.** The far side was re-keyed after a probe found:
- the legs crossed (left foot on the right) from 3.0 to 4.5 s;
- the feet turned backward through the drop and stand;
- the left knee folding into the far face as the leg came over;
- a 310-degree long-way hoof turn between keys at heading -130 and 180.

The new far side:
- **Straddle:** faces along the wall, one leg down each side.
- **Left leg over:** the left knee goes up behind onto the top, then the leg slides off the far side as the body turns
  left to face the wall. The knee points out to the side, clear of the face.
- **Hands:** the right lets go once the chest is over and plants ahead, before the right knee comes up beside it; the
  left re-grips on the far side.
- **Feet:** on their own sides, toes forward, from the hang to the drop.
- **The turn onto the tile** is two steps, lifted mid-step: the left foot round behind the planted right, then the
  right foot round to its place.

Also on the climb:
- **The right knee-up** no longer passes the foot by its own hip; there the bend plane spun the knee at 21 m/s.
- **A foot leaving a face** keeps its ankle off it, toe up, so a long foot (rabbit, dog, skunk) never swings into the
  wall (8 to 2.3 cm).
- **The arms swing up ahead of the jump**, in front of the face, and come down onto the top. Reaching straight for it,
  the forearms went 7 cm into the face.
- **Gripping elbows** bend back and out from the wall.
- **The face stays the way out until 1.88 s**, so the sheep's waistcoat hem no longer meets the top edge (6.9 to 1.4 cm).

The phantom-wrench gate on the horse, before (781975c) and after:

| | window | side vault | climb |
|---|---|---|---|
| capsule overlaps over 2 cm (deepest) | 11 (18.5 cm) to 1 (4.7) | 8 (10.3) to 2 (3.4) | 42 (15.0) to 7 (3.7) |
| fastest point | 71.7 to 8.4 m/s | 136 to 12.2 | 34.8 to 10.2 |
| position pops | 8.3 cm palms to none | 1.0 to 0.4 cm | 8.1 cm palms to none |
| COM velocity jumps | 0.04 to 0.03 m/s | 8.0 to 0.015 m/s | 34 to 0.09 m/s |
| required force in contact | 29 to 30 x BW | 503 to 11.3 | 38 to 7.7 |
| joint range | elbow 160 to 155 degrees | inside | inside |

Every mammal's surface against the floor and obstacle, deepest part, every 10 ms:
- **Window:** 3.3 cm or less, except the donkey's and rabbit's ears at the lintel (5.6 and 4.7) and a 10 ms frame of
  the cow's tail.
- **Side vault:** 3.1 cm or less, except the tails (donkey 7.3, cow 3.5).
- **Climb:** 3.2 cm or less, except both pigs (8, their bellies at the face) and the skunk's tail plume (4.6).

The committed climb put feet, seats, forearms and shirts 8 cm into the wall for most species. The 12 traversal tests
pass.

Left for the physics pass and polish:
1. **Physics balance.** The phantom wrench outside impacts and the required force in contact still fail all three
   (the window's roll peaks at 30 x BW).
2. **The window's right elbow** folds to 155 degrees as its hand leaves the floor, 5 past the rig's table. The tucked
   right hand rests on the right thigh (4.7 cm by capsules).
3. **The vault's spring** swings the feet at 12 m/s, over the gate's 8.
4. **The climb.** The seat grazes the top 2 to 3 cm as the left leg slides off. The forearms graze the near edge 2 to
   3 cm at the catch. A pig needs its own hang.
5. **Long ears** at the lintel, and **tails** on the walls.

### 2026-10-20 (physics balance, first part): the side vault

The user: "Start the physics-balance pass: the phantom wrench and required-force checks for the window, vault and
climb."

The new `dist/tactics/traversal-balance.js` balances a traversal in four steps:
1. **What holds the body** is read from its skinned surface, the way the phantom-wrench rig reads it:
   - a hand within 1 cm of an obstacle grips;
   - hooves or hands within 1 cm of the floor stand, and their extent is the pressure point's box;
   - any other part touching is held as authored;
   - nothing touching is flight.
2. **A plan for the centre of mass**, as near the authored path as those contacts allow, with low jerk:
   - in flight, ballistic;
   - on the feet, the linear inverted pendulum's pressure point (with the body's measured dL/dt) inside the soles,
     the push within friction, and the floor pushing between 0.3 and 3 body weights;
   - gripping, any way within 3 body weights;
   - the first and last samples at rest.

   It is one convex QP per axis, the vertical first, solved by ADMM on a banded Cholesky factorisation. Clamping the
   pressure point sample by sample instead made an unstable pendulum: the plan drifted 90 cm and snapped back.
3. **The hips follow the plan.** Each of five passes moves them by 1.29 times the miss.
4. **Rounds.** The contacts are measured again on the balanced motion and the plan is solved again, until the schedule
   settles. A grip counts from 20 ms after its first touch.

The rig's 1 ms audit then found two interpolation defects between the 5 ms samples:
- **`track()` flattens the slope at every key where a channel turns**, so an authored channel never overshoots its
  keys. On the densely sampled hips shift, that stepped the velocity by 2 cm/s inside one segment: 8 m/s² at 0.299 s.
  Solver channels now pass `{limit:false}`.
- **The clearance fit's trunk offset (20 ms knots) and the shift (5 ms knots)** each cancel the other only at their own
  knots. The fit's push back from the wall at 0.56 s read as 480 N of phantom force between samples. The shift is now
  interpolated together with the fit's offset.

Also shared by all three crossings:
- **Plant snaps.** A planted end's lowest point is held 2 mm off its surface where fully planted, and faded with the
  plant (the rig counts a contact within 1 cm). Switched on at half planted, the snap jerked the wrists.
- **Soft IK is C2.**
- **The turn pre-pass's cheap switch is 0.1°.** At 4° it popped the palms 3 to 4 mm.

**The vault's left hand stays on the top until the hooves are down**, so the vault has no free flight.

The phantom-wrench gate on the horse vault, same rig, before (50f5b53) and after:

| | 50f5b53 | now |
|---|---|---|
| phantom wrench outside impacts | 0.49 s of 2.40 s over, worst 5,486 N | pass |
| required force in contact | 11.3 x BW | 3.7 x BW |
| position pops | palms 0.3 and 0.4 cm | none |
| fastest point | 12.2 m/s | 10.0 m/s |

Still failing as before: a 0.015 m/s step in the COM velocity at 0.98 s, the upper arm and thigh capsules 3.5 cm at
1.068 s, and the feet at 10 m/s in the spring.

The rig changed in the same pass. Each part's touching points on a face are now its convex hull in that face's plane,
as in the idle rig. The deepest vertex plus or minus 2 cm, as before, stood a flat hoof on its heel.

The vault now takes 0.97 s to build (node, horse), up from 0.47 s.

Next: the climb's jump asks 6 x BW of the legs (0.26 s from the crouch to the catch) and its drop outruns gravity, so
both are re-keyed as ballistic flights. In flight the angular momentum must also hold.

### 2026-10-20 (physics balance, second part): the climb, and where the window stands

**The climb is re-keyed** wherever it asked for a force its legs or hands could not give. Its duration goes from 4.85
to 6.10 s.

| stretch | before | now |
|---|---|---|
| jump | crouch to catch in 0.26 s: 6 x BW | a deeper crouch, a steady 2 g push of 0.16 s, then the launch, apex and catch on one arc |
| flight | legs tuck, arms swing in the air (up to 300 N·m) | limbs held to the trunk; the hands reach onto the top in the last 0.15 s |
| far side | one hand on two contact points while sliding off; the hips 0.81 m down in 0.28 s | the right hand re-planted turned in the straddle; the lowering takes 0.48 s |
| drop | 0.40 m in 0.20 s, faster than a fall | from a still hang on the free fall's parabola; the hooves come off the face and the hands off the top first |
| turn onto the tile | the stance hoof 20 to 30 cm from the centre of mass | the weight onto each foot, then one swing per step (0.32 s), set down over the mark |

Flight keys carry the arc's speed and an acceleration of -g. Keyed by speed alone, the drop outran gravity at 13.8 m/s²
and the push went on past the toe-off at +24 m/s². The plan's arc could fit neither, and it moved the toe-off earlier
each round to try.

**New in the shared tools:**
- `angleTrack` keys a trunk's heading, pitch and roll on C2 quintics. `spinTrack`'s cubic in the log of the turn stepped
  the angular acceleration at every key: 55 m/s² at the head within 2 ms. It also made the vault's 0.98 s velocity step,
  which now passes.
- `track()` takes acceleration pins.
- A limb key's `soft` option: next to a floor key, the hoof's height is the softplus maximum of the two, and the leg's
  soft reach widens mid-segment. A leg driven at an unreachable mark locked straight, and its knee whipped at 14 m/s at
  the toe-off.
- A limb key's `arc` option lifts a step mid-swing, so the hoof no longer stops in the air at a mid-step key.
- **What counts as support:**
  - a part against a face, or on a top the body hangs below, doesn't count (forearms on the edge at the catch);
  - a body part on a top with the centre of mass above it does count (a belly on a sill);
  - a touch under 60 ms is not a grip.
- **The contacts' probe is the rig's own surface:** every hand and foot vertex and every third of the rest.
- **The feet's push** fades over the 20 ms next to a flight, and a feet sample's box is the intersection of its
  neighbours'.
- **The body's turning.** The whole body turns about its centre of mass at w = I^-1 (L* - L):
  - in flight, L* is the flight's median and the turn is eased in and out over the contacts beside it;
  - on contacts, L* is L averaged over 40 ms, so a leg's swing or a stepping hoof's arrival is taken by a few degrees of
    the trunk instead of 270 to 640 N·m from one hand or hoof.
- **Two rounds**, the follow warm-started; four gave no more.

The gate on the horse, same rig. The climb is compared with the unbalanced 7232820; the vault was the first part's.

| | climb before | climb now | vault now |
|---|---|---|---|
| phantom wrench outside impacts | 0.94 s of 4.85 s over | 0.21 s of 6.10 s over | pass |
| required force in contact | 12.6 x BW | 3.1 x BW | 3.7 x BW |
| external velocity jumps | 4 | pass | pass |
| position pops, internal snaps, joint range | pass | pass | pass |

The vault now passes 6 of the 8 checks. Its capsule overlap and point speed are not balance checks.

**The vault on every mammal:**
- The required force passes for all 11 (3.4 to 4.8 x BW).
- Both checks pass for 7: horse, goat, bull, cow, donkey, sheep and skunk.
- The rabbit and the dog fail the wrench check at its first moving sample, 11% against the limit of 10%.
- The pig director fails it at one sample of the spring (32%).
- The pig foreman fails it on two events between samples (worst 127 N).

**Still over 10% of body weight on the climb:**
- the toe-off and the start of the flight (56% and 55%), where the legs slow as they near full reach just as the support
  narrows to the toe tips;
- the weight onto the right foot (26%) and the right foot's step (43%);
- the left leg over (13%);
- 388 N·m airborne just before the landing.

The catch, hang, walk-up, straddle, lowering, drop, absorb and the left foot's step pass.

**The window is not balanced on this branch.** Its first pass is parked on `anim/window-balance-wip` (bab4ab8):
- The clearance fit left the belly 1 to 2.6 cm above the sill through the slide, where the rig finds nothing holding the
  body. The trunk is now set down onto it.
- With that, the window is over the limit for 0.85 s of 3.68 (1.74 s unbalanced), with 17.4 x BW at the roll (30.1).
- The traversal test fails for five species: three trunks 1.1 to 1.4 cm into the sill, and the pig foreman's head
  16.8 cm in where the reach plans as a 0.16 s flight.

Next there: hold the sill until the hands are down; then the roll's contact jumps (328%), the sit-up and the rise.

Build time, measured while other sessions ran their tests: vault 1.3 s and climb 3.4 s, against 0.84 and 1.63 s at
50f5b53 under the same load. The balance is most of it (the follow and the contact measure).

### 2026-10-20 (physics balance, third part): the window's sill, reach and roll

The user: "Continue with the window's balance: hold the sill until the hands are down, measure the rest on every vertex,
then the roll."

**The rig now reads every vertex of the body** (phantom-wrench d3ea4d3). A belly sliding over the sill's edge touches it
between every third vertex: every vertex 0.03 to 0.3 cm off it, every third 1.5 to 2.2 cm, so no contact. The rig
already read every hand and foot vertex for the same reason. On the committed vault and climb it reads the same:

| | every third | every vertex |
|---|---|---|
| side vault | wrench and force pass | the same, in every number |
| climb, wrench outside impacts | 0.21 s over, 12 spans | 0.21 s over, 11 spans |
| climb, Left leg over | 13% BW | 10% BW |
| gate time, vault / climb | 24 / 115 s | 49 / 119 s |

**Support, in `traversal-balance.js`:**
- The contacts' probe is the rig's surface again: every vertex.
- A part on a top counts at its edge too, within 1 cm of the top's height. The rig reads a point just past the edge as
  touching the edge, pushing up and out.
- A body draped over a top still lies on it while its centre of mass is less than 15 cm below the top (the window's
  belly as it reaches for the floor), not when it hangs well below (forearms on a wall's edge at a catch, 70 cm).
- A hand against a face still grips, as the rig has it. Taking that away (only a hand on a top or within 5 cm below it
  grips) cost the climb's landing 0.08 s. It leans on a hand brushing the wall's face to take a 200°/s turn the drop
  carries onto the feet.

The vault and climb read the same, phase for phase, with all of this. `tests/natural-traversal.test.mjs` passes 12/12
with the committed window. `angleTrack` takes slope pins, and the planner's banded programme (`boxedPath`) is exported.

**What the window's reach is, measured.** A belly on the sill is an inverted pendulum about the edge, its centre of mass
about the belly's depth above it. Tipping head down carries the centre of mass past the edge and the tip speeds up.
Computed about the edge with the body's own inertia, it goes from 1.7 rad/s at the slide to 4.1 rad/s by the time the
left hand reaches the floor. The keyed tip stays near 1.8 rad/s. No shape of the body keeps it over the sill:
- the trunk is about 20 cm deep, so a trunk hanging down the far face carries its mass 10 to 20 cm past the edge;
- the legs, a third of the mass, can't reach far enough back to balance it (piked level behind: 3.5 cm of it);
- moving the hips back puts the chest into the wall.

Re-timed 0.1 s earlier, the keyed tip stays within about 4° of the computed one, but it slows from 1.76 s, before the
chest reaches the far face at 1.88 s: 130 to 270 N·m about the edge, with nothing there to give it.

**The window's balance, on its own branch and not passing yet** (`anim/window-reach-wip`):
- **The sill held until the hands are down.** The trunk is set down onto the sill as one smooth push inside a band at
  every 5 ms, solved with the planner's banded programme:
  - at least enough that the body is within the rig's centimetre of the sill's top or edge, on every vertex;
  - at most 8 mm into the sill anywhere over it: a soft belly flattens, and 4 mm in it touches over the sill's depth;
  - never into the floor.
  - A point that has passed the edge may go on down beside the face, so a 2.4 cm step in the nearest point never closes
    the band. The push sampled point by point, or averaged, stepped the hips' velocity by up to 0.5 m/s.
- **The hands** are aimed at their floor marks, set down on them and kept there. They used to touch down and slide 12 to
  20 cm.
- **The trunk turns on per-angle quintics** from rest into the roll's spin. `spinTrack` jolted the centre of mass by
  12 m/s² at a key.
- **The roll's re-seat is averaged** over its 40 ms, like the roll itself. Re-seated exactly, the lowest point's jump
  from the mane to the shoulder and on to the seat came back as a 0.6 m/s step in 6 ms (14 x BW). The seat now sinks at
  most 1.1 cm into the floor.
- **`hold`, a support rule tried there:** a body on a top that also leans on a face below it is held by the two, and the
  plan keeps the authored path for the rig to judge. Planned on the top alone, the draped body's centre of mass was
  pulled back 10 cm into the wall and 24 cm along it.

The gate on the horse (every-vertex rig), percent of body weight:

| | over the limit | slide | reach | right hand down | hands to the floor | back to the floor | roll | sit up | rise |
|---|---|---|---|---|---|---|---|---|---|
| first pass (bab4ab8) | 0.79 s | 12 | 33 | | 55 | 26 | 328 | 183 | 72 |
| re-timed, with `hold` (the branch) | 0.66 s | 146 | 150 | 35 | 42 | 40 | 34 | 38 | 47 |
| re-timed, without | 0.92 s | 120 | 142 | 79 | 36 | 41 | 34 | 38 | 48 |
| first timing, without | 0.55 s | 3 | 195 | 141 | 25 | 54 | 36 | 41 | 34 |
| first timing, with `hold` | 0.70 s | 3 | 110 | 44 | 106 | 52 | 40 | 41 | 32 |

The roll's fix holds in every variant: the required force in contact goes from 17.4 to 5.0 x BW. The reach passes in
none. The traversal test passes 10 of 12 on the branch: the goat's head is
2.2 cm into the floor at 2.12 s, and the pig director's trunk 5.2 cm into the sill at 1.82 s.

**Open: what stops the tip.** Gravity speeds it up until something holds the body:
- the hands bracing on the outside wall as the body tips, then walking down it to the floor;
- the chest coming to rest against the outside wall, the body sliding down it on the chest until the hands are down;
- or nothing: a free tip onto the hands, which reach the floor at about 2 m/s and take it on the arms.

That choice sets the reach's keys, then the two species.

### 2026-10-20 (physics balance, fourth part): the window's reach braced on the wall

The user: "Use option 1: the hands brace on the outside wall as the body tips and walk down it to the floor. Re-key the
reach around that, then fix the goat and the pig director."

The window's balance is now on this branch, with the third part's sill, hands, trunk and roll, and the brace:
- **The right hand braces on the far face.** At 1.42 s it goes off the sill top, over the edge and onto the face. It slides
  down the face under the body's weight to 32 cm above the floor, stays there until the left hand is down, then takes one
  step onto its floor mark (2.08 to 2.16 s). Pressed on the face it pushes the body out from the wall below the edge,
  which slows the tip.
- **It slides rather than stepping down the face.** Lifted mid-way for a step, it was off the wall for 50 ms just as the
  tip needed slowing: 55% of body weight.
- **Its elbow points out to the right, along the wall,** set in the world. Bent away from the wall, the arm went 7.5 cm
  into the chest as the shoulder neared the wall. Set out to the side in the chest's frame, it turned into the wall as
  the chest tipped.
- **The left hand lands at 2.04 to 2.08 s, while the right still braces.** Its mark moved 6 cm toward the body, still
  behind the rolling back. At the old mark it was out of reach until 2.10 s, so the right hand held the body alone on
  the wall for 60 ms, which a palm on a wall cannot do (110 to 120 N·m it cannot give). Closer still, the left elbow
  folded to 172° at the roll.

**New in `traversal-pose.js`:**
- `face`: a palm pressed flat on a face, turned the least way to face it, and blended with a floor palm from one to the
  other. Switched at the key, the hand jumped 1.4 cm.
- `arcTo`: the direction of a step's lift. A palm stepping between two places on a face comes off it on the way.
- `elbowTo`: an elbow's bend direction set in the world.
- The vault and climb pose bit for bit the same.

**The species.**
- **Pig director.** Keyed at the horse's hips, its belly went through the sill as it went down the far face, and the
  clearance fit, lifting it 19 to 26 cm, still left it 5.7 cm in. A deeper body now hangs further out from the far face
  by its extra depth (`far`: 16 to 19 cm for the pigs, under 1 cm for the rest). It is left 1.2 cm in, within its 3 cm.
- **Goat.** Its ears dipped 2.3 cm into the floor for 40 ms while the clearance fit swung its head from one turn to the
  next. The head now tucks a little as the hands land (nod 10°), and is left 0.2 cm in.
- `tests/natural-traversal.test.mjs` passes 12/12.

The gate on the horse, same rig. The committed window is the unbalanced one.

| | committed | first pass (bab4ab8) | now |
|---|---|---|---|
| over the limit (wrench outside impacts) | 1.71 s of 3.68 | 0.79 s | 0.36 s |
| slide over | 113% | 12% | 0% |
| reach for the floor | 106% | 33% | 21% (one peak, 1.80 s) |
| down the wall | | | 0% |
| hands to the floor | 77% | 55% | 40% |
| back to the floor | 179% | 26% | 32% |
| roll | 247% | 328% | 32% |
| sit up | 153% | 183% | 38% |
| rise from the crouch | 366% | 72% | 45% |
| required force in contact | 30.1 x BW | 17.4 x BW | 5.0 x BW |
| external velocity jumps | 3 | 5 | none |
| joint range | elbows 151 and 155° | left elbow 157° | elbows 160 and 151°, knees 156° |

A palm on a face can push, not pull, though the rig lets any hand on an obstacle grip. A copy of the rig where a hand on
a face only pushes reads 0.39 s over, against 0.36 s: the plan leans on little it could not have.

**Left in the window:**
- the right hand leaving the wall at 2.09 s (40%): the body turns from heading 46 to 58° on the left hand alone;
- back to the floor, the roll, the sit-up and the rise (32 to 45%);
- the left elbow folds to 160° and whips at 10 m/s as the roll starts;
- the knees reach 156° in the rise.

### 2026-10-20 (physics balance, fifth part): the brace's hand-over, the roll's release, and the roll to standing

The architect: "Finish the transfer from the wall brace to the floor. Try delaying the remaining torso turn until the
right hand has landed, so the left arm doesn't have to take that twist alone. Then smooth the left arm's release into
the shoulder roll, addressing the elbow whip. Keep the improved sill contact and species corrections. Once that
transition works, tackle the roll → sit-up → rise as the next continuous section. Check the final balanced poses for
reach and clipping across the animals."

**The hand-over from the brace.**
- **The torso holds its heading (46°) from "Down the wall" until the right hand is down** (2.18 s, from 2.16), then
  turns to the roll's 78° along one curve. The roll starts at 2.46 s (from 2.40). The 2.22 s key had held the hips
  high, so the body fell onto its hands with the floor pushing a third of its weight, then stopped at 2.3 body weights
  just before the roll. It now comes down at a steady 0.9 m/s.
- **The new key sits on the committed hips curve.** Keyed lower, it steepened the descent through "Down the wall", and
  the belly slid 1.1 to 1.4 cm off the sill's edge (20% at 1.95 s).
- **The right hand's step off the wall has no lift.** The lift took the palm's outward offset away in 30 ms, a 5.4 m/s
  hump. The hand now slides off the face, 2.06 to 2.18 s.
- **The balance planner holds the pressure point inside the contacts' outline (their convex hull), not their bounding
  box,** solving x and z together. With the hands on a diagonal, the box let it sit 4 to 11 cm off the line between
  them, and the rig, reading the hull, found 20 to 32% of body weight of phantom force in "Back to the floor". It now
  reads 3%. The solver gained a stride: bit for bit the same on one channel, and on two channels without coupling rows
  within 2e-7 of two separate solves.

**The release into the roll.**
- **The left hand leaves the floor for a point beside the shoulder, in the chest's frame, then tucks.** Blended straight
  from the floor to the tuck, its path passed a few centimetres from the shoulder: the elbow folded to 158° and flicked
  at 9 m/s. Out to the side in the world, the hand moved too fast (8.7 m/s). The elbows now peak at 142°, and no point
  passes 8 m/s (the elbow reached 10 m/s before).
- **Bend directions turn softly (`steadyPoles`).** The side a knee or elbow bends to was clamped at its turn limit, and
  switched when the pole came within 0.2 of the limb. Each switch kinked it at a 5 ms sample: the right elbow's velocity
  turned by 1.9 m/s in 3 ms as the arm let go of the floor (400 to 600 m/s^2). The limit is now a tanh and the switch a
  smoothstep (173 m/s^2, like its neighbours), and the sampled sides are joined with plain slopes.

**The roll.**
- **The roll's raw path is smooth between impacts.** Each impact is a step of velocity and spin, from the turn about one
  contact to the turn about the next. Joined by straight lines, the steps kinked the path every half degree. Through
  one curve, it rang about each impact (34 m/s^2 within 5 ms at the hooves' landing).
- **The turn about the axis follows a smooth curve,** pinned to the spins at both ends. Slerped, the last step ran at
  the step before's speed and met the get-up 0.2 rad/s apart.
- **Each step's time comes from its mean spin.** From the spin before alone, it ran 12% fast as the body slowed.
- **The softening is a triangle,** whole wherever it fits and blended to the raw path over its half-width at each end.
  The box stepped the floor's push at its edges as they passed each impact. Narrowed sample by sample at the ends, it
  kinked the path (12 m/s^2).

**The roll to standing.** The hooves land 40 cm along the wall from the centre of mass. Tucked 14 cm tighter, they land
earlier and only 4 to 10 cm nearer. The momentum left after their landing is 35 J, where rising over them takes 180.
Turning on about the hoof, as before, the body would fall back: the plan dragged the centre of mass 30 cm forward over
the feet, the hips sank between the heels (knees at 167°), and any change made it run away.
- **The body rocks on over its seat, the hooves braking it to rest over 32°.** The braking fades as it stops, so the
  get-up starts without a pull.
- **It leans its weight forward onto the feet with the seat still down.** A band like the sill's holds the seat on the
  floor, measured on the final legs. The overalls' seat rides on the thighs: with the legs planted it floated 1 to 5 cm
  above the floor, and sank 7.5 cm into it as the pelvis tipped upright.
- **While it sits, the plan keeps the authored path** (a new `hold` in `balanceTraversal`). Its own hips' move lifted
  the seat, and the next round, finding the feet alone under a centre of mass 30 cm behind them, ran the hips away at
  80 to 210 m/s.
- **It rises over the feet and steps back onto the tile centre in three steps:** the left foot halfway, the right to its
  mark, the left round to its mark. Each lifts once the weight is over the other; lifted as the weight crossed, it read
  49%.
- **It turns to face on along one smooth curve over the whole get-up,** on heading and pitch angles (C2, as before the
  roll). Turned key by key, a turn on one foot asked a hoof for 50 to 140 N·m it cannot twist.
- **The feet no longer slide.** Before, they slid 25 and 70 cm into the stance under load.
- **The arms are kept off the legs (`fit.solveSelf`).** Each arm's capsules (the rig's radii) are kept off both legs' by
  moving the arm's end out the way they part. Placed by hand, the arms went 9 to 12 cm into the thighs and shins as the
  knees came up to the chest.
- The get-up takes 2.36 s (it was 1.0 s), and the window 5.71 s (it was 3.68 s).

The gate on the horse, same rig, against the committed window (f70faa0):

| | committed | now |
|---|---|---|
| over the limit (wrench outside impacts) | 0.36 s of 3.68 | 0.14 s of 5.71 |
| hands to the floor | 40% | 8% |
| back to the floor | 32% | 3% |
| roll | 32% | 50% (one sample, 2.75 s) |
| sit up | 38% | 0% |
| lean over the feet | | 4% |
| rise | 45% | 121% (one sample, 3.86 s) |
| the steps and weight shifts | | 0 to 5% |
| left foot round | | 19% |
| stand on the tile | 11% | 14% |
| required force in contact | 5.0 x BW | 3.1 x BW |
| point speed | elbow 10.0 m/s | under 8 m/s |
| joint range | elbows 160 and 151°, knees 156° | inside |
| capsule overlap over 2 cm | 2 pairs, 4.3 cm | 1 pair, 2.4 cm |

**The vault and the climb under the shared changes.** The vault stays within the phantom limits. The climb goes from
0.21 to 0.15 s over. Their capsule and point-speed failures were already there; the vault's capsule overlap moved from
3.5 to 3.8 cm.

On every mammal, the vault's required force passes (3.4 to 4.8 x BW) and its phantom check passes for four: the horse,
both pigs and the rabbit. The dog has one short event in its first 20 ms (183 N). The other six each have one at 0.121 s
in the step-in, 73 to 75 N against a 73.5 N limit. That is a 1 ms ripple in the centre of mass, and the previous commit
has it too: 11% of body weight at 1 ms on the goat, against 10% now. There the gate's between-sample audit, which looks
only inside the stretches its 0.1 ms re-scan flags, didn't look at it. A/B: the planner file moves what gets flagged.

**Reach and clipping across the animals** (the window, every 10 ms; the gate's capsule pairs over 1 cm, worst):

| | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clipping, committed (cm) | 4.3 | 4.8 | 3.4 | 4.5 | 4.0 | 4.2 | 2.5 | 2.0 | 4.1 | 4.6 | 2.7 |
| clipping, now (cm) | 2.4 | 2.2 | 1.2 | 4.1 | 7.1 | 3.3 | 2.8 | 3.7 | 1.8 | 3.9 | 2.7 |
| left hand short of the floor at 2.03 s (cm) | | 0.9 | 12.8 | 3.7 | 10.2 | 11.0 | 11.4 | 8.8 | | 4.1 | 11.5 |

- The donkey's right hand, pushed off its leg, folds into its own shoulder (7.1 cm at 4.43 s).
- The cow's and the rabbit's right upper arm touch the trunk as the roll starts (4.1 and 3.9 cm; 4.5 and 4.6 before).
- The left hand's shortfall was there before, up to 3 cm worse (sheep 14.3, bull 13.3 cm): their arms reach the floor
  later than the horse's.
- The goat's legs are short of the get-up's step marks by up to 9.9 cm, from 13.8 cm short of its stance at the end.
- The clearance fit's leftovers, as it reports them, are within the test's limits on every mammal (its report is taken
  before the balance moves the body: on the final motion they are not; see the sixth part).
  `tests/natural-traversal.test.mjs` passes 12/12.

**Left in the window:**
- the lift-off from the seat (one sample at 121%, 3.86 s) and the step into the planner's hold (50%, 2.75 s);
- "Reach for the floor" (19% at 1.79 s; 21% before), the last step (19%) and the stand (14%);
- the donkey's arm, and the left hand's reach on most species.

### 2026-10-20 (physics balance, sixth part): the left hand on every animal, the donkey's arm, the lift-off, and the clearance no check read

The user: "Next pass: get the left hand onto the floor on every species, fix the donkey's arm, then smooth the seat
lift-off spike."

**The roll starts where the descent brings the hips.** The roll's start was placed by its lowest point, set on one spot
(.94, -.55). That point is the horse's mane crest, most others' shirt on the back, and the goat's horns, so each body
lay up to 19 cm along the wall from the horse's (the goat's 30 cm the other way). The left hand's floor mark is set under
the shoulder as it lies at the roll's start, so on six species it was out of reach as the hand came down (8 to 13 cm
short at 2.03 s, down 40 to 120 ms late). Now the hips lie where the horse's do (a wider body farther from the wall,
as before), and the lowest point sets only their height: a vertical move does not change which vertex is lowest, so the
height is exact at once. Each roll takes as long as before: its dynamics do not depend on where it starts.
- The left hand is on the floor by 2.08 s on all eleven mammals, with no shortfall (it was 4 to 13 cm short on eight).
- The goat's steps reach their marks (9.9 cm short before): its roll had ended 30 cm off.
- The donkey's right hand no longer folds into its own shoulder (7.1 cm, the elbow at 174 degrees). Lying where it did,
  the self fit pushed the hand 35 cm up off the thigh beneath it; it now moves it aside, and the elbow peaks at 78.
- On the horse the new placement moves no point by more than 2.3 mm (a palm, once).

**The right elbow turns up as the body lies back onto its hands.** A body that lies lower at the roll's start than the
horse's (its back's surface nearer its bones: the skunk, cow and rabbit, 4 to 5 cm) folds its right arm tighter over the
hand. Bent back along the body, the upper arm went 4 to 6 cm into the lower trunk; the horse's cleared it by half a
centimetre. Swept round the circle the elbow can lie on (shoulder and wrist fixed), it is clear turned up, on every
mammal and all the way down; out to the side is the wall. Moving the hand out along the floor instead opened the elbow
(123 to 118 degrees) and went deeper in: the arm lay more along the trunk. The elbow now turns up (UP, in the world)
over the lie-back, and the cow and rabbit have no capsule pair over 1 cm.

**The lift-off.** The seat lifts with the centre of mass 7 cm behind the heels. The planner kept the authored path
while the body sat ('hold'), by a tracking weight alone, and met the feet's outline after the hold in its last samples,
at 2 g, with nothing holding the push to what the floor can give: 121% of the body's weight of phantom force, the
shift's acceleration 25 m/s^2. A held sample is now planned across as the feet are, near its authored path: its height as
authored (so the hips cannot lift the seat, the hold's reason), the pressure point inside the support's outline (seat,
feet and hands, while sitting) and the push within friction. That gave 33%. The rest was a knee: `steadyPoles` let a bend
direction start turning at its full rate at once, and a knee folded to 149 degrees, a thigh's length off its hip-ankle
line, swung from rest to 1 m/s in 10 ms (100 to 170 m/s^2). The sampled directions are now softened by a triangle over
2 samples either side: 7%. Softened wider (3 or 4 samples), a side that must turn fast turned early: the pig director's
knee at the vault's spring read 35% of its weight.

**The seat band counts a tail's root as seat:** it rides the hips and cannot bend away, and left out of the band the
skunk's plume root went 9 cm into the floor as the body rocked.

The gate on the horse, same rig, against 669b9a8:

| | 669b9a8 | now |
|---|---|---|
| over the limit (wrench outside impacts) | 0.14 s of 5.71 | 0.04 s |
| roll (the step into the hold) | 50% | 30% |
| rise (the lift-off) | 121% | 7% |
| required force in contact | 3.1 x BW | 3.5 x BW |
| capsule overlap over 2 cm | 1 pair, 2.4 cm | 1 pair, 2.6 cm (the left hand in its thigh, rising) |
| point speed, joint range, jumps, pops | pass | pass |

**The vault and the climb under the softened bend directions** read as before on the horse: the vault within the
phantom limits, the climb 0.15 s over, their capsule and point-speed failures as they were (vault 3.8 cm, 9.6 m/s;
climb 3.8 cm, 9.1 m/s). On every mammal the vault reads as at 669b9a8: the required force passes on all 11 (3.4 to 4.8
x BW), and the phantom check on the horse, both pigs and the rabbit; the others have their one short event (the step-in
ripple, the dog's first 20 ms).

**Clipping across the animals** (the window, every 10 ms; the gate's capsule pairs over 1 cm, worst, cm):

| | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 669b9a8 | 2.4 | 2.2 | 1.2 | 4.1 | 7.1 | 3.3 | 2.8 | 3.7 | 1.8 | 3.9 | 2.7 |
| now | 2.6 | 2.9 | 1.0 | under 1 | 1.4 | under 1 | under 1 | 3.7 | 1.9 | under 1 | 2.7 |

The left hand reaches the floor on every mammal and the goat's legs their step marks (the reach is short only where it
was before the window: the step in, and the pig foreman's legs at the sill). `tests/natural-traversal.test.mjs` passes
12/12.

**The clearance no check read.** The clearance fit's report (`fit.report`), which `tests/natural-traversal.test.mjs`
caps, is taken before the balance (and the window's bands), which then move the body. Read on the final motion with
phantom-wrench's `bin/collisions.mjs` (every vertex, every 10 ms, through the battle contract), it is much worse, on the
committed code as now:

| deepest surface point (cm), the window | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 669b9a8 | 4.7 | 9.0 | 4.4 | 16.7 | 9.1 | 16.6 | 9.9 | 13.8 | 14.7 | 19.2 | 5.9 |
| now | 4.3 | 5.5 | 4.4 | 13.2 | 8.8 | 16.5 | 8.0 | 13.6 | 14.4 | 18.9 | 5.9 |
| where, now | trousers, rising | trousers | trousers | tail | trousers | trousers | right arm, the wall | trousers | trousers | trousers | tail |

- In the window, most of it is the trouser legs going 13 to 19 cm into the floor as the body rises, which nothing
  checks: the test caps the trunk, head and tail, and the gate's capsules are the bones'.
- In the climb (committed), every head goes 4.5 to 9.8 cm into the wall at 4.6 s (the horse's left forearm 8 cm at
  4.55 s), and the pig foreman's trousers 40 cm into the floor at 0.63 s. The vault is clean (1.4 cm at most).
- Re-taking the report after the balance, with a second self fit and the tails bent again on the final motion (parked
  on `anim/window-honest-wip`), the test fails on three window leftovers: the goat's head (3.0 cm at 2.44 s), the
  skunk's trunk (1.2) and the dog's (1.5). And bent again, a tail jumps between candidate bends from one 20 ms sample to
  the next: the dog's swept 39 cm through the floor for 10 ms.
- The skunk's rock now falls within the wall's span, and its right elbow, bent back and out, points at it: the arm goes
  8 cm into the wall from 2.96 to 3.12 s (its plume root was 9.9 cm in the floor instead), and the cow's right forearm
  6 cm from 3.16 s. A world direction for that elbow, tried and not kept, cleared the cow's but not the skunk's.

**Left in the window:** the clearance on the final motion, above, first. Then the roll's step into the hold (30%: the
balance shift jitters on its 5 ms grid through the roll), "Reach for the floor" (19%), the last step (19%), the stand
(14%), and build time.

### 2026-10-21 (physics balance, seventh part): the clearance on the played motion

The user: "Fix the clearance on the played motion next: the window's trouser legs, tails and the skunk's arm first,
then the climb's heads and the pigs, and make the traversal test read the final motion."

**The window's trouser legs.** Bent along a sitting leg's hip-ankle line (the default), the knees took whichever side
the roll left them on and splayed out and down into the floor as the body sat, leaned and rose: the rabbit's knees
9 cm under it, its trousers 19. The knees now point up and out through those keys (`KNEE_UP`, in the pelvis frame;
straight up, the thighs met the chest leaning over them). With the knees up, the seat rose 1 to 2.5 cm off the floor
through the lean once the bend directions were found again for the moved hips, and the plan, finding the feet alone,
dragged the hips 11 cm toward them and folded the knees to 160 degrees. The seat band is now measured twice, and a
held sample keeps the support the authored motion had (measured again on the moved hips, the seat lifted off the floor
and the lean read 78% of the body's weight).

**The skunk's arm.** Hung outside the knee while the trunk leans over the thighs, the right hand (on the wall's side)
went into the wall: the skunk's 8 cm, the cow's 6. It now reaches forward past its knee, then comes out beside the
thigh to rest. The self fit keeps the forearm and hand off the upper trunk too (chest to neck, .14): kept off a raised
thigh alone, a hand was pushed up through the chest (the rabbit's 18 cm into it).

**Tails.** Re-bent on the final motion, a tail swung between candidate bends from one 20 ms sample to the next (the
dog's 230 degrees, 22 cm through the floor for 10 ms). A bend now moves no faster than 40 degrees a sample, and each
step must clear half way. Followed from moment to moment, a tail held down stays pressed against what holds it: the
cow's, sat on in the roll, was pinned at the grid's corner 3 cm in the floor with the clear side 180 degrees away; the
dog's lay 4 cm in for 1.5 s. After the balance, where the followed path touches (at a sample or half way to one), the
path is planned over the whole motion instead (Viterbi on the candidate grid). Planned at its samples alone it took
steps whose middle went through the lintel (the skunk's plume, 8 cm for 10 ms): it now checks each step's midpoint
under the poses at both ends and between them, moves one grid step (10 degrees) a sample within 5 cm of anything, plans
with 3 cm to spare, and is played as planned (smoothed and snapped afterwards, it rebuilt the step it had avoided).
Bending each candidate once, skipping bends whose bounding sphere is clear, and an allocation-free depth put its cost
inside the build's run-to-run noise.

**The climb's drop.** Raised overhead, the hands swept down past the far face at 8 m/s as the feet landed. The balance
counted them gripping it, so the drop's flight ended at the grip, not the feet, and its turn was carried into the
landing: 21.5 degrees toward the wall at 4.60 s, every head 4.6 to 8 cm into it, every forearm 6 to 8. Taken off the face,
the landing read 924 N of phantom force (126% of the body's weight): the rig's grip on the sliding hands had been
holding the landing's turn. So the palms now come off the top, out past its far edge and onto the far face, and slide
down it as the body drops, pushing it off the wall until the landing is absorbed. The balance sees a grip, not a
flight, and adds at most 2.8 degrees of turn. Straight from the top to the face, the fingers cut through its corner
(4 cm); arced over it, the hand's turn onto the face switched its way round 2 ms short of done and popped the palm, so
they pass a point just past the edge.

**The climb's push-off.** The balance winds the body up before the jump (14 degrees toward the wall at 0.76 s), and the
long heads went 4 to 6 cm into the near face (the horse's 2.4), where the fit before the balance saw them clear. Standing the crouch back
made it worse (the longer jump leans further). The head is now fitted again after the balance (`fit.solveHead`): its
bow kept (the balance was planned with it), the turn eased over 0.25 s (over 0.1, the crouch read 17% of the body's
weight), and held through a flight next to it (eased out into the jump, it asked 0.03 s more phantom torque in the air).
Tried in the window too and not kept: held through the hop, a turn chosen for the donkey's ears at one moment took them
8.3 cm into the lintel at another, and no turn of the head clears the goat's horns in the roll.

**The pigs' hang.** Unadapted, the fit pushed a pig's belly 17 to 26 cm back off the face in the hang, out of its arms'
reach of the top. Its hands never gripped; the balance, finding nothing holding the body until the straddle, planned a
second-long flight and drove the hips 25 to 40 cm into the floor to launch it. The hang keys now stand back like the
approach (`near`), so the grip rise sees the stand-back, and lean over the belly toward the wall until the shoulders are
where the horse's were (stood back alone, the pig director's shoulders were 52 cm from the top, past its arms' 50).
Both pigs now grip from the catch to the straddle. Their climb gate goes from 2.5 and 2.8 s over the limit (required
force up to 1130 x BW, knees at 154 m/s, 44 capsule pairs) to 1.3 and 1.2 s (6 to 10 x BW); their bellies still pass
through the 16 cm top in the straddle.

**The test reads the played motion.** Every crossing now takes the fit's report again after the balance (the vault and
the window bend the tails again, the climb the head and tails), so the leftovers the test caps are the motion's as
played. The named gaps are set to it.

The gate on the horse, same rig, against d3fec1f:

| | d3fec1f | now |
|---|---|---|
| window: over the limit | 0.04 s of 5.71 | 0.07 s |
| window: the lean over the feet; the rise | 0; 7% | 27% (198 N at 3.805 s); 0 |
| window: the roll | 30% | 31% |
| window: required force in contact | 3.5 x BW | 3.0 x BW |
| window: capsule overlap over 2 cm | 1 pair, 2.6 cm (left hand in its thigh, 3.92 s) | 1 pair, 2.2 cm (right hand in its thigh, 4.33 s) |
| climb: over the limit | 0.15 s of 6.10 | 0.14 s |
| climb: the drop; the weight onto the right foot | 81 N (11%); 135 N (18%) | 25 N (3%); 0 |
| climb: the crouch | 8 N (1%) | 65 N (9%: the head turned clear) |
| climb: points over 8 m/s | 7 (the wrists at 9.1 as the arms swung down at the landing) | 4 (as before: the push-off, the left leg over) |
| vault | within the phantom limits, 3.7 x BW | the same |

On every gate the capsule failures, and the vault's and climb's point-speed failures, are as they were (the climb's
fewer). The window's balance is the one thing worse: with this pass's changes to its sit and rise (the knees, the
right arm, the seat band measured twice, the held support), the lean over the feet reads 27% late in it, where it
read nothing.

**Clipping across the animals** (phantom-wrench's `bin/collisions.mjs`: the deepest surface point, every vertex, every
10 ms, through the battle contract; cm):

| | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| window, d3fec1f | 4.3 | 5.5 | 4.4 | 13.2 | 8.8 | 16.5 | 8.0 | 13.6 | 14.4 | 18.9 | 5.9 |
| window, now | 4.1 | 4.3 | 3.7 | 3.4 | 2.9 | 3.5 | 4.1 | 1.3 | 2.6 | 3.5 | 2.8 |
| climb, d3fec1f | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 40.2 | 35.6 | 8.0 | 8.0 |
| climb, now | 3.5 | 5.6 | 3.2 | 4.0 | 3.7 | 3.5 | 4.1 | 8.0 | 8.0 | 8.0 | 3.9 |
| vault, d3fec1f | 2.8 | 3.8 | 3.9 | 4.4 | 7.9 | 3.4 | 3.4 | 5.4 | 5.4 | 2.9 | 2.9 |
| vault, now | 2.8 | 3.8 | 3.9 | 3.0 | 3.2 | 3.4 | 3.4 | 5.4 | 5.4 | 2.9 | 2.9 |

- In the window, every animal's deepest point is now a hand or forearm on the sill as it slides over (1.26 to 1.30
  s), or a pig's shirt on it; before, it was the trouser legs in the floor as the body rose, the tails and the skunk's
  arm.
- In the climb, the heads and forearms that went 8 cm into the wall at the drop are out. What is left is the legs
  coming over the top (the trousers at 3.6 s: the goat's 5.6, the rabbit's 8.0, both as before), the feet leaving the
  far face (4.1 s), and the pigs' bellies through the top in the straddle.
- In the vault, the cow's and donkey's tails are out (4.4 and 7.9 before); the rest is as it was.
- The traversal test passes on every mammal with the report read on the played motion. Switched off, the tail planner
  leaves the cow's and dog's tails 3.3 cm in the floor, and the test's cap catches it.

**Left:**
- The window's balance, 0.07 s over the limit (0.04 at d3fec1f): the lean over the feet (27%, new), the roll's step
  into the hold (31%), the reach (19%), the left foot round (19%), the step in (18%) and the stand (14%).
- The climb's push-off and the flight over the top (60 and 63%), the right foot's step round (48%).
- The pigs' straddle: their bellies pass through the 16 cm top (the foreman's 15.6 cm under it at 3.70 s, the
  director's 7.9), and their climb gate (1.3 and 1.2 s over, 9.6 and 6.4 x BW). A pig needs its own straddle.
- The goat's horns in the window's roll (3.6 cm), the donkey's and rabbit's ears at the lintel (2.8 and 5.1); hands
  and forearms on the sill and the wall's edges (up to 5 cm: the test caps no limb); the climb's left leg over the top
  (the rabbit's trousers 8 cm in, the goat's 5.6) and the feet leaving the far face (4 cm).
- Build time.

### 2026-10-21 (physics balance, eighth part): the pigs' straddle, and what the window's lean is

The user: "Do the pigs' straddle over the climb's top first, then the window's lean."

**The pigs' straddle.** The horse's keys lean its trunk over the 16 cm top, held there by its hands, its seat a few
centimetres above it. At those leans a pig's belly went 8 to 36 cm into the top, and its arms, set wider, fell 3 to 5 cm
short of holding it above. For a body that deep in front (`deep`: more than 5 cm; the pigs stand back 16 and 19 cm,
every other body within 1 mm, and switched on at "more than 0" the donkey's 1 mm moved its legs 22 cm):
- each key from the chest over the top to the left leg over takes the least change of lean and height that keeps the
  torso out of the top (its points at rest riding the hips or spine), and from the right knee up on rests the seat on
  it, 7.5 mm above; the hands' reach to their marks is a cost. The foreman's chest-over-the-top key comes out 20 degrees
  flatter and 26 cm higher.
- between the keys one smooth vertical move holds the torso's lowest point over the top 6 to 9 mm above it, measured on
  the final limbs every 5 ms from 2.55 to 3.66 s, then runs on free until the lowering's key. Let go in 80 ms at the
  band's end instead, the foreman, held 13 cm down onto the top's edge as it slid off, rose 12 cm, lifted its hands off
  the top and fell at 6 g (724% of its weight); released slowly, the balance goes from the seat straight to the grip.
- the balance keeps the authored path on the top (`hold`), and a held sample now keeps the authored support whatever
  the moved hips touch: the seat rose 5 mm off the top for 40 ms, and the plan, finding it in flight, jerked the body at
  39 m/s.

Every other climb and every window is the same motion as before (largest point difference 0.0000 cm on all 11
mammals). The gate, the climb, b11a948 against now (phantom force, peak per phase, % of body weight):

| | pig foreman | pig director |
|---|---|---|
| over the limit | 1.34 -> 1.06 s | 1.24 -> 0.71 s |
| right knee up | 0 -> 55% | 37% -> 0 |
| straddle | 633% -> 0 | 134% -> 0 |
| left knee up behind | 6348% -> 70% | 1029% -> 269% |
| left leg over | 910% -> 493% | 2174% -> 0 |
| lower down the far face | 14% -> 220% | 170% -> 214% |
| let go | 118% -> 233% | 165% -> 310% |
| required force in contact | 9.6 -> 9.4 x BW | 6.4 -> 8.8 x BW (2.40 s, the right knee onto the top) |
| capsule overlap, deepest | 11.2 -> 3.2 cm | 10.1 -> 6.4 cm |
| points over 8 m/s; fastest | 20; 55.1 -> 13; 18.2 m/s | 14; 14.2 -> 13; 16.7 m/s |

The fit's report (the test's cap), trunk: 15.6 -> 1.7 cm (foreman), 7.9 -> 2.6 (director). `bin/collisions.mjs`: the
foreman's deepest point 8.0 cm (the trousers through the top at 2.86 s) -> 6.6 (a boot in the near face in the hang,
1.48 s); the director's 8.0 (the waistcoat, 2.31 s) -> 7.9 (the trousers as the left leg goes over, 3.60 s).

**The window's lean.** The 27% in the lean over the feet is one 5 ms sample: 198 N at 3.805 s, with the seat and both
hooves on the floor (the phase's mean is 2 N). The rest of the 0.04 -> 0.07 s is three more samples in the roll. At
that sample the balance's move of the hips accelerates the body at 28 m/s^2 across the floor, then turns it round
within 3 ms (along the wall, +16.7 -> -16.7 m/s^2 at 3.806 to 3.809 s) as the seat lifts. What it is answering: once
the seat is off, the feet are the only support and the centre of mass is outside them, so to keep the pressure point
on the feet the plan throws the body toward them as the seat lets go.

At the seat's lift-off every mammal's centre of mass is outside its feet's support (cm, the authored path, from the
balance's own samples):

| horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|
| 12.3 | 14.7 | 11.0 | 21.8 | 12.1 | 14.7 | 16.7 | 9.4 | 9.9 | 21.2 | 13.1 |

and the trunk leans back: the lean key's pitch is -5 degrees, and the horse's chest is 5 cm further from its feet than
its pelvis. The get-up above says the body "leans its weight forward onto the feet with the seat still down"; it never
did. d3fec1f had the same fault, hidden longer: the horse's left thigh splayed on the floor, both hands on the floor
behind the hips and the right forearm and sleeve on the wall carried it until 3.90 s, when its centre of mass was still
9.7 cm outside its feet (the cow's 11.8, the rabbit's 12.8, the skunk's 8.3). The seventh part's clearance fixes (the
knees up, the right hand forward past its knee) took those contacts away. The right sleeve, which this was first taken
for, was one of them.

Tried and not kept:
- A right palm braced on the wall (fourteen variants). The horse's lean went to 0 but its rise to 12% and its total
  stayed at 0.07 s. The cow went 0.69 -> 0.39 s and the rabbit 0.21 -> 0.14. The skunk sits with its knees up toward
  the wall, and its upper arm went 11.8 cm through its thigh; its left elbow, already at 148 degrees in the roll
  (allowed 150), went past its range (158 to 166) in every variant tried.
- The lean key pitched forward 10, 20 and 28 degrees. The horse's lean went to 4 to 6%, but its right hand, reaching
  forward in the chest's frame, came down on its hoof (at 20 degrees: at 2 to 3 m/s, two velocity jumps, a 7 cm
  overlap), and the skunk and rabbit got worse (0.96 and 0.24 s).

Both are supports added at the end of a get-up that does not bring the weight over the feet. The fix is in the get-up
itself: the weight over the feet before the seat lets go. Either the feet are drawn in under the seat first (each
stepping in while the seat and the other foot hold the body) and the body leans forward over them and rises, the
ordinary sit-to-stand; or it rises through a half-kneel, the left knee down and then up over the right foot (d3fec1f's
accident, made deliberate). Either changes the get-up of every mammal.

**Left:**
- The window's get-up (above).
- The pigs' climb: legs 3.5 to 7.9 cm and forearms 5.5 to 6.6 cm in the top's edges as they go over; the lowering and
  the let-go (2 to 3 x BW); the catch and hang (424 to 524%, unchanged); the director's knee onto the top.
- The climb's push-off and the flight over the top, the right foot's step round; the goat's horns and the donkey's and
  rabbit's ears in the window; the climb's left leg over the top; build time.

### 2026-10-22 (physics balance, ninth part): the window's sit-to-stand

The user, on how the get-up should bring the weight over the feet: "Draw the feet in under the seat first, then lean
forward over them and rise (the ordinary sit-to-stand), on every mammal."

**The feet in.** Once the body sits after the roll, each foot slides in along the floor off its landing mark, the right
first (two new phases, Right foot in and Left foot in, 0.30 and 0.28 s: every window is 0.34 s longer). Lifted to step,
a foot left the seat and the other foot alone holding the body: the skunk's steps read 40 and 80% of its weight, 30 and
56% sliding. Each slides toward a point 18 cm outside its hip joint (drawn straight in toward the hip, the left shin
pressed 5 cm into the belly as the trunk leant over it) until its knee folds to the chosen fold. The fold is read across
the floor: sitting, the hip joints are 4 cm off the floor and the ankles 12, so as the hips rise they pass the ankles'
height and come nearest them there. Capped on the distance at the lean key, the knees folded on to 156 to 160 degrees as
the hips rose (the rig allows 155).

**The lean.** The hips' pitch at the lean key (it was -5 degrees: the trunk leaning back) and the fold are searched per
body: the least fold (125 to 140 degrees) that sets the centre of mass 3 cm inside the feet's own support (their skin on
the floor, as the balance reads it) within 35 degrees of pitch; failing that, the deepest fold with the least pitch that
does; failing that, the nearest. At the lean the right knee is kept 12 cm off the wall's face. Both arms reach forward
from the shoulders (about 2.7 cm of the centre of mass), the left coming back to rest by the left foot's step (back by
the weight onto the right foot, its palm swung at 8.1 m/s). The chest leans 60 degrees in all, the spine flexing what
the hips' pitch leaves, and the head nods back so the face looks 25 degrees down: the spine's old 45-degree curl on top
of the hips' pitch tipped the chest to 80 degrees and hung the head down between the feet (seen on the study page).

| | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pitch, degrees | 39 | 45 | 45 | 45 | 39 | 45 | 43 | 31 | 33 | 45 | 45 |
| fold, degrees | 140 | 140 | 140 | 140 | 140 | 140 | 140 | 125 | 125 | 140 | 140 |
| lift-off, before (cm) | -10.2 | -12.1 | -9.9 | -19.5 | -11.5 | -14.0 | -15.4 | -7.6 | -8.6 | -18.9 | -11.5 |
| lift-off, now (cm) | 3.9 | 2.8 | 7.4 | 7.2 | 9.4 | 2.3 | 3.8 | 3.7 | 3.1 | -2.7 | -1.7 |

(Lift-off: the planned centre of mass's least depth inside what holds it from the lean key to the rise key, the seat
letting go between; negative is outside. The rabbit's and dog's furry feet hold from the ankle forward, their heels off
the floor, so no lean within 45 degrees reaches them.) The window reports it (`getup.liftoff`) and the traversal test
now caps it: at least 2 cm inside (the rabbit -3, the dog -2). With the old lean and the feet where they landed, the
test fails it: the horse -9.1 cm, the pig foreman -5.9, the rabbit -17.5.

The gate, every mammal, against 78604a6 (the window unchanged since b11a948), over the limit (s), and the lean over the
feet, the rise and the new steps (peak, % of body weight):

| | horse | goat | bull | cow | donkey | sheep | skunk | pig foreman | pig director | rabbit | dog |
|---|---|---|---|---|---|---|---|---|---|---|---|
| over the limit, before | 0.07 | 0.48 | 0.08 | 0.69 | 0.64 | 0.14 | 0.80 | 0.06 | 0.42 | 0.21 | 0.24 |
| over the limit, now | 0.07 | 0.52 | 0.07 | 0.60 | 0.57 | 0.08 | 0.84 | 0.06 | 0.38 | 0.14 | 0.15 |
| lean, before -> now | 27 -> 0 | 35 -> 0 | 0 | 100 -> 0 | 17 -> 0 | 45 -> 0 | 66 -> 0 | 0 | 12 -> 0 | 46 -> 0 | 21 -> 0 |
| rise, before -> now | 0 | 3 -> 2 | 67 -> 18 | 107 -> 21 | 60 -> 20 | 81 -> 0 | 1 -> 0 | 23 -> 0 | 0 | 1 | 67 -> 1 |
| feet in (right; left) | 5; 0 | 2; 0 | 0; 0 | 86; 36 | 5; 1 | 2; 0 | 37; 54 | 0; 0 | 0; 0 | 4; 1 | 1; 0 |

- Fixed with it: the horse's hand in its thigh (2.2 cm: the horse now passes every rule but the phantom time), the
  goat's and the cow's capsule overlaps (the cow's six pairs), the donkey's required force (5.2 x BW), the rabbit's knee
  past its range, the dog's palm snap and arm overlap.
- Worse: the skunk's left elbow, already at 148 degrees just before the roll (allowed 150), reads 151. The balance
  spreads the body's turn drift over the whole crossing, so the new get-up turns every earlier pose a little; it also
  moves the goat's total (0.48 -> 0.52 s) and the skunk's (0.80 -> 0.84) outside the get-up.
- The cow sits on its tail's root through the sit-up and the right foot's slide, as before: the root at the floor (-0.4
  to 1.4 cm), its buttocks 5 to 7 cm above (the seat band counts a tail's root as seat). Within the rig's centimetre or
  just past it, the root's contact comes and goes with the tail's plan, so its sit-up read 29% in one variant (the tail
  lying on the floor) and 173% here (147% before).

**Clipping** (`bin/collisions.mjs`, every vertex every 10 ms): every mammal's deepest point is unchanged (a hand or
forearm on the sill as the body slides over, the pig director's waistcoat on it), but the pig foreman's: 1.3 -> 1.7 cm,
its shirt on the sill. Folded to 143 degrees, the foreman's trouser seat went 4.1 cm into the floor as its left foot
slid in (the least fold, 125, leaves it under 2 cm); folded to 143, the skunk's right trouser leg went 2.1 cm into the
wall.

Tried and not kept: lifting the feet to step them in; drawing them straight in toward the hips; a fold cap read on the
distance at the lean key; the spine's 45-degree curl kept on top of the lean (with a 140-degree cap, the chest bowed to
90 degrees on six bodies); pinning the hips at rest at the lean key (a degree off the knees); a cost weighing fold
against lean (it chose 43 to 45 degrees of pitch where 31 did).

**Left:**
- The skunk: its hooves land at 16 m/s in the roll and its seat bounces 3 cm (2.75 to 2.83 s), so its sit-up reads 250
  to 320%; its left elbow just past its range.
- The cow's tail-root seat; the rabbit's and dog's heels; the goat's horns in the roll.
- The window is 0.34 s longer (6.05 s on the horse). Build time: the search adds up to about 2 s (the horse's window
  13.0 -> 14.9 s here; the cow's within its run-to-run noise).

### 2026-10-22 (physics balance, tenth part): the skunk's landing in the roll

The user: "Fix the skunk's hoof landing in the window's roll next: the hooves at 16 m/s and the seat's 3 cm bounce that
drive its sit-up to 250-320%."

**What it was.** The skunk's roll never lands its feet. From 0.08 s into it the skunk rolls on its plume's root, and
climbing over the root drains its spin (2.45 to 0.25 rad/s) before its hooves reach the floor: the roll ends at 24
degrees of turn, the body lying back, the boots still tucked 50 to 58 cm up. The other nine mammals land theirs at 61 to
68 degrees and rock to rest; the cow stalls too, on its tail's root, at 50. With no landing, the tucked feet were pulled
to the floor in the roll's last 60 ms: the skunk's toes struck at 16.7 m/s and its seat bounced 4.5 cm (the sit-up 322%
of its weight); the cow's toes at 8.7 m/s.

**The fix.** For a roll that ends before its hooves land, the legs leave the tuck 0.18 s before its end
(`DROP_STALL`), as it slows, and land at its end as before. The balance also keeps the authored path through such a roll
(from 0.08 s in): moved by the plan, the skunk's root lifted off the floor and the rig found the body on its shirt and
seat with nothing under the roll's pivot. The skunk's toes now peak at 6.7 m/s (the cow's at 3.5) and its seat stays
within 1 cm through the landing. Every other mammal's window is the same motion (largest point difference 0.0000 cm).

| | skunk, 18a944f | skunk, now | cow, 18a944f | cow, now |
|---|---|---|---|---|
| over the limit | 0.84 s | 0.70 s | 0.60 s | 0.67 s |
| roll; sit-up (peak, % BW) | 194; 322 | 108; 260 | 572; 173 | 562; 103 |
| right foot in; left foot in | 37; 54 | 85; 53 | 86; 36 | 78; 36 |
| other gate failures | toes 16.7 m/s; left elbow 151 degrees | none | toes 8.7 m/s; required force 5.7 x BW | required force 5.6 x BW |

`bin/collisions.mjs`: the skunk's deepest point is 4.1 cm and the cow's 3.4, as before (a hand on the sill). The cow's
total moves within the swing its tail-root seat gives it (its sit-up read 29 to 173% across the ninth part's variants).

Tried and not kept:
- The feet eased down after the roll instead (over 0.3 s): the body lay on its root with nothing else under it, and the
  skunk's first step read 195% (0.99 s in all).
- Landing them a little later (0.18 s centred on the roll's end): the plan moved the hips 9 cm before the roll to meet
  it, and the left elbow, planted on the floor, folded to 163 degrees.
- A stronger roll-in (3.4 to 3.8 rad/s for the skunk, 2.6 to 3.0 for the cow, against 2.2): it carries over the root but
  crawls, the roll holding 360 to 560 N throughout (1.9 to 2.9 s over the limit).
- The tail's root never a pivot: the skunk's went 13.2 cm into the floor, the cow's 7.4.
- Less tucked legs: the cow's hooves land, the skunk's never do.
- The legs swung down inside the roll's own physics (a rock-up: their weight carried the skunk up, its hooves landed at
  2.7 rad/s). The balance moves the played body up to 18 cm from the roll it was computed on, so a swing worked out on
  the roll's own pose did not carry into the played motion (1.74 s, spikes of 47 x BW).

**Left:** the stall itself. The skunk still rolls on its plume's root, and the played body keeps it down only in part,
so its sit-up reads 260% and its first step 85%. A roll that lands every body's feet needs its physics and the balance
to agree on the pivot. And the cow's tail-root seat.

## Integration

The battle adapter matches the contract of Codex's `createSimpleTraversal(model, event, unit)`:
`{duration, climb: {skeleton, equipmentState}, apply(t) -> {worldRoot}, dispose()}`. That makes it a
drop-in for the `window` and `wall` kinds. In Codex's tree the battle picks the motion in `battle-traversal.js`
(`BattleTraversal.pose`: `simpleTraversal(event) ? createSimpleTraversal(...)`), so wiring is one branch there, once
`work/editor-3d` is on `main`. The waist-high wall needs a new edge kind, which is Codex's call. The proposal (geometry, cover, sight, route, art) goes in the handoff section of this doc.
