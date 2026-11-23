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

### 2026-10-22 (physics balance, eleventh part): the stalled roll turns about the tail's root as played

The user: "Make the stalled roll's physics and the balance agree on its pivot next, so the skunk (and the cow) rolls
on its tail's root as played and its sit-up comes down from 260%."

**What it was.** Not the balance: through the stall the played hips are within 0.5 cm of the roll's own rows (the
tenth part keeps the authored path there). It was the tail. The roll turns about the lowest point of the body and the
tail's root (`isRoot`: the points where the bend's reach is under a third), read on the tail as built. But the bend
turned every point by its share of the turn, the root's edge by a third of it, and to keep the skunk's plume off the
floor the fit bends it 40 to 90 degrees down and 80 across. As played, the root rose 2.1 to 3.0 cm off the floor exactly
while the roll turned about it, and from 2.56 to 2.74 s the phantom-wrench rig found no contact at all: the body was
airborne, at 425 to 1,282 N of phantom force. The cow's root, 1.0 to 1.4 cm up, came and went at the rig's centimetre.
The window's "Sit up" phase runs from the roll's middle to its end, so its 260% was the skunk afloat.

**The fix** (`traversal-fit.js`, the tail bend):
- The root does not turn. The turn grows from the root's edge (a smoothstep of the reach from a third to all of it), so
  the roll, the window's seat and the trunk's fit find the root where it is played.
- The base just beyond, turned less than half the way, cannot get out of anything's way either. Pressed into the floor
  it squashes onto it (`squash`, after `set` in each crossing's `at`), and so does the root: the roll reads every second
  point of the body, and the bull's rocking seat put a root point between them 3.1 cm in. Unsquashed, with the root
  rigid, the base went 3.2 to 5.5 cm into the floor under every body that sits or lies on it after the roll.
- The fit clears the base out of the obstacles only. Fitted out of the floor as well, it swung the skunk's plume round in
  front of the body to lift the base a few millimetres, and laid the plume's tip on the floor 80 cm out, which the rig
  took for support (the sit-up's torque peak read 167 N·m with the tip down, 417 without it).
- The fit reads every point of the tail (92 to 502 a tail), not every third. At every third, the bull's coarse tube hid
  its underside, 2.2 cm into the floor while the fit's report read 0.

Six mammals' rolls turn about a tail's root for a while. Through those rows the played tail now lies on the floor, its
lowest point (cm off it, every vertex skinned as the rig does):

| | skunk | cow | bull | dog | donkey | pig director |
|---|---|---|---|---|---|---|
| 4a1c49f | 2.1 to 3.0 | 1.0 to 1.4 | -1.4 to -0.1 | -0.6 to 1.2 | 0.7 to 2.0 | -0.3 to 1.7 |
| now | 0.0 | 0.0 to 0.4 | 0.0 | 0.0 | 0.0 to 1.0 | 0.0 to 3.2 |

The pig director's roll is not stalled, so the balance moves its body there (it rose 1.7 cm before, with part of the
lift hidden by the bend).

phantom-wrench `--gate`, the window, 4a1c49f -> now (the peaks are % of body weight):

| | skunk | cow | donkey | dog | sheep | pig director |
|---|---|---|---|---|---|---|
| over the limit (s) | 0.70 -> 0.49 | 0.67 -> 0.15 | 0.57 -> 0.21 | 0.15 -> 0.07 | 0.08 -> 0.13 | 0.38 -> 0.39 |
| roll; sit-up | 108; 260 -> 7; 73 | 562; 103 -> 562; 18 | 250; 20 -> 78; 0 | 61; 0 -> 5; 0 | 178; 0 -> 178; 0 | 142; 0 -> 142; 0 |
| right foot in; left foot in | 85; 53 -> 56; 53 | 78; 36 -> 34; 2 | 5; 1 -> 0; 0 | 1; 0 -> 0; 0 | 2; 0 -> 3; 0 | 0; 0 -> 0; 1 |

- The sheep is worse because a support went that the motion never planned. Its roll never turns about its tail, but
  the bent root had dipped onto the floor as the body went from waistcoat to seat (2.68 to 2.86 s), and at 2.72 s it was
  the only thing the rig found under the body. The rigid root no longer reaches the floor there, which uncovers the roll's
  own phantom (its mean 29 -> 86 N; the peak, 1306 N at 2.695 s, is the same).
- The bull, rabbit and pig foreman windows read the same, and so do the twelve vaults and climbs gated. The gate ran
  on the 21 crossings where a tail touches anything or the body moved, at 4a1c49f and now; the other twelve are the
  same body with no tail within the rig's centimetre in either.

The body moves as before everywhere but six crossings, where the tail fit's pushes on the trunk (for what no bend
clears) differ: the bull's, cow's, dog's and skunk's vaults (0.8 to 3.4 cm, going over the top), the pig foreman's
window (a palm, 1.7 cm) and the skunk's window (a knee, 0.7 cm after the roll). Their gates read as before. The tails, every
5 ms: no tail point more than 1 cm into anything in any crossing (the skunk's one sample at the hop, 1.9 cm, as before).
The bull's and donkey's windows had 14 and 28 such samples at 4a1c49f, down to 1.4 and 2.0 cm. `bin/collisions.mjs`
reads all 33 crossings the same (the deepest a hand or the trousers on the obstacle).

`tests/natural-traversal.test.mjs`: a roll that stalls before its hooves land lies on its tail as played, within the
rig's centimetre at every third row that turns about the tail. Against 4a1c49f's tail bend it fails on the cow (1.3 cm at
2.63 s) and the skunk (2.2 cm at 2.54 s). The adapter passes the window's roll on for it.

Tried and not kept, in order:
- The root rigid alone: the base 3.2 to 5.5 cm into the floor in five windows (the bull, cow, dog, donkey and skunk sit
  or lie on it), and the skunk's plume tip on the floor.
- The base not fitted at all: 1 to 3.4 cm into five vaults' walls as well.
- The base squashed up to a third of the turn: points the fit skipped, just past it, 3.4 to 5.0 cm into the floor.
- The base to half the turn, still read at every third point: the bull's root 3.1 cm in (missed by the roll's probe),
  then its tube's underside 2.2 cm (missed by the fit's).

**Left:** the skunk's sit-up still reads 73% (387 N·m at 2.755 s, while the legs come down and the roll slows: not
yet looked at) and its first step 56%. The pig director's and donkey's rolls on their tails' roots, where the balance moves
the body. The cow's roll-in (562%, 5.6 x BW at 2.475 s). The sheep's hand-over from waistcoat to seat.

### 2026-10-23 (physics balance, twelfth part): what was left of the skunk's sit-up

The user: "Find what still drives the skunk's sit-up to 73% (387 N·m at 2.755 s, while its legs come down in the
stalled roll) and bring it down."

**What drives it.** The rig's own rows split the "Sit up" phase (the roll's second half) into two moments:
- From 2.63 to 2.71 s, the floor's push the body needs falls to nothing and below (-171 to -197 N at 2.68 s): the
  centre of mass is pulled down faster than gravity, and with no push the floor cannot give the 440 to 550 N it needs
  sideways either (531 N of phantom force). The legs, swung from the tuck to the floor in the roll's last 0.18 s, fall
  at up to 25 m/s² (-678 N on their 27 kg), and braking them at the landing then needs +748 N.
- At 2.74 to 2.75 s it needs 640 to 1,190 N toward the wall, which the wall cannot give (481 N and 354 N·m of
  phantom). The balance's plan moves the hips 2 cm in 50 ms there (15 to 23 m/s²), inside the stretch it holds.

Both come from one thing. The roll is worked out rigid, with the legs tucked, and the legs are keyed down on top of it,
so nothing holds their swing. Through the held stretch the balance keeps the pressure point inside what holds the body
(the root), but the authored point lies 20 to 177 cm outside it (the turn's rate up to 186 N·m, the floor's push at
the planner's 0.3 g floor). The plan can bend only the centre of mass's path, not the turn: the wiggle.

**The fix.** The legs leave the tuck as early as the stall allows, 0.05 s into the roll, or 0.33 s before its end where
the roll runs longer (`DROP_STALL`: the skunk's drop is 0.285 s, the cow's 0.33). Their accelerations fall by over half,
and the floor's push the body needs stays positive (its least 152 N, at 2.63 s).

phantom-wrench `--gate`, the window, c97a690 -> now (peak % of body weight, and phantom torque):

| | skunk | cow |
|---|---|---|
| over the limit | 0.49 -> 0.47 s | 0.15 -> 0.14 s |
| sit-up | 73% (387 N·m) -> 20% (30) | 18% (148) -> 2% (14) |
| right foot in | 56% (215 N·m) -> 15% (89) | 34% (208) -> 13% (120) |
| roll | 7% (34 N·m) -> 24% (51) | 562% (211) -> 562% (211) |
| left foot in | 53% -> 53% | 2% -> 2% |

The skunk's roll phase rises because the drop now starts in the roll's first half. Every other mammal's window is the
same motion (largest point difference 0.0000 cm). `bin/collisions.mjs`: the deepest points as before (the skunk's 4.1
cm, the cow's 3.4, a hand on the sill). The skunk adds one 10 ms span past 2 cm: its left trouser cuff, 2.0 cm into the
floor at 2.91 s, with the foot planted after the landing (0.8 cm before).

Tried and not kept:
- The rock-up worked out in the roll's own physics, in time steps: the legs swing down inside it, and the angular
  momentum about the floor contact changes only by gravity's turn about it. (The earlier attempt kept the energy, which
  a body that moves its legs does not keep.) The skunk's feet land, at 0.10 rad/s. But the physics itself asks the root
  for 2.4 to 3.3 times the friction it has as the roll brakes over it (with a 0.4 s swing, the push 96 to 123 N against
  233 to 293 N sideways at 2.65 to 2.67 s). With a 0.3 s swing, the push falls to 29 to 35 N. A rock-up that holds needs
  its physics to check the floor's push and grip, not only the turn.
- The rock-up's legs keyed every 5 ms: each key is eased in and out, so the legs stopped at every one of them (60 m/s²,
  spikes of 3.5 kN: the roll 1502%, 131 x BW). The earlier attempt's spikes had the same cause.
- The balance pinned to the authored roll through the stall: worse (0.56 to 0.57 s over). Its own correction was
  carrying part of the drop.
- The balance planning the stall freely: 0.54 s.
- The drop over 0.28 s: the skunk the same (0.46 s), the cow's first step 34%.

**Left:** the skunk's roll's first half (24%), its left foot in (53%) and its step in (27%); the cow's roll-in (562%,
5.6 x BW); a rock-up whose physics keeps the floor's push and grip.

### 2026-10-23 (physics balance, thirteenth part): the skunk's left foot in, and the seat band's pull

The user: "Find what drives the skunk's \"Left foot in\" phase to 53% in the window and bring it down."

**What drives it.** From 3.13 to 3.19 s, as the left foot slides in, the floor's push the body needs goes below
nothing (-368 N at 3.16 s, the rig's own rows): the centre of mass falls at 1.5 g, faster than anything but a pull
could bring it down (387 to 391 N of phantom force). The whole body drops: the hips fall 23 cm in 0.26 s, from 27.5 cm
to 4.6. The keyed get-up lowers them only 13 cm, gently. The rest is the seat band. The skunk's roll stalls with it lying
back on its plume's root, its chest 66 degrees from upright (the nine that land their feet end within 3 to 10 of it),
so it sits up during the feet-in, turning about 110 degrees to the lean where the others turn 35 to 55. The band holds
the seat's lowest point on the floor, and until 3.24 s that is the root, which the turning trunk would lift 12 cm off
it. Holding it down, the band pulled the hips 11 cm down in 0.2 s (-10 m/s², then braking at up to +22).

**The fix.** The band's push never drops the hips faster than half of gravity (`SEAT_DROP`), nor deepens a drop they
already make (a landing's impact). Where keeping the seat on the floor would, the seat is weighed in heavily instead of
held, and may float a moment. Where the band keeps to that already (the bull's and dog's windows), it is solved as
before.

phantom-wrench `--gate`, the window, af53de0 -> now:

| | over the limit | changed phases (peak % of body weight) |
|---|---|---|
| skunk | 0.47 -> 0.44 s | left foot in 53 -> 15, right foot in 15 -> 17 |
| cow | 0.14 -> 0.14 s | rise over the feet 21 -> 17 |
| horse | 0.07 -> 0.06 s | roll 30 -> 28 |
| goat | 0.52 -> 0.51 s | hands to the floor 27 -> 26 |
| sheep | 0.13 -> 0.10 s | |
| donkey, pig foreman, pig director, rabbit | the same | |

The bull's and dog's windows are the same motion (largest point difference 0.0000 cm). Through the feet drawn in, the
centre of mass now falls at most 1.10 g (the skunk; 1.52 before), the cow 0.85 -> 0.59 g, the others 0.24 to 0.65.
`bin/collisions.mjs` reads the nine windows the cap touches the same (the deepest a hand or the shirt on the sill).

`tests/natural-traversal.test.mjs`: as the feet are drawn in, the centre of mass falls at most 1.2 g (the floor never
asked to pull more than a fifth of the body's weight). With the cap off it fails on the skunk (1.52 g).

Tried and not kept:
- More time to sit up after a roll that ends lying back (the get-up's keys later by the chest's angle past 10 degrees
  over a rate). At 150 degrees a second the skunk read 0.35 s and its left foot in vanished, but at 100, 125 and 200
  its right foot in rose to 45 to 58%: where the band's pull fell against the right foot's slide decided it. With the
  cap as well, 65%.
- The band's limit at 0.3, 0.4 or 0.7 g. At 0.3 the skunk still fell at 1.04 g (the clearance fit's trunk and the
  thighs carry the rest), and the cap reached the bull's and dog's sits; at 0.7, the left foot in read 21%.

**Left:** the skunk's roll's first half (22 to 24%), its step in (27%) and left foot round (40%); the cow's roll-in.

### 2026-10-23 (physics balance, fourteenth part): a flight's refinements turned the contacts twice

Found on the way to the skunk's left foot round (the fifteenth part).

**What it was.** The balance turns the whole body about its centre of mass (`bodyTurn`). On contacts the turn rate is
w = I⁻¹ (L* − L), from the angular momentum L measured on the round's motion; w carries over between rounds, each
adding what the last missed. A round with a flight refines the turn twice more (`REFINE`), measuring the flight's
samples again with the turn so far. But each refinement ran `bodyTurn` whole, and there the contacts' L, not measured
again, gave the same correction again. Every contact sample of a crossing with a flight was turned about twice as far
as the round meant, all through the motion, not only beside the flight (the goat's window: 0.24 degrees at 10 ms, 0.13
turned once).

**How it showed.** A first try at the skunk's last step left a 5 to 40 ms flight in the donkey's and sheep's rolls,
which had none, and their windows read 0.37 and 0.30 s over the limit (0.21 and 0.10 before), worst far from the roll:
the step in at 0.005 s and the last steps. The hips' plan there was the same to a millimetre; the body's turn was twice
as large (the donkey's 0.85 degrees at 6.32 s, 1.77 with the flight).

**The fix.** `bodyTurn(..., contacts=false)` leaves the contacts' w as it comes; the refinements pass it.

phantom-wrench `--gate`, cd8ba6f -> now (only the crossings with a flight change):

| | over the limit | changed phases (peak % of body weight) |
|---|---|---|
| goat, window | 0.51 -> 0.41 s | step in 30 -> 15, hands to the floor 26 -> 12, left foot back 16 -> under 10, right foot back 16 -> under 10, left foot round 36 -> 14; back to the floor 16 -> 18, stand on the tile under 10 -> 11 |
| pig director, window | 0.39 -> 0.20 s | step in 40 -> 19, slide over 33 -> 28, hands to the floor 15 -> under 10, left foot back 12 -> under 10, right foot back 13 -> under 10, left foot round 42 -> 16 |
| horse, climb | 0.14 -> 0.07 s | right foot round 48 -> 15 |
| goat, climb | 0.21 -> 0.14 s | right foot round 52 -> 19, crouch 12 -> under 10 |
| bull, climb | 0.24 -> 0.16 s | right foot round 53 -> 17, crouch 14 -> under 10 |
| cow, climb | 0.19 -> 0.12 s | right foot round 54 -> 17, crouch 15 -> 11 |
| donkey, climb | 0.15 -> 0.10 s | right foot round 46 -> 14 |
| sheep, climb | 0.20 -> 0.12 s | right foot round 52 -> 20, crouch 12 -> under 10 |
| skunk, climb | 0.15 -> 0.10 s | right foot round 47 -> 12 |
| rabbit, climb | 0.29 -> 0.23 s | right foot round 41 -> 20 |
| dog, climb | 0.29 -> 0.19 s | right foot round 41 -> 15, jump and catch 17 -> 12; left foot round 19 -> 30 |
| pig foreman, climb | 1.06 -> 1.02 s | drop 39 -> 27, left foot round 44 -> 36, right foot round 25 -> 11 |
| pig director, climb | 0.71 -> 0.64 s | let go 310 -> 252, right foot round 55 -> 13, left foot round 13 -> under 10; left knee up behind 269 -> 282, drop 33 -> 38, right knee up under 10 -> 12 |

The vaults and the other nine windows have no flight and are unchanged. The other rules: the pig director's window no
longer passes 8 m/s (its right elbow at 8.1); capsule pairs over 2 cm, the horse's climb 8 -> 6, the bull's 10 -> 8,
the goat's 14 -> 13, the cow's 8 -> 9. `bin/collisions.mjs`: the deepest points move at most 0.2 cm (the bull's climb
3.2 -> 3.4 cm, the cow's 4.0 -> 4.2, the skunk's 4.1 -> 4.3, the goat's 5.6 -> 5.5), and the spans deeper than 2 cm
over the 33 crossings fall from 113 to 106.

### 2026-10-24 (physics balance, fifteenth part): the skunk's last step, and the tails as played

The user: "Find what drives the skunk's \"Left foot round\" phase to 40% in the window and bring it down."

**What drives it.** From 5.04 to 5.16 s the skunk steps its left boot round on the right one, and the push its body
needs lies 6 to 51 cm outside the boots, even with both down (the rig's own rows). The balance had planned the centre of
mass against a support the body does not have. Its contact probe read every body mesh once, as made, and the motion
bends a tail in its geometry (the clearance fit's bend, the base squashed onto the floor): to the plan the skunk's plume
stayed straight, lying back along the floor 31 to 58 cm from anything the played body had there all through the last
steps, where the played plume rises clear. The plan's support was 87 cm across.

**The fix.** The probe reads the tails again at every update (`createSurfaceProbe`'s `live`), and the balance poses them
as played before it does (`playTail`: the fit's bend, the base squashed onto the floor). From the lean over the feet on,
the plan's floor support is now the played body's on every mammal (its farthest corner 3.3 cm off, as the skunk's left
boot lifts at 5.10 s; 31 to 58 cm on the skunk before, 58 on the donkey).

**What it uncovered: a flight the plan makes itself.** Without its straight tail the sheep's roll lies, at 2.67 s, on a
patch of its back 18 cm from its centre of mass. The balance's first round moves the hips toward it, and measured again
on them in the second the back is off the floor for 40 ms: a flight. Planned as one, the hips crouched to spring the
body over it, and its trunk went 1.8 cm into the floor at 2.60 s (the test allows 1). As played, the sheep's tail, bent
down by the fit after the balance, props it there. A round now keeps the authored support through a flight shorter
than `LOST` (60 ms) where the authored motion lay on the floor: the plan's own move lifted the body off what held it,
as at the hold. The goat's roll (two such flights, 5 and 15 ms) and the pig director's (15 ms) had them before this.

phantom-wrench `--gate`, d82f740 -> now (only windows change):

| | over the limit | changed phases (peak % of body weight) |
|---|---|---|
| skunk | 0.44 -> 0.20 s | left foot round 40 -> 18, right foot in 17 -> under 10, left foot in 15 -> 10, back to the floor 18 -> under 10, roll 24 -> 21, sit up 20 -> 18; hands to the floor 18 -> 31, stand on the tile under 10 -> 12 |
| donkey | 0.21 -> 0.07 s | roll 78 -> 41, rise over the feet 20 -> under 10 |
| goat | 0.41 -> 0.24 s | back to the floor 18 -> 12; hands to the floor 12 -> 30, roll 304 -> 353 |
| pig director | 0.20 -> 0.10 s | roll 142 -> 202 |
| rabbit | 0.14 -> 0.07 s | hands to the floor 13 -> 17 |
| cow | 0.14 -> 0.09 s | rise over the feet 17 -> under 10; hands to the floor 44 -> 46 |
| bull | 0.07 -> 0.04 s | rise over the feet 18 -> under 10 |
| sheep | 0.10 -> 0.11 s | roll 177 -> 205 |

The skunk's time over the limit, phase by phase: its left foot round 135 -> 10 ms, the right foot in 50 -> 0, the left
foot in 65 -> 30, back to the floor 35 -> 0. The eleven windows read 1.11 s over the limit together (1.90). The horse's,
pig foreman's and dog's windows and every vault and climb are unchanged. The other rules: the skunk's left elbow folds
to 151 degrees as it lies back onto its hands (147 before; the rig allows 150), and the goat's left elbow moves at 9.0
m/s (8.2; it folds to 155, 156 before). `bin/collisions.mjs`: the same, but for one span deeper than 2 cm fewer in the
goat's window (3 -> 2).

`tests/natural-traversal.test.mjs`: from the lean over the feet on, every corner of the balance's floor support lies
within 5 cm of something the played body has on the floor. Without the fix it fails on the skunk (4.10 s, 35 cm) and the
donkey (4.80 s, 58 cm). Before the lean, where contacts come and go, the plan's last round reads them on the hips of the
round before, and the goat's roll leaves the floor 23 cm from where it was planned on.

**Tried and not kept.**
- Leaving the tails out of the probe but for their roots, as the clearance fit's own probe does: the nine windows with
  tails read 1.05 s over the limit together (1.43 before; the played tails 0.92 without the rule, 0.81 with it), the
  donkey's 0.21 s (it rolls on its tail's base as played, and the plan found it in the air), the skunk's 0.23. The
  tail's root and base as made: the skunk 0.22 s, the donkey 0.10.
- A tail bent before the balance is not always the one played: the fit bends the sheep's 0 to 70 degrees up in its roll
  before the balance and 110 to 120 down after, its follow taking the side that clears first, which a few centimetres of
  the hips decide. Bending it again between the balance's rounds (the sheep 0.20 s) or in the fit's planned mode before
  (the skunk 0.23 s) planned no better.

**Left.** As the body lies back onto its hands the balance pulls the hips toward the line between them (the goat's 11 to
18 cm), and the left elbow folds past the rig's 150 degrees (the goat's 155, the skunk's 151): the hands' marks leave
the elbows too little room. The skunk's hands to the floor (31%: the left hand alone holds it for 25 ms, which the
straight plume had hidden). The rolls' peaks (the goat's 353%, the sheep's 205, the pig director's 202, each one sample).
The steps' over keys (a swing leg lifting at 99.96% of its reach).

### 2026-11-04 (physics balance, sixteenth part): the elbows as the body lies back onto its hands

The user: "Fix the window's lying back onto the hands next: the balance pulls the hips toward them and folds the left
elbow past 150 degrees (the skunk 151, the goat 155)."

**What folds them.** Every mammal's left elbow peaks as it lies back onto its hands, 2.42 to 2.51 s, the shoulder
coming down over the planted hand. As built, before the balance, the folds peak at 131 to 143 degrees; the balance,
keeping the centre of mass over the hands until the back is down, adds up to 9, and to the goat's 24. Two causes:

- The goat lets go before its back is down. Nine of the eleven land their back at 2.42 to 2.43 s, the hands still on
  the floor (to 2.48 or 2.49). Lying back, the goat's lowest point is its horns, and its roll turns on them alone for
  80 ms after the hands let go at the roll's start (2.46 s): from 2.49 to 2.52 s a horn tip 70 cm to the side was all
  that held it, then nothing until its back landed at 2.55 (the rig's own contacts). Planning the pressure point onto
  that tip, the balance pulled the hips 13 to 18 cm sideways from 2.18 s on, the shoulder came down over the hand and
  the elbow folded to 155 (its roll read 353%). The horse's roll turns first on its mane crest, which rides the spine
  near the body's middle (its elbow 140).
- The skunk's back lands in time, but its body lies lower than the horse's (its back's surface nearer its bones), so
  its shoulder comes nearer the hand: 143 degrees as built, and the balance takes the hips 2.7 cm toward the hands'
  line: 151.

**The fixes.**

- The hands keep the floor until the roll turns on the trunk (`RELEASE`: the first roll row whose pivot does not ride
  the head bone; the roll's start for the other ten). The goat's let go at 2.543 s.
- Let go that late, the goat's left hand tucked with its chest already over its head, and its upper arm went 4.1 cm
  into its lower trunk. On the way to the tuck the hand passes beside its shoulder, where the arm points out along the
  tuck's own elbow direction: that pole leaves the bend side undefined, and `steadyPoles` carries it over from the
  floor. It comes out 95 to 113 degrees off the pole on the skunk, cow and horse (let go at the roll's start) and 123 on
  the goat; the skunk's bends down toward its hips, which a hand let go at the roll's start clears. A hand let go late
  passes there with its elbow up, toward the head (`SIDE_ELBOW`).
- The left hand's mark leaves its elbow room. Placed from the shoulder, it moves out along the floor, away from where
  the shoulder comes nearest while the hand is down, until the elbow folds at most 138 degrees as built (`FOLD_ROOM`).
  The skunk's mark moves 2.3 cm, the dog's 1.9, the cow's and rabbit's 1.6, the donkey's and bull's 1.1, the sheep's
  0.2; the horse's, goat's and pigs' not at all.

phantom-wrench `--gate`, b1d042b -> now (only windows change):

| | over the limit | changed phases (peak % of body weight), other rules |
|---|---|---|
| goat | 0.24 -> 0.12 s | hands to the floor 30 -> 11, back to the floor 12 -> under 10, roll 353 -> 128; its joint range (155) and point speed (9.0 m/s) pass |
| skunk | 0.20 -> 0.20 s | its joint range (151) passes; hands to the floor 31 -> 35 |
| rabbit | 0.07 -> 0.09 s | hands to the floor 17 -> 19 |
| sheep | 0.11 -> 0.12 s | |
| cow | 0.09 -> 0.09 s | hands to the floor 46 -> 50 |

The horse's, bull's, donkey's, dog's and both pigs' windows read the same, and the eleven windows 1.02 s over the limit
together (1.11; first written 1.08, a slip in adding). Every mammal's left elbow now peaks at 147 degrees or less (the skunk's 147, the others 139 to 142).
`bin/collisions.mjs`: the same on all 33 crossings.

`tests/natural-traversal.test.mjs`: lying back onto its hands and rolling, both elbows stay inside the rig's 150
degrees. Without the fixes it fails on the goat (155.4 at 2.50 s) and the skunk (150.9 at 2.43 s).

**Tried and not kept.**

- Leaving the head out of the balance's support (a horn tip cannot hold a body): the goat's elbow 142, but its window
  0.35 s. The rig still sees the horns touch; planned as a fall there, its back to the floor read 21%.
- The elbow up beside the shoulder on every body: the goat the same, but the skunk's sit-up 18 -> 31% and the cow's
  right foot in 13 -> 33 (the arms swing differently).
- `steadyPoles` carrying the side with the trunk where the trunk carries the limb's end: the goat 0.14 s and clear of
  its trunk, but only by trimming the undefined side's 123 degrees to 101; the rabbit's climb's left foot round
  17 -> 31%. Carried with the chest on every arm, whatever holds its end: the climbs' gripping elbows met the trunk
  (seven of the eleven a capsule pair or two more), the horse's climb 0.07 -> 0.11 s.
- The hands kept down, released at the old pace to the old tuck time: the goat's palm at 10 m/s.
- `FOLD_ROOM` 142 or 140: the skunk's elbow 150 or 149 (138: 147; the dog's 145, 143, 141), moving steadily with it.

**Left.** The goat's roll (128%). The skunk's hands to the floor (35%: its left hand alone holds it for 25 ms). The
rabbit's and sheep's windows, a hundredth or two more with their marks moved. And every body's left elbow, bending
off its pole for 0.2 s as it tucks.


### 2026-11-04 (physics balance, seventeenth part): the left elbow as its hand tucks

The user: "Fix the tuck elbows" (proposed as: give every body's left elbow a defined bend side as it tucks past its
shoulder, without changing the swing the skunk's sit-up depends on).

**What it did.** As the roll starts the left hand leaves the floor beside the head for a point out beside the shoulder
(24 cm out), then tucks in front of the chest with its elbow out to the side (the tuck's `[.3, 0, 1]`). Out beside the
shoulder the arm points along that side, so the side gives the bend no direction: at least 0.18 of it lies off the
arm (`steadyPoles`' first pass, against the keys). The side was carried over from the floor, turning as little as it
could with the arm, and that left it pointing down toward the hips. Every left elbow reached the tuck bent down, 101
to 117 degrees off its side (the goat's, let go later with its elbow up, 179), and swung out over the next 0.25 s at
the turn limit (2 degrees in 5 ms), through the roll's second half. In the photographs the fist comes to the chest
with the elbow by the ribs, then the elbow flaps out.

**The fix.** The hand passes in front of the shoulder instead (`TUCK_MID`: 27 cm from it, 30 degrees up from straight
ahead, in the chest's frame), with its elbow out as it will be tucked. The arm swings from beside the head to the chest
across the side it bends to, and the side stays square to the arm. The hand gets there 0.16 s after it lets go (0.12
before) and is tucked at 0.28 (0.24). Every left elbow now keeps within 12 degrees of its side through the tuck, and the
goat's elbow-up case (`SIDE_ELBOW`) goes. In the photographs the hand comes up past the jaw, elbow out, and reaches the
chest in the pose the old one ended in.

phantom-wrench `--gate`, ea4240b -> now (only windows change):

| | over the limit | changed phases (peak % of body weight) |
|---|---|---|
| goat | 0.12 -> 0.14 s | hands to the floor 11 -> 19, back to the floor under 10 -> 10, roll 128 -> 158 |
| skunk | 0.20 -> 0.18 s | hands to the floor 35 -> 32, roll 21 -> 26, sit up 18 -> 20 |
| rabbit | 0.09 -> 0.10 s | |
| cow | 0.09 -> 0.09 s | hands to the floor 50 -> 42, roll 563 -> 556 |

The other seven read the same over the limit (the donkey's roll 42 -> 38, the sheep's 205 -> 202, the pig director's
202 -> 198, the horse's 28 -> 30). The eleven windows read 1.03 s over the limit together (1.02). The left elbows peak at
141 to 147 degrees (137 to 147 before), and no rule fails that did not before. `bin/collisions.mjs`: the same on all
eleven windows. The windows' motion is bit for bit the one gated (every point every 5 ms, all eleven).

`tests/natural-traversal.test.mjs`, two checks. From 0.12 s after the hands let go to the roll's end, the left elbow
stays within 30 degrees of its tucked side; the old tuck fails it on all eleven (101 to 117, the goat 179). And the
left hand keeps 2 cm from the head as it tucks (the pig director's ears 2.8 cm, the sheep's 3.1). With the hand 45
degrees up it fails (the pig director's 0.9 cm). Read at every fourth point every 10 ms, it had read that 0.9 cm as
2 cm.

**Tried and not kept.**

- Straight ahead of the shoulder at its height: the side within 16 degrees, but the hand passed close by the shoulder
  and the elbow folded past the rig's 150 degrees on ten of the eleven (151 to 157), the goat's palm at 9.5 m/s.
- Higher (45 and 60 degrees up): the side within 10 degrees, but the fist went by under the ears, which on the sheep
  stand out from its head about as far as its shoulder (60 degrees: the hand 0.2 to 0.4 cm from the pig director's,
  bull's, sheep's and cow's heads).
- Turned out toward the side (15 to 35 degrees): the elbow fell behind its side again, up to 48 degrees off at 35, and
  the sheep's ears, which stand out to the side, stayed within 0.2 to 3.4 cm.
- Lower (20 degrees up) or farther (30 to 32 cm): the elbow folding to 150 again, the goat's wrist past 8 m/s.
- The swing kept, the elbow given the side it takes (forward and down beside the shoulder, down and out once tucked):
  the upper arm 1 to 2 cm into the lower trunk on eight bodies, still 31 to 53 degrees off, and later, as the arms
  reach forward, elbows folded to 157 to 172.
- Reached at 0.14 s and tucked at 0.24: the goat's palm at 8.4 m/s (the rig allows 8). Reached at 0.16 and tucked at
  0.24: the skunk's sit-up 18 -> 22%, the eleven 1.05 s. Swung in the roll's own plane the arm pushes back on the roll;
  slower, it pushes less.

**Corrected.** The sixteenth part's eleven windows read 1.02 s over the limit together, not 1.08 (a slip in adding).

**Left.** The right elbow lags its side too as its hand leaves the floor (the horse's, skunk's and goat's up to 62 to 73
degrees, for about 0.11 s), though its side stays defined. The goat's roll (158%) and window (0.14 s). The skunk's hands
to the floor (32%).


### 2026-11-04 (physics balance, eighteenth part): the right elbow as its hand tucks

The user: "Fix the right elbow" (left by the seventeenth part: it lagged its side as its hand left the floor).

**What it did.** The right hand lies back onto the floor under its shoulder, its elbow up (`UP`, in the world; turned
out it would meet the wall, the shoulder 13 to 15 cm off it). At the roll's start the hand swung straight up to its
tuck in front of the chest in 0.18 s. That swing turns the arm about the body's side-to-side axis, which is the very
side the tucked elbow bends to, so it cannot turn the elbow toward it: it carries the elbow's side round with the arm,
and up became up toward the head. The elbow came up beside the face, and the forearm went by the jaw: the horse's and
cow's 0.2 cm from it, the bull's, sheep's, rabbit's and goat's within 0.7 to 1.8 (the test's reading). Only after the
hand had stopped did the elbow turn out to its side, at the turn limit (2 degrees in 5 ms), from up to 75 degrees behind
it (the pigs' 32 and 44).

**The fix.** The right hand goes by way of a point low in front of its ribs (`TUCK_MID.arm1`: from the shoulder in the
chest's frame, 15 cm forward, 18 cm down, 6 cm out), reached 0.10 s after it lets go, and its elbow is asked there for a
side half way round to out, mostly forward (`TUCK_MID_ELBOW.arm1`, `[.7, .5, .5]`). The elbow starts to turn as the hand
lifts, and the hand is tucked at 0.24 s (0.18). The elbow lags its side by up to 39 degrees just after the release (the
swing still carries it). As the hand arrives it is 13 to 24 off its tucked side, and from 0.04 s later within 12 (the
test's readings). The hand now keeps at least 3.6 cm from the head (the horse's), the elbow at least 7.8 cm off the wall
(the skunk's; 8.0 before), and the forearm 2.9 cm off the lower trunk (the rig's capsules; 2.7 before). `TUCK_MID` and
`TUCK_MID_ELBOW` are now keyed by limb; the left's are as they were.

phantom-wrench `--gate`, 4de2cc7 -> now (only windows change; the motion is bit for bit the one gated, every point
every 5 ms on all eleven):

| | over the limit | changed phases (peak % of body weight) |
|---|---|---|
| skunk | 0.18 -> 0.17 s | hands to the floor 32 -> 33, roll 26 -> 19, sit up 20 -> 17 |
| rabbit | 0.10 -> 0.08 s | roll 520 -> 524 |
| goat | 0.14 -> 0.13 s | hands to the floor 19 -> 11, roll 158 -> 154 |
| cow | 0.09 -> 0.08 s | hands to the floor 42 -> 53, roll 556 -> 562, right foot in 13 -> 14 |
| pig director | 0.10 -> 0.09 s | roll 198 -> 195 |
| sheep | 0.12 -> 0.13 s | roll 202 -> 206 |

The horse's, bull's, dog's, donkey's and pig foreman's windows read the same over the limit (the donkey's roll 38 -> 18,
the horse's 30 -> 27), and the eleven windows 0.98 s together (1.03). No rule fails that did not before; the left elbows
peak at 142 to 148 degrees (141 to 147), the right at 127 to 145. `bin/collisions.mjs`: the same on all eleven windows.

`tests/natural-traversal.test.mjs`. The left-hand head check now reads both hands: on 4de2cc7 the right fails it on six
bodies (0.2 to 1.8 cm). And from 0.28 s, just after the right hand is tucked, its elbow keeps within 20 degrees of its
tucked side (`[.8, 0, .4]`): tucked at 0.28 with no midway point, it fails on eight (20 to 30).

**Tried and not kept.**

- The same straight swing, slower (tucked at 0.24, 0.28, 0.32 s): the lag up to 65, 59, 52 degrees, and the forearm
  still within 0.2 to 0.7 cm of the horse's and bull's jaws. A swing about the elbow's own side cannot turn the elbow
  to it.
- The midway point with its elbow asked for out at once: up to 96 degrees behind (the turn limit), and other half-way
  sides (more out, or more up) up to 48 to 52; mostly forward is the one it can follow (36).
- The midway point higher (15 or 16 cm down): the hand back within 0.8 to 1.0 cm of the horse's head. Nearer the ribs
  (2 cm out): the skunk's forearm 0.6 cm into its lower trunk.
- Tucked at 0.28 s (the left's time): the skunk's sit-up 20 -> 36%, its window 0.20 s; reached at 0.08 and tucked at
  0.24: 37%. Reached at 0.10 or 0.11, tucked at 0.24 or 0.25, it reads 17 each way.

**Left.** The goat's roll (154%). The skunk's hands to the floor (33%). The cow's hands to the floor, 42 -> 53%.


### 2026-11-06 (physics balance, nineteenth part): the roll's first landing

The user: "The cow's roll-in" (its roll 562% of its weight and 5.6 x BW at 2.475 s, left since the eleventh part; the
rabbit's 524% and 5.2 are the same landing).

**What it was.** Both are one landing, 15 ms into the roll. The cow and the rabbit lie back on the same shirt (their
first contact is the same to the millimetre): the floor meets the back high up, and its middle, 12 cm along the roll, is
still 3 to 4 mm off it. The roll turns about the upper point, and after 1.5 to 2 degrees the middle lands: an impact, a
step of 0.25 m/s in the hips' velocity, nearly all of it in their fall (and 8 ms later a second, 3 cm on, 0.08 m/s). The
roll spreads each impact's change of velocity over about 40 ms (a triangle average of its path), but the average gave
way to the raw path within 30 ms of the roll's start, so that the roll started exactly where the descent hands over. An
impact there was taken whole, within one 2.5 ms sample of the path. The code (since 669b9a8) said the first impact comes
90 ms into the roll. The horse's landing on its shirt does (92 ms), but the bull's, sheep's, horse's (its mane), dog's
and pig director's next contacts also meet the floor 8 to 23 ms in (steps of 0.03 to 0.09 m/s).

**The fix.** Before the roll's start its raw path goes on backward, turning about the first contact at the starting spin
and that spin's rate of change, so the softening's window is whole at the start too. The descent hands over at the
softened start (`soft0`: its position, turn, velocity and spin). Toward the end the window gives way to the raw path as
before; the last impact comes at least 0.19 s before the end (the cow's).

phantom-wrench `--gate`, b827f62 -> now (only windows change):

| | over the limit | roll (peak % of body weight; phantom torque) | required force in contact |
|---|---|---|---|
| cow | 0.08 -> 0.07 s | 562% (213 N·m) -> 6% (33) | 5.6 x BW at 2.475 s (fails) -> 3.3 at 2.635 |
| rabbit | 0.08 -> 0.07 s | 524% (217 N·m) -> 17% (38) | 5.2 x BW at 2.475 s (fails) -> 4.1 at 0.720 |
| dog | 0.07 s | 6% (35 N·m) -> 3% (16) | 3.3 x BW, as before |
| sheep | 0.13 -> 0.12 s | 206 -> 207% (at 2.74 s, later in the roll) | 2.3 x BW, as before |

The horse's, bull's, donkey's, goat's, skunk's and both pigs' windows read the same phase by phase, and the eleven
windows 0.95 s over the limit together (0.98). The worst short event between the rig's samples falls from 4,257 N and
441 N·m to 643 and 253 (the cow's), and from 4,262 and 439 to 571 and 208 (the rabbit's). No rule fails that did not
before, and the required force now passes on all eleven windows; the cow's peak is its tail's root landing, and the
rabbit's is now at 0.72 s, before the roll. `bin/collisions.mjs`: the same deepest points and spans on all eleven
windows. The donkey and the pig foreman, whose rolls have no impact in their first 0.14 s, move by at most 0.12 mm
(every point every 5 ms, at 2.47 s).

`tests/natural-traversal.test.mjs`: every landing in the roll is soft. Read every millisecond, the floor's push the body
needs (its centre of mass's acceleration less gravity) stays within the rig's 5 body weights. On b827f62 it fails on the
cow (12.2 at 2.473 s), the rabbit (11.5) and the sheep (5.7 at 2.467 s). The rig, sampling every 5 ms, read the cow's
and rabbit's as 5.6 and 5.2 and missed the sheep's: its required-force rule reads only its 5 ms samples.

**Not tried.** Starting the roll on the contact it meets within 30 ms (the cow's on the middle of its back, 2 degrees
on). That would bring the horse's landing from its mane to its shirt from 92 ms to 69 ms after the start, into the
stretch the window only partly reached, and leave the cause in place.

**Left.** The cow's tail's root landing, now its roll's peak (3.3 x BW). The rig's required-force rule reads only its
5 ms samples. A step of 0.005 to 0.009 m/s in the centre of mass's velocity at the roll's start (the cow, rabbit,
horse, sheep, bull and dog; not the goat), read every millisecond: there before, not looked at. The goat's roll (154%),
the sheep's (207) and the pig director's (195), all later in the roll. The cow's hands to the floor (52%).

### 2026-11-06 (physics balance, twentieth part): the roll keeps its floor, and the goat tucks its chin

The user: "The goat's roll" (its roll 154% of its weight at 2.65 s). The sheep's 207% and the pig director's 195%, which
the list of what was left called one-sample peaks, turned out to be the same thing.

**What it was.** Not peaks: flights. For two or three of the rig's 5 ms samples nothing of the body was within its
centimetre of the floor (the goat at 2.655 to 2.665 s, the sheep at 2.700 to 2.705, the pig director at 2.680 to 2.685),
while the roll asked the floor for 1.2 to 2.1 body weights. The roll's physics keeps the body on the floor (it turns
about its lowest point); the balance took it off. Its plan weighs keeping near the authored path at 1 against jerk at
2e5, a filter of about 4 Hz on the centre of mass, and the roll's landings (its softened impacts: 2.8 to 4.6 body
weights at the balance's 5 ms samples) are quicker than that. The plan rode 0.9 to 1.1 cm above them and the hips
followed. A body lying on the floor cannot rise without leaving it: the goat's seat, the sheep's waistcoat and the pig
director's tail's root rose 1.06 to 1.27 cm.

The goat's had a second cause underneath. Lying back, its swept horns were its lowest point, its back 10.7 cm off the
floor at the roll's start. Its roll turned on them for 83 ms, then fell onto the back at up to 1.67 m/s: 6.1 body
weights at the balance's 5 ms samples. The free plan had braked that fall with the hands (0.7 cm under the roll's path,
then 1 cm over it).

**The fix.**
- A roll that lands its hooves is held near its authored height from 80 ms in until they land (window-dive.js: `hold(t)`
  returns `'height'`), as the stalled rolls (the skunk's, the cow's) already were in full. The plan weighs that height
  in at 50 (traversal-balance.js `level`; a held path's weight is 400), with no force bounds, and plans across on the
  support each round measures, as on the feet: a body lying on the floor slides on it and gives a little, but does not
  rise off it.
- Lying back, a head that would be the roll's lowest point nods forward, the chin toward the chest, by the least whole
  degree that lifts it 5 mm clear of the rest of the body, within the neck's measured range (idle-fits.js: the goat's
  35). The goat nods 23 degrees and lies back onto its shirt as the others do. Its roll now takes 1.44 s and ends at
  3.90 s, and its window 6.60 s (6.09). Every other body nods 0: built with and without the rule, each of their points
  is the same to the bit every 5 ms.

phantom-wrench `--gate`, c2c5a9b -> now (only windows change):

| | over the limit | roll (peak % of body weight) | required force in contact |
|---|---|---|---|
| goat | 0.13 -> 0.06 s | 154 -> 5% | 3.5 -> 2.5 x BW |
| sheep | 0.12 -> 0.07 s | 207 -> 12% | 2.3 -> 2.4 x BW |
| pig director | 0.09 -> 0.07 s | 195 -> 12% | 3.1 x BW, as before |
| donkey | 0.07 s | 18 -> 11% | 2.5 -> 3.4 x BW |
| rabbit | 0.07 -> 0.09 s | 17 -> 18% (now at 2.60 s, 108 N·m) | 4.1 x BW, as before |
| pig foreman | 0.06 -> 0.07 s | 7 -> 8% (42 N·m, two samples) | 2.7 x BW, as before |

The horse, bull, cow, dog and skunk read the same phase by phase (the bull's roll 17 -> 16%). The eleven windows read
0.84 s over the limit together (0.95), summed by script. `bin/collisions.mjs`: the same deepest points and spans on all
eleven windows. Through every roll the body's lowest point stays between 0.53 cm above the floor and 0.95 cm in it (on
c2c5a9b up to 1.27 cm above; the donkey's 0.98 in).

What it costs:
- The donkey's seat landing (2.70 s), which the free plan softened by lifting the body 0.88 cm, now comes through: 4.66
  body weights read every millisecond (3.97). Weighed in at 400 it read 5.1, past the rig's 5; at 100, 4.81; at 20, 4.49
  with the pig director 0.62 cm up. 50 sits between.
- The rabbit's roll at 2.595 to 2.605 s (18%, 108 N·m). The plan leans there on its tail, and the tails are bent again
  after the balance: the rabbit's comes clear of the floor, 20 to 25 cm from where the plan leans. On c2c5a9b the lower
  free plan had kept the bent tail down.
- The goat's hands to the floor, 11 -> 21% (at 2.08 s, as the right hand comes off the wall with the left alone on the
  floor). On c2c5a9b its horns (three or four corners) and its seat on the sill's edge touched there, at 2.080 to 2.090
  s: the descent ended in a roll 11 cm higher. It is the moment of the cow's (52%) and the skunk's (33%). Its get-up,
  0.51 s later now, reads its left foot round 14 -> 16% and its stand 11 -> 7%.

`tests/natural-traversal.test.mjs`: the roll keeps the floor (the body's lowest point, every vertex every 5 ms, within
the rig's centimetre); no roll turns about the head; the chin stays within the neck's measured range. On c2c5a9b the
goat (1.3 cm up at 2.660 s), the sheep (1.1 at 2.700) and the pig director (1.2 at 2.685) fail the first, and the goat
fails the second (its horns at 2.460 s). With every chin forced to 30 degrees, the horse fails the third (its neck
allows 15). The goat's allowance for its horns left in the floor (4 cm) is gone: its head is left 0.0 cm in (0.5 on
c2c5a9b).

**Not kept.**
- The roll's whole path held (height and across, at 400): the plan steered back onto its horizontal path from 0.4 s
  before, through the hands' landing. The donkey's hands to the floor went 14 -> 52%, the rabbit's 18 -> 29, the horse's
  roll 27 -> 46; 0.94 s over the limit together.
- The height held inside a band of 5 mm either way, free within it: where the plan meets the band's edge it rides the
  edge, with the landing's whole curvature. The donkey's landing read 5.8 body weights, the horse's roll 33%, the
  rabbit's 32; 0.89 s together.
- The chin at 30 degrees (the least multiple of 5 that cleared 2 cm): the goat's muzzle came within 0.7 cm of its right
  elbow, which lies back pointing up (the test asks the hands to keep 2 cm from the head). At 20 degrees the horns still
  carry the roll's first 8 ms; at 25 the hand comes within 1.5 cm.

**Left.** The hands to the floor (the goat's 21%, the cow's 52%, the skunk's 33%): the right hand comes off the wall
with the left alone holding. The tails bent again after the balance (the rabbit's roll, 18%). The rig's required-force
rule reads only its 5 ms samples. The cow's tail-root landing (3.3 x BW).

### 2026-11-07 (physics balance, twenty-first part): both ends at rest

The user: "Edge wobble first". phantom-wrench 1.2.0 (dfea5d6), which reads every millisecond between and beside its 5 ms
samples, found the body turning on the spot at every crossing's start, a wobble of about 4 ms that the 5 ms sweep had
only aliased, and readings in the last milliseconds of every window and of the climb. The low wall's phantom rule failed
on it (105 N, 4 ms in), where 1.1.0 had passed it.

**What it was.** The battle's own stance hands over at rest at both ends of a crossing, and two parts of the balance did
not:
- Its turn of the body. On contacts the turn steers the body's angular momentum toward its average over 40 ms either
  side, which at the clip's ends is one-sided and not the body's own, so the turn's samples already had a rate there.
  Its track (traversal-pose.js `track`) gives the first and last key slope 0, so it went from rest to that rate inside
  its first 5 ms segment, overshooting it, and back to rest inside its last.
- Its grid. Clamped to the crossing's end, every window's grid (their durations follow the roll's physics) was off: six
  ended on a short last step, read as a whole one (the sheep's 2.5 ms, the cow's 2.6, the horse's 3.5), and five stopped
  up to 2 ms short of the end (the goat, bull, donkey, rabbit and dog). In the sheep's last 2.5 ms, where the turn's
  track also came back to rest, the rig read 266 and 239 N.

**The fix** (traversal-balance.js).
- The contacts' turn, its rate and its unwinding, fades in from rest over 80 ms (`REST`, twice its averaging
  half-window) and out over the last 80, a smoothstep: it starts and ends with no rate and no acceleration, as its track
  does. Faded without its unwinding, the turn still read 0.056 to 0.117 mrad 10 ms before the windows' ends.
- The samples stay 5 ms apart and cover the crossing: the last may fall up to 5 ms past its end, where the body stands
  in its stance (the motion's pose, hold and base must answer there as at its end, as all three crossings' do). The low
  wall's and the climb's grids (2.4 s, 6.1 s) are the same to the bit.

phantom-wrench 1.2.0 `--gate` (a frozen copy), c1862be -> now; "readings" counts the samples over the limit and the
instants between and beside them; "at the ends" is within 10 ms of either end:

| | over the limit | readings | at the ends: readings, worst (% of its limit) |
|---|---|---|---|
| window horse | 0.060 s | 214 -> 211 | 5 -> 0, 547 -> 99% |
| goat | 0.055 -> 0.050 s | 251 -> 246 | 5 -> 0, 503 -> 91% |
| bull | 0.035 -> 0.030 s | 208 -> 205 | 4 -> 0, 495 -> 81% |
| cow | 0.070 -> 0.065 s | 218 -> 214 | 5 -> 0, 494 -> 84% |
| donkey | 0.065 -> 0.060 s | 244 -> 240 | 6 -> 0, 592 -> 96% |
| sheep | 0.065 -> 0.060 s | 230 -> 226 | 5 -> 1, 431 -> 108% |
| skunk | 0.170 -> 0.160 s | 354 -> 337 | 6 -> 1, 758 -> 146% |
| pig foreman | 0.065 -> 0.060 s | 224 -> 221 | 5 -> 2, 843 -> 117% |
| pig director | 0.075 s | 257 | 5 -> 1, 718 -> 109% |
| rabbit | 0.090 -> 0.080 s | 285 -> 277 | 6 -> 2, 393 -> 136% |
| dog | 0.065 -> 0.060 s | 222 -> 219 | 4 -> 1, 209 -> 103% |
| low wall | 0 s | 1 | 1, 143 -> 105% |
| climb | 0.075 s | 240 -> 235 | 5 -> 3, 142 -> 126% |

Together 0.890 -> 0.835 s over the limit (the windows 0.815 -> 0.760; the twentieth part's 0.84 was phantom-wrench
1.0.0's, summed from two-decimal readings), 2948 -> 2889 readings, 62 -> 12 at the ends. Every crossing reads the same
or fewer. The twelve left at the ends are 76 to 107 N, 4 to 6 ms into a step-in or 2.5 to 6 ms before an end: the low
wall's at 6 ms (77 N; on c1862be, 105 N at 4 ms), so its phantom rule still fails. `bin/collisions.mjs`: the same
deepest points and spans on all thirteen crossings. The other rules pass and fail as before (the required force the same
or a little lower). Read every millisecond, the vault's required force fails, before and after: 5.3 body weights at
0.826 s, where its 5 ms samples read 3.7 (the figure the earlier parts give).

`tests/natural-traversal.test.mjs`, on every mammal and crossing: the balance's samples evenly spaced and covering the
crossing (the first at 0, the last at its end or less than a step past it); its turn at most 0.03 mrad within 10 ms of
either end. On c1862be every window fails the first, and with it switched off the second (1.4 to 3.7 mrad); faded
without its unwinding, the turn fails the second on every window (0.056 to 0.117 mrad).

**Not kept.**
- The step stretched to fit the duration (dt = D / (n - 1)). Correct, but it slid the hips' shift's knots off the rig's
  5 ms samples, which then caught the ripple the shift carries between its knots, read before only between the samples.
  Gated with the turn's rate fade (not its unwinding's) and the hoof change below, the horse's window read 0.060 ->
  0.375 s over the limit at its samples while the readings between and beside them fell 202 -> 142 (214 -> 217 in all).
- A standing hoof's lift and snap eased in as one. Inside the ends' 0.12 s ease the clearance fit lifts a planted hoof
  out of the floor and snaps it 2 mm off it, each eased in with the clip, the snap measured on the half-eased lift: the
  lift comes in as e, the snap as e squared, and the hoof rises and sinks back while the body stands (the fit's own
  offsets on the low-wall horse: up 2.7 mm in its first 80 ms, back to 1.8). Read as if the lift were whole, the snap
  took back the part the ease had not brought in, and the low wall's phantom rule passed. But the windows begin on the
  battle stance's hooves, which the fit lifts 1.5 to 2 cm in the first 0.12 s (the horse's, donkey's and rabbit's; the
  low wall's and the climb's fitted stance, 1.8 mm), under load and through nearly straight knees as the step-in slides
  them: eased as one, that lift moved its readings later and added to them (the windows' step-in 162 -> 279 readings,
  2889 -> 2983 in all; the rabbit's 15 -> 39, the donkey's 7 -> 25), and `bin/collisions.mjs` found a third span deeper
  than 2 cm on the donkey's window. Eased over 0.24 s instead, the donkey's head was left 8.8 cm in at 0.72 s (the test
  allows it 3).

**Left.** The windows' start: the battle stance's hooves, which the fit lifts 1.5 to 2 cm under load in the step-in's
first 0.12 s (on the three windows measured), where the low wall's and climb's fitted stance needs 1.8 mm (the hand-over
itself wants a look: the two stances disagree by about 1.5 cm). A standing hoof's lift and snap at the ends (above). The
low wall's step-in (the plan puts its pressure point on the hooves' back margin from its first free sample), and its
required force read every millisecond (5.3 body weights). The ripple the hips' shift carries between its 5 ms knots.
phantom-wrench's open contact-step stencil, which may move these numbers again.

### 2026-11-09 (physics balance, twenty-second part): the hips between their samples

The user, of the list each part ends with: "keep iterating until you are done with the fixes". This part takes the
largest item first.

**What it was.** Read every millisecond, about half of the instants phantom-wrench 1.2.0 flagged between and beside its
5 ms samples on 30a39408 (1408 of 2722) lay between two samples that both read under half the limit: something the
samples could not see. Around 4.61 s in the horse's window, as its weight goes onto its right foot, the centre of mass's
acceleration rippled with a 5 ms period, from 0.8 m/s^2 at each of the balance's samples to 3 a millisecond past it and
to -1.5 four past; through that phase the rig read 77 to 243 N of phantom force a millisecond past samples whose own
readings were at most 14% of its limit. The hips carried it. The balance hands them their whole move (its shift with the
offsets under it: the clearance fit's, and the window's sill and seat or the climb's top) as a track through its 5 ms
samples, and that track (traversal-pose.js `track`, `{limit:false}`) took each key's slope from its neighbours, a
central difference that is off by a sixth of the jerk times the step squared, and its acceleration from theirs. Between
keys the quintic bends to meet those slopes, by about 0.96 times the jerk times the step in acceleration; there the
hips' jerk is about 600 m/s^3 (their acceleration falls from 14.6 to 2.3 m/s^2 in 20 ms), so 2.5 to 3 m/s^2, the ripple
measured. The balance's turn of the body (its angle and pivot) was tracked the same way, and so were the bend sides of
the legs and arms (`steadyPoles`, on a grid of about 5 ms).

**The fix.** `track` takes `{spline:true}` (with `limit:false`): each inner key's slope and acceleration are the C2
cubic spline's through the keys (its end slopes the pins', or 0), so between inner keys the track is that cubic and its
acceleration runs straight from key to key; the end keys keep acceleration 0, so the ends stay at rest. It refuses a
limiter and an inner pin or acceleration, each of which would bend it off that cubic. The balance's hips
(`followCentre`, which also hands out `hips(t)`, their whole move), its turn and pivot (`turnAt`), and the limbs' bend
sides use it. Splined without the bend sides (review round 1), the hips stopped cancelling the legs' own wiggle, and the
skunk's window read 308 N at 2.904 s beside samples at 77 and 68%; with them, 129% at worst in that phase. A cubic comes
back to 1e-15 and a 7 rad/s sine's acceleration to 0.004 m/s^2 (1.6 with central slopes). On the low wall and the climb,
whose durations are whole 5 ms steps (so the bend sides' grid is the balance's), the balance's samples (its plan,
contacts and turning) are the same to the bit, and so are the positions at them; on the windows the bend sides' grid is
not the balance's, and their spline moves what the balance measures a little (on the horse's window the plan by up to
0.028 mm, the positions at the samples by up to 0.03 mm and the rate of the angular momentum by up to 0.13 N·m; the
contacts are the same). The acceleration the rig reads around a sample (over plus or minus 1 ms) is now the spline's. At
4.61 s the horse's centre of mass accelerates (0.8, -5.4, -1.0) m/s^2 through the whole 5 ms, as at the samples.

phantom-wrench 1.2.0 `--gate` (a frozen copy), 30a39408 -> now; "readings" counts the samples over the limit and the
instants between and beside them; "at the ends" is within 10 ms of either end:

| | over the limit at the samples | readings | at the ends: readings, worst (% of its limit) |
|---|---|---|---|
| window horse | 0.060 s | 211 -> 44 | 0, 99 -> 86% |
| goat | 0.050 -> 0.070 s | 246 -> 62 | 0, 91 -> 79% |
| bull | 0.030 -> 0.040 s | 205 -> 41 | 0, 81 -> 77% |
| cow | 0.065 -> 0.090 s | 214 -> 73 | 0, 84 -> 77% |
| donkey | 0.060 -> 0.105 s | 240 -> 76 | 0, 96 -> 97% |
| sheep | 0.060 -> 0.080 s | 226 -> 57 | 1 -> 0, 108 -> 84% |
| skunk | 0.160 -> 0.195 s | 337 -> 179 | 1, 146 -> 113% |
| pig foreman | 0.060 -> 0.075 s | 221 -> 53 | 2 -> 0, 117 -> 87% |
| pig director | 0.075 -> 0.095 s | 257 -> 87 | 1 -> 0, 109 -> 57% |
| rabbit | 0.080 -> 0.140 s | 277 -> 108 | 2 -> 1, 136 -> 105% |
| dog | 0.060 -> 0.070 s | 219 -> 56 | 1 -> 0, 103 -> 95% |
| low wall | 0 s | 1 -> 0: **passes** | 1 -> 0, 105 -> 77% |
| climb | 0.075 -> 0.095 s | 235 -> 81 | 3 -> 1, 126 -> 115% |

Together 2889 -> 917 readings, 12 -> 3 at the ends, and between two samples that both read under half the limit 1408 ->
19 instants. Every crossing reads fewer, and each one's worst reading falls (the horse's window 852 -> 289% of the
limit, the donkey's 1192 -> 259%, the climb's 6295 -> 5193%). **The low wall passes** its phantom rule (worst 56.5 N,
77% of the limit, at its first sample; between samples 42.5 N, 6 ms in) and, read every millisecond, its required force
(5.3 -> 3.7 body weights: the 5.3 between samples was this ripple); it still fails the rig's capsule overlap (the left
upper arm and thigh, 3.8 cm, legs up and out) and point speed (the right ankle at 9.6 m/s in the spring). The time over
the limit **at the samples** rises, 0.835 -> 1.115 s (167 -> 223 samples: 66 newly over, 10 no longer), on eleven of the
thirteen crossings: each new one sits within 5 ms of a larger reading the old track had between its samples, which the
samples now read. They sit where the hips' own samples are rough at the 5 ms scale (on the horse's window 0.6 to 0.9
m/s^2 of acceleration RMS against their average over two samples either side, 12 at the worst, where the plan and the
played centre of mass agree to 0.09 mm and carry 0.15 to 0.19 m/s^2): the hips cancel the stepping legs. The left foot
round (19 of the 66; the horse's left thigh 260 N of short-scale force at 5.82 s), the step in (10), the roll (13) and
the hands' arrival on the floor (7). `bin/collisions.mjs`: the same deepest points and spans on all thirteen crossings.

`tests/natural-traversal.test.mjs`, on every mammal and crossing: the balance's hips, turn angle and pivot accelerate in
a straight line between their samples (read at four points in each 5 ms; the tracks' own end segments, which ease from
rest, aside; at least one segment of each read). With the hips' spline switched off it fails on all eleven mammals (5.2
to 6.6 m/s^2 off straight), with the turn's off on all eleven (19 to 27 rad/s^2), with the pivot's off on the horse
(1.06 m/s^2). And `steadyPoles` on its own: a bent leg whose pole turns about its axis at 4 rad/s gives a side that
follows it and whose acceleration runs straight between its samples (2.7e-4 /s^2 off at most, away from the first and
last 50 ms, where the track is held at rest while the pole turns on; with central slopes 5.2e-2).

**Left**, from what the samples now read. The steps: each stepping hoof arrives 2.5 cm over its mark and sets down in 40
ms (90 m/s^2 at the peak; 87 measured), and the window's last step lifts and lands with the leg at 0.99 of its length
(the hips at 0.79 and 0.80 m on the horse, about standing height), in the IK's soft zone, as does the climb's last
(1.00, its hoof landing 100 ms late). The hands to the floor: the right hand's brace on the far face ends at 2.06 s,
before the left hand lands at 2.08, so it leaves the face as the left arrives (the cow's 464 N at 2.089 s), and the left
hand then holds the body alone until 2.18. The windows' start: the window's first key gives the hooves no orientation,
so they start 3.5 to 4 mm into the floor, where the battle stance and the low wall's and climb's first keys have them on
it. Then the rest of the list as it stood.

### 2026-11-09 (physics balance, twenty-third part): the steps keep their knees bent

Once the hips stopped rippling between their samples (the twenty-second part), the samples read what the hips had been
cancelling: the stepping legs. The window's last step (Left foot round) carried 267 of the 917 readings over the limit.
It lifted (5.594 s on the horse) and landed (5.834 s) with the leg at 0.992 of its length, inside the IK's soft reach
(traversal-pose.js `limb`: within `SOFT`, 1.5 cm, of straight it eases the end short of its target; with legs of 0.67 m
that is from 0.978 of the length), the hips at 0.79 and 0.80 m on the horse, about its standing 0.80; its knee whipped
as the hoof left the floor (97 m/s^2 at 5.635 s). The climb's last step (Right foot round) reached the leg's full
length, its hoof landing about 100 ms after its key.

**The fix.**
- The steps keep their knees bent. From the window's second get-up step on the hips stay at 0.73 to 0.78 m on the horse
  (2 to 7 cm below its standing 0.80, scaled to each body's legs; the first step at 0.67 to 0.72; weight on the left
  0.75 -> 0.73, right foot down 0.78 -> 0.75, weight on the right again 0.79 -> 0.73, left foot down 0.80 -> 0.78),
  rising to standing at the stand; through the climb's last two steps at 0.75 to 0.77 m, and over toward the right foot
  as it lands. Every stepping leg now stays short of the soft reach: the window's last step by 1.3 mm (the dog) to 11.4
  mm (the pig foreman) as it lands, the climb's by 20 mm or more. With the last key at 0.77 m the window's last step
  kept 16 mm on the horse, but the stand's rise from there turned the goat's and bull's bodies 0.031 and 0.033
  milliradian within 10 ms of the end, where the twenty-first part's test allows 0.03 (at 0.78 m, 0.026 and 0.027).
- No tail holds the body on an obstacle (`supportAt`, a tail point beyond its root on an obstacle is not support). The
  tails are fitted out of the obstacles again once the balance has moved the body (`fit.solveTail`), so the plan must
  not count on that support (a support it does not use costs nothing). With the lower hips alone, the skunk's plume lay
  on the window's sill behind it as it stepped back (0 to 5 mm off the sill before the final tail fit, 34 to 37 mm
  after): the balance's support reached back to it, and the plan leant on it while the rig found the boot alone, its
  last step 19 -> 102 readings. Tails on the floor still count: the skunk's stalled roll turns on its plume (leaving
  every tail point beyond the root out of the support took that roll's sit up 17 -> 43 readings, 464%).

phantom-wrench 1.2.0 `--gate` (a frozen copy), 0bd41f54 -> now; "readings" counts the samples over the limit and the
instants between and beside them; "at the ends" is within 10 ms of either end:

| | over the limit at the samples | readings | at the ends: readings, worst (% of its limit) |
|---|---|---|---|
| window horse | 0.060 -> 0.050 s | 44 -> 35 | 0, 86% |
| goat | 0.070 -> 0.050 s | 62 -> 45 | 0, 79% |
| bull | 0.040 -> 0.035 s | 41 -> 29 | 0, 77% |
| cow | 0.090 -> 0.055 s | 73 -> 53 | 0, 77% |
| donkey | 0.105 -> 0.090 s | 76 -> 64 | 0, 97% |
| sheep | 0.080 -> 0.055 s | 57 -> 38 | 0, 84% |
| skunk | 0.195 -> 0.170 s | 179 -> 160 | 1, 113% |
| pig foreman | 0.075 -> 0.030 s | 53 -> 16 | 0, 87% |
| pig director | 0.095 -> 0.040 s | 87 -> 40 | 0, 57 -> 64% |
| rabbit | 0.140 -> 0.105 s | 108 -> 82 | 1, 105% |
| dog | 0.070 -> 0.025 s | 56 -> 15 | 0, 95 -> 94% |
| low wall | 0 s | 0: passes | 0, 77% |
| climb | 0.095 -> 0.070 s | 81 -> 70 | 1 -> 0, 115 -> 81% |

Together 1.115 -> 0.775 s over the limit at the samples (223 -> 155 samples) and 917 -> 647 readings; every crossing
that read any reads fewer. By phase: the window's last step 267 -> 24, its right step back 14 -> 0, the weight onto the
right foot again 12 -> 1, and the climb's last two steps 10 -> 0 (and its turn onto the tile 1 -> 0); the window's stand
rises 37 -> 46, every one of them in its first 6 ms, as the last step lands (the dog's 157 -> 260%). Each crossing's
worst reading falls or holds (within a point: the donkey's 259 -> 260%, the sheep's 732 -> 733%). `bin/collisions.mjs`:
the same deepest points and spans on all thirteen crossings.

`tests/natural-traversal.test.mjs`, on every mammal: through the window's three get-up steps and the climb's last two,
the stepping leg stays short of the IK's soft reach (the window's last step by 1.3 mm on the dog to 11.4 on the pig
foreman, the climb's steps by 20 mm or more); and `supportAt` on its own: a tail point beyond its root on the sill adds
nothing to the support, while a tail's root on the sill and a tail on the floor do. On 0bd41f54 every mammal fails the
first (the window's last step 10.7 to 15.0 mm inside the reach) and the second fails.

**Not kept.**
- An 80 ms set-down (each step's over key 0.08 s before its landing rather than 0.04): it shortens the swing. Gated with
  the hips at 0.75, 0.75 and 0.77, lower hips alone read 39 (the horse's window) and 16 (the pig foreman's), with the 80
  ms set-down 47 and 47, and the climb 84 -> 88.
- The window's first key keyed flat (hoof 0, heading 0, as the walls' are). Its hooves start 3.5 to 4 mm into the floor,
  where the battle stance and the walls' first keys have them on it (0.0 to 0.1 mm), and keyed flat the step in's
  readings went 50 -> 6. But the clearance fit then left the donkey's head 8.8 cm in the lintel at 0.72 s (the test
  allows 3; the twenty-first part hit the same 8.8 cm there from another change): the start waits for the long ears.

**Left.** The window's start and the long ears at the lintel (above). The hands to the floor: the right hand's brace on
the far face ends at 2.06 s, before the left hand lands at 2.08, and the plan leans on the brace until it lets go. The
roll's landings; the climb's push-off and flight; the vault's capsule overlap and the spring's foot speed; then the rest
of the list as it stood.

### 2026-11-10 (physics balance, twenty-fourth part): the head clears the lintel, and the window starts on the floor

The twenty-third part left the window's start: its first key gave the hooves no orientation, so they started in the
floor, and keyed flat the donkey's head went 8.8 cm into the lintel at 0.72 s. The clearance fit itself left it there.
Its report taken before the balance read the donkey's ears 8.7 cm in at 0.72 s with either start. The 2.8 cm the window
read as played was the balance's doing: on the tilted start the hooves' support was smaller, and the balance moved the
hips 9 to 11 cm back through 0.5 to 0.72 s, which held the head out of the opening. Keyed flat, the hips stayed put.

The head search chose one turn per stretch of contact, judged on the stretch alone. Its eases (`hold()`, 0.1 s either
side) were checked afterwards: a moment an ease carried into contact joined the stretch, which was solved again, up to
three passes. On the donkey's window the passes chased the contact. First chin up 30 degrees for 0.84 to 0.96 s, whose
ease carried the head into contact at 0.98 to 1.02 s. Then a 30 degree nod down from 0.84 to 1.02, whose ease carried
it in at 0.78 to 0.82. Then a 40 degree nod from 0.78, whose ease tipped the ears forward into the lintel's face at 0.72
to 0.74, and the passes ran out. (The fit reads a point under a lintel by how far it must duck, so the ears read 8.7 cm
in while their tips were 2 to 3 cm past the face.)

**The fix.**
- Each turn and bow is judged on every sample it sets, posed as the motion will play it: the stretch, a flight it is
  held through, and its eases, as `hold()` eases and softens them, and scaled as the motion frees the head and trunk.
  Where it meets the stretch before, the samples between are judged with that stretch's chosen turn; where it meets
  the next, the next stretch's part is taken as its own until that one chooses, and the next stretch's samples are
  left to it. The donkey's first pass now finds a turn that clears all of it: the head tilted 60 degrees to the side,
  its ears under the lintel, from 0.84 to 0.96 s, eased in and out over 0.1 s (a nod down sweeps the ears into the
  face as it comes in). Every window's fit settles in one pass, with nothing left in contact at its stretches.
- The window starts on the floor: its first key holds the hooves flat and facing along the crossing, as the walls'
  first keys do. Given no orientation they started in it (the left hoof 2.5 mm on the dog to 9.5 on the pig foreman,
  4.0 on the horse) and turned off the battle stance (9.9 degrees on every mammal but the pig foreman, 23.4 on it), and
  the clearance fit lifted them out under load as the step in began.
- The balance's plan is at rest at either end, as the battle's stance is: the first sample on the authored path, with
  no velocity and no acceleration there, the first interval a cubic from rest (c1 = (7 c0 + c2) / 8); at the end the
  same into the last sample before the crossing's end, the last sample (at the end or up to 5 ms past it) held there
  too. It pinned its first two samples equal (and its last two), so it stood still for 5 ms and then took its first
  acceleration all at once, and the hips' track through it overshot that step by about 40%. Standing flat, on the
  goat's window that plan accelerated the centre of mass 2.7 m/s^2 sideways and 1.2 forward from the start, its
  pressure point asked to keep a centimetre inside the feet's outline at the heels (it lay 0.6 cm inside there; with
  the hooves tilted it asked 2.6 sideways and 2.1 forward, and lay 1.0 cm outside); played, the overshoot carried it
  past the heels. With the hooves tilted the centre of mass went 3.7 sideways at 5 ms (58 N of phantom force, 79%
  of the limit); standing flat, 3.9 (76 N, 104%), and four of the eight windows gated so read over the limit there
  (the goat's, bull's, cow's and sheep's, 103 to 107%).
- Those end rows are met exactly: `boxedPath` takes a row's `stiff`, a multiple of its step size (OSQP gives equality
  rows 1000 times the rest), and the plan's end rows take 1000 (its flights' rows keep the step they had). The
  programme's iterations stop at 1500, and on the cross plan (x and z, coupled over the whole crossing) they stopped
  with its rows met to about 1e-5, the end rows among them. Kept at the step the other rows have, the end rows miss by
  up to 74 micrometres on the windows (the rabbit's) and 277 on the climbs (the rabbit's), so the plan does not start
  from rest: as the test reads the start, the rabbit's window's centre of mass starts at 0.51 m/s^2 (1.65 a millisecond
  in; the dog's 0.44 and 1.47), its climb's at 1.80. Stiff, every crossing's end rows are met within 0.30 micrometres
  (the rabbit's climb; its window and the dog's within 0.08), the test holding them to one. The centre of mass starts
  under 0.1 m/s^2 and, as the test reads it over its last millisecond, ends under 0.3 mm/s (the rabbit's window:
  0.19 mm/s over its last 0.2 ms; with the stiffness off, 0.91 as the test reads it). Resting at the last sample
  instead, up to 5 ms past the end (the copy before the end rows were met), the rabbit's moved 5.8 mm/s at the end over
  0.2 ms (3.4 with the pins). The first interval's ramp still overshoots the plan's first acceleration, by up to a third
  (the goat's 3.4 sideways at 5 ms against its 2.7; the horse's low wall 32%).
- So the plan asks the feet's outline in by 4 cm (not 1) on the rows of samples 1 to 4 and n-5 to n-2 (20 ms at either
  end): there the overshoot carried the pressure point past the heels, and the dog's start read two readings over the
  limit, the worst 130% (96 N at 5 ms; 61 N on 26d37e89). Asked in 4 cm (the one setting gated, on all thirteen
  crossings, and on the other twenty after review: below), the dog's start reads 70 N (95%), and no crossing's worst
  reading within 10 ms of either end rises but the dog's window's (its start 61 -> 70 N, 83 -> 95% of the limit; its end
  94 -> 25%): the horse's window 86 -> 25%, the climb's 81 -> 25%. Against the plan's own centimetre, on the fifteen
  crossings gated both ways, the 4 cm takes 2 readings off the thirteen (the dog's window start, 130 -> 95%), adds 34 to
  the bull's and cow's climbs (their crouch over the limit, and three each at the top; at 1 cm they read as on 26d37e89:
  below), and lowers every crossing's worst reading within 10 ms of either end by 26 to 36 points (the horse's window
  55 -> 25%, the bull's climb 57 -> 21%). The plan does not meet those rows: it stops with its rows met to about 1e-5,
  which on a pressure point's row is centimetres (its own pressure point at the dog's sample 1 lies 3.3 cm outside the
  outline, 6.0 without the margin). The margin works by nudging that solve, so only the gate sees it: the test suite
  passes without it, and the dog's window and the bull's and cow's climbs are to be gated again after any change to the
  plan, its iterations or the hips' track (phantom-wrench 1.2.0, from its own folder: `TR_ROOT=<this checkout>
  TR_KIND=window TR_SPECIES=dog node bin/phantom-wrench.mjs rigs/traversal.mjs --gate`, and `TR_KIND=wall` with
  `TR_SPECIES=bull` and `cow`; the rig's default root is another checkout. The gate fails those crossings either way, on
  their readings elsewhere: read the dog's window's ends, which should hold no reading over the limit within 10 ms of
  either end, the start's worst 95%, 70 N, and the climbs' crouch, 12 and 16 readings at 129%). Those rows made stiff
  too, the plan might meet them and a test check them: not tried.

phantom-wrench 1.2.0 `--gate` (a frozen copy), 26d37e89 -> now; "readings" counts the samples over the limit and the
instants between and beside them; "at the ends" is within 10 ms of either end:

| | over the limit at the samples | readings | at the ends: readings, worst (% of its limit) |
|---|---|---|---|
| window horse | 0.050 -> 0.040 s | 35 -> 34 | 0, 86 -> 25% |
| goat | 0.050 -> 0.045 s | 45 -> 44 | 0, 79 -> 43% |
| bull | 0.035 s | 29 | 0, 77 -> 42% |
| cow | 0.055 s | 53 | 0, 77 -> 42% |
| donkey | 0.090 -> 0.080 s | 64 -> 60 | 0, 97 -> 21% |
| sheep | 0.055 -> 0.050 s | 38 -> 37 | 0, 84 -> 45% |
| skunk | 0.170 -> 0.125 s | 160 -> 126 | 1 -> 0, 113 -> 22% |
| pig foreman | 0.030 -> 0.020 s | 16 -> 11 | 0, 87 -> 10% |
| pig director | 0.040 s | 40 | 0, 64 -> 8% |
| rabbit | 0.105 -> 0.090 s | 82 -> 79 | 1 -> 0, 105 -> 54% |
| dog | 0.025 s | 15 -> 16 | 0, 94 -> 95% |
| low wall | 0 s | 0: passes | 0, 77 -> 23% |
| climb | 0.070 s | 70 | 0, 81 -> 25% |

Together 0.775 -> 0.675 s over the limit at the samples (155 -> 135 samples) and 647 -> 599 readings; at the ends
2 -> 0. The readings' change is all the window's step in, 50 readings -> none, but for one more on the horse's hands
to the floor (6, at the same worst, 136%) and one more as the dog's weight goes onto its right foot again (2, 113 ->
117%); the goat's hands to the floor read their worst higher (236 -> 248%). Of the 20 fewer samples over the limit,
19 are the step in and one the horse's reach for the floor (2 -> 1, its 9 readings as before).
`bin/collisions.mjs`: the same deepest points and spans on eleven crossings; the donkey's deepest 2.9 -> 2.8 cm (its
left forearm and hand on the sill at 1.29 s), and on the skunk one more span deeper than 2 cm: its plume 2.5 cm in
the lintel for one 10 ms frame at 0.93 s (the tail is planned after the balance on the fit's 20 ms samples, and the
balance's path moved). Frame by frame (every 10 ms) the rabbit's ears no longer reach the lintel (3.1 cm in at
0.82 s on 26d37e89), and its right foot lies up to 0.7 cm deeper in the sill from 0.46 to 0.76 s (1.7 to 1.9 cm at
0.69 to 0.72 s, where 26d37e89 had 1.0 to 1.2; at its deepest 2.6 cm, as before).

Gated after review on the other ten mammals' low walls and climbs as well (the same instrument, copies and reading), the
low walls read 5 -> 2 readings: the dog's start read 3 on 26d37e89 (106% of the limit at the worst) and reads none now
(63%), the pig director's two instants are as before, and none reads more than 31% within 10 ms of either end (up to
103% before). The climbs read 2.48 -> 2.53 s over the limit at the samples and 2434 -> 2476 readings, their push-off and
top up to 64 times the limit as before. Of the 42 more, 28 are the bull's and cow's crouch (0 -> 12 and 0 -> 16, 129% of
the limit at 0.625 s); the other 14 come a few at a time in the push-off, the top and the catch (the dog's catch at its
worst 825 -> 1222%) and the rabbit's left foot round (3 -> 6, 171 -> 236%), less one each in the sheep's push-off and
the dog's step in. At their ends the rabbit's climb still reads at its start, 3 readings within 10 ms (2 before; its
worst 248 -> 136%), and the dog's 1 -> 0 (128 -> 75%); within 25 ms of an end, 10 readings against 12. At the plan's
1500 iterations the crouch is the end margin's doing. With the margin at the plan's own centimetre (in memory, on the
final copy) the bull's crouch reads 5.0% of body weight at the worst, at the samples and every instant between (6.2 on
26d37e89) and its climb as on 26d37e89 (0.135 s over the limit at the samples in 5 spans, and 106 instants between); the
cow's likewise (5.9% at the worst, 7.4 on 26d37e89, its climb as on 26d37e89); with the stiffness off, the bull's reads
as with it. Asked in only over the first and last 20 ms, the margin moves the bull's climb's plan by up to 3.9 mm
through its first 0.65 s (the most at 0.37 s, in the step in), its rows no better met for it (its residual 1.2e-5 either
way), and its acceleration by up to 1.2 m/s^2 (1.1 at 0.63 s; at 0.625 s the crouch reads 12.9% of body weight, 4.6 at
1 cm and 6.1 on 26d37e89). Solved further (the bull's climb at 100000 iterations, its rows met to 5.0e-6 and its
push-off's pressure point 5.5 cm outside the outline where it was 38), the margin moves the plan as far (3.8 mm at
0.36 s) and no phase reads differently for it, but the crouch reads over the limit with either margin (24 readings, 143
to 144%), and the climb reads 326 readings either way against 148 and 133 at 1500 iterations (the top 47 -> 178, the
catch 0 -> 35); the margin still lowers its ends' worst (60.5 -> 33.1% within 10 ms). The cow's climb, solved as far,
reads its crouch over the limit with either margin too (32 readings, 141 to 142%), and 284 and 285 readings in all
against 108 and 89 (its push-off 43 with the margin, 44 without). The crouch sits at the limit's edge: 1500 iterations
stop on its near side with the margin at a centimetre, and solving the plan further is no way out of it.
`bin/collisions.mjs` reads the same on seventeen of the twenty; the bull's low wall 4.0 -> 3.9 cm at its deepest, the
rabbit's climb one span fewer deeper than 2 cm, and the sheep's climb's deepest point 10 ms earlier.

`tests/natural-traversal.test.mjs`, on every mammal and crossing: both ends stand on the floor as the battle stance does
(each hoof's lowest surface point within a millimetre of it, each hoof turned within half a degree of the stance; on
26d37e89 every mammal's window fails); the balance's plan meets its end rows within a micrometre; the centre of mass is
at rest at both ends (under 0.3 m/s^2 and 1 mm/s; on 26d37e89 up to 3.76 m/s^2 at the end, the bull's window), and
within 10 ms of either end its acceleration overshoots the plan's next to that end by at most 35%, give or take
0.1 m/s^2 (by up to 32%, the horse's low wall; with the first two samples pinned equal, 26 of the 33 crossings on
26d37e89 fail it, and every window with the hooves flat); and the donkey's and rabbit's heads, allowed 3 and 6 cm for
their ears at the lintel, are now held to 2.5 and 2 for their brush with the floor as the body reaches down for it (2.1
and 1.3 cm at 1.92 s; at the lintel on 26d37e89, 2.8 and 5.2). With the stiffness off, the end rows miss by more than a
micrometre on 16 of the 33 crossings, failing the test on six of the eleven mammals: the windows' start rows by up to 74
micrometres (the rabbit's; the dog's 63, the sheep's 15, the goat's 13, the bull's and cow's 8), the climbs' by up to
277 (the rabbit's; the dog's 167) and the low walls' by up to 24 (the dog's). None of it guards the outline asked in at
the ends: the suite passes without it, where the dog's window starts at 130%.

**Not kept.**
- Judging each turn on its eases by `hold()`'s weights alone, without the softening where two stretches meet: it
  cleared the lintel, but the goat's head fitted again after the balance (below) took two turns that met at 2.10 s,
  and their softened join left its horns 1.8 cm in the wall's far face.
- Judging each turn on the next stretch's first samples too, that stretch's turn taken as none: those samples stayed in
  contact whatever the turn, so the worst never cleared and the choice was left to a hair's difference. The bull's
  window took the far corner of the search for 1.88 to 2.10 s (nod 40, tilt -60, turn 48 degrees, bowed -5, and a trunk
  push), although the next stretch's own turn cleared everything: its hands to the floor went from 10 readings to 42
  (977% of the limit), the cow's from 36 to 57 (1721%), and the cow's head went 3.2 cm into its left upper arm at
  2.05 s.
- The window's head fitted again after the balance (`fit.solveHead`, as the climb's is). It clears the donkey's and
  rabbit's ears off the floor as the body reaches down for it, but it chooses every turn again on the balanced motion,
  which the balance planned with the turns as they were: on the copy before the plan's end rows were met exactly, the
  horse's, goat's, bull's and cow's windows went from 159 readings to 252 (the goat's back to the floor 70 where it had
  none, 662% of the limit at the worst, and its hands to the floor's worst 248 -> 795%; the horse's hands to the floor
  5 -> 26; the cow's back to the floor 0 -> 5, 128%; the bull's unchanged).
- The hips' track ending on the spline's own acceleration (a `splineEnds` option for `track`), on the reading that the
  shift had to cancel the authored motion's acceleration at the ends: it has next to none there (0.02 m/s^2 at the
  start, 0.05 at the end). What it did was make up for the unmet end rows (the rabbit's start 132 -> 87% of the limit,
  the dog's 121 -> 103%); with the rows met, the track's end keys ease from rest as before.
- For the first interval's overshoot, with the end rows met: the jerk weighed 10, 100 and 1000 times over within
  0.05 s of either end (the dog's start 3.2 to 3.3 m/s^2 sideways at 5 ms: a constant acceleration from the first
  sample after the rest has no third difference in any jerk row, so the ramp out of rest is never weighed); and that
  ramp weighed, as the jerk out of the stance's rest (the acceleration at sample 1, and at the last before the end's
  rest): at the jerk's own weight it moved the dog's 3.23 to 3.17, and weighed 30 to 3000 times it moved the overshoot
  to the next knots, where it rang (the dog's sideways acceleration +0.5 to +0.8 m/s^2 at 5 ms, then 3.3 at 11 ms; at
  30 times, its forward 1.7 -> 2.0 at 5 ms; gated, the dog's start 131% at 10 times and 136% at 30).
- These, measured while the cross plan's end rows were still met only as far as its iterations reached (so they may
  read differently now): a parabola from rest at the plan's ends (no velocity, the acceleration free), whose track's
  first segment wobbled after it (3.0, 3.6, 3.0, 2.3 m/s^2 at 1 to 4 ms on the goat); three samples pinned at rest,
  which moved the step and its overshoot to 10 ms.

**Left.** The first interval's overshoot itself, which the outline asked in at the ends only steers around (the plan's
own jerk lets it take its first acceleration within 5 ms), and the ends' margin where it is missed most, on the rabbit's
and dog's climbs: their plans' pressure point at sample 4 lies 7.2 and 10.4 cm outside the outline (9.7 and 13.2 without
the margin), and the gate reads their starts over the limit (5 readings each within 25 ms, 136 and 148%); the bull's and
cow's crouch on the climb, at the limit's edge (over it with the margin at 4 cm, and with either margin when the plan is
solved further, which reads both climbs worse); margins of 2 and 3 cm, untried; the ears' floor brush, for which a local
fit of the head after the balance (only where the played head touches, keeping the planned turns elsewhere) is the
untried way; the rabbit's right foot up to 0.7 cm deeper in the sill at 0.46 to 0.76 s; the skunk's plume frame in the
lintel (the tail is planned with its steps' midpoints checked at the average of their bends, which the played track does
not follow). And every plan's other rows, met only as far as the iterations reach (about 1e-5 in their unit-norm
measure, which on the pressure point's rows is centimetres): before the end margin, the rabbit's plan left its pressure
point 9.6 cm outside the outline at 2.155 s, with 245 rows more than 0.96 cm out, where its hands to the floor read 105
to 165% of the limit; and raising the iterations to 20000 moved the rabbit's plan elsewhere (its centre of mass's worst
miss of the plan 1.65 -> 9.73 mm, on the copy before the end rows were met). Then the hands to the floor; the roll's
landings; the climb's push-off; the vault's capsule overlap and the spring's foot speed; and the rest of the list as it
stood.

### 2026-11-12 (physics balance, twenty-fifth part): the climb's push-off

Every climb but the pigs' read its worst at the push-off and the flight's start (the pigs' at the catch): on 148c6fb7
the horse's climb read 520 N·m of airborne phantom torque at 0.855 s, the goat's 645 N·m at 0.875. Most of it lay around
the take-off: 63 of the horse's 70 readings from 0.83 to 0.904 s, 6 more in its push at 0.78 s (up to 95 N against the
limit's 73.5; the goat's push read 38 from 0.725 s, up to 137 N), and one at 1.218 s in the flight, whose samples from
0.91 s read 0.5 to 8.4 N·m against its 10.

Three faults, each feeding the next:
- The hooves leave the floor on a soft key (from the floor key at 0.70 s to the tucked key at 0.995, soft 3 cm): their
  height is a softplus of the tucked key's, which rides the pelvis, which rides the hips the balance moves. Raising the
  hips, each round's plan took the hooves off earlier. The horse's last foot sample is 0.870 s as authored and 0.860 in
  the schedule held from the second round, and as played its hooves are within the rig's centimetre of the floor only
  until 0.848 and 0.854 (the goat's 0.865, 0.850, then 0.832 and 0.840). The plan pushed on with nothing under it: the
  runaway the balance's rounds already name (a toe-off came 5 ms earlier every round), seen from the leg's side.
- As the hooves leave, the legs swing up toward the tuck: on the horse the legs alone changed the body's angular
  momentum about its centre of mass at up to 539 N·m, with nothing under them to give it.
- The flights' turn is refined on frames posed with the round before's hips, and the hips are found again after (the
  take-off moved with them), so the played flight began with a move the turn never saw: the horse's angular momentum
  about its centre of mass fell from 3.3 N·m·s to -0.1 in the flight's first 30 ms (the flight's median -0.18), a 20 ms
  ring of up to 379 N·m.

**The fix.**
- The push's ceiling: balanceTraversal takes ceiling(t), how far up off its authored path the plan may move the centre
  of mass at t, and planCentre bounds a feet sample's height by it. The climb's is how far up the trunk may move before
  a hoof leaving on its soft key rises more than 5 mm off its mark (bisection on the leg's own key), never below the
  authored path (there the authored hoof leaves at its own time; what that floor costs is under Not kept). On these
  climbs the plan meets the ceiling only at that floor, over the last one to four foot samples, where the authored hoof
  is already 5 mm up: its centre of mass lies on its authored path at the last foot sample (within 0.3 mm) and up to
  5.4 mm under it before, and it stays at least 5.9 mm under the bisection's own heights above the authored path (each
  plan's least gap 5.9 to 19.9 mm, at 0.835 to 0.860 s; every plan's ceiling rows logged, both rounds, the eleven
  climbs). So the floor holds the take-off, and the bisection finds where it starts; that its heights are found as a
  move of the trunk, while the plan bounds the centre of mass (a different move while the legs stand), does not reach
  the plan. As they leave, from 0.865 to 0.873 s, the horse's played hooves are within 0.5 mm of the authored ones
  (earlier in the push the right one sits up to 1.1 mm deeper). Every round now plans the take-off at its authored time.
- The flights' turn is refined once more on the final hips (in flight a turn about the centre of mass leaves the plan as
  it was; on the contacts beside the flight, where the turn eases in and out, the horse's played centre of mass moves
  off the plan by up to 0.37 mm): the horse's flight now holds its angular momentum within 0.12 N·m·s of its median
  through its first 50 ms, 0.38 without it. Without it the eleven climbs read 2053 readings against 1878 and every
  climb's worst is higher, the pigs' most (12776 and 11907% against 7807 and 5535).
- An end leaving its floor mark on a soft key, or coming down onto one, follows the trunk key along the floor over three
  soft, not one (keyedLimb; the climb's hooves leave on one at the take-off and come down on one at the drop, each
  window's left hand comes down on one): released with their lift, the hooves swung along the floor as fast as they rose
  (on 148c6fb7 the rig read 523 N of phantom force at 0.860 s, 511 of it along the crossing, as they came off). On the
  code as kept, one soft instead of three reads 1992 readings against 1878, more on every climb, and the nine mammals'
  worst higher (the horse's 3467% against 2198); the pigs' within 1%.
- The crouch goes down to 0.50 m (it was 0.56): held under the release, the jump finds its speed in the push's length.
  From 0.56 the horse's centre of mass peaked at 2.93 m/s in the push and met the catch 7.9 cm under its authored path;
  from 0.50 it peaks at 3.13 m/s and meets it 0.6 cm under. With the rest in place, the eleven climbs read 2218 readings
  from 0.56 and 1878 from 0.50.

phantom-wrench 1.2.0 `--gate` (frozen copies), 148c6fb7 -> now; "readings" counts the samples over the limit and the
instants between and beside them:

| climb | over the limit at the samples | readings | worst (% of its limit) |
|---|---|---|---|
| horse | 0.070 -> 0.030 s | 70 -> 40 | 5196 -> 2198% |
| goat | 0.120 -> 0.055 s | 111 -> 49 | 6447 -> 1899% |
| bull | 0.150 -> 0.100 s | 148 -> 83 | 5668 -> 722% |
| cow | 0.100 -> 0.050 s | 108 -> 38 | 5627 -> 725% |
| donkey | 0.085 -> 0.040 s | 80 -> 41 | 5262 -> 2230% |
| sheep | 0.095 -> 0.050 s | 92 -> 40 | 6327 -> 1886% |
| skunk | 0.080 -> 0.040 s | 75 -> 36 | 4908 -> 885% |
| rabbit | 0.105 -> 0.065 s | 97 -> 53 | 4042 -> 1186% |
| dog | 0.125 -> 0.055 s | 119 -> 53 | 4966 -> 1151% |
| pig foreman | 1.035 -> 0.940 s | 1009 -> 911 | 11193 -> 7807% |
| pig director | 0.635 -> 0.550 s | 637 -> 534 | 13076 -> 5535% |

Together 2.600 -> 1.975 s over the limit at the samples and 2546 -> 1878 readings, every climb fewer; the eleven windows
and eleven low walls read as before (the low walls' reports byte for byte; the windows' counts and flags the same, and
every reading within 6.4 N and 2.8 N·m, the pig foreman's at 2.24 to 2.26 s, the rest within 1.0 N and 0.61 N·m: their
left hands come down onto the floor on a soft key, now followed along it over three soft). Their balance schedules have
no flights for the last refinement to find. `bin/collisions.mjs`: the same on eight climbs; the horse's deepest
3.6 -> 3.5 cm (one more span deeper than 2 cm), the sheep's at the same depth 30 ms earlier, the pig foreman's boot
6.6 -> 7.2 cm into the wall at 1.49 s; the windows and low walls as before. With the ceiling, the 4 cm end margin (the
twenty-fourth part) no longer puts the bull's and cow's crouch over the limit: gated with the margin at the plan's own
centimetre (in memory), their crouch reads nothing either way, and over the eleven climbs the margin takes the readings
within 10 ms of an end from 5 to 3 and those in all from 1871 to 1878.

The hooves still lean into the floor late in the push, as authored: posed without its balance, the climb puts the right
hoof's lowest point up to 6.3 mm into the floor (at 0.847 s) and the left 3.2 (at 0.845; 148c6fb7's pose 6.6 and 3.4).
148c6fb7's balance hid it by lifting the hooves early; as played the right now goes 7.4 mm in (at 0.848 s). On the copy
before the ceiling's floor (the dropped rule below still in it; 10.1 mm there), measuring the plant snaps
(traversal-fit.js) again after the balance took it to 7.5 mm, as they act only where a hoof counts as fully planted (the
soft key's plant weight falls with time), and holding the hoof at its planted pitch until it lifts took it to 11.4:
neither kept.

`tests/natural-traversal.test.mjs`, on every mammal's climb: every round of the balance plans the take-off at its
authored time (on 148c6fb7 every climb's moved 5 to 15 ms between the rounds); at the last foot sample before the flight
a hoof is within the rig's centimetre of the floor (4.9 to 9.2 mm, the rabbit's the highest; on 148c6fb7 13.8 to
30.2 mm); and through the flight's first 50 ms the body's angular momentum about its centre of mass stays within
0.5 N·m·s of the flight's median, what the rig's airborne limit of 10 N·m moves in 50 ms (0.02 to 0.12; on 148c6fb7 0.88
to 7.8). Each fails on all eleven mammals on 148c6fb7's motion with the other two switched off. The third guards the
runaway and the stale turn together and barely sees either alone: with the take-off held and the last refinement left
out it reads 0.15 to 0.51 (only the rabbit's over), and with the last refinement alone on 148c6fb7's motion 0.09 to 0.66
(the goat's and sheep's over), so the gate shows that refinement's worth (above). The battle's traversal hands the rig's
segment points back from apply for the last.

**Not kept.**
- The hooves' release decoupled from the balance (keyedLimb deciding it on the authored trunk): with half the plan's
  move leaking in as the hoof let go, it still left early, and the horse's climb read 95 readings against 70.
- The ceiling alone, before its floor: the early runaway is gone, but the take-off then drifted later between the rounds
  on seven climbs (with the floor and the rest, none does), and the legs' swing fell wholly in the flight, where the
  turn answered it late (110 readings on the horse's climb).
- The last refinement alone: the flight's turn eases back into the push's contacts, and the horse's push read 55
  readings against 28 (89 in all).
- A ceiling at the leg's reach instead of the release: the authored pose is past the reach from 0.86 s (part of the
  authored toe-off is the leg's IK tugging a hoof it cannot reach), and the plan drove the hips 29 cm under the authored
  path.
- A later round's feet kept in the air where the ceiling applies and the authored motion is airborne. Before the ceiling
  had its floor or the three-soft follow (the crouch already at 0.50 m), the ceiling's lower hips kept a hoof down
  longer, the next round planned on it and the ceiling then held the hips under those samples too: the pig foreman's
  last foot sample went from 0.855 to 0.870 s, its take-off there 83 mm under its authored path and its catch 175 ms
  late (1.425 s against 1.250). The rule held that take-off at 0.855 s (43 mm under its path there; the catch still at
  1.425 s) and took the horse's climb from 62 readings to 51, the dog's from 76 to 65 and the pig foreman's from 1147 to
  1138. With the floor it never fires, on any climb or round, and without the rule the eleven climbs' gate reports read
  byte for byte the same: the floor stops the drift (without the floor it is back, the next item).
- No floor at the authored path, the ceiling at 5 mm (all else as kept): the take-off drifts later between the rounds on
  seven climbs (the horse's, donkey's, skunk's and dog's by 5 ms, the rabbit's and pig director's by 10, the pig
  foreman's from 0.855 to 0.870 s), and at the last foot sample a hoof's lowest point is into the floor on those seven,
  by 0.3 to 17.7 mm (the pig foreman's the deepest). The horse's centre of mass peaked at 2.99 m/s (3.13 with the
  floor), lay 28 mm under its authored path at its last foot sample (0 with it) and met the catch 7.3 cm under it (0.6);
  the pigs' walk up the face read 240 and 108 readings (52 and 0 with the floor), their climbs' worst, in the hang,
  29270 and 27795%, and the eleven climbs 2253 (2.375 s over the limit at the samples). Its worst readings were lower on
  seven climbs, which is the floor's cost: the horse's 299% against 2198, the donkey's 327 against 2230, the goat's 1282
  against 1899, the sheep's 1270 against 1886, the bull's 394 against 722, the cow's 377 against 725 and the skunk's 837
  against 885 (with the floor all seven fall at 0.867 to 0.873 s, as the hooves leave). At 9 mm, inside the rig's
  centimetre, the take-off moves on seven climbs too (the goat's and sheep's 5 ms earlier), the climbs read 2165, and
  the worst is lower only on the horse's, donkey's and skunk's (the goat's, bull's, cow's and sheep's 2990, 2103, 2110
  and 2903%).
- The end's follow along the floor over six soft instead of three: the horse's, goat's and dog's climbs read 39, 44 and
  51 against 40, 49 and 53, their worst 1926, 1617 and 1017% against 2198, 1899 and 1151, a change that would reach
  every crossing again (the windows' left hands land on a soft key too) for 12 to 15% off those three worst.

**Left.** The take-off: the rig reads 28 readings on the horse's climb from 0.863 to 0.893 s, 8 of them on the floor as
the plan's push fades (to 0.1 of the body's weight by the last foot sample, 0.870 s) and the legs begin to fold, and 20
in the air from 0.871 s, the hooves past its centimetre (the worst, 2198%: 268 N and 220 N·m at 0.871 s, the hooves 10.6
and 16.4 mm up; 299% without the floor at the authored path, which cost the jump and the take-off's time: Not kept); the
dog's 28 from 0.863 to 0.900 s, 10 on the floor and 18 in the air from 0.873 s. The pigs' flight and catch: the
foreman's catch is late, and from 1.164 to 1.557 s it reads 391 readings, 271 in the air until the rig finds its catch
at 1.438 s and 120 in the hang and the walk up the face after. The push's own contacts at 0.71 to 0.75 s (12 readings on
the horse). The hooves' authored lean into the floor. Then the hands to the floor; the roll's landings; the vault's
capsule overlap and the spring's foot speed; and the rest of the list as it stood.

### 2026-11-12 (physics balance, twenty-sixth part): the pigs' catch

The pigs' climbs read the most of any crossing (on e909dcf4 the pig foreman's 911 readings over the limit, the pig
director's 534, of the eleven climbs' 1878), much of it from the jump to the catch on: the foreman 80 readings in the
jump and catch, 240 in the hang and 52 walking up the face (372 of its 911), the director 80 and 235 (315 of its 534).
Their hands missed the top.

Why:
- A body deeper in front (the pigs) stands back while it faces the wall and leans over its belly toward it until its
  shoulders are where the horse's were (wall-climb.js, lean: 23 degrees on the pig foreman, 29 on the director). The
  lean was keyed from the catch on: the catch key (1.265 s) had it and the key before it (1.185) did not, so the trunk
  leant into the wall in the flight's last 80 ms. Posed without the balance, the foreman's spine went from 5 degrees
  back to 17 forward between 1.18 and 1.26 s.
- A body in the air cannot turn itself. The balance's turn about the centre of mass took the lean back: the foreman's
  spine 9 degrees back as it reached for the top, and the pigs' shoulders 11 to 16 cm past their arms' reach of it at
  the authored catch. The second round, measuring the schedule on the first round's motion, found no grip until 1.365
  and 1.345 s (115 and 90 ms after the first round's catches, which are the authored motion's; there the turn was 25 and
  29 degrees and the nearest hand 65.5 and 47.3 mm off the wall), and the hang played on with nothing holding the body.

**The fix.**
- The lean is set up in the push and held through the flight: a body deeper in front leans from the launch key on
  (leanFrom), while its hooves can still turn it. At the catch the balance's turn is now 2.1 degrees on the foreman and
  1.4 on the director, and the hands are on the top (12.5 and 9.5 mm into the wall's box at the catch). Leaning in the
  push costs a little there: the foreman's worst in its push off 1356 -> 1626% (at 0.856 s), and the pigs' flights hold
  their angular momentum within 0.12 and 0.15 N·m·s of their median through the first 50 ms (0.02 and 0.03 on e909dcf4).
- The pelvis-carried leg keys under the lean are turned back by it, so the legs keep the tuck the horse's keys give
  them. Turned with the pelvis, they lifted the hooves 25 and 30 ms early (0.830 and 0.835 s) into a longer jump than
  the pigs could make: the foreman's first round's plan lay 12 to 14 cm under its authored path through the catch, and
  the second round put the catches 160 ms after the first round's. That takes in the hang's first leg key too (1.375 s),
  which rode the lean from the catch on e909dcf4: its target moves 25 cm on the foreman and 32 on the director.
- The head holds its turn through the flight, before and after the balance (traversal-fit.js), but for the catch's own
  turn, softened over three of the fit's 20 ms samples, reaching back into the jump's end: on the pig director 5.0
  degrees at the jump's last sample before the balance (1.26 s) and 5.2 degrees in the played flight's last 15 ms (1.220
  to 1.235 s), where the rig already reads its hands on the top; on the foreman 0.18 and 0.01 degree. Leant from the
  take-off, the pigs' snouts pass close to the wall on the way up, and the head fit turns them away:
  - two stretches in a row that meet inside one flight (every 20 ms sample from the end of the one to the start of the
    next in the air) are one: the foreman's head came within the fit's margin of the wall from 0.78 to 1.04 s, a run cut
    into stretches of 0.24 s (CHUNK) at 1.00 s, inside its jump, and it turned 12 degrees and nodded 10 there in 60 ms
    (up to 421 N·m of airborne phantom torque, and 624 N, at 1.035 s);
  - the fit before the balance holds the head through the jump too (solve takes air; the climb passes its
    launch-to-catch keys). The balance plans the flight's turn with the head as that fit leaves it, and the foreman's
    head, easing out of a 15 degree tilt from 1.04 s in the air there and held by the fit after the balance, left the
    turn answering a tilt no longer there: up to 65 N·m of airborne phantom torque from 1.03 to 1.18 s, where the fit
    before the balance turned the head in the air.

phantom-wrench 1.2.0 `--gate` (frozen copies), e909dcf4 -> now:

| climb | over the limit at the samples | readings | worst (% of its limit) |
|---|---|---|---|
| pig foreman | 0.940 -> 0.570 s | 911 -> 541 | 7807 -> 4871% |
| pig director | 0.550 -> 0.215 s | 534 -> 206 | 5535 -> 3216% |
| donkey | 0.040 s | 41 | 2230 -> 2221% |
| the other eight | as before, byte for byte | | |

Together 1.975 -> 1.270 s over the limit at the samples and 1878 -> 1180 readings. The pig foreman's catch, hang and
walk up the face read 80, 240 and 52 readings before and 6, 0 and 0 now; the director's catch and hang 80 and 235
before, 23 and 0 now, and its flight 61 before, 28 now. The donkey stands back 1 mm, its lean 0.2 degrees.

The eleven windows and eleven low walls are the same motion frame for frame (the battle's wrapper read on e909dcf4's
tree and on this one: the centre of mass and every rig point every 5 ms, the largest difference 0): the head fit's air
rules act only where a fit is given flights, and only the climb gives them. `bin/collisions.mjs`: the same on eight
climbs; the pig foreman's deepest 7.2 -> 6.5 cm (its left forearm in the top at 2.38 s; its left boot, 7.2 cm into the
wall at 1.49 s before, now 1.9 cm at 1.455 s), one span deeper than 2 cm fewer on each pig and one more on the donkey's.

`tests/natural-traversal.test.mjs`, on every mammal's climb: every round of the balance plans the catch (the first grip
after the flight) within 15 ms (three samples) of the first round's, measured on the authored motion (10 ms early on
both pigs, within 5 on the rest), and at the catch a hand point lies within the rig's centimetre of the wall's surface,
inside it or out (the rig counts a point deeper than that a sink; 0.0 to 0.7 mm). On e909dcf4 each fails on both pigs
and on no other mammal, the second with the first switched off (the nearest hand 65.5 and 47.3 mm off the wall at the
catch). They read the lean and the leg keys; the head fit's rules only the gate sees (the suite passes without them), so
the climbs are gated again after any change to the head fit.

**Not kept.**
- The lean dropped from the catch key, coming in after the catch while the hands hold: stood back without it, the
  shoulders were further from the top, the grip rise lifted the catch, and the jump grew past the pigs' push (the
  foreman's take-off 45 to 50 ms early, its plan 6 cm under its path at the catch).
- Stretches joined wherever their meeting touched the air, or wherever both its ends were in the air: stretches in two
  flights were joined across the ground between them, the horse's head held nodded 20 degrees from 0.80 to 4.0 s (its
  climb 80 readings against 40, the new ones in its crouch and push) and the bull's nodded 20 and turned 12 from 0.7 to
  4.6 s, its jump's stretch (from 0.66 s) joined to its drop's.
- The lean as a bend of the chest instead of the pelvis: the pigs' shoulders sit 11 cm above the chest's joint, so no
  bend brings them the 16 and 19 cm forward the stand-back takes.

**Left.** The pigs now read in the straddle, the way down and the turn on the far tile: the pig foreman 93 readings
bringing its right knee up, 87 bringing its left leg over, 79 lowering down the far face, 63 letting go and 86 as its
left foot comes round (5.19 to 5.27 s), its worst 4871% at 3.37 s (3579 N); the director 112 lowering down the far face,
its worst 3216% at 4.20 s as it lets go. Then the take-off's last readings, the hooves' authored lean into the floor,
the hands to the floor, the roll's landings, the vault's capsule overlap and spring speed, and the rest of the list as
it stood.

### 2026-11-13 (physics balance, twenty-seventh part): the pigs' straddle and way down

On 4e9853f6 the pigs' climbs still read the most of any crossing: the pig foreman 541 readings over the limit and the
pig director 206, of the eleven climbs' 1180. All but their push, flight and catch lay from the right knee coming up to
the turn on the far tile: the foreman 93 bringing its right knee up, 34 and 87 bringing its left knee up behind and its
left leg over, 79 lowering down the far face, 63 letting go, 46 dropping and 86 + 8 as its feet came round; the director
11 bringing its left knee up behind, 112 lowering, 8 letting go and 24 dropping. Theirs were the only climbs whose
required force passed the limit (16.5 and 17.0 body weights, at 2.437 and 2.402 s; every other climb 3.0 to 3.3).

Why:
- The far face. A body deeper in front stands back and leans in over its belly while it faces the near face (the
  twenty-sixth part). Facing the far face it did neither, and the clearance fit pushed the pigs' trunks 21 to 22.5 and
  24.7 to 25.0 cm off it as they lowered (from 3.85 to 4.2 s; the horse's 4.7 at most). Their shoulders hung out past
  their arms' reach of the top: from 3.85 to 4.15 s the nearest hand point lay up to 25.5 and 40.6 mm from the wall's
  surface (every other body's within 2 mm, read as the test below reads it), and the lowering and the let-go were played
  holding on with no hand in the rig's reach.
- The knees. The search over the top (the eighth part) sets each key's lean and height for the pigs' bellies: the pig
  foreman's chest over the top 24 cm higher than the horse's, the director's 26. Their feet on the near face stayed
  where the horse's were, and each right leg hung straight, out of reach of its foot's target (the foreman's 1.31 leg
  lengths at 2.40 s), until its knee whipped as the target came back within reach: the foreman's from straight (0.3
  degrees at 2.424 s) to 46 degrees at 2.444 s, 12.6 m/s at 2.438 s by the climb test's measure (the shin bone's knee
  over 2 ms chords; the rig's knee point 13.4), the director's 14.1 m/s at 2.402 s (14.5). Those whips are the required
  force's peaks.

**The fix.**
- Facing the far face a body deeper in front stands back again and leans in again (wall-climb.js: far, the share of its
  stand-back a key takes, the whole of it from the lowering through the drop and half of it as the landing is absorbed;
  farLean, the two keys it hangs on, leant 1.5 times as far as on the near side (FAR_LEAN): 34.7 degrees on the pig
  foreman, 43.9 on the director). The larger lean is for the hands, not the trunk. The clearance fit pushes the
  director's trunk 15 to 19 cm past its stand-back at 1.5 and 13 to 18 at 1.0, but at 1.0 its hands rose up to 6.0 cm
  above their grip as it lowered (the hand check below 48.1 mm from the wall, its climb 341 readings against 78; the
  foreman's 354 against 374, its drop cheaper at 1.0 and its let-go dearer), and at 1.5 they stay within the rig's
  centimetre of the top. The lean comes off in the drop as the palms push on the face. The pelvis-carried leg keys under
  it are turned back by it, as on the near side, by a share of it that falls linearly from the let-go to the drop (the
  trunk's pitch eases off on a curve, the two parting by up to 5 degrees between the keys). Only the left landing foot
  stands back.
- A deep body's far grips lie near the top's far edge (x 0.565, the horse's 0.54): hanging low, an arm reaching from
  shoulders out past the belly to the top's middle crossed its far corner, and the clearance fit lifted the hand's
  target off the top to clear it (up to 7.2 cm on the director leant as far as on the near side). With the grips at the
  middle, the far lean as it is now, the foreman's hand came 10.6 mm off the wall as it lowered and the climbs read 359
  and 107 readings against 374 and 78 (the foreman's left knee up behind and left leg over 33 and 79, its lowering and
  drop 22 and 67; its required force 8.0 body weights against 5.9). The forearms clear the corner while the body hangs
  (read every 5 ms, at most 0.3 cm in from 3.76 to 4.10 s and 0.8 to the let-go; 1.1 and 1.0 with the grips at the
  middle), not as it first comes over it (up to 5.3 cm in from 3.60 to 3.72 s; 5.7 at the middle).
- Its hands slide down the face 10 cm further out on each side, 20 cm further apart: leant in over its belly, its head
  lay between its arms as they came off the top (the foreman's right hand 8.3 cm into it at 4.214 s, 3.7 now; the
  director's forearm 3.1 cm). The wider slide doubles the director's turn in the air as it lets go (373 N·m at 4.206 s
  against 191, its worst reading 3733% against 1906%) and costs the foreman 4 readings (the director's 1 fewer).
- The hooves on the near face rise with the search's change of height at their key, as with the grip's rise. That ends
  the right knees' whip (now 4.1 and 5.3 m/s by the test's measure), though the foreman's right arm then goes 5.4 cm
  into its trunk as its knee comes up (1.6 cm without the rise, as on 4e9853f6). Without the rise the director's climb
  reads the same 78 readings, but its required force is back at 17.0 body weights at 2.402 s and its right knee point at
  14.5 m/s: for the director the rise buys the force and the knee, not readings. With the far grips the search sets the
  foreman's left leg over 8.7 cm above the horse's (0.8 on 4e9853f6), and its left leg, going down the far side to its
  3.685 s key, locked straight out of reach (the rig's knee point 14.3 m/s at 3.617 s, the test's measure 13.6; 13.7
  body weights of required force). So the legs' keys at 3.685 s, hanging below the top's level, ride the search's height
  too (deepDy, between the trunk keys either side): the lock is back near what it was on 4e9853f6 (the rig's knee point
  10.4 m/s at 3.631 s; 10.9 then), at the cost of one reading and the foreman's hand check (7.7 mm from the wall against
  3.6 without it). Riding every leg key below the top while the body is over it instead cost the right knee up 9
  readings (its foot's 2.525 s key raised 17 cm), turned the airborne body at the band's jump harder (870 N·m at 3.405 s
  against 273) and put the director's required force over the limit (5.1 body weights against 4.9).

On the far face the pigs' hips now hang further out than before (1.02 to 1.07 m from 4.0 to 4.2 s, against 0.93 to
1.01), and their hands hold only in the rig's sense: they ride the top's far edge (x 0.56 to 0.61, the face at 0.58,
past their mark at 0.565), from 2.6 cm above to 3.8 cm below their grip's height (read every 5 ms from 3.85 s until
their palms begin to let go at 4.18 s).

phantom-wrench 1.2.0 `--gate` (frozen copies), 4e9853f6 -> now:

| climb | over the limit at the samples | readings | worst (% of its limit) |
|---|---|---|---|
| pig foreman | 0.570 -> 0.390 s | 541 -> 374 | 4871 -> 4296% |
| pig director | 0.215 -> 0.090 s | 206 -> 78 | 3216 -> 3733% |
| donkey | 0.040 -> 0.035 s | 41 -> 40 | 2221% |
| the other eight | as before, byte for byte | | |

Together 1.270 -> 0.960 s over the limit at the samples and 1180 -> 884 readings. The foreman's right knee up, lowering,
let-go, drop and feet coming round read 93, 79, 63, 46 and 86 + 8 readings before and 20, 0, 5, 46 and 84 + 7 now; the
director's left knee up behind, lowering, let-go and drop 11, 112, 8 and 24 before and 0, 0, 1 and 26 now. The foreman's
left knee up behind and left leg over read more, 34 and 87 before and 70 and 97 now: the far grips move its right hand's
grip from 3.12 s on, and the search then sets its left leg over 8.7 cm higher (33 and 79 with the grips at the middle).
The foreman's worst is the band's seat as before (3156 N at 3.379 s; 3579 N at 3.370 s on 4e9853f6), just before the
band drops the body 8.3 cm in 15 ms as a trouser point slides off the top's near edge. The director's is an instant at
4.206 s just after it lets go, its hands off the top and not yet on the face, while its lean starts to come off in the
air (373 N·m; 2363 N at 4.204 s before).

The required force reads 5.9 body weights on the foreman (at 3.420 s), over the limit of 5, and 4.9 on the director,
under it. The points over 8 m/s go 9 -> 6 and 8 -> 6: the right knees are gone from them, the foreman's left knee is
still there (10.4 m/s at 3.631 s, the rig's knee point; 10.9 at 3.633 before), and the fastest are the left elbows (14.8
and 17.1 m/s at 3.52 s; 15.2 and 16.1 before). The capsules: the foreman's right arm passes 5.4 cm into its trunk as its
right knee comes up (2.596 s; 1.6 cm at 2.429 before, and without the rise) and its right hand 3.7 cm into its head at
4.206 s; the director's deepest overlap goes 6.2 -> 3.1 cm.

The donkey stands back 1.3 mm, so its far keys move 1.3 mm and lean 0.29 degrees. The windows and low walls are the same
motion: only the climb reads wall-climb.js. `bin/collisions.mjs`: the same on nine climbs; the foreman's deepest
6.5 -> 5.3 cm (its right forearm in the top at 3.70 s; its left forearm at 2.38 s before), the director's 7.9 -> 8.0 cm
(its trousers in the top, at 3.56 s; 3.60 before), one span deeper than 2 cm fewer on each.

`tests/natural-traversal.test.mjs`, on every mammal's climb: over the top (every 2 ms from 2.3 to 3.1 s) no knee (read
as the shin bone's world position over 2 ms chords, not the rig's knee point) moves faster than the rig's 8 m/s, and
lowering down the far face (every 10 ms from 3.85 to 4.15 s) a hand point (of the hand's mesh, forearm and hand, as the
rig's grip reads it) lies within the rig's centimetre of the wall's surface, inside it or out. On 4e9853f6 each fails on
both pigs and on no other mammal, the second with the first switched off (12.6 and 14.1 m/s and 25.5 and 40.6 mm; every
other mammal's knees 7.6 m/s at most, the dog's, and its hands 1.9 mm at most, the skunk's). Now the pigs read 4.1 and
5.3 m/s and 7.7 and 4.3 mm; without the hooves' rise the knee check reads 12.6 and 14.1 m/s, 4e9853f6's whip again, and
without the far stand-back and lean the hand check 66.3 and 29.0 mm. The rig's 8 m/s holds the knees only to 3.1 s:
after it the foreman's left leg locks going down the far side and the director's left knee reads 8.0 m/s at 3.188 s, as
on 4e9853f6. From 3.1 to 3.7 s the knees are held at 11 m/s, a bound 4e9853f6 also meets (the foreman's 10.4 then and
10.3 now; 13.6 without deepDy): that bound guards deepDy.

**Not kept.**
- The far lean as far as the near side's (1.0, the rest of the change the same): the director's hands rose up to 6.0 cm
  above their grip as it lowered, and its climb read 341 readings against 78 (its lowering, let-go and drop 123, 80 and
  87; 8.4 body weights of required force); the foreman's 354 against 374.
- Both landing feet stood back, and the hips with them through the left foot's step (an earlier version, whose other
  differences do not reach the step): the left foot stepping round passed in front of the planted right, the shins
  10.0 cm through each other (at 5.149 and 5.159 s).
- The far grips wider apart instead of the wider slide (0.23 or 0.26 from the middle, the horse's 0.20, the slide moving
  out only as far as the grips, 3 or 6 cm, not 10; read by the hand check, not gated): the foreman's hands came 15.4 and
  15.1 mm off the wall as it lowered.
- A drop that moves out from the wall 4 cm, not the horse's 11 (an earlier version, both landing feet back): the
  foreman's lowering and let-go read 59 and 40 readings (6334% at worst) against 0 and 4 with the 11 cm drop.
- The lean held through the drop, coming off in the absorb with the feet down (on the previous version, with the next
  item's change in too): the foreman's let-go read 53 readings (11582% at worst), against 25 with that change alone.
- The grip rise read at the far grips for the far keys (x 0.565; on the previous version): the far hang keys came about
  1 cm lower, and the foreman's lowering read 35 readings (6149% at worst) against 0.
- The legs riding the search's height at every key below the top while the body is over it (the previous version):
  above.
- The hooves on the face raised twice over, by rise and again with deepDy (the first version): its right knee up read 0
  readings and its arm went 3.5 cm into its trunk, but its feet then rose twice as far as its trunk, which nothing asks
  for.
- The band over the top reworked: its move as a body can move (no faster down than gravity, no harder up than 3 body
  weights) and the top's edges rounded, so a point sliding off one lets the body down along it. Smooth (gated, on an
  earlier version), the band let the seat off the top for about 0.2 s as the body slid off toward the far side, and the
  body turned with nothing under it (up to 164428% of the limit, 16443 N·m in the air); the rounding alone, probed, left
  the jump (a rounded edge falls straight down at the face).

**Left.** The pig foreman's left knee up behind and left leg over (70 and 97 readings): the band holds its seat on the
16 cm top while its turn slides the body off it (its worst, 4296%, on that seat), then drops the body 8.3 cm in 15 ms as
a trouser point slides off the near edge. Its left leg locking going down the far side (the rig's knee point 10.4 m/s at
3.631 s), its right knee up (20 readings, its right arm 5.4 cm into its trunk), its belly brushing the wall as its left
foot comes round (84). The pigs' drops (46 and 26) and the lean coming off in the air as they let go; the left elbows'
whip at 3.52 s; the left leg's swing over the top on every climb (its ankle 8.0 to 8.7 m/s). Then the rest of the list
as it stood: the take-off's last readings, the hooves' authored lean into the floor, the hands to the floor, the roll's
landings, the vault's capsule overlap and spring speed.

### 2026-11-16 (physics balance, twenty-eighth part): the pig foreman's left leg over the top

On d1118c40 the pig foreman's left knee up behind and left leg over read 70 and 97 of its 374 readings over the limit,
among them its worst (4296% of the limit, at 3.379 s), and its required force passed the limit there (5.9 body weights
at 3.420 s, 22 ms over it).

Why: the band over the top (the eighth part) holds a deep body's lowest point over the 16 cm top 6 to 9 mm above it,
and it counted as that body every skin point whose heaviest bone is the hips, spine or head. A fold of trousers the bent
left leg drags under the hip is carried 60% by the hips and 40% by the left thigh, so it counted, and it hung up to
4.6 cm below the torso's own lowest point (at 3.39 s; the torso's points as they lie at rest, riding the hips or spine).
The band held the body up on it. As the leg swung over, the fold slid off the top's near edge (3.40 s) and the band
dropped the body 8.3 cm in 15 ms. The balance held the climb's top as a hold with no vertical bounds, so its plan
smoothed the drop by pulling the body down ahead of it, at 51.4 m/s^2 (5.2 g) at 3.380 s, with only the fold on the
top: 3046 N of phantom force at 3.375 s, and 3156 N at 3.379 s between the samples. The pig director rode its own fold
the same way earlier in its turn (its hips' vertical acceleration -89.7 m/s^2 at 3.195 s and +42.0 at 3.149, its plan
pulling at 53.6 at 3.195), though its gate read nothing over the limit there.

**The fix.**
- The band rests the torso: a skin point a thigh carries 30% or more of moves with the leg, and is left out
  (wall-climb.js, LEG). At 40% both pigs' gate records are the same byte for byte, so anywhere from 30% to 40% leaves
  the same lowest point at every sample; the fold's own thigh weight is 40.2%, just above. At 15% the director's record
  is the same and the foreman reads the same 207 readings (4.3 body weights of required force against 3.6, its drop's
  worst 616% against 625%).
- The balance's hold over the top is a seat (traversal-balance.js, planCentre: a hold with seat). Like a floor it pushes,
  between none and the balance's 3 body weights (its FMAX; the rig allows 5), and it never pulls, so the plan's centre
  of mass falls onto it no faster than gravity. With the torso band alone the plan pulled the foreman down at 51.1
  m/s^2 at 3.655 s, as the body comes off the top, and its required force read 6.0 body weights for 1 ms at 3.632 s.
  Seated, both pigs' plans fall at 9.81 m/s^2 at most over the top and push up at 17.2 and 19.5 at most (the bound is
  19.6). A seat keeps a hold's sideways bounds even where it bears nothing: where the seated plans ride -g (26 and 9 of
  their samples) they push the body sideways at up to 3.75 m/s^2, which a hand supplies. The balance reads a hand
  gripping the wall at every seated sample, and a seat's bounds, up, down and sideways, lie inside a grip's.

phantom-wrench 1.2.0 `--gate` (frozen copies), d1118c40 -> now:

| climb | over the limit at the samples | readings | worst (% of its limit) |
|---|---|---|---|
| pig foreman | 0.390 -> 0.220 s | 374 -> 207 | 4296 -> 1626% |
| pig director | 0.090 s | 78 | 3733 -> 3728% |
| the other nine | as before, byte for byte | | |

Together 0.960 -> 0.790 s over the limit at the samples and 884 -> 717 readings. While the pigs sit on the top (2.55 to
3.68 s) the gate reads nothing over its limits on either (the foreman 167 readings there before). The foreman's left
knee up behind and left leg over read 70 and 97 readings before and none now; its let-go and drop read the same 5 and 46
(at worst 471% and 625%, against 475 and 584). Its worst is now the push-off's, which reads as before (1626% at
0.856 s). Its required force reads 3.6 body weights (at 3.522 s), under the limit of 5, and the director's 4.8 (4.9
before). The
director's left knee comes up behind faster: 8.9 m/s at 3.179 s, the rig's knee point (8.0 at 3.188 before; the climb
test's measure 8.9 at 3.180 and 8.0 at 3.188). Going down the far side the foreman's left leg still locks straight (2.3
degrees at 3.662 s; 1.7 before), at 9.3 m/s, the rig's knee point (10.4 before). The points over 8 m/s, the capsule
pairs over 2 cm and the joints out of the rig's table are the same ones as before. Small changes: the foreman's left
elbow 14.8 -> 15.1 m/s at 3.522 s, its head and right hand 3.7 -> 3.8 cm into each other at 4.206 s, the director's
left knee bending to 135 degrees at most (133 before, within the table's 155). The windows and low walls, which
share the balance but hold no seat, play the same motion frame for frame (every rig point and the centre of mass every
5 ms, the largest difference 0).

The cost is clearance. The fold, and the left thigh under it, now go into the top as the leg swings over: the climb
test's trunk measure (the clearance fit's report, taken after the balance) reads the foreman's trunk 3.3 cm in at 3.34 s
(1.8 at 3.72 before) and the director's 1.3 at 3.16 (1.0 at 3.14). That measure reads every 20 ms and every other skin
point; the rig reads deeper. `bin/collisions.mjs` (every 10 ms, every point): the same on ten climbs; on the foreman
five spans deeper than 2 cm as before, but the fold's now runs from 3.23 to 3.40 s and reaches 6.6 cm at 3.38 s, its
deepest point (3.38 to 3.40 s and 3.0 cm before; its deepest was its right forearm, 5.3 cm at 3.70 s, and the forearms'
span now reaches 4.9 cm, the left at 3.59 s). The test's allowance for the foreman grew from 2 cm to 3.5: the user chose
**"Allow the 3.5 cm clip"** over the seat rule alone, which keeps the 2 cm (below, Not kept). The gaps the test names
are otherwise only allowed to shrink.

`tests/natural-traversal.test.mjs`:
- A seat (planCentre, on its own): planned against a seat whose height drops 6 cm at once, the plan falls no faster
  than gravity and pushes up at no more than 2 g (3 body weights, which it meets); a plain hold, with no bounds, pulls
  the body down at 44.9 m/s^2 to follow it. Without the seat's rows it fails (44.87), and with their upper bound lifted
  (99 g, as at fmax 100) it fails too (27.15).
- Every mammal's climb, from 2.6 to 3.5 s: the hips' vertical acceleration (the hips bone's world height, 5 ms chords
  read every millisecond) stays within -25 and +30 m/s^2. On d1118c40 it fails on both pigs (-63.4 m/s^2 at 3.378 s and
  -89.7 at 3.195) and on no other mammal (-19.8 to +11.5, unchanged); with the seat alone, the band still resting the
  fold, on the director (-38.2 at 3.198). Now the pigs read -14.4 to +24.5. Past 3.5 s, as the foreman comes off the top
  into the hang, its hips still read -63.2 m/s^2 at 3.635 s (-84.7 before).
- Every mammal's climb: only the deep bodies (the pigs) hold over the top, the plan pulls the held body down no faster
  than gravity, and every held sample is a seat. On d1118c40, with the hips check switched off, it fails on both pigs
  (51.43 m/s^2 at 3.380 s and 53.58 at 3.195); with the torso band and no seat, on both pigs again (51.05 at 3.655 and
  13.93 at 2.990).
- The figures the climb's comments give for the pigs after the top are read again: the foreman's lowering hand 7.2 mm
  from the wall at most (7.7 before), the pigs' hands from 2.5 cm above (2.6) to 3.8 cm below their grip's height, the
  foreman's left knee going down 9.1 m/s at 3.632 s (10.3), the director's left knee 8.9 at 3.180 (8.0).

**Not kept.**
- The seat alone, the band still resting the fold: the foreman read 363 readings (its left knee up behind and left leg
  over 62 and 95, at worst 1063% and 578%; 4.9 body weights of required force at 3.459 s), the director 78, and the hips
  check failed on the director (-38.2 m/s^2 at 3.198 s). It kept the trunk measure within 2 cm (1.8).
- The seat with a floor under its plan (the plan's centre of mass no more than 1 or 3 cm below the authored path at a
  seat, on the seat alone): the foreman 417 or 374 readings, the director 159 or 123.
- The torso resting, with the fold kept no more than 1.5 or 0.8 cm into the top (the band holding the body that much
  higher where the fold would sink deeper): the foreman 252 or 311 readings, its trunk 2.6 or 2.2 cm in by the test's
  measure, both over the old allowance of 2; at 1.5 cm the director's let-go read 4233% at worst.
- The left leg's two keys over the top (3.305 and 3.485 s) raised 8 or 16 cm to lift the fold and the thigh clear (not
  gated): the trunk measure 3.0 or 3.5 cm against 3.3 without, neither within the old allowance of 2.
- The body turning about its seat, the trunk sliding along the top toward the far side so the fold stays on it: the
  foreman 429 readings, the director 328 (its required force 8.1 body weights at 3.175 s).
- The right hand holding the top at the horse's far grip (x 0.54) through the straddle and the left leg over: the
  foreman 380 readings, the director 89.
- An unloaded seat's turn held as in a flight (where the seated plan falls at g, the body's angular momentum kept): the
  foreman's required force 76.6 body weights at 3.792 s.

**Left.** The fold and the left thigh in the top as the leg swings over (3.3 cm by the test's measure, 6.6 by the
rig's). The foreman's hips as it comes off the top into the hang (-63.2 m/s^2 at 3.635 s, past the hips check), its left
leg locking straight going down the far side (9.3 m/s at 3.631 s), its right knee up (20 readings, its right arm 5.4 cm
into its trunk), its belly brushing the wall as its left foot comes round (84 + 7) and its push-off (10, its worst at
1626%). The director's left knee up behind (8.9 m/s). The pigs' drops (46 and 26) and the lean coming off in the air as
they let go; the left elbows' whip at 3.52 s; the left leg's swing over the top on every climb. Then the rest of the list
as it stood: the take-off's last readings, the hooves' authored lean into the floor, the hands to the floor, the roll's
landings, the vault's capsule overlap and spring speed.

### 2026-11-18 (physics balance, twenty-ninth part): an elbow is not a hand

On b383d186 the pig foreman's left foot round and its weight on the left foot read 84 and 7 of its 207 readings over the
limit (from 5.187 to 5.277 s): a steady phantom force of up to 158 N (22% of its weight; 38 N on average over the step)
as it stepped round on its right boot.

Why: the balance counts a hand within 1 cm of an obstacle as a grip, which may push or pull any way
(traversal-balance.js, supportAt), and it told a hand by its mesh, as the rig does: every point of the mesh named
"forearm and hand". Most of that mesh is arm. Of the foreman's right one, the arm that brushes, 160 of its 477 points
are skin the hand or fingers carry most of, 215 the forearm's and 102 the upper arm's (the horse's 145 of 632, the
rabbit's 157 of 502). The foreman walks away from the wall with its hands on its hips, elbows out, and as it turns round
its right elbow brushes the wall's far face. In the balance's second round, measured on the first round's motion, points
of that mesh around the elbow lay within 1 cm of the face from 5.155 to 5.295 s, a grip from 5.175 (after the grip's 20
ms onset). Free to pull, the plan drew the body back toward the wall at up to 2.50 m/s^2 (at 5.250 s) on the one boot.
As played (the second round's motion) only the shirt's sleeve touched the face, 0.3 to 0.9 cm off it, which can only
push, and the rig read the pull as phantom force. (The twenty-seventh and twenty-eighth parts' Left called it the
foreman's belly brushing the wall; as played only the sleeve over its upper arm touched.)

Nine more climbs did the same; only the pig director walked away on its feet. Their balances read a grip from 5.150 s to
5.235 at the widest (45 to 85 ms on each, 20 ms after the touch), and their plans pulled the body toward the wall by
1.15 to 5.56 m/s^2 at most (the rabbit's the hardest). Their gates read nothing there but the rabbit's: as played their
right elbows, on the mesh the rig calls a hand, touched the face too (within 1 cm of it at 5.17, 5.19 and 5.21 s on
every one; the horse's 0.06 cm inside it at 5.19), and the rig, whose grip is the mesh's name as well, let the elbow
pull. The rabbit read 6 readings in its left foot round, from 5.164 to 5.169 s, between its grip's start (5.165) and its
elbow coming within the rig's centimetre (5.170, 0.99 cm off; review round 8's rabbit-base-rows-r8.txt).

**The fix** (traversal-balance.js, supportAt and the balance's measure). A hand is skin the hand or fingers carry most
of, on a mesh the rig names a hand, and it grips on an obstacle's top or against a face, as before (the climb's landing
leans on its palms on the far face). The rest of that mesh, the forearm and the elbow, grips only hooked over a top,
within 1 cm of its height (the pigs lowering down the far face, their forearms over the edge); elsewhere against a face
it is a part that can only push, and the plan does not count on it. On every rig "most of" and "half or more" pick the
same points, and the hand and fingers are the only hand bones. The rig still lets the whole mesh grip anywhere, so the
plan counts on less than the rig allows (a support the plan leaves unused reads nothing in the rig).

Where the body is held (the motion's hold: the window's roll on the floor, the pigs' seat) the old rule stands, the
whole mesh gripping, so this change leaves the held stretches as they were. That is this fix's limit, not physics. Held,
a grip only lifts the support outline (planCentre keeps the hold by friction alone), and the cow's and skunk's rolls on
the floor past the window's sill read one from their right elbows on its far face (from 3.195 to 3.325 s and from 2.940
to 3.045). Their plans there are not physical either: the skunk's pushes it along the sill at up to 13.3 m/s^2, riding
the friction bound, its pressure point 27 to 42 cm outside the floor's outline (the cow's up to 37 cm; review round 1's
r1-planp.mjs on the balance's own plan), which the rig misses because it, too, lets the elbow grip there: it reads
nothing over the limit through the skunk's stretch and 9 readings at the start of the cow's (3.195 to 3.203 s). Held
within that outline instead (below, Not kept), the skunk's window read 301 readings over the limit against 126 and the
cow's 59 against 53. The held wiring is guarded by the gate alone: with it switched off (measure() passing false), the
unit test and the cow's and skunk's crossing tests still pass.

phantom-wrench 1.2.0 `--gate` (frozen copies), b383d186 -> now:

| climb | over the limit at the samples | readings | worst (% of its limit) |
|---|---|---|---|
| pig foreman | 0.220 -> 0.130 s | 207 -> 116 | 1626% |
| rabbit | 0.065 -> 0.060 s | 53 -> 47 | 1186% |
| the other eight that changed | as before, phase by phase | | |
| pig director | the same motion frame for frame | | |

Together 0.790 -> 0.695 s over the limit at the samples and 717 -> 620 readings. The foreman's left foot round and its
weight on the left foot read 84 and 7 readings before and none now, and the rabbit's left foot round 6 and none, but the
rig is now blind where those were (below).

The rig cannot show by itself that the new walk-out is physical. As played, the right elbow now lies on the far face on
most climbs (skin of the mesh the rig calls a hand, most of it the upper arm's: review round 6's armskin-*.txt, round
7's armskin-seven-f8c.txt): the rig's rows list it there at 27 of the foreman's 35 samples from 5.14 to 5.31 s (none on
b383d186) and at all 35 of the rabbit's (19), and the rig, gripping by the mesh's name, reads nothing there. A measure
that can see it: the pressure point the played walk-out asks of the feet alone (planCentre's formula, p = c - k a and
the turning term, against the outline the new rule finds; review round 1's r1-zmp.mjs, every 2.5 ms from 5.10 to 5.32
s). On b383d186 it lay 12.6 to 49.1 cm outside the support on the ten climbs that changed (the foreman's 20.4, the
rabbit's 49.1, the dog's 36.9; as a force at the centre of mass's height, 129 to 493 N), so the nine others, which read
little or nothing there, were not physical either; now 0.06 to 3.17 cm (the foreman's 0.43, the rabbit's 2.99, the dog's
3.17). Its forces are rough: where the rig reads too, the rig's force is 0.2 to 2.8 times the measure's (review round
3's r3-zmp-vs-rig.mjs joined samples, round 4's ratio.txt over them with the rig at 1 N or more; on b383d186's large
offsets the measure reads more than the rig, at the 1 cm ones of the right foot round about half). The two largest now,
the dog's 3.17 cm and the rabbit's 2.99 at 5.270 s, fall where the rig is blind (their elbows on the face), so they are
unconfirmed: at that instant on b383d186, with only the feet touching, the rig read 61.7 and 66.1 N (84% and 90% of its
limit of 73.5) for 3.68 and 3.47 cm.

In the walk-out (from its first sample on the feet after the Absorb key, as the test reads it; the limit is 73.5 N): of
what read over the limit, the foreman's 84 + 7 readings and the rabbit's 6 now read nothing at every instant, where the
rig is now blind, the right elbow on the face (review round 6's walkout-r6.txt, round 5's blind-r5.txt, round 7's
overnow-walkout.txt); the rabbit's and dog's 4 each from 5.839 to 5.842 s (2 as the right foot comes round, 2 as it
turns onto the tile) stay over it where the rig sees, as before. At the gate's 5 ms samples (b383d186 -> now; review
rounds 4 and 5's touchdown-rows.txt, rises-8N.txt and blind-r5.txt): the rabbit's and dog's 66.1 and 61.7 N at 5.270 s
and 22.3 and 18.8 at 5.275, under the limit, now read nothing where the rig is blind, and the goat's, bull's and cow's 5
to 11 N there nothing where it sees. Samples rise by 8 N or more only in three places, all where the rig sees and none
over 43.0 N, 59% of the limit: as the left foot lifts (4.985 to 5.045 s; the foreman 0 -> 33.4 N, the rabbit 19.7 ->
42.6, the dog 15.9 -> 43.0, at 4.985), as it touches down (5.260 and 5.265 s; the horse, goat, bull, cow and donkey up
to 21.2 N, from 0 to 10.9) and as the right foot comes round (5.680 to 5.700 s; the rabbit and dog up to 12.7 N, from 0
to 2.2). Before the walk-out, at the landing grip's last samples: the rabbit's grip ends one sample sooner (its last at
4.740 s, 4.745 before), the only change to any climb's schedule outside its walk-out, and at the dog's (4.745 s) its
left palm, 1.000 cm off the far face before, now lies 1.005 cm off, just past the rig's centimetre, while the plan still
grips there: 15.8 N where the rig read nothing (review round 5's palm-4745-*.txt). The ten climbs' motion changed by 2.4
to 18.3 mm at most (every rig point and the centre of mass, every 5 ms). The windows and low walls play the same motion
frame for frame (all 22, the largest difference 0), and so does the pig director's climb.

The cost is clearance at the walk-out. Planned on its feet, the body turns closer to the wall: at their farthest from
their authored paths (from 5.10 to 5.32 s) the plans now carry the foreman 0.83 cm, the rabbit 1.02 and the dog 0.71
toward the wall from them, where on b383d186 they lay 0.12, 0.74 and 0.58 cm away from it, and on average eight of the
ten plans lie farther from their authored paths than before (the foreman's 0.46 -> 1.09 cm), only the rabbit's and the
dog's nearer (review round 2's r2-authored.mjs). The arms were fitted 4 mm clear of the face on the authored path, and
the right elbow goes into it. The deepest point every 20 ms from 5.13 to 5.29 s, b383d186 -> now (review round 1's
face-depth.mjs; negative is inside): the foreman's sleeve +0.35 -> -1.21 cm, the rabbit's elbow +0.61 -> -1.13, the
dog's +0.60 -> -0.81, the sheep's -0.02 -> -0.34, the donkey's -0.19 -> -0.31, the horse's -0.06 -> -0.18, the bull's
+0.10 -> -0.14, the goat's +0.17 -> -0.12, the cow's +0.12 -> -0.12, the skunk's +0.08 -> -0.08 (read every 2.5 ms, the
foreman's -1.21, the rabbit's -1.14, the dog's -0.84). The deepest point is the shirt's sleeve on the foreman, bull,
donkey, goat, sheep and skunk and the arm's own skin on the others; the donkey's and sheep's arm skin stays outside the
face (+0.22 and +0.11 cm). `bin/collisions.mjs` reads only spans deeper than 2 cm, so on the ten climbs it reads the
same deepest points and spans as before.

`tests/natural-traversal.test.mjs`:
- The grip on its own (supportAt): a boot on the floor beside the wall, and one more point. A palm or fingertips against
  the far face grip; an elbow there does not, unless the body is held; a forearm hooked over the top grips; a sleeve
  cuff riding the hand bone does not. On b383d186 it fails (the elbow grips).
- Every mammal's climb: from the landing (its first sample on the feet after the Absorb key) to the end, the balance
  plans on its feet alone. On b383d186 it fails on the ten climbs (a grip from 5.150 to 5.175 s) and passes on the pig
  director.

**Not kept.**
- The hand's own skin alone, the forearm gripping nowhere: as the pigs lower down the far face it changes their flights
  between grips. The pig director's palms come more than 1 cm off the top for 70 ms (4.055 to 4.125 s) while its
  forearms still lie over the edge, and its plan would have dropped it in a 70 ms flight there; the foreman's 95 ms
  flight there (4.045 to 4.140 s), which b383d186 and this change keep, would go (schedules only, not gated).
- No exception for a held body: the skunk's window 301 readings against 126, the cow's 59 against 53 (above).

**Left.** The elbows in the far face at the walk-out (up to 1.2 cm). The arms are fitted clear of the obstacles before
the balance (fit.solveLimbs, 4 mm) and the balance moves the body after; fitting them again after it, as the head and
tail are, would likely keep them off (untried). With the elbows off the face the rig would see the walk-out. The cow's
and skunk's held rolls, planned past the floor's outline where the elbow on the sill grips. The rig's grip is still the
mesh's name. Then the list as it stood: the take-off's last readings (every climb's over the top, 22 to 32 readings) and
the push-off; the drops (the foreman 46, the bull 42, the director 26); the foreman's right knee up (20, its right arm
5.4 cm into its trunk); the director's jump and catch (23); the left hoof stepping round through the right shank on
every climb (2.9 cm at 5.165 s on the horse, 1.9 at 5.181 on the foreman); the fold and the left thigh in the top; the
left elbows' whip at 3.52 s.

### 2026-11-19 (physics balance, thirtieth part): the take-off holds its turn as the legs fold

On 6d7ac5d4 the climbs read most of their readings over the limit at the take-off: their push-off and flight up ("Push
off" and "Over the top") read 381 of the eleven climbs' 620 (144 of them on the feet), and the worst reading of ten
climbs fell there (the horse's 2198% of the limit at 0.871 s, the donkey's 2221%, the goat's 1899%; the pig director's
is elsewhere).

Why: the legs begin to fold before the hooves leave the floor. On the horse's climb the legs' own angular momentum
(their segments about the body's centre of mass, in the balance's model) turned at 0.851 s and swung 4.3 N·m·s by its
last foot sample (0.870 s), at up to 356 N·m/s, while the push faded: 2087 N on its hooves at 0.845 s, 147 at 0.865
(motion\probe-takeoffL.mjs, reproduced by review round 3: legs-f8c.txt; the gate's rows). The balance turns the whole
body to hold a flight's angular momentum (traversal-balance.js, bodyTurn: in flight L* is the flight's median), but only
from the flight's first sample, so for those last 20 ms the floor was asked to turn the body as the legs swung, on
almost no load: the body's angular momentum changed at up to 398 N·m/s at 0.865 s, and the rig read 252 N and 115 N·m of
phantom wrench there. From 15 ms before the last foot sample to 10 ms after it, the eleven climbs' bodies changed their
angular momentum at 229 to 408 N·m/s (motion\probe-takeoffpeak2.mjs, read every 1 ms, the rate over 2 ms chords;
tpeak2-f8c-*.txt).

**The fix** (traversal-balance.js), in two parts that need each other:
- LEAD and turnAir: for the turn, a take-off's flight starts 25 ms before the hooves leave (the last five samples of a
  run on the feet longer than that, just before a flight), in bodyTurn and in the flights' refinement. The turn holds
  the flight's angular momentum there, the trunk turning against the legs as they fold, and its ease into the flight
  moves into the loaded push. A shorter run, a touch between two flights, is left as it is (none of the 33 crossings
  has one, and no test reaches that branch).
- On that lead the plan's pressure point reads no turning: the turn holds the angular momentum there. With the lead
  alone the plan read the rate measured before the round's turn and still counted on the spin the turn takes out (the
  horse's 147 N·m/s at 0.860 s, against -32 as played, its rate over 1 ms chords): it pushed the body toward the wall
  at 2.9 m/s^2 on 0.82 g of load, and the feet read more at the release on five climbs (below, Not kept). Now the
  horse's plan asks 1.1 m/s^2 there and 0.4 at 0.865 s, its pressure point within the hooves' outline
  (motion\probe-takeoffcop.mjs; review round 3's lead-f9z.txt). The support schedule is the same on ten climbs; the
  donkey's catch comes one sample later, at 1.250 s (runs-f8c-all.txt against runs-f9z-all.txt). From 15 ms before the
  last foot sample to 10 ms after it, the eleven climbs now read 12 to 64 N·m/s (the test's own measure:
  testspin-f9z-*.txt).
- Two things are left of the plan's part (review round 3: lead-f9z.txt, jnew-base-f9z.txt). turning()'s five-sample
  mean carries the lead's zero back over the two samples before it, where on five climbs the plan reads 88 to 115
  N·m/s less turning than is played over 1 ms chords (the rabbit's -135 against -250 at 0.845 s). And on the lead the
  played rate rings about the plan's zero from sample to sample (the dog's -18, +56, -33, +22 and -13 N·m/s), the
  turn's track following the kink at the lead's start: the horse's -30 at 0.860 s, on 0.82 g, puts its pressure point
  1.8 cm behind its heels. There fall the fix's five new readings on the feet, phantom force of 74 to 83 N: the
  horse's at 0.861 and 0.862 s (108 and 101% of the limit) and the sheep's at 0.856 and 0.857 (108 and 113%), mid-lead,
  and the rabbit's at 0.845 s (106%), before its lead.

phantom-wrench 1.2.0 `--gate` (frozen copies; 6d7ac5d4's motion = var-f8b's climbs and var-f7fin's pig director ->
var-f9z, this commit's code but for comments and a local's name; var-f9zfin, the tree, plays all 33 crossings the same
frame for frame: same-f9z-f9zfin-all.txt; f9z-summary.txt):

| climb | readings (on the feet) | worst (% of its limit) |
|---|---|---|
| horse | 40 (20) -> 20 (11) | 2198 -> 227% |
| goat | 49 (24) -> 10 (1) | 1899 -> 256% |
| bull | 83 (19) -> 50 (0) | 722 -> 253% |
| cow | 38 (17) -> 8 (0) | 725 -> 249% |
| donkey | 40 (10) -> 17 (0) | 2221 -> 217% |
| sheep | 40 (15) -> 12 (3) | 1886 -> 256% |
| skunk | 36 (8) -> 16 (0) | 885 -> 246% |
| pig foreman | 116 (28) -> 88 (22) | 1626 -> 625% |
| pig director | 78 (9) -> 57 (1) | 3728% |
| rabbit | 47 (19) -> 28 (13) | 1186 -> 999% |
| dog | 53 (19) -> 27 (9) | 1151 -> 217% |

Together 0.695 -> 0.370 s over the limit at the samples and 620 -> 333 readings, 188 -> 60 of them on the feet; the
push-off and flight up 381 -> 105 (144 -> 14 on the feet). By phase (f9z-phases.txt): every climb's flight up reads
fewer (the horse's 28 -> 11, the skunk's 22 -> 2); the push-off fewer on six (to none on the goat, bull, cow and pig
foreman) and one more on the rabbit; the catch fewer on the pigs and the dog (the director's 23 -> 18) and one more on
the goat, sheep and rabbit. The horse's worst is now an old one in its push (227% at 0.745 s, 252 before).

Of the 287 fewer readings, 29 go only because the rig now credits cloth on the wall's near face, not physics (review
round 2's jcredit2.mjs, here probe-credit.mjs: credit-f9z.txt): the skunk's overalls from 0.870 to 0.887 s (15, among
them its old worst, 885% at 0.873, so its new worst lies elsewhere), the goat's overalls in its push from 0.783 to 0.789
s (7), the dog's trousers at its catch from 1.222 to 1.226 s (5), the pig director's waistcoat at 1.174 and 1.175 s (2);
and one appears where the director's skull leaves that face (0.872 s, 111%). Besides the cloth, 20 go where the rig
newly finds a hoof or boot within its centimetre of the floor at the take-off, which the fix leaves lower there (the
pig director's lowest boot point 3.4 mm into the floor 5 ms before its last foot sample, 0.1 mm above it before; it
leaves the rig's centimetre 7 ms after that sample, 2 ms into the planned flight, where it left 3 ms after it): at the
last foot sample on six climbs (197 to 279% of the limit there before, 11 to 72% now), and just after it, where the
rig's flag turns from the air to a contact, the pig foreman's and the rabbit's old worst readings (1626% at 0.856 s,
1186% at 0.876 s; review round 3's jany.mjs: jany-base-f9z.txt). A hoof within the centimetre is a support by the
suite's own rule, but those falls are the rig's crediting, not the take-off's physics. The pigs' right palms in the
push run faster (the foreman's 7.89 -> 8.13 m/s, its seventh point over the rig's 8 m/s; the director's 7.46 -> 7.67),
and the other climbs' palms 0.006 to 0.165 m/s faster (the goat's, bull's, cow's and sheep's 0.064 at most), theirs
already over the rig's 8 m/s on 6d7ac5d4 (8.21 to 8.42 m/s, now 8.24 to 8.49; review round 3's speeds-base-f9z.txt).
The windows and low walls play the same motion frame for frame (all 22,
var-f8c against var-f9z: same-f9z-wl.txt). `bin/collisions.mjs`: the same on eight climbs; the horse's deepest point,
its left hoof in the wall at 1.45 s, 3.5 -> 3.6 cm (spans deeper than 2 cm 6 -> 5), the donkey's spans 9 -> 8, and the
sheep's deepest point the same 3.6 cm 20 ms later.

The lead: at 20, 25 and 30 ms the eleven climbs read 378, 333 and 313 readings (99, 60 and 63 on the feet). At 30 ms the
horse's push reads 541% at 0.744 s and the rabbit's catch 1133% at 1.224 s (999 at 25), so 25. The legs begin to fold 14
to 20 ms before the last foot sample on ten climbs and 25 on the rabbit (review round 1).

`tests/natural-traversal.test.mjs`, every mammal's climb: from 15 ms before the balance's last foot sample before the
flight to 10 ms after it, the body's angular momentum (the test's model, read every 1 ms, the rate over 2 ms chords)
changes at most 100 N·m/s, a bound set between the two copies: on 6d7ac5d4 it fails on all eleven climbs (229 to 408;
var-tchk9a: t9-tchk9a.txt), now 12 to 64. It passes with the lead alone as well (13 to 64): the plan's part is guarded
by the gate alone.

**Not kept.**
- The lead alone: 475 readings, but the feet read more at the release on five climbs (from 0.80 to 0.95 s the horse 8 ->
  14, the skunk 8 -> 15, the dog 10 -> 14, the rabbit 7 -> 10, the donkey 10 -> 12; the horse 102 to 275% of the limit
  at 0.857 to 0.862 s, where 6d7ac5d4 read up to 40%), its feet's total 188 as before (var-f9t25; at 20, 30 and 35 ms
  506, 472 and 488 readings).
- On the lead, the turning rate taken from the turn's own angular momentum (L + I (w_new - w)) rather than none: 355
  readings, 96 on the feet. The rate's chords and five-sample mean smeared the step into the hold over the lead's first
  three samples (the horse's +56, +96 and +57 N·m/s, where the played body read -79, -38 and -8 by the same rate), and
  nine climbs read 24 new readings on the feet there (var-f9u; review round 2), against the kept version's five.
- The plan reading the body's turning as the round's turn leaves it on every sample, not only the lead: the horse 39 ->
  36, the goat 25 -> 29, the pig foreman 93 -> 87 against the lead alone; the walk-outs moved too (the goat's right foot
  round 0 -> 7; var-f10a, three climbs gated).
- The feet's push sideways held within friction of the floor's push as planned, not of 0.3 g at least: alone, the horse
  read 40 readings (worst 2252%); with the lead, 38 (275%) against 39 (var-f9f, var-f9tf25).
- Four refinements of the flights instead of two, with the lead: the horse 39 -> 36, the goat 25 -> 27 (var-f9r4).

**Left.** The flights' small torques just after the release (the horse's 9 readings from 0.871 to 0.893 s, 11 to 21 N·m
against the airborne 10), the plan's turning just before and on the lead (above), the horse's push (227% at 0.745 s),
the drops (the foreman 46, the bull 42, the director 26), the pigs' palms in the push, and the rest of the list as it
stood.

### 2026-11-20 (physics balance, thirty-first part): the drop holds its turn, and the palms slide off the top

On d54c607d the let-go and the drop off the far face ("Let go" and "Drop") held 154 of the eleven climbs' 333 readings
over the limit, among them the worst of five climbs (the donkey's and the dog's 217% at 4.235 s, the skunk's 246%, the
pig foreman's 625% at 4.259, the pig director's 3728% at 4.206). On the nine climbs but the pigs' they fell in the
flight between the palms leaving the top and landing on the far face (from 4.210 or 4.215 to 4.295 or 4.300 s), where
the body's angular momentum changed at 20 to 32 N·m/s (the new drop check's own measure on d54c607d's code: the release
test's model, read every 1 ms, the rate over 2 ms chords; review round 3's t-old.txt), against the rig's airborne 10.

Why, two causes:
- The bull's head. The clearance fit before the balance held the head's turn through the jump alone; the fit after it
  holds it through every flight. On the bull the first eased the head into a stretch that clears the wall from 4.23 s,
  through the drop's flight (turned 6.0 degrees at 4.30 s, 12 at 4.38), and the balance planned the flight's turn
  against that head; the second turned the head before the let-go (11.9 degrees at 4.20) and held it there. The played
  body never made the turn the balance answered: 10 to 20 N·m of airborne phantom torque from 4.228 to 4.280 s, the
  bull's drop 42 readings (motion\probe-headdrop.mjs on var-ph, d54c607d's code, where PREHEAD=1 skips the second fit:
  review round 1's headdrop-ph-bull.txt and headdrop-ph-prehead-bull.txt).
- The hands braking in the air. Every limb key is a stop (keyedLimb's smoothstep), and the palms' path from the top to
  the far face went through a key just past the far edge (4.235 s): the hands braked to rest there in mid-air, the
  arms' angular momentum changing at 330 N·m/s at 4.222 s and 15 at 4.236 on the dog (motion\probe-Lparts.mjs), and the
  turn, sampled every 5 ms, could not follow. The rig read 217 to 249% of its airborne limit at the key (the dog and
  the donkey 217, the skunk 246, the bull, its head held, 249).

**The fix**, in three parts:
- wall-climb.js: the fit before the balance holds the head through the drop too, from the let-go to the palms on the
  far face (ONFACE, 4.33 s), as it holds it through the jump. Alone: the bull 50 -> 18 readings (its drop 42 -> 10),
  the other ten climbs' readings as they were (var-a1).
- wall-climb.js, SLIDE: the palms arc out over the top's far corner to the face (ARC: 6 cm along the face's outward
  normal at the most, mid-way), with no key between, so the hands never stop in the air. They slide off the top's far
  edge as the body starts down. In the balance's schedule the grip on the top now ends at 4.240 s, 30 or 35 ms later,
  and the drop's flight runs from 4.245 to 4.325 s on the nine climbs; nothing else in the schedule moves
  (runs-a1xsd-all.txt against runs-f9z-all.txt). That flight now turns at 3.5 to 5.9 N·m/s at the most (the check's
  measure: t10-f10fin-r2.txt). A deep body keeps the key (Not kept).
- traversal-pose.js, steadyTurns: arced, the palm's turn onto the face kept the long way round until 2.5 ms short of
  done and switched halfway between two samples, popping 0.09 degrees (0.08 mm, 0.10 m/s on the rig's palm points at
  4.3275 s, both hands, on the nine climbs). Between two neighbouring samples whose long-way flags differ, the switch
  now falls on whichever of the two it costs the less (min(w, 1 - w), nothing where no partial turn is recorded): here
  the face key, where the turn is done. The low walls switch too (review round 1's rv-stlog.txt, which found it: the
  5 ms frame comparison, same-a1xs-wl.txt, reads only the samples, where both rules agree): their palms' turn as the
  hands come onto the wall (from 0.640 to 0.645 s, on ten of the eleven) and as the legs go up and out (from 1.090 to
  1.095, on six) now jump 0.03 degrees on the later sample, where halfway they jumped 0.09 and 0.10. Gated
  (lowwall-f10.txt, var-f9zfin against var-f10fin), their readings and worst readings are as they were, and their
  palms' snaps (0.6425 s, 0.03 m/s, on ten; 1.0925 s, 0.04 m/s, on six) are gone, with the velocity jumps the scan
  found (1 or 2 on each of the ten, none now). The windows' played hands never switch; they play as they did. The
  pigs' climbs gate as with the head's hold alone (var-a1 against var-a1xsd).

How the palms leave, on the horse (every hand vertex against the wall's box every 1 ms: review round 2's
tail2-f10fin-horse.txt against tail2-f9zfin-horse.txt, round 3's tail-letgo-f10fin-horse.txt; the slide's speed, the
need and the centre of mass: round 1's q1-analysis.txt): they slide out over the top (outward at 1.2 to 2.5 m/s, and
down), the left hand in the wall's box until 4.234 s (2.5 cm in at the let-go, as through the hang, 3 cm; 5.3 mm or less
from 4.225), while the motion's upward need, 458 N at the let-go (501 at 4.206), falls to 145 (through the key 223 N at
the let-go and none by 4.215). Then both hands hover clear of the box until 4.242, the nearer within the rig's
centimetre (0.2 to 8.9 mm), as the need falls from 132 N to 41: a hover as long as through the key (from 4.205 to 4.213
s, 223 to 29 N) and lighter. The centre of mass starts down earlier and falls less fast after (at most 5.5 mm off its
path through the key, at 4.218 s; within 1 mm by 4.33), and the landing is the same from 4.6 s.

The change also reaches back into the lowering: the motion moves from about 3.8 s (the skunk's head tip 4 mm off at 4.00
s, 40 at 4.10 and 26 at 4.15; the horse's shoulders 1.0 to 1.4 cm nearer the wall at 4.10 s, its centre of mass at most
1.7 mm), its readings there as they were (review round 1: offgrid-wall-skunk-early.txt; round 2: com-horse.txt).

phantom-wrench 1.2.0 `--gate` (frozen copies; d54c607d = var-f9zfin, its gates var-f9z's, the same motion; this
commit's tree = var-f10fin, which plays all 33 crossings as var-a1xsd frame for frame (same-f10fin.txt), whose nine
climbs but the pigs' play as var-a1xs's (same-a1xsd-wall.txt), the gates here theirs: g12-droptable.mjs):

| climb | readings (let-go and drop) | worst (% of its limit) |
|---|---|---|
| horse | 20 (0) -> 20 (0) | 227% (0.745 s) |
| goat | 10 (0) -> 10 (0) | 256% (0.889 s) |
| bull | 50 (42) -> 8 (0) | 253% (0.889 s) |
| cow | 8 (0) -> 8 (0) | 249% (0.889 s) |
| donkey | 17 (9) -> 8 (0) | 217 (4.235 s) -> 176% (0.889 s) |
| sheep | 12 (0) -> 12 (0) | 256% (0.889 s) |
| skunk | 16 (14) -> 2 (0) | 246 (4.235 s) -> 130% (0.973 s) |
| pig foreman | 88 (51) -> 88 (51) | 625 (4.259 s) -> 603% (1.177 s) |
| pig director | 57 (27) -> 57 (27) | 3728% (4.206 s) |
| rabbit | 28 (0) -> 28 (0) | 999% (1.224 s) |
| dog | 27 (11) -> 16 (0) | 217 (4.235 s) -> 168% (0.889 s) |

Together 333 -> 257 readings (154 -> 78 in the let-go and drop, all of them the pigs' now), 0.370 -> 0.275 s over the
limit at the samples. The pig foreman's worst moves to its old 603% at 1.177 s: the head's hold moves its fit a little
everywhere, and its drop's worst is 584% now (its readings 88 as before). `bin/collisions.mjs`: the same on seven
climbs; fewer spans deeper than 2 cm on the bull (7 -> 5), the donkey (8 -> 7), the skunk (8 -> 7, its deepest point
4.3 -> 4.1 cm, now at 1.45 s) and the dog (6 -> 5, 4.1 -> 3.8 cm, now at 1.45 s). No new internal velocity snaps (the
horse's palm at 2.2325 s and the pig foreman's at 2.2175 as before).

`tests/natural-traversal.test.mjs`:
- every mammal's climb but the pigs': through the balance's first flight from the let-go key on, the body's angular
  momentum (the release test's model) changes at most 10 N·m/s, the rig's airborne limit. On d54c607d it fails on all
  nine (20 to 32 N·m/s: review round 3's t-old.txt), now 3.5 to 5.9 (t10-f10fin-r2.txt).
- steadyTurns: a turn kept the long way round until it is done switches back on the sample where it is done, not
  halfway, and a nearly done turn that is still partial switches on the sample where it costs the less (the low walls'
  case). On d54c607d's code both fail: the ref names no way in the first and the short way in the second.

**Not kept.**
- Four refinements of the flights' turn instead of two: the bull's drop 42 -> 42 readings, the horse 20 -> 22, the pigs
  88 -> 77 and 57 -> 50 (var-r4, four climbs gated).
- The flights' angular momentum measured over 1 ms chords in their refinement, not the grid's 10 ms: the bull's drop
  42 -> 41 (its readings 50 -> 55), the horse 20 -> 25, the pigs 88 -> 81 and 57 -> 49 (var-fc, four climbs).
- A pass-through key at 4.235 s (via: the end keeps the chord's speed through the key, no acceleration there): 297
  readings. It bent the palms' path up 1.6 cm at the let-go, they left the top early, and the let-go read new phantom
  force there (the donkey 718% at 4.207 s, the dog 486% at 4.208; var-a1v). At half the chord's speed, 275, but the
  nine climbs hardly moved (the bull 14, the dog 26; var-a1h).
- The arc on the pigs too: the foreman 159 readings (7545% of the limit) against 88, the director 67 (6399%) against 57
  (var-a1x).

**Left.** The pigs' let-go and drop (78 readings, the director's 3728% at 4.206 s): from about 4.0 s their far grips lie
past their arms' reach (by the let-go the foreman's 6.3 to 7.9 cm past .97 of the arm from 4.18 to 4.22 s, the
director's 4.8 to 5.8, the horse's 2.0 at the most, at 4.10 to 4.12 s: motion\probe-gripgap.mjs on the tree, review
round 1's gripgap-f10fin.txt and gripgap-f10fin-horse-wide.txt), their shoulders hanging 3 to 4 cm lower than the
horse's and 3 to 6 cm further out (at 4.20 s 1.614 to 1.624 m up against 1.656), so their palms come off the top before
they let go. The drop read honestly (palms on the face holding nothing), the flights' small torques after the release,
and the rest of the list as it stood.

### 2026-11-20 (physics balance, thirty-second part): the pigs hang within reach, and arc off the top

On f293da69 the pigs' let-go and drop held 78 of the eleven climbs' 257 readings over the limit (the pig foreman's 51,
the director's 27), and the director's 3728% at 4.206 s, the worst of any climb. From about 4.0 s their far grips lay
past their arms' reach (the foreman's 6.3 to 7.9 cm past .97 of the arm from 4.18 to 4.22 s, the director's 4.8 to
5.8, its most 7.5 at 4.095; the horse's 2.0 at the most), so their palms came off the top onto the far face before they
let go, and the balance found the foreman in flight inside its authored grip (4.045 to 4.140 s).

Why: the far hang's keys. The stand-back and the far lean left a deep body's keys with its trunk in the far face, and
the clearance fit pushed it out after them (14 to 17 cm from 4.10 to 4.22 s on f293da69: fitpush-f10-f11b.txt, round
1's probe-fitpush-battle.mjs), past where the grip rise had set the keys' height. With its palms off the top before it
let go, a deep body also kept the drop's stopping key past the far edge (the thirty-first part: arced, the foreman read
159 readings and the director 67).

**The fix**, in two parts, both in wall-climb.js:
- A deep body's far hang: each far key is pushed out until the torso clears the far face by FAR_CLEAR (6 mm) below the
  top (the foreman's hanging keys 14.8 and 14.6 cm, the director's 14.5 and 14.1; the drop's and the absorb's nothing),
  and each hanging key is raised until both arms reach the far grips at .97 of the arm (the foreman's 7.6 and 7.2 cm,
  the director's 6.6 and 6.2). The let-go keeps its time: the drop falls from the raised hang, and the hands' release
  keys keep theirs. The fit's push from 4.10 s is now 3.7 cm at the most (the foreman's; the director's 2.5), and the
  arms come within 1 cm of the grips' reach from 4.165 s (the director's from 4.140), 3.5 cm past it at the most (the
  foreman's, at 4.075 and 4.080 s: reach-f11b.txt, round 2's probe-reach.mjs).
- SLIDE: the pigs arc off the top as the other climbs do, now that their palms hold it until they let go. With the far
  hang, arced, they read 42 and 34 readings against 78 and 53 through the key past the far edge (var-f11b against
  var-fh4), their let-go and drop 5 and 4 against 41 and 23 (the foreman's drop 10810% of its limit at 4.265 s through
  the key, 227% at the most arced). Arced, the foreman's right hand no longer meets its head as it lets go (the rig's
  capsules head x hand 3.8 cm deep at 4.206 s on f293da69, 3.5 at 4.212 through the key, now under 1 cm), so its
  overlapping pairs over 2 cm read 3 against 4. Of the 9 readings left in the let-go and drop, 8 are new, none of
  f293da69's 78 (below, What else moves).

phantom-wrench 1.2.0 `--gate` (frozen copies; f293da69 = var-f10fin, its gates var-a1xsd's, the same motion; this
commit's tree = var-f11b: droptable-f11b.txt):

| climb | readings (let-go and drop) | worst (% of its limit) |
|---|---|---|
| horse | 20 (0) -> 20 (0) | 227% (0.745 s) |
| goat | 10 (0) -> 10 (0) | 256% (0.889 s) |
| bull | 8 (0) -> 8 (0) | 253% (0.889 s) |
| cow | 8 (0) -> 8 (0) | 249% (0.889 s) |
| donkey | 8 (0) -> 8 (0) | 176% (0.889 s) |
| sheep | 12 (0) -> 12 (0) | 256% (0.889 s) |
| skunk | 2 (0) -> 2 (0) | 130% (0.973 s) |
| pig foreman | 88 (51) -> 42 (5) | 603% (1.177 s) |
| pig director | 57 (27) -> 34 (4) | 3728 (4.206 s) -> 455% (1.181 s) |
| rabbit | 28 (0) -> 28 (0) | 999% (1.224 s) |
| dog | 16 (0) -> 16 (0) | 168% (0.889 s) |

Together 257 -> 188 readings (78 -> 9 in the let-go and drop), 0.275 -> 0.190 s over the limit at the samples. The
director's worst is now its old 455% in the jump's flight.

What else moves:
- Only the pigs' climbs. The windows, the low walls and the nine other climbs play as on f293da69, frame for frame (31
  of 33 crossings: same-f11b-f10fin.txt).
- The far hang moves the pigs elsewhere. They touch down 25 and 30 ms later (the left boot at 4.555 and 4.545 s against
  4.530 and 4.515; the absorb's need the same, 2.2 kN against 2.3, and no readings there on either copy:
  landing-f11b.txt). Their hips come 5.1 and 4.2 cm back toward the wall through the drop (to 4.550 s; 3.6 and 3.3 on
  f293da69, to 4.600: pelvis-f10-f11b.txt), the foreman's let-go key lying 3.5 cm further out than its drop key, which
  nothing pushed. The foreman's head passes within 5.0 mm of the far face as it lets go (4.230 s; within the rig's
  centimetre from 4.190 to 4.255, 14 samples), the director's within 10.4 (16.0 and 12.6 on f293da69:
  headwall-f11b-*.txt); the rig reads the foreman's head as contact to 4.255 s, so its drop's first four samples are
  judged against the contact limit (they read 1.8 N·m at the most, and from the release to 4.255 s 3.9, at 4.238: all
  under the airborne 10). The director's left arm goes 2.9 cm into its left thigh as its left leg comes over (3.543 s;
  1.4 before; its forearm 2.4 cm there, where its deepest before was 1.6, at 3.120 s), its overlapping pairs over 2 cm
  4 -> 6 (6 already through the key, var-fh4). The pigs' right toes at 4.12 s run a little faster (11.1 and 11.1 m/s
  against 10.9 and 10.6, already over the rig's 8). The foreman's hips coming off the top into the hang read
  -43.6 m/s^2 at 3.635 s against -63.2 (hipsacc-f11b.txt; the climb test reads 2.6 to 3.5 s only). The wall's
  collisions find no new span (the rig's own sampling, every 10 ms: coll-f11b-pigs.txt; span by span, review round 6's
  collspans-*.txt), but part by part (review round 7's collparts-*.txt and collseries-*.txt) four parts go deeper: the
  foreman's left forearm and hand as its left leg comes over, 4.9 -> 5.3 cm at 3.59 s; its right forearm and hand,
  4.3 -> 4.4 at 3.51 s and up to 9 mm deeper from 3.55 to 3.63 s; its trousers, 2.3 cm into the far face at 3.59 s,
  where they reached 1.2 at the most from 3.55 to 3.65 s on f293da69; and the director's trousers in the straddle,
  7.6 -> 7.9 at 3.17 and 3.18 s, now its deepest. The rest get shallower or stay: the foreman's trousers as its left
  leg swings over 6.6 -> 6.3, the director's 8.0 -> 7.8, the director's forearms 3.6 -> under 2 and 5.9 -> 5.7, and the
  boots on the far face (the foreman's right 4.8 -> 2.7, the director's left 3.4 -> under 2, its right 2.8 -> 2.6).
  FAR_CLEAR's 6 mm lies inside the rig's centimetre: the rig reads the director's shirt on the far face from 4.150 to
  4.220 s (4.140 to 4.185 on f293da69), with no readings there (review round 5's contact-parts-pigs-3.6-4.4.txt).
- New readings in the let-go and drop: of the 9 left, 8 are new (review round 5's cmp-readings-a1xsd-f11b.txt). The
  foreman's 5 come in the air from 4.306 to 4.310 s, up to 227% of the limit (22.7 N·m), in the last 5 ms before its
  palms reach the far face (the rig reads them on it from about 4.311 s), where f293da69's palms reached it at 4.276 s
  with the airborne torque 9.9 N·m at the most from 4.265 s, under the limit. The director's 3 come on contact from
  4.231 to 4.233 s, up to 111%, as its hands leave the top; its fourth, in the air at 4.236 s (110%), was among
  f293da69's.
- A regression, from old whips: the gate's required force while in contact now fails on both pigs, briefly. The foreman
  needs 7.6 times its weight for 3 ms at 3.633 s, as its left leg locks straight going down the far face (its reach
  96.6% at 3.630 s on both copies, the knee point 10.5 m/s against 9.3); the director 6.5 for 1 ms at 3.517, at its old
  left elbow whip as its left leg comes over (16.8 m/s against 17.0). On f293da69 they read 3.6 (at 3.522 s, elsewhere)
  and 4.8; the 5 ms samples alone read 3.9 and 3.1 now, under the rig's 5. The foreman's lock read so little on
  f293da69 because its body was falling as the knee locked: its top band's last held sample jumped (the target 1.44 cm
  lower at 3.660 s than at 3.655, as a torso point left the top's footprint) and the band's free run then dropped the
  body a further 7.7 cm by 3.715 s, its pelvis falling from 2.103 to 2.015 m from 3.60 to 3.70 s (0.3 to 0.8 times its
  weight). With the far keys pushed out, the fit pushes the trunk out less over the top (the hips 3.7 to 5.4 cm further
  back from 3.60 to 3.70 s: review round 4's pelvis-over-f10-f11b.txt, probe-pelvis-path.mjs), the band runs smoothly
  to its end and its free run rises; the hands hold the body level (2.099 to 2.106 m from 3.60 to 3.70 s), the
  motion needs 1.2 to 2.6 kN up from 3.595 to 3.655 s (within 0.5 kN from 3.615 on
  f293da69: contacts-foreman-a1xsd-fh5.txt), and the lock rides on that need. f293da69's code with only the band's end
  moved to 3.655 s reads 7.93 times its weight at 3.633 instead of 2.98 (exp-old-foreman-xbb3.655.txt against
  exp-old-foreman-xbb3.66.txt). The director's band was already smooth: its whip now peaks within one 1 ms instant
  (6.48 at 3.517 s, where it read 4.49 and 4.84 at 3.517 and 3.518), its pelvis 2.2 cm further back at 3.52 s. (These
  were measured on var-fh5, which plays all 33 crossings as var-f11fin does (same-f11fin-fh5.txt), whose pigs play as
  var-f11b's from 3.37 to 3.97 s: diffspans-f11fin-f11b-pigs.txt. var-f11b's own gate reads the same 7.6 and 6.5.)
  Raising the foreman's legs' 3.685 s keys by the far rise lets its force pass at 4.0 (gate-vx-foreman-xr076.txt), but
  that is a new design of its own; the director's needs its elbow whip mended. The next fix.

`tests/natural-traversal.test.mjs`:
- A pig hangs from the far grips within its arms' reach: over the last 50 ms before it lets go, each arm's shoulder
  lies within .97 of the arm's length, plus 1.5 cm (on these rigs the arm's whole length, 50.5 cm), of its grip. On
  f293da69 it fails on both pigs (7.4 and 5.7 cm past: t11-reach-f10fin.txt), now 1.15 and 0.52 (t11b-instr.txt). It
  guards the last 50 ms only (over 60 and 75 ms the foreman reads 1.47 and 2.05: reach-f11b.txt), and the pigs only
  (the dog's arms hang at their full length there, 2.2 to 2.6 cm past: gripgap-nonpigs-f11b.txt).
- turnAir's rule on its own, a unit test (traversal-balance.js now exports turnAir): a take-off, and a touch longer
  than the lead between two flights, are held from the lead; a let-go's run on a grip, a run on the feet no longer
  than the lead (counting the feet alone, not a grip or a held seat before them; a touch that short between two
  flights among them, up to exactly the lead's five samples), a run on a held seat and a landing are left. It kills
  every mutant of turnAir that reviews 5 to 7 wrote but one, flooring LEAD/dt for rounding it, the same five samples
  (turnair-mutants-r7.txt, turnair-mutants-r7b.txt, turnair-mutants-r8.txt). It reaches the short run's branch, which
  none of the 33 crossings does (the only runs on the feet before a flight are the eleven take-offs, 172 to 176
  samples: shortrun-f11b.txt).
- The drop check's comment gives the pigs' drop flights, 51 N·m (the foreman) and 11 (the director), at 4.327 and 4.325
  s as their palms land on the far face, against 58 and 148 on f293da69, at 4.259 and 4.213 s, earlier in their drops;
  the nine other climbs' figures there are 3.5 to 5.9, as on f293da69 (t11b-instr.txt).
- Two margins narrow, with the far hang: the pig foreman's trouser fold lies 3.4 cm in at 3.34 s (3.3 on f293da69),
  1 mm under the 3.5 cm the user allowed, and its left knee locks at 10.2 m/s in the climb test (9.1 on f293da69, where
  the band's drop hid it), 0.8 under that test's 11 (testmeasures-f11b.txt). The figures the fix moved in unchanged
  comments are brought up to date, each with its figure on f293da69 (testmeasures-f10fin.txt): the pigs' wrists over
  the top now 0.1 to 1.4 cm above their grip's height (2.5 above to 3.8 below), their hands within 6.5 and 3.0 mm of
  the wall as they lower (7.2 and 4.3), the director's left knee 8.8 m/s (8.9), their hips' accelerations over the top
  -15.5 to +24.5 m/s^2 (-14.4 to +24.5), the fit's push and the reach; and in the code, the wider slide's cost
  (wall-climb.js: the foreman's hand in its head, and the director's turn as it lets go, 8.1 N·m at the most now, at
  4.236 s, where it was 373 at 4.206 s on f293da69) and the seat's figures (traversal-balance.js: the pigs' plans ride
  -g at 16 and 9 of their held samples, 26 and 9 on f293da69: review round 4's seat-g-*.txt; the gate reads no phantom
  wrench there, its required force over its limit at the two old whips).
- Units: the rate of change of the body's angular momentum is a torque, in N·m (the rig's airborne limit is 10 N·m);
  the tests' messages and comments and the code's comments now say so where they wrote N·m/s. The earlier parts of
  this doc are left as written: read their N·m/s as N·m.

**Not kept.**
- The let-go lead: turnAir holding a let-go's flight from LEAD before the hands leave, as a take-off's before the hooves
  leave (var-f11fin, review round 3's control var-f11nolead). Before the arc it took the raised hang's let-go and drop
  from 41 and 23 readings to 15 and 10 (var-fh4 against var-fh4d). With the arc it reads the foreman's let-go and drop
  the same (5 readings) and the director's 5 against 4, its worst 385% in the air at 4.239 s against 111% on contact at
  4.231 (the turn easing in as the rig sees no hand). On the nine other climbs it changes no reading, while it turns
  their bodies up to 1.8 cm off their paths before the let-go, puts five right toes past the rig's 8 m/s at 4.12 s
  (8.03 to 8.12 m/s: the horse, goat, cow, donkey and dog) and holds the horse's head within the rig's centimetre of the
  far face from 4.240 to 4.460 s, so that none of its drop reads as airborne. Its one gain is the pig foreman's flight
  over the top, after a run on a grip (from 2.335 s): 13 readings against 20, but its worst 603% at 2.490 s against 323%
  at 2.364 (and the foreman's palm snap at 2.2175 s, 0.06 m/s, goes). Together 182 readings against 188, 0.190 s over
  the limit at the samples either way. Review round 3 found it (scratchpad\review-fix11-r3\).
- The hang raised and the let-go moved earlier by the longer fall, so that the drop touched down where and when it did:
  the falling body stretched the still-holding arms and the palms snapped onto the far face (the foreman 10160% at
  4.265 s; var-fh2). With the hands' release and slide keys moved with the let-go, the snap came in the let-go (5398%
  at 4.125 s; var-fh3). Both ran on d54c607d's code with the far hang.

**Left.** The pigs' required force at their old whips (above); their drop's landing on the far face (the foreman's 51
N·m there, and its 5 new readings just before its palms reach the face); the director's left arm in its left thigh as
its left leg comes over (2.9 cm, its forearm 2.4, at 3.543 s); the fit's push over the far face before the far keys
(the far hang moves the keys from 4.105 s only, and from 3.70 to 3.90 s the fit still pushes both pigs' trunks out
12.9 to 15.4 cm, 17.9 to 21.3 on f293da69: fitpush-f10-f11b.txt); the drop read honestly (palms on the face holding
nothing); the flights' small torques after the release; and the rest of the list as it stood.

### 2026-11-20 (physics balance, thirty-third part): the pigs' legs hang down the far face from their reach

Since ba891c83 the gate's required force while in contact has failed on both pigs at two old whips (the thirty-second
part). The pig foreman's: 7.6 times its weight for 3 ms at 3.633 s, as its left leg locked straight going down the far
face (the climb test's knee 10.2 m/s at 3.632, the rig's knee point 10.5 at 3.631). On f293da69 the band's drop hid it.

Why: the legs' keys hanging down the far face as the body leaves the top (DOWN_FAR, 3.685 s) rode the search's height
over the top (deepDy, between the trunk keys either side: the foreman's 7.7 cm up, the director's 0.8). From the keyed
trunk's hip there the foreman's keys still lay at 104.1 and 104.2% of the leg's length, thigh and shin (116.9 and
117.1 as authored): out of reach. Its left leg went straight from about 3.645 s on f293da69 and ba891c83 alike (on the
game's model f293da69 reads 99.9% of the leg at 3.645 s and 100.0 at 3.650: review round 1's legover-rig files).

**The fix**, wall-climb.js: the keys no longer ride the search's height. They rise as far as each leg needs to reach
its key at .97 of its length from the keyed trunk's hip there (trunkAt with no band, fit or balance), as the gripping
keys rise for the arms. The foreman's go to 1.478 and 1.479 m, 4.2 and 4.3 cm above the ride; the director's lie at
90.2 and 90.3% and stay as authored, 7.5 mm below the ride (an instrumented copy's log, var-f12bl).

phantom-wrench 1.2.0 `--gate` on frozen copies (ba891c83 = var-f11b; this commit's tree = var-f12b; the other 31
crossings play as on ba891c83, frame for frame: same-f12b-f11b.txt):
- The foreman's required force passes. Its peak is now its left elbow's whip, 3.9 times its weight at 3.523 s, where
  it read 3.1 (the 5 ms samples alone 3.4 at 3.640). The lock moves later and eases: 3.8 at 3.646 s, where it read 2.6,
  against the 7.6 at 3.633, its largest rise at 3.637 s (1.26 -> 3.01) (forceprofile-f11b-f12b-foreman.txt, on the
  gate's 1 ms grid). Its readings over the gate's limits are as they were (42, 0.040 s over the limit at the
  samples, the worst 603% at 1.177 s).
- The rig's knee point reads 7.3 m/s at 3.644 s against 10.5, and the foreman's points over 8 m/s 5 against 7 (the
  left knee and the left ankle, 8.05 at 3.583, go under; the left elbow 15.2 -> 15.0, the left palm 8.17 -> 8.11).
- The director's left arm no longer goes into its left thigh as its left leg comes over (2.9 cm, the forearm 2.4, at
  3.543 s on ba891c83; under 1 cm now), its overlapping pairs over 2 cm 6 -> 4. Its required force's peak is as before
  (6.5 times its weight for 1 ms at 3.517, its left elbow's whip; 6.48 -> 6.45 on the 1 ms grid:
  forceprofile-f11b-f12b-director.txt), and so are its readings (34, 0.030 s). It pays a little: its required force
  rises at instants under the limit (2.10 times its weight at 3.589 s against 1.75, the largest rise, from 3.571 to
  3.616 s: review round 2's forceprofile-f11b-f12b-director-tol01.txt), its hips dip to -27.0 m/s^2 at 3.790 s by
  the climb test's measure (-21.3 there before, its least then -27.0 at 3.747: review round 2's
  hipsacc-series-f11b-f12b-director.txt), its plan's sideways acceleration over the held samples reads 16.08 m/s^2 at
  3.595 s against 15.04 (seatplan-f12b.txt, against review round 1's seatplan-f11b.txt), its left elbow 16.8 -> 16.9
  m/s and its left ankle 8.41 -> 8.51 (its left toe and palm, also over 8, by 0.003 m/s: review round 2's
  jsoncmp-f11b-f12b-pigs.txt).
- Without any raise (the authored keys: var-f12nr) the foreman needs 11.9 times its weight at 3.617 s, its knee point
  at 14.4 m/s; the rule costs it no reading (42 either way) and not its hand check (6.5 mm either way: review round 2's
  gate-var-f12nr-pig-foreman.txt and testmeasures-f12nr-foreman.txt).

As played the foreman's keys still lie past the leg's reach (105.3 and 105.9% from the played hips, against 112.4 and
113.3 on ba891c83, the same model: review rounds 1 and 2): the clearance fit pushes the trunk 11.9 cm further out than
keyed and, with the band (which lowers it 6.6 cm there), 4.0 cm higher. Both legs still hang straight down the far
face, their knees bent under 5 degrees from 3.660 and 3.647 s to 4.150 and 4.112 (from 3.641 and 3.609 on ba891c83, to
the same: review round 3's rigpose-f11b-foreman-to430.txt and rigpose-f12b-foreman-to430.txt): the lock comes later
and slower, not out.

What else moves (by over 0.1 mm): the foreman from 3.431 to 4.290 s by up to 7.0 cm (at 3.637), and by 0.2 mm or less
from 3.330 to 3.397 and from 4.325 to 4.409 (diffspans-f11b-f12-foreman.txt; var-f12 and var-f12b play the foreman
alike to 0.00 mm: review round 2's diffspans-f12-f12b-foreman.txt); the director from 3.266 to 4.619 s by up to 4.6 cm
(at 3.576: diffspans-f11b-f12b-director.txt).
- The foreman's head passes within 4.9 mm of the far face as it lets go (4.230 s), against 5.0; the director's 10.5,
  against 10.4 (review round 4's headwall-f11b-f12b-*.txt).
- The foreman's hips, by the climb test's measure: -20.6 m/s^2 at 3.646 s, where they read +8.5 (the lock's moment);
  their least from 3.5 to 4.0 s -30.0 at 3.749 (hipsacc-f12.txt), where ba891c83 read -30.8 (its least there -43.6 at
  3.635: review round 1's hipsacc-series files); over the top -15.6 to +24.5 against -15.5 to +24.5
  (testmeasures-f12b.txt, testmeasures-f11b.txt).
- The foreman's trouser fold lies 3.41 cm in at 3.34 s against 3.40, 0.9 mm under the 3.5 cm the user allowed.
- Collisions part by part (fix 11's review round 7's collparts.mjs: collparts-f12-foreman.txt and
  collparts-f12b-director.txt, against that round's collparts-f11b-pig-foreman.txt and this fix's review round 2's
  collparts-var-f11b-director.txt): the foreman's move by 2.2 mm or less (the left forearm and hand 5.3 -> 5.1 cm, its
  deepest point now on the top's upper face; the right boot on the far face 2.7 -> 2.9; the trousers at 3.59 s 2.3 ->
  2.4, on the top's upper face), the director's by 1.1 mm or less (its trousers as its left leg swings over 7.82 ->
  7.86 cm, its right boot 2.61 -> 2.50). The rig's own count of spans deeper than 2 cm is 5 and 4 as before, the
  deepest 6.3 and 7.9 cm (part by part the foreman's 8 -> 7, its left forearm's 2.1 cm at 3.52 s gone).
- The foreman's left boot comes within the rig's centimetre of the far face from 3.835 to 3.870 s (no reading there),
  and its right boot is off it at 3.965 and 4.050 s (review round 2's readings-boots-f11b-f12b.txt); its right toe's
  peak 11.107 -> 11.115 m/s.
- The pigs' plans over the top ride -g at 13 and 9 of their held samples, against 16 and 9 (seatplan-f12b.txt).

`tests/natural-traversal.test.mjs`: the climb test's knee check splits at 3.5 s. As the left knee comes up behind
(3.1 to 3.5 s) the knees are held at 11 m/s as before, a sentinel no copy measured fails (the director's 8.8 at 3.180
the fastest, 8.9 on f293da69, 8.05 on 4e9853f6; every other mammal 6.1 to 7.5). Going down the far side (3.5 to 3.7 s)
they are held at the rig's 8, which fails on ba891c83 (the foreman 10.2 at 3.632) and with the foreman's authored keys
alone (13.8 at 3.618: var-f12nr); the same measure reads 9.1 on f293da69 (review round 2's kneewin-f10fin-pigs.txt;
the test itself cannot load f293da69, which has no turnAir export); every other mammal reads 6.2 to 7.2 there
(kneelock2-f11b.txt, kneelock2-f12b-pigs.txt, kneelock2-f12nr-foreman.txt). No test guards the director's left arm
out of its left thigh; the gate's capsule check reads it.

**Not kept.**
- The ride kept and the reach added on top of it (var-f12, review round 1): the foreman the same, the director's left
  arm 2.9 cm into its left thigh as on ba891c83. Once the reach sets the foreman's keys the ride does nothing there
  (review round 1's x-noride: its climb the same to 0.00 mm), and it lifted the director's 7.5 mm.
- The keys risen by the far hang's own rise on top of the ride (fix 11's review round 1's experiment, the foreman's
  7.6 cm and the director's 6.6, on var-g12x): the foreman passes the same way (4.0 times its weight), but the
  director's left arm goes 6.3 cm into its left thigh at 3.561 s, its overlapping pairs over 2 cm 6 -> 8, and its own
  failure, the elbow, stays (6.6).

**Left.** The reach read from the played trunk (the fit's push and lift, the band's lowering, a second pass), which
would likely take out what is left of the lock and let the legs bend as they hang; the pig director's left elbow
whip (6.5 times its weight for 1 ms at 3.517 s; its left hand crosses to the far grip through a stopping key at
3.545 s): the next fix. The rest as the thirty-second part leaves it.

### 2026-11-20 (physics balance, thirty-fourth part): the pigs' left hand lets go before its arm runs out

Since ba891c83 the gate's required force while in contact has failed on the pig director at its left elbow's whip: 6.5
times its weight for 1 ms at 3.517 s (the thirty-second and thirty-third parts), as its left hand let go of the near
edge to cross to the far grip. The rig's elbow point read 16.9 m/s at 3.516 s, and the pig foreman's 15.0 at 3.522 (its
force there 3.9 times its weight, under the limit).

Why: the thirty-third part put it down to the crossing's stopping key (3.545 s); it is not that. The left hand held its
near grip, 18 cm along the edge from the wall's middle, until 3.485 s, and the arm could not reach it. Seated over the
top the pigs' shoulders are wider than the wall: as they straddle it and bring the left knee up behind, the left
shoulder hangs out past the near face (22.3 cm on the director at 3.27 s, 44.6 cm above the grips' height; 25.1 and 46.6
cm on the foreman at 3.34: topreach-f12b.txt). As played the grip lies past the arm's whole length from 2.92 s to the
let-go on the director, but for 3.005 to 3.070, where it comes just within it, and from 3.065 on the foreman (109 and
110% of the arm at 3.48: grip-f13d.txt; the horse's arm reaches it throughout, 99.5% at the most at 3.055 s:
grip-f13d-horse.txt). The director's nearest point of the edge stays within its arm (98.8% at the most), but no point of
the top lies within the foreman's from 3.14 to 3.43 s (104.8% at the most: topreach-f12b.txt). The deep search over the
top weighs the hands' reach to their marks, but with the seat resting it does not bring the shoulder in: at 3.305 s it
could take the director's no nearer the grip than 2.3 cm past .97 of the arm (the foreman's 0.4), its pitch turned 30
degrees, and it keeps their pitch within 2 degrees of the authored one, 8.4 and 5.9 cm past (search-f13d.txt).

So the arm went straight from about 2.95 s (3.0 on the foreman: elbow-f12b-pigs-lock.txt), and the hand was dragged off
its grip, 7.5 cm (7.0) by 3.48 s (grip-f13d.txt), now into the top, now over it (below). As the hand let go its target
swept in toward the crossing's waypoint: unlocking, the director's elbow bent 1 degree at 3.507 s and 45 at 3.520, the
arm's stretch falling from 100% to 75% by 3.540 (elbow-f12b-director.txt). Near full reach the soft IK moves the elbow
up to twice as fast as the target comes in toward the shoulder (traversal-pose.js, limb), and here the wrist came in at
up to 7.4 m/s (2.5 ms chords, the same file).

**The fix**, wall-climb.js: a deep body's left hand lets go at LET_GO, 2.895 s, its arm then at 98.5% of its length from
the grip on the director and 95.0% on the foreman (grip-f13d-5ms.txt). The palm lifts off over 120 ms (an arc of 3 cm)
into a pose the chest carries, .6 of the arm out from the shoulder toward the crossing's waypoint where the keyed trunk
at 3.545 s leaves it, holds there to 3.485, and crosses from there as before (the waypoint at 3.545, the far grip at
3.605). The left arm stays bent through the let-go and the hold (98.3% of its length at the most, the director's at
2.902 s; the foreman's 94.0 at 2.900), its elbow at 3.8 and 3.2 m/s at the most there (2.926 and 2.928 s) and 5.0 and
4.6 in the crossing (3.572 and 3.586: the rig's elbow point over 2 ms chords, stretch-f13fin-2ms.txt). As the hand comes
to the far grip the foreman's stretches without a break from 3.556 s (85.6%) and goes straight there as on c44413ef
(99.0% at 3.588, 99.5% or more from 3.590 to 3.674: stretch-f13fin-2ms.txt; review round 1's farstretch-x-tree.txt and
-x-head.txt).

phantom-wrench 1.2.0 `--gate` on frozen copies (c44413ef = var-f12b; this commit's tree = var-f13fin, its pigs as
var-f13e's line for line; every other crossing plays as on c44413ef, frame for frame: same-f13fin-f12b.txt, all 33):
- The director's required force passes: its peak is now 3.6 times its weight at 3.040 s, where it read 3.0, against the
  6.5 at 3.517 (0.7 there now: forceprofile-f12b-f13fin-director.txt). The foreman's peak 3.9 at 3.523 (its elbow) ->
  3.7 at 3.646 (its lock going down the far face).
- No left elbow goes over the rig's 8 m/s: both now peak at the push-off (6.59 and 6.64 m/s at 0.78 s; 16.92 and 14.96
  at 3.516 and 3.522 before). The director's points over 8 m/s 6 -> 4 (its left palm, 8.05 -> 7.66, goes under too), the
  foreman's 5 -> 4 (its left palm still reads 8.0 m/s in the crossing, at 3.574 s, against 8.1 before; its peak, 8.10,
  is at the push-off and keeps it among the four).
- Readings over the gate's limits: the director's 34 as before, the foreman's 42 -> 43. The foreman's new one: a span
  that begins, during its right knee up, as its left hand's contact with the top ends, starts a millisecond earlier (at
  2.355 s that hand touches the top at one point where it touched at two, reading 30.6 N where it read 0; 2.356 reads
  137.9 N where it read 31.6; 2.357 139.0 before, 139.1 after: the gates' rows), and from 2.360 to 2.495 s neither of
  the foreman's hands is on the wall, before and after (review round 1's handruns-f12b-xtree.txt): the grip's 1 cm drift
  across the top (.45 to .46 m) now runs to the let-go, not 3.485 s, and moves the pigs from 1.66 s, by 5.3 mm at the
  most before the let-go (the left elbow: diffwindow-f12b-f13fin-before-letgo.txt). Over the top (2.55 to 3.68 s)
  neither pig reads anything over the limits.
- The director's capsule pairs overlapping over 1 cm 9 -> 8: its left forearm 1.5 cm into its left thigh at 3.120 s
  goes; the rest move by 0.6 mm or less. The foreman's are as they were. Read at every vertex, the left forearm comes
  within a few millimetres of the left thigh before and after, at different moments: on this tree in the hold, the
  director's 1.4 mm at 3.320 s and the foreman's 2.4 at 3.490, where c44413ef's were 11.4 and 12.7 cm off; on c44413ef
  in the grip, the foreman's 1.2 mm at 2.950 s and the director's 2.0 at 2.965. The vertex readings are review round 3's
  nearpair-x3tree.txt and -x3head.txt and handhead-x3tree-s1-full.txt and -x3head-s1-full.txt. By the rig's capsule
  check (which leaves a hand or forearm against the lower trunk out), on this tree no capsule of the left arm overlaps
  another from 2.85 to 3.65 s (review round 2's caps-x2tree-director.txt and -foreman.txt), where on c44413ef the
  director's left forearm went 1.5 cm into its left thigh at 3.120 s, in the grip (above). By this fix's own trunk
  capsule (pelvis to chest, .14 m, which the rig does not count against a hand), the left hand as it crosses comes 3.0
  cm into it on the foreman (2.5 before) and 2.8 on the director (2.7), near 3.53 s (free13-candidates.txt f895,
  free13-f12b.txt). From 2.88 s to the old let-go (3.485), the dragged hand's mesh on c44413ef went more than 1 cm into
  the top at times, the director's at 2.990 to 3.125 and 3.420 to 3.480 s (2.3 cm at 3.040), the foreman's at 2.960 to
  3.080 (1.7 at 3.030), and from 3.150 to 3.485 the foreman's rode up to 1.2 cm over the top; on this tree the left hand
  is 1.5 mm into the top at the most from 2.88 s to the crossing (review round 2's handgap-x2head-2.88-3.62.txt and
  -x2tree-). At the catch and through the hang it still sinks about 1 cm into the top, as before (review round 4's
  handgap-x4tree-1.26-2.90.txt and -x4head-). The foreman's forearm across the far corner as it reaches the far grip,
  5.3 cm at 3.585, is as before.
- The seat: supportAt read a grip at all 227 held samples of each pig; it now reads the seat's outline at 15 and 20 of
  them (the foreman's at 2.915 to 2.925, 2.960 and 2.965 s and from 3.040 to 3.085, the director's from 2.920 to 2.965
  and from 3.040 to 3.085: the left hand let go and the right, in the balance's own pose, still off the top or crossing
  to the far grip; as played the foreman's right hand is on the top at 2.925, 2.960 and 2.965 s, by the gate's rows),
  which take the feet's bounds (seathull-f12b.txt, seathull-f13fin.txt). The plans ride -g at 13 and 10 held samples (13
  and 9 before) and push the body sideways there at up to 3.75 m/s^2 as before (seatr4b-f13fin.txt).
- The required force rises elsewhere, under the limit: the director's largest rise 3.00 -> 3.56 at 3.040 s (the right
  hand letting go with the left already off), the foreman's 1.53 -> 2.01 at 3.101 (forceprofile-f12b-f13fin-director.txt
  and -foreman.txt).

What moves (by over 0.1 mm): the pigs alone, the director from 1.656 to 3.806 s and the foreman from 1.682 to 3.960
(diffspans-f12b-f13fin.txt); by over 5 mm only the left arm (the elbow up to 26.6 and 27.8 cm, at 3.494 and 3.490 s,
where it is bent now and was straight), the centre of mass by 7.9 and 8.3 mm, and on the director its pelvis and hips by
up to 5.6 mm at 3.060 s, its left knee 5.1 there and its left shoulder 5.6 at 3.508 (diffpoints-f12b-f13fin.txt). By the
climb test's own measures (testmeasures-r3-f12b.txt and -f13fin.txt): the foreman's hips over the top -15.6 to +24.5 ->
-15.4 to +23.7 m/s^2, its trouser fold 3.409 -> 3.412 cm in at 3.34 s (under the 3.5 the user allowed), its knee going
down the far side 7.13 -> 7.12 m/s; the director's left knee as it comes up behind 8.81 -> 8.78, its hips' most +17.2 ->
+16.8.

`tests/natural-traversal.test.mjs`: the climb test now holds the elbows to the rig's 8 m/s from 2.8 to 3.7 s, as the
left hand lets go and crosses to the far grip, by its own measure (the forearm bone over 2 ms chords, as the knees are
read). c44413ef fails it on both pigs (15.7 and 14.1 m/s at 3.518 and 3.524 s, the director's and the foreman's:
elbowtest-f12b.txt; the test itself on var-f12t: test-f12t-pigs.log); now the pigs' fastest there are their right elbows
(5.8 and 5.6 at 3.034) and every other mammal's its left, 7.55 to 7.67 at 3.514, as before, 4 to 6% under the limit
(elbowtest-f13fin.txt).

The thirty-third part's 4.6 cm for the director is its largest coordinate: as distances its left knee moves 6.4 cm
(3.588 s) and its ankle 5.8 (3.591), not the 7.5 mm its keys drop. The clearance fit, pushing that leg out of the top as
it comes over (up to 17.4 cm on ba891c83, 19.5 on c44413ef), pushes it further over and less high (at 3.575 s from 13.0
cm over and 11.1 up to 17.6 and 8.0: fitleg-f11b-f12b-director.txt, diffpoints-f11b-f12b-director.txt).

**Not kept.**
- Held at .85 of the arm, let go at 2.865 s (var-f13a): the director's left hand went 4.4 cm into its left thigh, the
  forearm 5.0, at 3.13 s as that knee came up, and the foreman sat on one point of its trousers for about 15 ms as the
  hand left (207 N and 142 N·m at 2.895 s: var-f13a's gates).
- Held out forward or to the side: the crossing from there whipped the elbow again, 8.5 to 15.3 m/s
  (free13-candidates.txt). Toward the waypoint mixed with forward or up (mixfwd, mixup, mixfu there): the crossing's
  elbow at 5.1 to 6.3 m/s, against the plain direction's 5.0 and 4.5 by that probe, and mixfwd's hand 2.4 cm into the
  director's left thigh. These were all tried at .85 of the arm (mixfu at .80), let go at 2.885 s, where the plain
  direction's own hand went 4.4 cm into that thigh (wp885 there). At the kept .6 and 2.895 (review round 5's
  free13-mix60.txt) the mix with up crosses at 5.1 and 5.3 m/s with the hand 2.2 and 2.6 cm into the trunk capsule and
  the mix with forward and up at 5.6 and 6.1 with 1.8 and 2.5, neither in a thigh, against the plain direction's 5.0 and
  4.5 with 2.8 and 3.0: about half a centimetre less hand in the trunk for a faster crossing, far under 8 m/s either
  way. The plain direction is kept; the mixes are not gated.
- Let go at 2.885 s (var-f13b): the foreman's hand, leaving the top between two samples, read 42.5 N·m for 1 ms at 2.907
  s; at 2.875 (var-f13g) up to 154.6 N·m, at the 2.895 s sample (the instants from 2.893 to 2.902 over the limit too).
  What sets the time is the foreman's seat: on this tree it touches the top at one point until 2.900 s, at three at
  2.905 and at five at 2.910, one of them on the near face. Let go at 2.875 or 2.865 the palm is off by 2.895 or 2.890,
  the seat on its one point; at 2.885 it leaves between 2.905 and 2.910, the seat on three, and still reads 42.5 N·m for
  1 ms at 2.907; let go at 2.895 it holds through 2.910, the seat then on five points, and is off by 2.915: a margin of
  5 ms at the most (the gates' contact rows on var-f13a, b, g and var-f13fin). Nothing in the suite guards that margin;
  the gate does.
- The search's near mark ended at the let-go (var-f13h): the director plays the same, but the foreman's straddle keys
  pitch otherwise and its body moves up to 20.6 cm at 3.26 s (diffspans-f13fin-f13h-marks.txt), and it fails the gate's
  required force again (6.0 times its weight for 1 ms at 3.243 s, its left knee at 9.0 m/s), its capsule pairs over 1 cm
  5 -> 8 (its left upper arm and forearm 3.9 and 3.4 cm into its left thigh at 3.566: review round 2's
  gate-x2-f13h-wall-pig-foreman.txt). The mark is kept to 3.485 s, its old let-go.
- Not tried (review round 1's suggestion): the grip slid to the nearest point of the edge and held until the right hand
  takes its far grip (3.12 s). The director's nearest edge point stays within its arm throughout and the foreman's until
  about 3.13 s (98.5% at 3.10: topreach-f12b.txt), and a hand would stay on the wall from 3.040 to 3.085, where the
  director's required force now peaks, at the cost of a palm sliding along the edge.

**Left.** The pigs' right arms hang straight from 2.40 s at the latest to the right hand's let-go at 3.0 (through its
step and its straddle grip: rightarm-f12b-pigs.txt), the hand never on its grip from its plant key (2.585 s) until 2.925
s on the foreman and 2.970 on the director, up to 10.3 cm over the wall (the foreman's at 2.585 s; the director's 8.8 at
2.770: handgap-f12b-2585.txt): the same grip out of reach, though its let-go does not whip (5.8 m/s). The next fix,
after which the let-go's margin on the foreman's seat wants the gate again (both pigs). The reach read from the played
trunk for the legs (the thirty-third part), and the rest as it leaves it.

### 2026-11-21 (physics balance, thirty-fifth part): the pigs' hands hold in front of their chests and go round their bellies

The thirty-fourth part left the pigs' right arms straight over the top, and its own left-hand hold lay inside the pigs'
clothes, which no check saw: this part's first review found it.

Why the right arm went straight. From the right hand's let-go of its first grip (2.345 s) its keys moved it through a
waypoint (2.465 s) and re-planted it on the top from 2.585 to 3.0 s, 4 cm in from the far edge and 10 cm along it from
the wall's middle, before it crossed to the far grip (a waypoint at 3.06, the grip at 3.12). Seated over the top the
pigs' right shoulders ride 45.7 to 57.4 cm above the grips' height on the director and 46.2 to 57.1 on the foreman
(every 5 ms from 2.585 to 3.0 s: rightarm-f13fin-2585-5ms.txt), more than the arm's 50.5 cm until 2.910 s on the
director and 2.885 on the foreman, so no point of the top lay within reach; as played the re-plant lay 103.9 to 121.8%
of the arm (shoulder to wrist) from the shoulder on the director and 103.0 to 125.2% on the foreman, where the horse's
arm reaches it at 91.7 to 99.7% (every 10 ms: grip-right-f14d-10ms.txt, var-f14d being 8da9a826 with read-only hooks).
The hand hung short of it, 8.7 and 10.3 cm off the wall at 2.585 s (handgap-f13fin-2585.txt), and the straight arm swung
into the body: by the rig's capsules (var-f13fin's gates) the foreman's right upper arm 5.4 cm into its lower trunk at
2.596 s, failing its capsule rule, and the director's 3.1 at 2.605, its right forearm 2.9 cm into its right thigh at
2.995.

Why holding in did not do. This part's first round held the right hand in to the body over 350 ms, .45 of the arm from
the shoulder toward the crossing's waypoint, as the thirty-fourth part held the left at .6. The rig's capsules read both
arms clear, but the rig gives every body one trunk, a .14 m capsule from pelvis to chest, and a pig's belly overruns it.
Read against the pigs' own clothes, the held hands lay inside them: by the generalized winding number of each vertex of
the hand and forearm against the shirt (its sleeves dropped) and the trousers and its distance to that garment's nearest
triangle, every 10 ms over the holds (the climb test's check, below), on 8da9a826 the pigs' right forearms lay 21.0 and
20.9 cm into their shirts (the director's at 2.695 s, the foreman's at 2.715), whole hands and forearms in from each
let-go to its far grip (up to 21.6 cm: forearm18-f13fin-exact-trace.txt), and on the first round the right hands 19.1
and 18.7 cm at 2.895 (test-f17t-pigs.log and test-f17u-pigs.log). Rendered, the held hands vanish into the chest
(video/f14/st-fore-280, the after panels; st-fore-330-v2 and st-dir-330-v2, the before panels). By the climb's own torso
points (below) both old holds lay 19.5 to 22.7 cm inside the torso (holdgeo15-f14d.txt), and so does the line from the
shoulder toward each waypoint, from 30 to 40% of the arm to 85 to 95% (holdline15-f14d.txt); the left waypoint itself, 6
cm above the top, lay in the director's belly.

**The fix**, wall-climb.js, one rule for a deep body's free hands, from each let-go to the far grip:
- Each hand holds in front of its chest, 30 degrees to its own side of straight ahead at the chest's height, 3 cm
  (MARGIN) out from the torso there. The torso is the climb's own surface probe, the points riding the hips or the spine
  (as the search over the top reads them), carried into the chest's frame by the keyed trunk; its radius along that line
  is its farthest point within 10 degrees of it (20 where 10 hold fewer than two), the largest every 50 ms over the
  hold.
- Through each hold the elbow bends out to its side and a little up (ELBOW, [0, .25, 1] in the chest frame, z to its own
  side). Bent the arm's own way (back, down and out), the elbows lay against the bellies' sides while the hands held:
  the forearms up to 3.1 cm into the clothes (the foreman's left, into its shirt) and the sleeves up to 10.5 (the
  director's right, into its waistcoat), by the winding number and the depth to the nearest triangle every 10 ms
  (forearm18-exact-c1.txt, its tree rows: probe-forearm17.mjs with EXACT on var-f17x, an experiment copy at its
  defaults, round 2's motion).
- The waypoints go. Each move from a grip to the hold, and from the hold to the far grip, arcs out by as much as its
  chord's middle lies within 7 cm (CLEAR) of the torso, along the line from the chest's origin through that middle, but
  never down. Every chord's middle lies below the chest, so each arc is pushed level, out to the side and back, 10.9 to
  17.4 cm (review round 2's arcs-r2.txt): each arc's size is how far the chord's middle falls short of CLEAR out from
  the torso, and it pushes level rather than out along that line, so CLEAR is not a clearance reached.
- The left hand lets go at 2.895 s (LET_GO, as before) and reaches its hold over 300 ms (LEFT_HOLD), holding it to 3.42
  (LEFT_END); the right lets go as before (2.345 s), reaches its hold over 350 ms (RIGHT_HOLD) and holds it to 2.90
  (RIGHT_END); then each goes straight on to its far grip (3.605 and 3.12 s). A missing key leaves the rule out rather
  than splicing elsewhere (guarded after round 2, the motion the same: diffspans-f15h-f16g.txt), and a hand whose hold
  finds no torso point keeps the keys it had before this rule, without arcs (the left would let go at 3.485 s again, out
  of reach, as before fix 13; until round 3 it fell back to the rest wrist, inside a deep body's belly, and until round
  4 its arcs still ran); neither happens for the pigs (the motion the same: diffspans-f17h-f18d-final.txt).
- The search over the top, which runs before this rule and does not see it, still weighs the right hand's old re-plant
  mark from 2.585 to 3.0 s (MARKS): without it, on the first round, the gate read 207 readings over its limits on the
  director against 34, its worst 692 N and 450 N·m at 2.543 s, its left knee at 12.2 m/s (review round 1's var-r1nom;
  the foreman's as they were). The comment now says so.

phantom-wrench 1.2.0 `--gate` on frozen copies (8da9a826 = var-f13fin, checked byte for byte; this commit's motion =
var-f17h's, gated; the tree since differs from it in comments, the test and a fallback that never fires for the pigs,
and var-f18d, the tree byte for byte, plays as var-f17h to 0.00 mm every 1 ms: diffspans-f17h-f18d-final.txt; every
crossing but the pigs' climbs plays as on 8da9a826, frame for frame: same-f17h-f13fin.txt, all 33):
- The director: required force 3.6 -> 3.3 times its weight (3.040 -> 3.037 s); capsule pairs over 1 cm 8 -> 3 and over 2
  cm 4 -> 1 (the three left as before: its left hand and forearm by its head at 1.167 and 1.337 s, its hooves at 5.185);
  readings over the limits 34, as before; its points over 8 m/s as before (its left knee coming up behind 8.8 m/s at
  3.179 s).
- The foreman: its capsule rule passes (pairs over 2 cm 3 -> 0, over 1 cm 5 -> 2, the two left as before); required
  force 3.7 at 3.646, as before; readings 43 -> 49, the six more where its boots alone hold it as its right knee comes
  up (from 2.36 to 2.50 s on both trees, 21 -> 27, in two clusters: from 2.356 to 2.368 s 13 readings peaking at 324% of
  the limit -> from 2.353 to 2.366 14 peaking at 195%, 143 N at 2.358; from 2.489 to 2.497 8 peaking at 239% -> from
  2.485 to 2.501 13 peaking at 273%, 200 N at 2.498, where 8da9a826 read 0 at 2.498 to 2.501). Its internal velocity
  snap at 2.2175 s (its right palm) reads 0.03 m/s, 0.06 before.
- Over the top (2.55 to 3.68 s) neither pig reads anything over the limits. The seat, alone from the left hand's
  lift-off until the right takes the far grip, reads nothing on the director from 2.90 to 3.10 s, and on the foreman
  19.8 N and 29.1 N·m at the most, at 2.966 to 2.968 s, between the 5 ms samples, which read nothing: 73% of the torque
  limit, where 8da9a826 read nothing there (the gates' rows and instants).
- The held elbows alone change little: against round 2's tree (var-f15h's gates) the same instants read over the limits
  on both pigs; over every instant the director's forces differ by 0.02 N at the most and the foreman's by 10.1 N and
  9.9 N·m (at 2.350 s, just after its right hand lets go, where round 2 read nothing; under the limits), its seat's
  moment 28.4 -> 29.1 N·m.

Measured on the tree's code (var-f17h):
- The clothes, by the winding number and the depth to the nearest triangle (probe-forearm17.mjs with EXACT: the vertices
  of the hand, the forearm and the forearm's sleeve, each against the shirt with its sleeves dropped and against the
  trousers, inside where the winding number passes .5, at the distance to that garment's nearest triangle). Through the
  holds, every 2 ms (forearm17-f17h-holds-exact-2ms.txt): no vertex of a hand or forearm goes over 0.3 cm in, two of the
  foreman's left elbow and two of its wrist through its left hold, and none of the director's goes in at all; the
  director's right sleeve lies 5.0 cm into its waistcoat by the elbow through its hold (up to 19 vertices), its left one
  vertex 1.1 to 1.2 cm from 3.20 to 3.31 s (forearm18-f17h-exact-trace.txt), and the foreman's right one vertex 0.1 cm
  into its trousers as the hand comes to the hold (2.70 s). Rendered, the director's right sleeve dips into the
  waistcoat's side at the elbow, a jagged seam, the arm reading as resting on the belly (video/f14/st-dir-280-elb, its
  zoom3.jpg). On round 2's motion the forearms lay up to 3.1 cm in and the sleeves up to 10.5 (above); on 8da9a826 the
  hands and forearms lay in from each let-go to its far grip, up to 21.6 cm (forearm18-f13fin-exact-trace.txt). Read to
  the garment's nearest vertex instead (forearm17-f17h-holds-vert-2ms.txt and this part's earlier figures), the depth
  misreads both ways: a vertex 0.04 cm in read 4.5, one 3.1 cm in read 3.7, and the director's right sleeve on round 2's
  motion 5.4 where it lay 10.5 (review round 3).
- Near the grips, at any depth by the nearest triangle every 10 ms (winspans18-f17h.txt, from
  forearm18-f17h-exact-trace.txt), the hands still sit inside the clothes for 0.09 to 0.15 s after each let-go and
  before each far grip (the foreman's left from its hold to its far grip, out only for about 4 ms at 3.50 s: 0.3 cm
  through the hold, 1.4 as it leaves it at 3.47 s, 6.6 at its grip) and the forearms for up to 0.27 s (the foreman's
  left from 3.17 s to its far grip, 0.3 cm through its hold), up to 18.0 cm in (the foreman's right at 3.11 s), and the
  sleeves up to 14.1 cm (the director's left, 2.90 to 3.17 s); the director's right sleeve stays in from its let-go to
  its far grip, up to 19.2 cm (3.09 s): the grips lie under the belly and the seat, which rest on the top, and the
  forearms are inside already as the hands let go. On 8da9a826 the hands and forearms lay in throughout
  (winspans18-f13fin.txt), though at some instants near the grips the tree's lie deeper (the hands and forearms by up to
  4.3 cm, the foreman's right forearm 12.5 -> 16.8 cm at 3.07 s, the left forearms 2.4 and 2.8 cm deeper at 2.93 to 2.96
  s; the sleeves by up to 4.8, the director's right 13.8 -> 18.6 at 3.07, the foreman's up to 3.2, its left 5.1 -> 8.3
  at 3.00; the peaks at the right grips 18.0 and 17.6 cm against 18.0 and 17.9: review round 5's
  deeper-f13fin-f17h.txt), and before its left let-go the foreman's left forearm and sleeve, still on the near grip, sit
  up to 1.1 and 1.2 cm deeper (the forearm 11.1 -> 12.2 cm at 2.53 s, the sleeve 2.3 -> 3.5 at 2.58; the director's arms
  move 0.3 cm at most outside the spans: review round 6's deeper-outside-f13fin-f18d.txt). The director's left sleeve,
  deeper from 2.92 s already (3.4 -> 12.4 cm at 2.97) and out of its clothes on 8da9a826 from 2.98 to 3.34 s, now stays
  in until 3.17 (up to 14.1 cm at 2.92 and 12.2 at 2.98; 3.1 at 3.16) and lies 1.1 to 1.2 cm in from 3.20 to 3.31 s: a
  regression (trace18-f13fin-pig-director.txt and trace18-f17h-pig-director.txt). By the chest ray (round 2's measure:
  the first crossing of the clothes from the chest point toward the palm) the palms read clear there but for 1.6 and 2.8
  cm grazes at 2.985 and 3.058 s (palmw-f17h-1ms.txt), where the hands lie up to 8.9 cm in by the triangle depth: that
  ray stops at an inner layer, so it cannot see the trousers' seat, and the climb test no longer uses it.
- The rig's capsules, every 2 ms from 2.3 to 3.7 s: no arm capsule goes over 0.5 cm into another, the pairs the rig
  leaves out (a hand or forearm against the lower trunk) included (hold15-tree-f17h.txt); from 2.4 to 3.0 s the pigs'
  right arms keep 7.3 and 9.8 cm clear of the trunk by these one-size capsules (armtrunk-f17h.txt). By the shirt itself
  the elbow joints now keep out of it through the holds, the foreman's 1.6 cm or more from any of its triangles (0.3 cm
  from its body on round 2's motion: review round 2's ptcheck-r2h-elbowR-hold.txt), the director's 5.0
  (ptcheck-f17h-elbows-hold.txt, round 2's probe at 2.75 to 2.85 and 3.25 to 3.35 s).
- Speeds over 2 ms chords from 2.3 to 3.7 s: the elbows, wrists and palms at 7.1 m/s at the most, the foreman's left
  palm at 3.510 s as it comes to the far grip (the director's 6.95); the left elbows swing back faster as the left hand
  crosses, on 8da9a826 -> this the foreman's 4.5 -> 6.3 m/s (3.586 -> 3.524 s) and the director's 5.0 -> 5.3
  (hold15-tree-f13fin.txt and -f17h.txt; 5.2 and 5.1 on round 2's motion, before the held elbows).
- The wall: after its let-go the left hand peels off the top, within the rig's centimetre of it until 2.965 s on the
  foreman and 2.980 on the director, the director's up to 4.6 mm into it at 2.945 (handgap-f17h-2.88-3.00.txt); the
  right leaves its grip clean (handwall-f17h-2.33-2.75.txt). The thirty-fourth part's let-go margin goes with it: the
  palm now stays on the top until the seat has spread (from 2.905 s). The foreman's left hand goes through the wall on
  its way to the far grip: held out over the near side (its chest faces back that way at 3.42 s), it crosses low, and
  its mesh enters the near face at 3.530 s and passes through the top to the grip, 4.9 cm deep at 3.540 and 7.7 at 3.560
  (lefttrack16-f17h.txt; as review round 2 found on its motion, lefttrack-r2h-foreman.txt, and saw in its render,
  stills/fore-a-g1-far.jpg). On 8da9a826 it came down onto the grip from above, through the waypoint (5.1 cm into the
  wall's box at the grip, 3.590: lefttrack16-f13fin.txt). The pigs' other hands reach their far grips over the far face
  or skimming the top, and sit 1.6 to 5.7 cm into the box at their grips, before and after (handwall-f17h-3.05-3.70.txt
  and handwall-f13fin-3.05-3.70.txt).
- The seat: supportAt reads its outline at 17 and 14 of each pig's 227 held samples (15 and 20 before), from 2.965 to
  3.045 s on the foreman and 2.985 to 3.050 on the director; the plans ride -g at 13 and 9 of the 227 (13 and 10) and
  push the body sideways there at up to 4.92 and 3.85 m/s^2, at 2.985 and 2.995 s, inside the outline's samples (3.75
  before, at 3.680 and 3.265, outside them: seathull-f17h.txt and -f13fin.txt).
- The required force (forceprofile-f13fin-f17h-director.txt and -foreman.txt): the director's largest rises 2.89 -> 3.30
  at 3.036 s and up to 0.38 more from 2.956 to 2.963 (0.68 -> 1.06 at 2.960); the foreman's 0.33 -> 0.82 at 2.333 and up
  to 0.45 more from 2.934 to 2.940 (2.49 -> 2.95 at 2.937).

What moves: the pigs alone, the director from 2.230 to 4.462 s and the foreman from 2.026 to 4.110 and from 4.218 to
4.368 by over 0.1 mm in any coordinate (diffspans-f13fin-f17h.txt), by over 0.5 mm only to 3.786 and 3.660 s
(diffspans-f13fin-f17h-tol.txt); the arms' points by up to 48.9 and 45.3 cm (the right palms); the director's other
points by 7.1 mm at the most and its centre of mass by 1.99 cm; the foreman's by up to 3.19 cm (its head at 2.560 s; its
shoulders, hips and knees 1.0 to 1.8 cm from 2.25 to 2.61 s, around its right knee up) and its centre of mass by 1.91
(diffpoints-f13fin-f17h.txt). The held elbows alone move the elbows by up to 7.2 cm and the palms by 2.5, the foreman's
head by 5.8 mm and its right wrist by 5.6, and nothing else over 4.3 mm (diffpoints-f15h-f17h.txt; until 3.814 and 3.678
s: diffspans-f15h-f17h.txt). By the climb test's own measures (testmeasures-r3-f13fin.txt and -f17h.txt,
elbowtest-f13fin.txt and -f17h.txt): the foreman's hips over the top -15.4 to +23.7 -> -15.2 to +24.3 m/s^2, its trouser
fold 3.412 -> 3.424 cm into the wall at 3.34 s (under the 3.5 the user allowed), its right knee over the top 4.1 -> 4.0
m/s, the director's hips -12.2 to +16.8 -> -12.2 to +18.6, its left knee coming up behind 8.78 -> 8.76 m/s, its right
knee over the top 5.253 -> 5.243 (the test comment's 5.3 now 5.2); the pigs' fastest elbows as the left hand crosses are
now their left, 5.3 and 6.3 m/s at 3.528 and 3.524 s (their right, 5.8 and 5.6 at 3.034, on 8da9a826).

`tests/natural-traversal.test.mjs`: the climb test holds a deep body's held hands and forearms out of its clothes: over
each hold, read every 10 ms, no vertex of the hand or forearm (the "forearm and hand" mesh's points carried by the hand,
fingers or forearm) more than 1 cm into the shirt (its sleeves dropped) or the trousers, inside by the winding number
against that garment, at the distance to its nearest triangle. Now the deepest are 0.3 cm (the foreman's left elbow and
wrist). It fails on 8da9a826, with the capsule check (below) switched off, since that fails there first: the pigs' right
forearms 21.0 and 20.9 cm into their shirts (the director's at 2.695 s, the foreman's at 2.715: test-f17t-pigs.log); on
the first round, the right hands 19.1 and 18.7 at 2.895 (test-f17u-pigs.log); on round 2's motion, the hands held as now
but each arm bent its own way, the foreman's left forearm 3.1 into its shirt at 3.415 (test-f17g-pigs.log); the tree
passes (test-f17h-tree.log, the pigs, the horse and the donkey). Its first version read the depth to the garment's
nearest vertex, 4 cm at most, which review round 3 found misread (above). The sleeves are cloth over the forearm, not
read (the director's right, above); nor are the moves to and from the grips (above). A version before it checked the
palm by the chest ray from each let-go to the far grip, 4 cm at most; written with 1 cm it failed round 2's tree on the
director's left graze (test-f15h-tree.log), and review round 2 found the ray blind to the trousers' seat, so the winding
number replaced it. It also holds the right arm out of the trunk over the top by the rig's capsules (2.4 to 3.0 s, every
2 ms): a deep body clear of it, every other mammal 4.5 cm into it at most (a sentinel: they read 3.0 to 3.9 cm, the
right upper arm in the lower trunk at 2.656 to 2.688 s as the hand re-grips the top: armtrunk-f17h.txt); 8da9a826 fails
it on both pigs, 5.4 cm at 2.596 s on the foreman and 3.1 at 2.604 on the director (test-f13t-pigs.log). The full suite
passes (2575 tests).

**Not kept** (each read by probe-hold15.mjs or probe-forearm17.mjs, var-f15x, var-f16x and var-f17x taking the rule's
numbers as globals; gated on frozen copies where named):
- Held .45 of the arm toward the waypoint (the first round, var-f14fin) and .6 for the left (8da9a826): inside the
  clothes (above).
- Pushed out from those holds to the torso's surface, or put on the belly's nearest point to the waypoint within 85% of
  the arm: the hands lay in the thighs as the knees came up, up to 7.7 and 12.0 cm by the rig's capsules
  (hold15-push-shell.txt).
- In front of the chest with straight moves and the waypoints kept: the palms cut up to 14.2 cm into the belly on the
  way down to the waypoint, by the chest ray (hold15-trace-union.txt).
- Arcs that could point down: near the top they drove the left hand into the wall after its let-go, 2.0 and 3.6 cm on
  the director and the foreman (handgap-f15fin-2.88-3.00.txt; var-f15fin's gates).
- The left hold reached in 120 ms: the director's left palm at 8.7 m/s (hold15-arcup.txt, up0); in 200 ms the foreman's
  seat, alone as the hand lifted clear, read 41.5 N·m at 2.965 s, 104% of the limit (var-f15fin2's gate; var-f15f, the
  right hand held to 2.95 instead, the same).
- The left held to 3.45 (with the 120 ms let-go and arcs that could point down): the foreman's left palm at 8.4 m/s at
  3.514 s (var-f15a's gate); to 3.40, the director's left forearm 2.1 cm into its left thigh by the rig's capsules at
  3.556 (hold15-nw4h.txt).
- CLEAR at 5, 6 and 9 cm, with the held elbows, by the triangle depth at any depth every 10 ms (forearm19-clear-a.txt
  and -b.txt, split by split-trace19.mjs and summed by winspans18.mjs; 7 is the tree): at 5 and 6 the right hands dipped
  up to 1.1 and 0.7 cm into the trousers on their way to the hold, from 2.46 s (0.3 at 7, none at 9; every 2 ms, review
  round 5's righthand-c5679-2ms.txt); at 9 the hands also came out of the clothes about 10 ms sooner at some grips and
  the foreman's left rose 0.9 cm into its shirt as it left its hold (1.4 at 7), but the fastest palm moved at 7.14 m/s
  (7.07 at 7), and, gated (var-f19c9), 9 reads over the limits at the same instants as 7, the foreman's seat at 29.8 N·m
  against 29.1 and its worst wrench 201 N against 200. The foreman's left hand is out of its clothes between its hold
  and its far grip for about 4 ms at 7, none at 5 and 6, and about 30 ms at 9 (from 3.482 to 3.510 s: review round 5's
  lefthand-foreman-c5679-2ms.txt). So 9 reads better on every clothes figure here, by 0.5 cm and tens of milliseconds at
  most, and gates about even; 7 stays. On round 2's design the chest ray had read the director's left palm 1.3 and 0.7
  cm in at 2.990 s at 5 and 6 and none at 7, every 10 ms; at 2 ms it reads 1.6 at 7, as on the tree (hold15-f15e.txt,
  hold15-f15gh.txt, palmskin-f15h-2ms.txt).
- Waypoints right above the far grips: the hands through the belly (up to 17.9 cm by the chest ray) and the thighs, at
  up to 12.8 m/s (hold15-pregrip.txt).
- The right hand's hold reached in 450 ms instead of 350 (var-f15c's gate, against var-f15b's, the tree it was tried
  on): the foreman's knee-up readings 28 against 29 (this tree's 27).
- Other elbows and holds through the holds, every 10 ms by the triangle depth (forearm18-exact-c1.txt and -c2.txt; by
  the vertex depth, forearm17-c1.txt to -c4.txt): bent straight out, the foreman's forearms stayed 1.1 and 1.2 cm in;
  out and further up (half as much up as out, or as much, or back as well), the director's left sleeve went 2.8 to 3.3
  cm in and the foreman's left elbow crossed at 6.9 to 7.8 m/s; held 6 cm out (MARGIN), the forearms stayed up to 2.4 cm
  in and the director's right sleeve 10.1; holds tilted 10 or 15 degrees up put the hands back into the clothes (up to
  2.3 cm), and 35 or 40 degrees to the side the foreman's right (1.5 to 2.3 cm), though they cleared the director's
  right sleeve.
- For the foreman's left crossing through the wall (lefttrack16-*.txt): arcs to the far grips tilted up by 30 and 45
  degrees still went in (from 3.540 and 3.550 s); straight up cleared the near face, the hand coming down onto its grip
  through the top (from 3.550 s, 5.0 cm at the most, as deep as a hand sits at a far grip: lefttrack16-upx1.txt), but
  the other hands rose into their bellies, the director's right palm 16.0 cm and left 13.3, the foreman's right 7.7, by
  the chest ray (hold15-f16-upx1.txt); holds tilted up 15 and 25 degrees still crossed low; a lift planned from the
  keyed trunk never fired, the keyed trunk carrying that hand 10 cm higher than it plays (2.106 m against 2.004 at 3.55
  s); world waypoints over the near half or at the near edge stalled both hands short of them (the director's backing
  off 4 cm) and then dropped them through the top; arcs never pointing away from the wall let the foreman's hand in
  earlier, from 3.520.

**Left.**
- The far grips (and the near ones) lie under the pigs' belly and seat, which rest on the top: the hands sit inside the
  clothes for 0.09 to 0.15 s at each and the forearms up to 0.27, and the foreman's left hand reaches its far grip
  through the wall (3.530 to 3.560 s). Grips set out from under the belly would end both; they reshape the far hang,
  which the thirty-second and thirty-third parts tuned.
- The director's sleeves: its right in its clothes from its let-go to its far grip, 5.0 cm into its waistcoat by the
  elbow through its hold (2.695 to 2.90 s), visible as a seam; its left deeper from 2.92 s, in until 3.17 and 1.1 to 1.2
  cm from 3.20 to 3.31, where 8da9a826 had it out from 2.98 to 3.34 s.
- The foreman's boots-only moment as its right knee comes up (from 2.36 to 2.50 s, both hands off the top): 27 of its 49
  readings, its worst 273% of the limit at 2.498 s.
- The foreman's seat moment at 2.966 to 2.968 s (29.1 N·m, under the limit, above); its right arm straight at its far
  grip from 3.075 to 3.740 s, 99.5% of its length or more (from 3.100 on 8da9a826: rightarm-f17h-far-5ms.txt and
  rightarm-f13fin-far-5ms.txt).

### 2026-11-21 (physics balance, thirty-sixth part): the pig foreman keeps its left hand on the top as its right knee comes up

The thirty-fifth part left the pig foreman 27 of its 49 readings over the gate's limits in one stretch, from 2.353 to
2.501 s, as its right knee came up: its two clusters there peaked at 195% and 273% of the limit (200 N at 2.498 s), and
the gate's contacts read its boots alone holding it from 2.355 to 2.500, both on the near face at first and the left
alone later (var-f17h's gate, 374c624c's motion).

Why its boots alone held it. Its right hand lets go at 2.345 s, and its left, keyed to hold its grip on the top until
2.895, came off it: the left shoulder rose out of the arm's reach of that grip, 110.2% of the arm (shoulder to wrist,
50.5 cm) from it at 2.44 s (107.1 by the keyed path, the balance lifting it 1.4 cm more), and pulled the hand up to 43.2
mm off the top from 2.34 to 2.51 s (reachlayers20-f20h.txt every 20 ms; review round 1's keyedreach-f18d.txt;
handgap-f18d-foreman-2.2-2.6.txt every 5 ms). The search over the top lifts each key before 2.5 s only as far as its
torso needs to clear the top, the chest over the top (2.305 s) 26.3 cm on the foreman (25.9 on the director), and sets
each later key's torso resting on the top, which raised the right knee up (2.705) 9.2 cm (1.7) and lowered the foreman's
straddle (3.065) 6 mm; it weighs the hands' reach to their marks at those keys alone, where the foreman's left arm
reaches 89.3 and 87.1% of itself (review round 1's knee-f18d.txt, the search logged), and the trunk's path between the
chest over the top and the right knee up rose higher than either needed.

The balance counts no part against a face (supportAt: a part there can only push; it names the boots on the near face),
so with no hand within its centimetre of the top from 2.340 s it planned a flight, the left boot within 7 mm of the near
face throughout and the right within 9 mm until 2.39 s (review round 4's measure-r4f18d.txt, the balance's measuring
rounds). The left hand was back within its centimetre of the top from 2.505 s, but a grip that short before the seat's
hold at 2.550 is not counted (ONSET: a touch under 60 ms), so the flight ran to 2.545 (2.335 to 2.495 already in its
first round, before any of its own moves: review round 3's sched-var-f18d.txt), the body falling free in the plan; as
played it needs 0.31 of its weight at the most from 2.340 to 2.545 s, and 0.05 from 2.379 to 2.490 (review round 6's
forcediff-f17h-f21h-foreman.txt, every 1 ms). Through a flight the balance keeps the flight's median angular momentum,
blended in and out over the 0.25 s of contacts either side (traversal-balance.js, bodyTurn, EASE), and that turn swung
the foreman (the turn's angle every 10 ms: unspin-unfit-f18d.txt and review round 4's unspin-late-f18d.txt): a degree or
more from 2.12 s, up to 15.4 degrees at 2.25, mostly a roll (its axis 0.91, 0.24, 0.33, x toward the wall: review round
3's unfit2-f18d.txt), the left shoulder 12.5 cm above the right at the 20 ms samples 2.24 and 2.26 (review round 2's
spin-f18d.txt); 0.2 degrees at 2.34 as it turned the other way, then up to 17.0 at 2.61, a roll and a yaw (its axis
-0.82, -0.57, 0.01 at 2.60), the shoulders 25.8 cm apart in height at 2.60 (14.0 on the tree, where the balance turns it
0.5 degrees: review round 2's spin2-f18d.txt and spin2-f21j.txt); back under a degree at 2.76. Its span is the flight's
and the 0.25 s either side. While the right hand still held, the turn and the clearance fit's push (19.7 to 21.6 cm back
from the wall from 2.16 to 2.30 s: review round 2's spin-f18d.txt) lifted the left hand 16.3 mm off the top (2.26 s, the
climb test's measure below). Neither alone took the arm past its length: at 2.26 s it reached 104.1% of itself as
played, 91.5 with the turn undone, and 84.3 or 88.4 with the fit's push taken away, as the turn's pivot moves with the
push or holds (unspin-unfit-f18d.txt, after review round 2's unspin-f18d.txt and round 3's unfit2-f18d.txt; 79.5 by the
keyed path: review round 1's keyedreach-f18d.txt). The director had no flight there and hardly turned (0.8 degrees at
the most from 1.90 to 2.40 s, 1.6 to 2.95: review round 2's spin-f18d.txt and spin2-f18d.txt); its left shoulder reached
103.2% (2.30 s), its hand within 8.2 mm of the top (handgap-all-f18d-2.2-2.6.txt), inside the rig's centimetre.

**The fix**, wall-climb.js: a deep body's trunk takes one more key, at 2.45 s (KNEE_MID), mid-way through its right knee
coming up, its fields blended by time from the keys either side (chest over the top, right knee up) as they stand before
the search, which then sets it as it sets them. It starts from the unsearched heights (the foreman's hips at 1.966 m)
and the search lifts it the 16.3 cm its own torso needs, pitched back 16 degrees (the director's 14.4 cm, 22 degrees);
the hands' reach does not bind at it (the left shoulder 85.2% of the arm from its grip, the director's 83.9: review
round 1's knee-f21h.txt).

So through the knee-up the trunk rides lower, from 2.33 s on the foreman (2.31 on the director), and from 2.36 s more
upright (2.31): at 2.45 s the foreman's pelvis is 12.0 cm lower (2.254 -> 2.134 m) and its trunk 25.7 degrees from
vertical against 29.8, the director's pelvis 6.5 cm lower and its trunk 18.7 against 23.6 (review round 1's
lean-f18d.txt and lean-f21h.txt); the foreman's trunk is up to 11.5 degrees more upright (2.60 s), the director's 6.5
(2.50: review round 2's lean10-f18d.txt and lean10-f21j.txt, every 10 ms). Before that, from 1.95 to 2.31 s, the pelvis
rides higher than on 374c624c, the foreman's by up to 5.2 cm (2.23 s) and the director's by 4.9 (2.17 to 2.19 s), the
foreman's trunk leaning up to 4.7 degrees further (2.25 s; the director's 1.1: lean10early-f18d.txt and
lean10early-f21j.txt, every 10 ms from 1.50 s, with review round 2's lean10 files). There the keyed path into the chest
over the top (2.305 s) rises sooner with the new key after it, the foreman's up to 4.1 cm higher at 2.15 s (the
director's 4.3), meeting the old path at that key, and the balance no longer shifts the body down as it did through the
turn (3.0 cm at 2.25 s on 374c624c, 0.2 now: early-nomid.txt and early-mid245.txt, every 50 ms). Riding higher keeps the
left legs at full stretch a little longer, the director's to 2.14 s against 2.07, the foreman's to 2.13 against 2.10,
and lifts the left ankle up to 2.5 cm above where it was at 2.11 s on the director (2.0 at 2.12 on the foreman: review
round 3's legs-var-f18d.txt and legs-var-f21j.txt, ankle-var-f18d.txt and ankle-var-f21j.txt, every 10 ms). The
foreman's trousers touch the wall's near face from 2.240 to 2.260 s and again from 2.380, and lie on the top from 2.395
through 2.70 s, the end of the window read; on 374c624c they touched the top from 2.235 to 2.295 s, then lifted off
until 2.525, and again from 2.545 to 2.580 (review round 2's contacts-var-f17h-foreman.txt and
contacts-var-f21h-foreman.txt, the gate's rows every 5 ms). And with its left hand on the top the balance plans no
flight there (a grip from the catch to 2.545 s, then the seat's hold: review round 3's sched-var-f21j.txt) and no longer
turns the foreman: 1.2 degrees at the most from 1.90 to 2.96 s (every 10 ms), against 15.4 and 17.0; the director's 1.6
at the most, as before (review round 4's unspin-all-f21j.txt and unspin-director-f18d.txt); the fit still pushes its
trunk back 18.9 cm at 2.26 s (21.3 before), where its left arm now reaches 98.9% of itself (unspin-unfit-f21j.txt).

Its left arm reaches 99.7% of itself at the most (2.29 s, where the clearance fit pushes the trunk back from the wall;
87.7 by the keyed path: review round 1's keyedreach-f21h.txt), the director's 101.8 at 2.27
(reachlayers20-f20x-mid245.txt, every 10 ms on var-f20x with the key), and from 2.20 to 2.60 s every mammal's left hand
keeps within 4.3 mm of the wall's surface, the pig director's at 2.28 s (8.2 before), the foreman's 2.1 at 2.21 (43.2
before), the others' as they were, 2.5 at most (handgap-all-f21h-2.2-2.6.txt, every 5 ms). The foreman's left leg,
locked straight from 2.340 to 2.570 s on 374c624c with its boot dragged about 9 cm up the face, now runs at 93.7 to
99.2% of its length there; it still straightens from 2.660 s, as it did from 2.675 (review round 1's knee-f18d.txt and
knee-f21h.txt, every 5 ms). Its right hand holds the top until its let-go, where it was pulled off from 2.32 s (review
round 1's knee-up traces). Rendered, the foreman stays down on the top with its left glove on it where it rose and
lifted the hand (video/f15/st-fore-2.30, st-fore-2.45).

phantom-wrench 1.2.0 `--gate` on frozen copies (374c624c = var-f18d, its gates var-f17h's, the motion the same; this
tree's motion = var-f21h's, gated, and it plays as var-f20a, the experiment's key at 2.45, to 0.00 mm every 1 ms
(diffspans-f20a-f21h.txt), the gates' JSON the same; var-f21j, the tree byte for byte with `deep` hoisted above the key,
plays as var-f21h to 0.00 mm: diffspans-f21h-f21j.txt; every crossing but the pigs' climbs plays as on 374c624c, frame
for frame: same-f21h-f18d.txt, all 33):
- The foreman: readings over the limits 49 -> 22, both clusters in the knee-up gone (2.353 to 2.366 s, 14 readings at up
  to 195%; 2.485 to 2.501, 13 at up to 273%), the rest as they were (0.888 to 1.183 s and 4.306 to 4.310); the seat's
  moment alone as its left hand lifts off the top (19.8 N and 29.1 N·m at 2.966 to 2.968 s, 73% of the limit) gone, as
  on 8da9a826; its internal velocity snap (its right palm, 0.03 m/s at 2.2175 s) gone; required force 3.7 times its
  weight at 3.646 (3.71 against 3.69); its capsule rule passes as before. With its right hand's contacts dropped from
  2.346 to 2.60 s, where it now peels off the top slowly, the gate still reads 22 (review round 1's pw-r1drop).
- The director: the same 34 readings over the limits, frame for frame, and its required force 3.3 at 3.037 s.
- The gate's peak speeds by phase move a little, all far under its 8 m/s: in the right knee up the director's right
  ankle 4.0 -> 4.5 m/s (2.413 s) and the foreman's 4.2 (2.415 s; under the phase's second-fastest, 4.0, before); in the
  chest over the top the director's hips now its fastest, 3.5 (2.111 s), where its left knee read 3.6 (var-f17h's and
  var-f21h's gate texts).

Measured on the tree's code (var-f21h; against 374c624c's, var-f18d or var-f17h):
- The required force (forceprofile-f17h-f21h-foreman.txt and -director.txt, the whole body's need, M(a+g)): the
  foreman's through its old flight, 2.340 to 2.545 s, at most 0.31 of its weight on 374c624c (its plan a free fall
  there, its hand off the top) and 0.70 to 1.36 now, rising most at 2.42 s (0.02 -> 1.36: review round 6's
  forcediff-f17h-f21h-foreman.txt, every 1 ms); the director's 0.96 -> 1.34 at 2.403 s, 0.55 -> 0.89 at 2.547 and 0.72
  -> 1.31 at 2.700, the foreman's 1.03 -> 1.54 at 2.730, and lower at others (the director's 1.11 -> 0.41 at 2.655, the
  foreman's 1.93 -> 0.63 at 2.299 and 2.61 -> 1.17 at 2.596); in the straddle the foreman's moves by up to 0.35 either
  way (2.844 to 2.970 s). Before the knee-up it rises in places: the foreman's 2.60 -> 2.78 at 1.979 s, the director's
  2.66 -> 2.86 at 1.965 and 0.66 -> 1.11 at 2.195.
- The climb test's measures (testmeasures-r3-f17h.txt and -f21h.txt, elbowtest-f17h.txt and -f21h.txt): the pigs' right
  knees over the top 4.0 -> 4.4 and 5.2 -> 5.5 m/s (the foreman's, the director's; 2.612 s); the foreman's hips over the
  top -15.2 to +24.3 -> -15.3 to +24.4 m/s^2, its trouser fold 3.424 -> 3.439 cm into the wall at 3.34 s (under the 3.5
  the user allowed, 0.015 cm nearer it); the director's hips -12.2 to +18.6 -> -10.3 to +18.6, its left knee coming up
  behind 8.76 -> 8.75 m/s; the right elbows from 2.3 to 2.8 s, the foreman's 5.8 -> 3.1 m/s (2.318 -> 2.528 s), the
  director's 2.4 -> 2.9.
- The rig's capsules: the pigs' right arms keep 8.0 and 10.4 cm clear of the trunk from 2.4 to 3.0 s (7.3 and 9.8
  before; the upper arm by the upper trunk at 2.754 and 3.000 s: armtrunk-f21h.txt); no arm capsule over 0.5 cm into
  another from 2.3 to 3.7 s (hold15-tree-f21h.txt); the speeds there as before but for the foreman's right elbow
  (above).
- The seat (seathull-f21h.txt): supportAt reads its outline at 16 and 14 held samples (17 and 14), from 2.970 to 3.045 s
  on the foreman; the plans ride -g at 14 and 9 (13 and 9) and push the body sideways there at up to 4.89 and 3.86 m/s^2
  (4.92 and 3.85).
- The wall (every 10 ms): the hands' brushes with it as the right lets go and the knee comes up are gone (on 374c624c
  the foreman's right hand 15.5 mm into it at 2.320 s and 4.9 at 2.330, its left 3.6 at 2.520:
  handwall-f17h-2.33-2.75.txt and review round 2's handwall-f18d-1.90-2.33.txt; on the tree no hand deeper than 8.4 mm
  from 1.90 to 2.75 s, the hands' rest within the rig's centimetre at 1.90: handwall-f21h-2.33-2.75.txt and review round
  2's handwall-f21j-1.90-2.33.txt); as the left lets go it peels off within the rig's centimetre as before, the
  director's up to 5.1 mm into the top at 2.945 s (4.6 before: handgap-f21h-2.88-3.00.txt, every 5 ms); the foreman's
  left hand still passes through the wall's near face to its far grip (7.7 cm at 3.560 s: lefttrack16-f21h.txt).
- The clothes: through the holds as before (forearm17-f21h-holds-exact-2ms.txt: the director's right sleeve 5.0 cm into
  its waistcoat, its left one vertex 1.2; the foreman's hands and forearms 0.3 cm at the most). Through the knee-up, by
  the chest ray (round 2's measure, every 10 ms from 2.33 to 2.75 s: handwall-f21h-2.33-2.75.txt and
  handwall-f17h-2.33-2.75.txt), the director's left wrist now lies inside its shirt at 6 samples, up to 1.4 cm at 2.410
  s, where 374c624c read none, and its left forearm at 37 samples against 29, 6.3 cm at the most against 7.4; its right
  forearm at 4 against 2, 2.2 cm against 6.1; the foreman's none, as before. Before it, from 1.90 to 2.33 s by the same
  measure (review round 2's handwall-f18d-1.90-2.33.txt and handwall-f21j-1.90-2.33.txt), the director's left forearm
  lies inside its shirt at 7 samples, up to 5.8 cm, against 4 and 5.3, its right at 5, up to 5.3 cm, against 5 and 6.1;
  the foreman's left forearm, inside at 10 samples up to 7.8 cm on 374c624c (2.27 s), now at none.

What moves (by over 0.1 mm in any coordinate): the pigs alone, the director from 1.538 to 3.350 s (9.0 cm at the most in
one coordinate, at 2.466 s) and the foreman from 1.552 to 3.862 (14.0 at 2.498: diffspans-f18d-f21h.txt); by point, the
director's by up to 11.2 cm (its left elbow at 2.444 s; its head 10.1 at 2.488) and its centre of mass by 5.1 (2.476 s),
the foreman's by up to 17.0 (its left elbow at 2.470; its head 15.8 at 2.250, where the balance turned it 15.4 degrees
on 374c624c; its pelvis 12.4 at 2.458) and its centre of mass by 10.0 (2.452: diffpoints-f18d-f21h.txt). The trunk's
keyed path itself already differs at 1.60 s, by 0.4 mm, under 2 mm before 1.9 s, then the foreman's up to 41 mm higher
at 2.15 s (the director's 43) and back to 2.6 mm at 2.30, by the chest over the top's key (early-nomid.txt and
early-mid245.txt, the keyed hips every 50 ms on var-f20x without and with the key).

`tests/natural-traversal.test.mjs`: the climb test holds the left hand to its grip as the right knee comes up: from 2.20
to 2.60 s, read every 10 ms, the nearest point of its mesh (forearm and hand) within 1 cm of the wall's surface.
374c624c fails it on the pig foreman (43.1 mm at 2.44 s: test-f21t-pigs.log; it would fail there at 2.26 s too, 16.3
mm); the tree passes (test-f21h-tree2.log, the pigs, the horse and the donkey; every mammal within 4.3 mm, the pig
director's at 2.28 s, the others' 2.5 at most). Its comments carry the measures above. The full suite passes (2575
tests).

**Not kept**: the key at 2.40 s (var-f20b): the same readings, the director's required force 3.3 at 3.038 s instead of
3.037, its hand within 3.1 mm (4.3 at 2.45); 2.45 sits where the left shoulder rose furthest (2.44 s).

**Left.**
- The far grips under the pigs' belly and seat (the hands in the clothes near each grip; the foreman's left hand through
  the wall at its far grip), and the director's sleeves (the thirty-fifth part); its left wrist by its shirt through the
  knee-up (above).
- The foreman's trouser fold, 3.439 cm into the wall at 3.34 s, 0.061 under the 3.5 the user allowed.
- The director's left arm past full stretch as the right knee comes up, 101.8% of its length at 2.27 and 2.28 s (103.2
  before), its hand 4.3 mm off the wall's surface (reachlayers20-f20x-mid245.txt, handgap-all-f21h-2.2-2.6.txt).
- The foreman's left arm at 99.7% of its reach at 2.29 s, where the clearance fit pushes the trunk back (1.5 mm short of
  full stretch); its right arm straight at its far grip, 99.5% of its length or more from 3.070 s (3.075 before) to
  3.740 (rightarm-f21h-far-5ms.txt and rightarm-f17h-far-5ms.txt, every 5 ms).

### 2026-11-21 (physics balance, thirty-seventh part): the climbs' flights hold their turn every millisecond

After the thirty-sixth part the eleven climbs read 168 readings over the gate's limits, 93 of them in the phase over the
top (g12-phasetable.mjs on var-f11b, the nine climbs but the pigs' as they have played since the twenty-eighth part, and
var-f21h, the pigs on 6fe975ef; g12-flightspans.mjs): on nine climbs as the hooves leave and through the flight's first
30 ms, from 0.861 to 0.900 s (the horse 11 readings, two of them phantom force on the lead before its hooves leave; the
goat and sheep 9; the bull, cow and donkey 8; the dog 5; the pigs 2 and 2), up to 26 N·m of airborne phantom torque
against the rig's 10 (the goat's and sheep's; the horse's 21); the skunk's and rabbit's later in the flight (2 and 4
readings from 0.972 to 0.983 s, up to 22 N·m); the pig foreman's 2 at 0.962 s; and the pigs' late flight before the
catch (13 and 10 readings, up to 603 and 455%).

The horse's take-off read every millisecond (phantom-wrench 1.2.0 with `--step 0.001` on var-f21h:
takeoff-1ms-horse.json): as the hooves leave its airborne torque reads 21 and 15 N·m at 0.871 and 0.872 s, 7 to 11 from
0.873 to 0.887, then 14 and 16 at 0.888 and 0.889 and 16 and 15 at 0.892 and 0.893. Split by axis
(probe-takeoff-segs.mjs, the rig's own mass model, the body's angular momentum about its centre of mass read over 0.5 ms
chords: takeoff-segs-horse.txt), it is a steady roll (about x, toward the wall) of 6 to 12 N·m from 0.866 to 0.889 s and
a pitch (about z) rippling by up to 20 either way. Two causes:
- The roll is the head the climb fits again after the balance (wall-climb.js, fit.solveHead). The balance planned the
  take-off with the head as the fit before it set it, turning from 16 degrees at 0.70 s to 1.8 at 0.85 and to none by
  0.90, and its turn through the flight took that swing out; the head fitted after the balance holds 12 degrees from
  0.80 s through the flight (probe-headfit.mjs). With that fit after the balance skipped (var-f22a, a probe only: the
  head then clears less), the roll is gone (x -4 to 3 N·m from 0.866 s: takeoff-segs-horse-nohead.txt); the limbs' turns
  found again after it (turns()) change nothing (takeoff-segs-horse-noturns.txt).
- The pitch is the turn's own track. The balance holds the body's angular momentum at its 5 ms samples and its turn is a
  spline between them, but the legs fold faster than that as the hooves leave. Measured over 2 ms chords at the samples
  instead of 10 (var-f22c), the ripple only moved (the horse's flight, by the probe's whole N·m every 1 ms from 0.871 to
  0.900 s, 11 instants over 10 against 6fe975ef's 9, and 2 at 10 against its 4: takeoff-segs-horse-f22c.txt and
  takeoff-segs-horse.txt).

**The fix**, traversal-balance.js (balanceTraversal's `fine`, which the climb alone passes): after the last refine of
the flights' turn, each run of samples in the air, by the samples' own contacts before ONSET (a touch counts here from
its first sample), is posed every half millisecond with the turn so far, its angular momentum about the centre of mass
read every millisecond over 1 ms chords (half a millisecond either side), and the rate I^-1 (L* - L) that holds the
run's median L* is added to the turn through a spline of keys 1 ms apart, twice. The rate is weighted by a window, full
from the last foot sample before a take-off (the lead, which the turn already holds as flight) or from 5 ms into a
flight off a grip, to 5 ms before the run's last sample, ramping over 5 ms either side (a smoothstep), and the angle it
adds is brought back to nothing over the run. Outside the window the turn is the 5 ms one; the window starts 10 ms
before a take-off's first sample in the air, on the lead's feet, and a run is the samples the balance finds no support
at, so it takes in what supportAt counts as none: a garment against a wall's face, and the pig foreman's head on the far
face. On the gate's 5 ms rows ten climbs have a garment on the wall inside a corrected stretch (review round 3's
spancontacts-f22i.txt): seven's trousers or overalls on the near face in the take-off stretch's last 40 ms, from 1.180 s
at the earliest; the skunk's overalls from 0.865 to 0.920 s (from 0.875 its only contact); the pig director's shirt from
1.085 to 1.175, its only contact; and the horse's, goat's, cow's and rabbit's overalls on the far face at the drop's
start (4.245 to 4.250 s). The pig foreman's head is on the far face from 4.240 to 4.255 s in its drop. Read every
millisecond, the goat's overalls are on the wall from 1.186 s to its catch, and from 4.245 to 4.251 s inside its drop's
stretch, where from 4.241 they are its only contact (review round 2's goat-contacts-f23b.txt). The window came from the
gate:
- Held up to and past the contact (the run's samples after ONSET, var-f22d; or before it, var-f22f, the same readings),
  the correction moved the rig's leftover at the catch from torque to force: the goat's 93 N and 49 N·m at 1.222 s
  became 131 N and 7.5 N·m (130 and 7.2 on var-f22f), the bull, cow and sheep read new readings at their catches and the
  donkey and sheep in their drops, and the goat and sheep at the lead's start (0.858 s): 72 readings in all, 10 of them
  new (g12-newreadings.mjs on var-f22d).
- Ending inside the air but ramping in over 10 ms before a take-off (var-f22h), it reached back to the lead's start,
  where the plan's pressure point takes the flight's turn: 71 readings, one fewer than the 72 kept, but three of them
  new, the goat's 109% and the sheep's 121% at 0.858 s (the goat's turn there moved by 0.0003 degrees) and the pig
  foreman's at 4.300 s (g12-newreadings.mjs on var-f22h).

So (var-f22i, the tree's motion to 0.00 mm every 1 ms on all eleven climbs: diffspans-f22i-f23a.txt), phantom-wrench
1.2.0 `--gate` on frozen copies:

| 6fe975ef -> this | readings over the limits | of them, the phase over the top | the catch |
|---|---|---|---|
| horse | 20 -> 13 | 11 -> 4 | 0 -> 0 |
| goat | 10 -> 2 | 9 -> 1 | 1 -> 1 |
| bull | 8 -> 0 | 8 -> 0 | 0 -> 0 |
| cow | 8 -> 0 | 8 -> 0 | 0 -> 0 |
| donkey | 8 -> 1 | 8 -> 1 | 0 -> 0 |
| sheep | 12 -> 4 | 9 -> 1 | 1 -> 1 |
| skunk | 2 -> 0 | 2 -> 0 | 0 -> 0 |
| pig foreman | 22 -> 8 | 17 -> 2 | 0 -> 0 |
| pig director | 34 -> 14 | 12 -> 1 | 18 -> 9 |
| rabbit | 28 -> 21 | 4 -> 0 | 11 -> 8 |
| dog | 16 -> 9 | 5 -> 0 | 2 -> 0 |
| together | 168 -> 72 | 93 -> 10 | 33 -> 19 |

- 97 readings go and one is new (g12-newreadings.mjs f11b f21h f22i): the pig foreman's 107% at 4.300 s in its drop, the
  first of its cluster there (now six from 4.300 to 4.310 s, up to 225%, where five from 4.306 read up to 227%).
- The worst reading of all is the rabbit's catch, 824% at 1.225 s, where it read 999% at 1.224. The push off (12), the
  step in (13), the director's drop and the walk-outs (8) read as they did.
- Eleven readings that stay over the limits rose: eight in the last 5 ms of a corrected run, where the correction ramps
  out (the pig director's four from 1.210 to 1.215 s before its catch, 103 -> 127%, 143 -> 154%, 204 -> 207% and 179 ->
  183%; the rabbit's at 1.221 s, 113 -> 133%; the pig foreman's three from 4.306 to 4.308 s in its drop, 103 -> 107%,
  133 -> 136% and 162 -> 164%), and three as the hooves leave, their phantom force 1.2 to 2.1 N more (the goat's at
  0.867 s, 108 -> 111%; the sheep's there, 104 -> 106%, read on its torque before, its force then 103%; the donkey's at
  0.871, 110 -> 112%: var-f11b's and var-f22i's gate rows). Where the torque fell, the phantom force rose: the rabbit's
  catch by 8 to 20 N at the five instants from 1.219 to 1.224 s where its torque fell (129 -> 150 N at 1.223), the pigs'
  late flight 123 -> 128, 79 -> 83 and 68 -> 83 N (at 1.177, 1.178 and 1.182 s: review round 1's cmp-readings-f22i.txt),
  and the goat's flight 58 -> 67 N at 0.889 s on the 1 ms gate, under its 73.5 N (takeoff-1ms-goat-var-f21h.json and
  takeoff-1ms-goat-var-f23a.json). Under the limits, force and torque rose as well: on the 1 ms gates, the hooves still
  on the ground, the horse's 15.7 -> 31.7 N and 4.3 -> 8.3 N·m at 0.867 s and the goat's 25.3 -> 42.7 N and 7.2 -> 11.9
  N·m at 0.862, against limits of 73.5 N and 40 N·m (review round 3's takeoff-1ms-4.txt); on the gate's 5 ms rows, seven
  rows rose by more than 10 points of their limit, all in the air, the pig director's the most, 2.6 -> 6.2 N·m at 0.875
  s (26 -> 62% of its 10 N·m), the other six to 44% or less (review round 3's rowrises-f22i.txt).
- The horse keeps two readings in the air as its hooves leave, 11.8 and 10.2 N·m at 0.871 and 0.872 s (118 and 102%):
  the head the climb fits after the balance, which the turn does not see (below). Its two on the lead, at 0.861 and
  0.862 s (108 and 101%, phantom force), are as they were.

Not kept:
- The flights' turn refined again after the head is fitted (var-f22b): 158 readings, the push off 12 -> 20 (four climbs
  new at the lead's start, 0.856 to 0.858 s): its ease into the flight is on the contacts before it, where the plan's
  centre of mass had the old turn.
- The 1 ms pass run again after the head is fitted (var-f22j): the horse's flight clear as its hooves leave, but its
  lead 128% (0.861 to 0.867 s), the pig director's catch up to 350% (1.213 to 1.215 s, against 207), the pig foreman's
  catch three new readings in the air (274% at 1.217 to 1.219 s) and its drop's worst 374% at 4.309 s against 225, and
  the donkey a new 111% in its drop at 4.247 s (72 readings).

Measured on the tree's code (var-f23a and var-f23b, the tree's motion; against 6fe975ef's, var-f21j):
- The windows and the low walls play as before, frame for frame (same-f21j-f23a-winvault.txt, all 22 every 5 ms): they
  do not pass `fine`.
- The climb test's flight measures (probe-testmeasures16.mjs, its code copied: testmeasures16-f21j.txt and -f23a.txt):
  the flight's first 50 ms hold their angular momentum within 0.001 to 0.127 N·m·s of the flight's median (0.026 to
  0.137 before); as the hooves leave, 12.4 to 63.8 N·m as before but the pig director's 34.9 against 40.3; the drop's
  flight 3.4 to 5.9 N·m on the nine (3.5 to 5.9 before) and the pigs' 51.3 and 11.3 as before.
- What moves: every rig point and the centre of mass by about a tenth of a millimetre at the most in any coordinate, the
  largest in the take-off's flight (the dog's just over 0.10 mm from 0.926 to 0.955 s, at 0.941; the sheep's 0.10 at
  0.893; read every 1 ms on all eleven climbs: diffspans-f21j-f23a.txt and diffspans-f21j-f23a-b.txt).
- The eleven climbs build in 65.0 s against 63.8, 1.7% longer (the least of two builds each, the old code and the new in
  turn: buildtime-f21j-f23b.txt): ten slower by 19 to 341 ms, the skunk 637 ms faster (without it, 3% longer); the pass
  posing each flight every half millisecond, twice.

`tests/natural-traversal.test.mjs`: the climb test holds the take-off's flight to the rig's airborne limit: from 5 ms
after the balance's first sample in the air (where the rig can still read a hoof on the floor: the pig director's boot
at 0.870 s, on the floor in var-f22i's gate row, where the test's measure reads 10.2 N·m: takeoff-check50-f23a-off0.txt)
to 50 ms after it, the body's angular momentum (the test's model, read every millisecond, its rate over 2 ms chords)
changes at most 10 N·m. On 6fe975ef's code eight climbs fail it, 14.6 to 24.8 N·m (the goat's 24.8 at 0.889 s:
test-f23t-all.log), the skunk, rabbit and pig director reading 8.9, 9.4 and 9.9 (takeoff-check50-f21j-off.005.txt); the
tree reads 0.6 to 8.8 (takeoff-check50-f23a-off.005.txt). The check on the balance's tracks between their samples now
reads the climb's turn in its flights between its 1 ms keys (the balance returns them, fineSpans), but for each
corrected stretch's first and last millisecond (fineSpans: a take-off's starts 10 ms before the run's first sample in
the air), where the correction's track eases from rest as a track's own ends do (its spline's end keys hold no
acceleration): read there too, it bends up to 0.88 rad/s^2 off straight (0.06 to 0.88 on the eleven, the rabbit's at
1.224 s: test-f23b-all.log, before the skip), as far as a track through central-slope quintics bends; built through
central-slope quintics instead of a spline (var-f23m), that turn fails it (0.77 and 1.09 rad/s^2 on the horse and the
goat: test-f23m-mutant.log). The climb test passes on the tree's copy (18 of 18: test-f23b-r1-all.log), and the full
suite passes (2575 tests: npm-check-fix16.txt, run before a local variable in the pass was renamed and the check's
message mended).

**Left.**
- The head the climb fits after the balance, which the flights' turn does not see: the horse's 11.8 N·m as its hooves
  leave.
- As the hooves leave, phantom force: the horse's two on its lead (0.861 and 0.862 s, 108 and 101%), the goat's, sheep's
  and donkey's (0.867 and 0.871 s, 111, 106 and 112%).
- The catch: the rabbit's 824% (eight readings), the pig director's nine up to 337% in the air before its hands land,
  the goat's and sheep's one each; the pigs' late flight, two and one readings of phantom force (128 and 83 N at 1.177
  and 1.182 s).
- The push off (the horse's 227% at 0.745 s), the step in (the rabbit's and dog's 13), the pigs' drops (the foreman's
  six, the director's four, three on contact and one in the air at 4.236 s), the walk-outs (the rabbit's and dog's 8).

### 2026-11-21 (physics balance, thirty-eighth part): the climbs' jumps hold their centre of mass, and their flights their turn up to the hands

After the thirty-seventh part (21efea5e) the eleven climbs read 72 readings over the gate's limits, 19 of them at the
catch (the rabbit's 824% at 1.225 s, the worst of all) and 10 in the phase over the top (motion/g12-phasetable.mjs on
var-f22i, 21efea5e's motion; scratchpad next-catch/ holds every probe and output named here but the var-* copies, those
named with motion/, and same-f23b-f29a-winvault.txt, test-f29a-all.log and test-f29t-fix16code.log, in motion/ too).

The rabbit's catch read every millisecond (next-catch/probe-catch-com.mjs and motion/probe-takeoff-segs.mjs on var-f23b,
the rig's mass model):
- Its centre of mass met the plan within 0.3 mm at its 5 ms samples there, but between them took 214 N of phantom force
  (1.224 s, com-rabbit-f23b.txt): as the hands stop at the top the arms decelerate along the wall's normal (their own
  -544 N at 1.229 s), and the hips, held to the plan at the samples and splined between, answer late.
- Its turn held the body's angular momentum to 1.219 s, then let it change at 98 N·m (1.225 s, segs-rabbit-f23b.txt), as
  the arms, head and legs swung in the last 5 ms of the corrected stretch, where the correction ramped out.
- Held up to the contact (the thirty-seventh part's var-f22d), the turn moved the leftover into force: near the catch
  the arms' targets are keyed in the world (their key at the catch, 1.265 s, blended in from 1.115), so the hands do not
  turn with the trunk and turning the trunk moves the centre of mass.

**The fix**, traversal-balance.js (balanceTraversal's `fine`, the climb alone): the 1 ms pass reads the body's contacts
at every key it poses on its first pass (the probe and supportAt, as at the samples), so it knows which keys lie in the
air: the run's, from the first to the last that the contacts read in the air (the result's `fineAir`). Its turn now
holds from the lead to 3 ms past the last key in the air (FINE_PAST, on the hands or palms the flight lands on; never
nearer than 5 ms to the stretch's end), fading over 5 ms after. Through a take-off's flight with three keys or more in
the air it holds the centre of mass too: those keys give the flight's own ballistic path (least squares, gravity fixed),
and the difference, less the Hermite cubic that meets it at the window's ends in value, and in slope over the 2 ms
inside each (5 ms before the first key in the air, FINE_LEAD, on the hooves; FINE_PAST after the last), goes into the
hips' move through a 1 ms spline (the result's `shift` and `hips`). Three passes. Each corrected stretch runs from three
samples before its run to three after it, on the samples.

Even so the catches held 8 readings, all the pig director's (var-f25b, a prototype), and the probe found why: the head
the climb fits again after the balance turns where the balance planned it held. **The second fix**, wall-climb.js with
traversal-balance.js's new `refit`: the climb fits its head and tail again inside the balance, after each of its rounds
that plans (with one round, once after the loop), and after the last refit, whichever round it follows, the balance
finds the hips again for them (followCentre, three passes), so the second round, the refine and the 1 ms pass plan the
body as it is played. A loop that settles a round early, or runs one round, finds them after the loop (review round 3
found them left as found before that refit): forced on test copies (next-catch/latent-switches17.mjs and
probe-latent17.mjs on var-f29t and var-f30t: latent-f29t-f30t.txt), the played centre of mass where the body is held
strayed from the plan by up to 3.0 mm on the horse (3.960 s) and 10.3 on the pig director (4.450 s), and now by 2.1 and
2.3 at most (at 0.775 and 1.325 s; the two rounds leave 0.66 and 0.46 at most); the eleven climbs run both rounds, so
they play as before to the bit (diffbody-f29a-f30a.txt). The fits there take no report (traversal-fit.js:
`fit.solveHead` and `fit.solveTail` take `report: false`); the report, which the climb test's caps read, is taken once
after the balance on the finished motion (`fit.measure`).

How the head is fitted, each gated on all eleven:
- after the first round alone (var-f28d, 28 readings): the second round moved the bodies under heads fitted for the
  first, and three ended in the wall where 21efea5e left them clear: the pig director's 1.28 cm at 1.349 s (over a
  millimetre from 1.300 to 1.394 s, every vertex every millisecond: next-catch/probe-headwall2.mjs, a round 2
  reviewer's; the fit's report, every other vertex on a 20 ms grid, read 0.83), the cow's 0.88 at 0.730, the donkey's
  0.78 at 0.732 (its trunk 0.87);
- after both rounds, the hips left as the second round found them (var-f28a): 42 readings, the horse's push 14 (up to
  308% at 0.815 s): the second fit comes after that round's plan;
- after both, the hips found again in one pass (var-f28e): 35 readings, the horse's lead and the cow's push new or
  higher (up to 122%);
- a third round planning after the second fit (var-f28b): 20 readings (the push off none, the drop the pig director's
  two), but the climbs built 43.3% longer than on 21efea5e (buildtime-f23b-f28b.txt, against 8.3% here in a later run),
  the step in 15 (the rabbit two new, thirteen of the rabbit's and dog's 4 to 7 points higher) and the pig director's
  trunk 1.64 cm in at 3.16 s against 1.24.
The fits after both rounds with the hips found again in three passes (var-f28c's motion to the bit:
diffbody-f28c-f29a.txt) read fewer readings than the other two fitted after both rounds and keep every head clear
through the catch (later the horse's grazes the top's far edge: below); a third round reads fewer still but builds 43.3%
longer.

Tried and not kept (each gated, but for the two fades, read by the probe on var-f24a's switches:
com-rabbit-f24a-fade.txt and -blend.txt; prototypes in var-f24*, var-f25*, var-f26*, switched by environment variables):
- The centre's window from the first key in the air: its join read in the air (the rabbit a new 138% at 0.877 s); 2 and
  3 ms before it, on hooves too lightly loaded to take it (164 and 119% at 0.875 and 0.874 s; from 5 ms before it, as
  kept, the dog's join reads 107% for a millisecond at 0.868 s: below); eased in over 5 ms in the air, it let the
  flight's first milliseconds through (the goat's 0.867 s 111 -> 119%, the sheep's 106 -> 114%, the donkey's 0.871 112
  -> 121%: var-f25a, 57 readings).
- A 5 ms fade of the whole difference instead of the Hermite cubic: its slow drift (0.538 mm off the flight's parabola
  on the rabbit) out in 5 ms, up to 3781 N of phantom force (1.226 to 1.231 s); a straight blend of its two ends: a kink
  of slope, 563 N at 1.226 s, the rabbit's last millisecond in the air.
- The centre held off a grip too (the drops), eased in over 5 ms: the pig director's first millisecond in the air 110 ->
  120% (4.236 s), nothing else changed on the five climbs gated (var-f26k against var-f26l).
- The head and tail fitted again just before the 1 ms pass (var-f26d, 39 readings): every catch cleared, but the lead
  and the let-go took what the 5 ms turn had planned for the other head (the horse a new 170% at 0.866 s on its hooves,
  the donkey 118 and 124% at 4.246 and 4.247 s in the air); started 10 ms before the first key in the air the horse's
  moved to 0.861 s (178%), and a turn started on the hands before the let-go put the donkey's in the air earlier (149 to
  188%).

So (var-f28c, whose motion var-f29a plays to the bit, as the tree's code does: var-f30a has its code lines, only
comments having changed since, diffbody-f29a-f30a.txt), phantom-wrench 1.2.0 `--gate` on frozen copies:

| 21efea5e -> this | readings over the limits | over the top | the catch | the drop | the push off |
|---|---|---|---|---|---|
| horse | 13 -> 0 | 4 -> 0 | 0 -> 0 | 0 -> 0 | 9 -> 0 |
| goat | 2 -> 0 | 1 -> 0 | 1 -> 0 | 0 -> 0 | 0 -> 0 |
| bull | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| cow | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| donkey | 1 -> 0 | 1 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| sheep | 4 -> 2 | 1 -> 0 | 1 -> 0 | 0 -> 0 | 2 -> 2 |
| skunk | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| pig foreman | 8 -> 0 | 2 -> 0 | 0 -> 0 | 6 -> 0 | 0 -> 0 |
| pig director | 14 -> 4 | 1 -> 0 | 9 -> 0 | 4 -> 4 | 0 -> 0 |
| rabbit | 21 -> 14 | 0 -> 0 | 8 -> 0 | 0 -> 0 | 1 -> 2 |
| dog | 9 -> 10 | 0 -> 1 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| together | 72 -> 30 | 10 -> 1 | 19 -> 0 | 10 -> 4 | 12 -> 4 |

- 44 readings go and 2 are new (next-catch/compare11.mjs f22i f28c): the dog's 107% at 0.868 s as its hooves leave, the
  first millisecond of its centre's window (its first key in the air at 0.873 s, less FINE_LEAD), where 21efea5e read
  59%, and from 0.869 to 0.900 s 6 to 8% against 10 to 74% (23 to 50% to 0.877 s); and the rabbit's 104% at 0.846 s in
  its push. Of the 28 readings both keep, 21 rose (next-catch/rises17.mjs at no threshold, to four decimals:
  rises-f22i-f28c-tol0.txt; 14 past compare11's 0.05 points): the rabbit's 0.845 s 106 -> 112%, the sheep's two at 0.856
  and 0.857 s by 1.6 and 1.5 points (108 -> 110 and 113 -> 115%), the walk-outs' eight by 0.18 to 0.22 points (the
  rabbit's 148.15 -> 148.33% at 5.840 s) and the step ins' ten by 0.071 at most (the rabbit's five from 0.023 to 0.027
  s, the dog's five from 0.019 to 0.023 s); the other seven fell or held. The step in keeps its 13 (the rabbit's 8, the
  dog's 5) and the walk-outs their 8.
- The worst reading now is the rabbit's walk-out, 148% at 5.840 s; the push off's is the sheep's 115% at 0.857 s, the
  drop's the pig director's let-go, 111% at 4.231 s.
- The gate's capsule overlaps are 21efea5e's pairs on every climb, none gone and none new (with the head fitted after
  the first round alone they lost the head and a hand on four climbs, the heads sitting otherwise: var-f28d), each as
  deep within 0.011 cm but the pigs' head against the left arm: over the top the foreman's against its hand 1.49 -> 1.52
  cm at 1.158 s and the director's 2.78 -> 2.84 at 1.168 s, and in its hang the director's against its forearm 1.93 ->
  1.69 at 1.336 s (var-f22i's and var-f28c's gate results).

Measured on var-f29a, whose motion the tree's code plays to the bit, or where named on var-f30a to var-f30f (the tree's
code lines; only comments changed after them); against 21efea5e's, var-f23b:
- The windows and the low walls play as before, frame for frame (same-f23b-f29a-winvault.txt, all 22 every 5 ms): they
  pass neither `fine` nor `refit`.
- The climb test's flight measures (next-catch/probe-testmeasures17b.mjs, its code copied: testmeasures17b-f23b.txt and
  -f29a.txt): over the last 50 ms before the hands land, to the last millisecond in the air, the body's angular momentum
  changes at 0.1 to 4.1 N·m (the rabbit's 4.1 at 1.224 s) against 3.1 to 79.4 (21efea5e, with no 1 ms keys, to its last
  sample in the air); through the take-off's flight its centre of mass falls within 0.04 to 0.14 m/s^2 of gravity
  against 0.50 to 2.86; the flight's first 50 ms turn at 0.3 to 1.2 N·m against 0.6 to 8.8; the nine's drops at 3.1 to
  5.9 against 3.4 to 5.9, the pigs' at 12 (the foreman's 51 before, the director's 11, so the director's rises); as the
  hooves leave the horse's 41.2 -> 48.1 N·m (the test's limit there 100) and the dog's 55.7 -> 55.8, the others' as they
  were to 0.0001 N·m or lower (read to 5 decimals by round 10's tm-full-r10.mjs: tm-full-f23b.txt and -f30f.txt). The
  figures the climb test's comments give for the code as it stands were read again on both roots, var-f23b against
  var-f30f, by these probes, to the digits each prints (next-catch/: round 2's two probes printing 5 or 6 decimals, as
  round 10 had them, tc1-full-r10.mjs and tc2-full-r10.mjs, compared field by field by round 10's cmp-full-r10.mjs:
  cmp-tc1-full.txt and cmp-tc2-full.txt; the far reach by round 7's probe-farreach-r7.mjs, farreach-f23b.txt and
  -f30f.txt; the clothes check and the plan rows by round 9's probe-unread-r9.mjs, unread-f23b.txt and -f30f.txt; the
  pigs' wrists by round 9's probe-wristheight-r9.mjs, wrist-f23b.txt and -f30f.txt; the dog's grip gap by fix 11's probe
  printing four decimals, probe-gripgap4-f11.mjs, gripgap4-dog-f23b.txt and -f30f.txt; the far reach and the clothes
  check print 4 decimals, the wrists and the plan rows 3), and every one holds within the test's bounds. The six that
  rose most, each against a bound of 1 cm: the pig foreman's catch hand, 0.25 -> 1.16 mm; the pig director's take-off
  hoof, 1.01 -> 1.58 mm; the bull's catch hand, 0.03 -> 0.38 mm; the pig director's far-hang hand, 2.85 -> 3.15 mm; the
  cow's catch hand, 0.01 -> 0.24 mm; and the pig foreman's take-off hoof, 6.35 -> 6.52 mm. Every other rose by at most
  0.08 mm (the donkey's take-off hoof), 0.008 cm (the pig director's far reach, 0.545 -> 0.552 cm), 0.015 m/s^2 (the
  hips' vertical acceleration over the top, the pig foreman's low end, -15.262 -> -15.277) and 0.0001 in the other units
  (the knees' speeds, the flight's angular momentum off its median), or fell or held; the files give each one. The
  comments' other figures for the code as it stands, which these probes do not read: the spline ends' bend (read on
  var-f29a, whose motion the tree plays: splineends-f29a.txt) and the boot's rate at 0.870 s (10.19 -> 0.46 N·m:
  rate-pigd-f23b.txt and -f30d.txt) fell; and the pigs' sleeves and hands in their clothes over the top move only with
  their meshes, every vertex by 0.03 mm at most from the right hand's let-go at 2.345 s to 3.42 s (the pig foreman's to
  3.75 s) and the pig director's by 1.26 mm at most by 3.75 s (round 4's probe-vertdiff-r4.mjs:
  vertdiff-pigs-pre-f23b-f30g.txt and vertdiff-pigs-top-f23b-f30f.txt).
- What moves, every 1 ms on var-f30a against var-f23b (next-catch/: round 4's probe-headroll-r4.mjs on the head's whole
  turn and its every vertex, headroll-f23b-f30a.txt; round 4's probe-vertdiff-r4.mjs on every vertex,
  vertdiff-f23b-f30a-1.txt and -2.txt; probe-headtrack17.mjs on the fit's own head turn, on var-f30c,
  headtrack-horse-f23b-f30c-1ms.txt). The heads sit as on 21efea5e but for two. The fit turns the horse's head up to 12
  degrees as it lowers itself down the far face (eased in from 3.67 s, 12 from 3.93 to 3.97 s) where 21efea5e's turned
  it 24 (the two fits' turns a degree or more apart from 3.69 to 4.13 s), so the head played is up to 12.2 degrees off
  21efea5e's at 3.886 s (over 1 from 3.690 to 4.129 s), a vertex 34 cm from the head bone 72 mm off at 3.884 s and the
  tip 31 mm (the swing of the neck-to-tip line, which a turn about that line leaves alone, reads 4.9 degrees:
  headwindow-f23b-f29a.txt); and the pig director's head turns 1.9 degrees otherwise in its hang (1.590 s; over 1 from
  1.517 to 1.664 s). The pig foreman's head is within 0.9 degrees, the donkey's 0.7, the bull's 0.3, the others' 0.1.
  Every vertex, by mesh: the horse's head (above), its mane 26 mm at 3.996 s, its overalls 14 and its shirt 11 at 3.99
  s; the pigs' heads up to 16.4 mm (the foreman's at 4.424 s, its cap 17.8; the director's 15.1 at 3.898 s, and 11.7 in
  its hang at 1.593 s: vertdiff-pigd-hang-f23b-f30c.txt) and their shirts up to 16.2 in the drop (the director's at
  4.446 s); around the catch (1.15 to 1.35 s) the pig director's head 10.4 mm at 1.308 s (over 1 cm from 1.294 to 1.328
  s) and its shirt 7.7, the donkey's tail's tuft 6.3 at 1.342 s, the pig foreman's trousers 3.9, the horse's head 2.9,
  the bull's 2.6, the cow's 2.0; over the whole climb the donkey's 6.3 mm, the bull's 4.6 (its tail, 0.757 s), the cow's
  2.4, the other five's 0.4 at most. The rig points but the heads' tips (probe-diff-body.mjs: diffbody-f23b-f29a.txt;
  the tips up to 30.8 mm, the horse's at 3.880 s, the pig foreman's 16.9 and the director's 14.9) move by up to 13.2 mm
  (a shoulder of the pig director's at 3.897 s, its centre of mass 10.3 mm in its drop at 4.448 s; the pig foreman's
  11.6 mm, its neck at 4.425 s; the donkey's 4.7, the horse's 3.5, the bull's and cow's 2.2; the other five's 0.4 mm at
  most), the second round planning with the head fitted after the first; around the catch by 6.7 mm at most (the pig
  director's left shoulder at 1.306 s: probe-diff-window.mjs, diffwindow-catch-f23b-f29a.txt).
- Clearance. The fit's report (next-catch/probe-report4.mjs: report4-f29a.txt) reads every head clear, as on 21efea5e,
  and the trunks' deepest as on 21efea5e to within 0.05 cm (the bull's 0.15 against 0.11, the cow's 0.13 against 0.08,
  the donkey's 0.06 against 0.01, all at 4.14 s). Read on every vertex every millisecond over the whole climb
  (next-catch/probe-limbclear17b.mjs, the two roots in turn: headtrunk1ms-f23b-f29a-1.txt and -2.txt by the fit's way
  out, limbs1ms-true-f23b-f29a-1.txt and -2.txt by the shortest), every head clears as on 21efea5e but the horse's: as
  it lowers itself down the far face it goes into the top's far edge at 3.933 s, 2.6 mm read every millisecond, and read
  every 0.25 ms up to 2.9 mm, inside for 7.75 ms from 3.9305 s, where 21efea5e's kept at least 16.1 mm clear (round 3's
  probe-horsehead-r3.mjs: horsehead-q-f29a.txt and -f23b.txt); it falls between the fit's 20 ms samples, where its
  report reads it clear. The trunks reach as deep as on 21efea5e to within 0.05 cm, and at no instant more than 1.6 mm
  deeper (the pig director's at 1.424 s; from 0.5 to 1.6 s its deepest is 0.51 cm against 0.36 and the pig foreman's
  0.11 against 0.08, both at 1.40 s: probe-headwall2.mjs, headwall2-f29a.txt and -f23b.txt; the dog's 1.86 cm within its
  2). The arms and legs on the six climbs whose rig points moved by over 0.4 mm and on the goat's reach as deep as on
  21efea5e to within 2 mm (the donkey's right thigh and shin against the near face, 1.16 and 1.47 cm against 0.97 and
  1.30; the pig director's right hoof against the far face, 2.67 against 2.51 at 3.88 s), and at no instant more than 3
  mm deeper (the donkey's right thigh at 1.331 s); the other four's within 0.2 mm by the fit's way out.
- The eleven climbs build in 71.2 s against 65.7, 8.3% longer (the least of two builds each, the old code and the new in
  turn: buildtime-f23b-f29a.txt), and 2.2% longer than with the head fitted after the first round alone
  (buildtime-f28d-f29a.txt); 21efea5e's own total moved 2.3% across six such runs, its climbs up to 20% each. The fits
  inside the balance take no report: with theirs (var-f28c, the same motion) the climbs built 18.7% longer than on
  21efea5e (buildtime-f23b-f28c.txt). With the contacts read again on every pass, 11.5% longer against 2.9% (both before
  the head was fitted after the second round too: buildtime-f23b-f27a.txt and -f27c.txt), for the same motion to the bit
  (diffbody-f27a-f27c.txt), so they are read on the first pass only.

`tests/natural-traversal.test.mjs`: the climb test checks the catch: over the 50 ms to the last millisecond the 1 ms
pass reads in the air before the hands land (the balance's `fineAir`; on code without it, the last sample whose own
contacts read air), the body's angular momentum changes at most 10 N·m, the rig's airborne limit (21efea5e fails it on
eight climbs, 11.5 to 79.4 N·m); and the take-off's flight falls free: from 5 ms after its first sample in the air to
that last millisecond, the centre of mass accelerates within 0.98 m/s^2 of gravity, the rig's force limit (21efea5e
fails it on seven climbs, 1.05 to 2.86: the pig foreman's 1.93 at 1.177 s fails it first, the other six the catch's
check before it). The spline check reads the hips' move between its 1 ms keys as it reads the turn's. The climb test
passes (18 of 18: test-f29a-all.log); run with 21efea5e's code it fails nine climbs, as said (test-f29t-fix16code.log,
run on var-f27t: 21efea5e's code with this test, whose code lines are the tree's).

**Left.**
- The push off: the sheep's two (up to 115% at 0.857 s), the rabbit's two (up to 112% at 0.845 s).
- The step in: the rabbit's eight and the dog's five (up to 143% at 0.020 s); the walk-outs: the rabbit's four and the
  dog's four (up to 148% at 5.840 s).
- The pig director's let-go (four, up to 111%) and the dog's lead (107% at 0.868 s).
- The horse's head in the top's far edge, up to 2.9 mm for 8 ms at 3.933 s, between the fit's samples (21efea5e's kept
  16 mm clear).

### 2026-11-22 (physics balance, thirty-ninth part): the walk-out's right foot sets down over 80 ms

After the thirty-eighth part (f209cf98) the eleven climbs read 30 readings over the gate's limits, the worst the
rabbit's and the dog's as they walk away from the wall: 148 and 147% at 5.840 s, four readings each from 5.839 to 5.842
s, as the right foot comes round and sets down and the body turns onto the tile (motion/var-f28c's gate results, whose
motion f209cf98's code plays to the bit: part 38; scratchpad next-walkout/ holds every probe and output named here but
the var-* copies and those named with next-catch/ or motion/).

Read every millisecond on the rabbit (f209cf98's code lines: motion/var-f30g, and var-f30a for the samples):
- The right foot comes round to a key over its mark, 2.5 cm up (5.80 s), and sets down onto the mark by the next (5.84
  s), 40 ms later, where it stops, as at every limb key: its hoof bone came down at up to 91 m/s^2 (5.808 s) and 1.20
  m/s (5.820 s), the dog's the same (probe-hoofacc.mjs: hoofacc-rabbit-f30g-f31b.txt and -f31l88.txt).
- The legs' rate of angular momentum about the centre of mass swung by 270 N·m in 8 ms as that foot stopped, from (-188,
  95, 130) N·m at 5.832 s to (19, -3, -19) at 5.840; the head's by 48 and the arms' by 45
  (motion/probe-takeoff-segs.mjs: segs-rabbit-walkout-f30g.txt).
- Both feet were on the floor from 5.825 s, and the centre of mass lay on the balance's plan at every 5 ms sample (0.00
  mm: probe-walkout-samples.mjs, samples-rabbit-walkout.txt). What the 5 ms samples could not follow was the moment: the
  force the wrench asks of the feet barely changes from 5.835 to 5.840 s, but the moment flips, and the pressure point
  it needs (all ground forces at the floor: pz - cz = (-cy Fz - dLx)/Fy, px - cx = (dLz - cy Fx)/Fy, from the gate's
  rows) goes from inside the feet's hull at 5.835 s to 9.6 cm behind it and 8.3 cm past its side at 5.840, 13.9 cm from
  it (NOTES.md; the dog's 13.6: probe-pp-walkout.mjs, pp-walkout-f30a-f28c.txt): the rig's 148%.

**The fix**, wall-climb.js: the walk-out's right foot sets down over 80 ms, its land key at 5.88 s, 40 ms after the
trunk's key as it comes round (5.84). Its hoof now comes down at 23 m/s^2 at the most (5.821 s) and 0.61 m/s (5.840 s);
the largest rate of angular momentum the gate reads at its 5 ms rows from 5.79 to 5.93 s falls from 156 to 58 N·m on
both climbs (walkout-worst-f28c-f31l88.txt).

Tried and not kept:
- The key over the mark earlier instead, so the swing ends sooner (at 5.76 or 5.78 s: 80 and 60 ms set-downs, the swing
  40 and 20 ms shorter; var-f31r76 and var-f31r78, gated on the rabbit and the dog): the same eight readings go and none
  is new, but the swing is faster. That is the twenty-third part's way, which it tried on every step (each over key 0.08
  s before its landing) and did not keep: there the readings rose (the climb's 84 -> 88). Moving the land key leaves the
  swing within 3.3 mm of where it was (every vertex every 1 ms to 5.80 s, where the set-down starts: below).
- The left foot set down over 80 ms too (its land key 5.27 -> 5.31 s; it reads none; var-f31b, gated on all eleven): no
  reading changed, but it moved the body (its centre of mass by up to 4.2 mm and its pelvis by 4.7, the dog's:
  diffbody-f30g-f31b.txt) so that the right upper arm and forearm went up to 3.0 mm deeper into the far face as the body
  turns away (the rabbit's upper arm at 5.277 s; the dog's 2.8 mm, the pig foreman's 2.3), their deepest rising up to
  2.4 mm (the rabbit's upper arm 1.14 -> 1.38 cm, the dog's 0.84 -> 1.06, the pig foreman's 1.21 -> 1.39 and its forearm
  0.22 -> 0.38, the pig director's upper arm 1.48 -> 1.54: clear1ms-f30g-f31b.txt by clear-summary.mjs), and it moved
  the bodies before 5.0 s by up to 2.2 mm (the dog's jacket at 4.779 s; the dog's tail apart, which takes another path
  there as it does with the fix) against 0.08 (vertdiff2-f30g-f31b.txt and -f31l88.txt).

So (var-f31l88, whose code lines the tree's are), phantom-wrench 1.2.0 `--gate` on frozen copies: the eleven climbs read
22 readings against 30. The rabbit's 14 -> 10 and the dog's 10 -> 6: the eight as the right foot comes round and the
body turns onto the tile are gone, and none is new (next-catch/readings.mjs: readings-f28c-f31l88.txt). Of the 22
readings both keep, five rose, by 0.0023 points at most (the pig director's at 4.233 s; next-catch/rises17.mjs at no
threshold: rises-f28c-f31l88-tol0.txt), and seventeen fell or held. From 5.5 s to the end the rabbit's worst is now
36.4% (5.545 s) and the dog's 29.6% (5.965 s), the dog's read without its tail's contacts (below; as gated, 29.1% at
5.545 s). The worst reading of all is now the dog's step in, 143% at 0.020 s.

Measured on var-f31c (the tree's code lines too) against var-f30g:
- The windows and the low walls play as before, frame for frame (all 22: same-f30g-f31c-winvault.txt).
- What moves (every rig point every 1 ms: next-catch/probe-diff-body.mjs, diffbody-f30g-f31c.txt; every vertex every 1
  ms: round 4's next-catch/probe-vertdiff-r4.mjs on var-f31l88, vertdiff2-f30g-f31l88.txt): from 5.0 s on every vertex
  but the dog's tail by up to 25.1 mm, the legs and clothes as the right foot sets down 40 ms later (the pig foreman's
  trousers at 5.832 s; the right forearm and hand up to 8.3 mm, the bull's and cow's tails up to 10.2); the rig points
  by up to 21.4 mm (the rabbit's right knee), the centre of mass by 2.4 mm at most and the heads by 4.9; before 5.0 s
  every vertex by 0.08 mm at most, but the dog's tail. From 5.0 to 5.80 s, until the foot starts down, every vertex but
  the dog's tail moves by up to 3.28 mm, growing to the end (the pig foreman's cap at 5.800 s; each climb's largest 2.46
  to 3.28 mm, all at 5.800 s; 0.29 mm to 5.5 s and 1.68 to 5.75, the pig director's trousers; the right hoof 0.90 to
  1.04 mm at 5.726 to 5.729 s: the same probe, vertdiff-5to580-f30g-f31l88.txt).
- The right foot comes into support 25 ms later, at 5.850 s in the balance's outline and the rig's contacts alike (6
  points, 10 from 5.865 s; f209cf98's 6 at 5.825 s and 10 from 5.835: the gate's rows): from 5.825 to 5.845 s the rabbit
  stands on its left foot alone, its centre of mass 103 to 115 mm outside that foot's outline at the balance's 5 ms
  samples (f209cf98's at most 99.7 mm, to 5.820 s), falling onto the right foot as before; the rig reads at most 1.6 N
  of phantom force there (probe-walkout-samples.mjs: samples-rabbit-walkout-f31l88.txt against
  samples-rabbit-walkout.txt).
- The dog's tail moves by up to 9.7 cm before 5.0 s (a vertex of it at 2.970 s, over the top) and 10.3 cm at the end
  (5.843 s), for a reason outside the walk-out's own change. The tail fit follows the tail from moment to moment, and
  where that followed path comes within the fit's 4 mm margin at any one of its 20 ms samples, or half way between two,
  it plays instead the tail's path planned over the whole climb on a 10-degree grid (traversal-fit.js:
  createClearanceFit's step .02 and margin .004, solveTail's planned branch). On f209cf98 the dog's followed tail came
  0.155 mm inside that margin half way to its 5.82 s sample (5.81 s, its bend half way from 10.3 to 13 degrees of yaw),
  3.85 mm clear of the floor and the wall (the fit's depth: traversal-fit.js, into); at the 5.82 s sample itself it lay
  0.134 mm outside the margin. With the foot set down later it comes within the margin nowhere. (The decision logged on
  copies whose traversal-fit.js carries one log-only line: review round 1's patch-taillog.mjs on var-tl30 and var-tl31,
  taillog-dog-tl30.txt and -tl31.txt; with the depths at the sample and half way to it apart, patch-taillog2.mjs on
  var-tl30b, taillog2-dog-tl30b.txt; run-taillog.mjs builds the climb.) So f209cf98 played the planned path: pitched -10
  degrees from 2.959 to 3.141 s over the top (from 2.942 to 3.158 s at all) and +10 from 5.739 s to the end, still +10
  at 6.1 s, where the battle takes the tail back. The tree plays the followed path (its pitch and yaw every 1 ms:
  probe-tailtrack.mjs, tailtrack-dog-f30g-f31c-1ms.txt): over the top it pitches -8 degrees at the most (3.057 to 3.063
  s), then holds -2 from 3.173 to 5.625 s, where the follow's relax rounds a bend of 1 or 2 degrees to itself and never
  reaches rest (traversal-fit.js, Math.round(.8 v): as it was); at the end it yaws up to +20 degrees (5.837 to 5.843 s)
  and is at rest from 6.058 s. It keeps the fit's 4 mm from the wall and little more: 4.27 mm from the far face at the
  closest (5.819 s), and within 1 cm of it at every millisecond from 5.779 s to the end, where f209cf98's kept 34.4 mm
  or more over the whole climb (every tail vertex every 1 ms as the rig skins it: review round 3's probe-taildist.mjs,
  taildist-dog-f30g.txt and -f31l88.txt).
- So the rig, which counts any vertex within 1 cm of a surface as a contact, gives the dog's tail on the far face as a
  support at its 64 rows from 5.780 to 6.095 s (counts-r4.txt), and reads the dog's phantom wrench as 0 (at most 1.2e-6%
  of its limit) at every instant from 5.779 s to the end, 320 of them (counts-r5.mjs: counts-r5.txt): the figures above
  are read through it. Read without tail contacts (a copy of the gate whose rig leaves the tail meshes out of its
  contact surface: patch-notail.mjs on scratchpad/pw-notail, NO_TAIL=1; on f209cf98's motion, var-f28c, it reads all
  6097 instants as the gate does), the dog's walk-out still reads nothing over the limit: the same six readings, its
  worst from 5.5 s 29.6% at 5.965 s and from 5.79 to 5.81 s 4.2% at 5.805 (cmp-gates.mjs: cmp-notail-dog.txt, from
  notail-f31l88-dog.json and notail-f28c-dog.json). The rejected variants carry it too, var-f31r76 and var-f31r78 at 16
  rows (5.770 to 5.825 s and 6.080 to 6.095 s) and var-f31b at the same 64 (counts-r4.txt); read without tail contacts
  each keeps the same six readings, the tail having hidden at most 8.6, 16.6 and 34.1% of the limit there
  (cmp-notail-variants.txt).
- Clearance (every vertex every 1 ms over the whole climb by the fit's way out, to 0.001 mm: review round 1's copy of
  next-catch/probe-limbclear17b.mjs printing 4 decimals of a cm, probe-limbclear-4dp.mjs, on var-f31l88:
  clear4dp-f30g-f31l88.txt, summarized by clear-summary4.mjs: clear4dp-summary-f30g-f31l88.txt): no part goes more than
  0.089 mm deeper at any instant (the skunk's right upper arm at 5.178 s). 43 parts' deepest rose: the eight right upper
  arms by 0.052 to 0.084 mm (the donkey's and the sheep's most; deepest from 5.185 to 5.317 s, as the body turns away
  from the far face, their largest rises at one instant from 5.175 to 5.282 s), the skunk's tail by 0.012 and the other
  34 by 0.006 at most; eight parts cross a millimetre for 1 or 2 ms where f209cf98's stayed just under. The horse's head
  goes 2.586 -> 2.589 mm into the top's far edge at 3.933 s at this 1 ms step (2.9 read every 0.25 ms: part 38).
- The figures the climb test's comments give for the code as it stands, read again by the same probes against their
  f209cf98 runs (next-catch/'s tc1-full-r10.mjs, tc2-full-r10.mjs, tm-full-r10.mjs, probe-farreach-r7.mjs,
  probe-wristheight-r9.mjs, probe-unread-r9.mjs and probe-gripgap4-f11.mjs on var-f31c against var-f30f, f209cf98's code
  lines: tc1-full-f31c.txt, tc2-full-f31c.txt and the rest beside next-catch/'s -f30f outputs;
  next-catch/cmp-full-r10.mjs: cmp-tc1-f30f-f31c.txt and cmp-tc2-f30f-f31c.txt): every one holds within its bound. The
  far-hang hands rose most, by 0.004 to 0.006 mm (the pig foreman's 6.486 -> 6.493 mm, the horse's 0.360 -> 0.366, the
  skunk's 1.894 -> 1.899, the pig director's 3.151 -> 3.154); every other rose by under 0.0005 in its unit (cm, mm, m/s,
  m/s^2 or N·m; the most, the pig foreman's knee as it locks, 0.00041 m/s; the wrists by 0.001 cm at the 3 decimals that
  probe prints), or fell or held.
- Below the limit the walk-outs' peaks fell too: every climb's peak from 5.79 to 5.81 s, as the right foot's swing ends
  at its key over the mark (60 to 87% of the limit, the nine others' at 5.799 s), is now 2 to 10% (the dog's 4.2%, read
  without its tail); from 5.5 s to the end every climb's worst is now 21 to 36% (60 to 148%), and from 5.0 s 28 to 39%
  (walkout-peaks.mjs: walkout-peaks-f28c-f31l88.txt; the dog's from cmp-notail-dog.txt). Not every instant fell: as the
  foot comes down, at 5.815 s, where f209cf98 read none, the goat reads 21.9%, the sheep 21.2, the cow and bull 19.5 and
  19.4 and the horse and donkey 11.2 and 11.1; every other climb's largest rise from 5.5 s is 10.0 points or less (the
  rabbit's, at 5.855 s: subrise.mjs, subrise-f28c-f31l88.txt, each climb's largest rise, the dog's read without its
  tail). Counted only where f209cf98 read under 0.05%, those six stay over 10% for 3 to 14 ms in all, between 5.813 and
  5.829 s (counts-r5.txt). Before 5.5 s no instant rose by 1.7 points or more (the skunk's 1.6 at the probe's 0.1, at
  5.260 s, 6.3 -> 7.9%: subrise-0to55-f28c-f31l88.txt).
- The eleven climbs build in 71.2 s against 72.6 (the least of two builds each, f209cf98's code lines and the tree's in
  turn: motion/probe-buildtime.mjs, buildtime-f30g-f31c.txt; two framing stills for the video ran in its last minute),
  2.0% less: the same within the run's noise, single climbs differing by up to 15.5% either way.

`tests/natural-traversal.test.mjs`: the climb test checks the set-down: from 50 ms before the trunk's key as the right
foot comes round to 80 ms after it, the body's angular momentum changes at most 100 N·m (the test's own rate, read every
millisecond: f209cf98's code reads 129 to 173 N·m there; now 44 to 60: next-catch/probe-rate-at-r7.mjs,
rate-setdown-summary.txt). It bounds how hard the set-down jolts the body, not where that asks the feet to push:
f209cf98's rate peaked as the hoof started down and as it stopped (171 N·m at 5.807 s on the rabbit and the dog, the
other nine's peaks at 5.833), and at the rig's 148 and 147% (5.839 to 5.842 s) it read 22 to 77 (rate-setdown-f30g.txt),
so a set-down under 100 N·m could still flip the moment. On the ground the feet may push that rate, so no fixed limit
holds it: 100 N·m is a guard between the two. Its step check, which reads each step's leg against the IK's soft reach
over the step's phase and is exact at the lift and the landing, reads the climb's right foot 40 ms past its phase, on to
its landing: from 5.84 to 5.88 s that leg keeps 31.0 mm or more of the reach (the rabbit's, at 5.872 s), its hoof down
from 5.875 s (review round 2's probe-softreach.mjs: softreach-f31c-to588.txt). The test file passes (18 of 18 tests, the
eleven climbs' among them: test-f31c-t18-r3.log, on var-f31c-t18, the tree's test); with f209cf98's code (var-f30g-t18)
it fails all eleven climbs on the new check, 129 to 173 N·m (test-f30g-t18-r3.log).

**Left.**
- The step in: the rabbit's eight and the dog's five (up to 143% at 0.020 s), now the worst.
- The push off: the sheep's two (up to 115% at 0.857 s) and the rabbit's two (up to 112% at 0.845 s); the dog's lead
  (107% at 0.868 s).
- The pig director's let-go (four, up to 111%).
- The left foot's set-down at 40 ms (it reads none; set down over 80 ms it pushed the right arm into the far face).
- The tail fit's switch: a followed tail within its 4 mm margin at any one sample, or half way between two, hands the
  whole climb's tail to the planned path, so a tenth of a millimetre anywhere moves a tail everywhere (the dog's, with
  this change, though it kept 3.85 mm clear); and its relax stalls at 1 and 2 degrees.
- The tail fit keeps a tail 4 mm clear and the rig counts anything within 1 cm as a contact, so a tail between the two
  reads as a support (the dog's walk-out, with this change; read without it, nothing new over the limit). That is the
  rig's standing limit, not this change's: on f209cf98 as now it takes the skunk's plume (15 rows from 3.700 to 5.445 s)
  and the bull's tail (3.040 and 3.045 s) for supports, the same rows on both (counts-r4.txt), and on the tree they hide
  nothing (gated without tail contacts there, 40 and 10 instants change, each by under 0.01 points, and none reads over
  the limit either way: cmp-notail-skunk-bull.txt).
- The horse's head in the top's far edge (2.9 mm for 8 ms at 3.933 s), between the head fit's samples.

### 2026-11-22 (physics balance, fortieth part): the step in sets the left foot back

After the thirty-ninth part (08274608) the eleven climbs read 22 readings over the gate's limits, the worst the dog's
143% at 0.020 s and the rabbit's 137% at 0.025 s as they step in: the rabbit's eight from 0.004 to 0.027 s and the dog's
five from 0.019 to 0.023 s; besides them the sheep's two and the rabbit's two in the push (up to 115%), the dog's one as
its hooves leave (107%) and the pig director's four as its hands leave the top (up to 111%) (motion/var-f31l88's gate
results, 08274608's code lines; scratchpad next-stepin/ holds every probe and output named here but the var-* copies and
those named with next-catch/, next-walkout/ or motion/).

Read every millisecond on the dog and the rabbit (var-f31l88):
- The played centre of mass follows the balance's plan at every 5 ms sample, and its acceleration read every millisecond
  meets the gate's required force (the dog's 2.37 against 2.33 m/s^2 forward at 0.020 s: probe-stepin-acc.mjs,
  acc-dog-f31l88.txt): the readings are the played body's, which meets the plan's path at its samples but not the plan's
  model of its motion between them: the plan's 5 ms second difference reads the dog 1.89 m/s^2 forward at 0.020 s, and
  its rows take its turn at +29.5 N·m where the gate's row reads +15.5 (probe-start-ab2.mjs: start-ab2-f31l88-s5e.txt).
- In the battle stance the rabbit's and dog's rounded paws reach only 1.0 and 3.5 cm behind the centre of mass at rest:
  their heels lie above the rigs' 1 cm contact band, where the skunk's boots reach 9.4 cm behind it (probe-paw.mjs:
  paw-f31l88.txt; motion/video/f18/grid-feet2.jpg). From its first sample the plan accelerated the centre forward
  nonetheless, and its pressure point, as its rows take it (the centre less k a plus the turn's shift, k = h/fy:
  planCentre), lay up to 9.9 cm outside the rabbit's feet (0.025 s) and 10.1 outside the dog's (0.020 s), their outline
  there reaching 1.1 and 3.5 cm behind the centre; the nine others' lies inside throughout the step in's first 50 ms,
  their outline reaching 6.4 to 10.4 cm behind the centre (probe-start-pp.mjs: start-pp-f31l88.txt). The pressure point
  the played body asks for, which is what the gate reads, lay further out: 14.9 and 15.9 cm at those samples, the nine
  others' 1.9 to 3.6 cm on the tree (its centre's acceleration and its angular momentum's rate read over 0.5 ms chords,
  as the climb test now reads them: probe-played-pp.mjs, played-pp.txt).
- Without its pressure-point rows over the first 40 ms, the plan throws the centre forward at once (its pendulum
  pressure point 72.5 cm behind it at 5 ms on the rabbit, 76.6 on the dog) and from 45 ms barely accelerates (var-s3b, a
  diagnostic: acc-rabbit-s3b.txt, acc-dog-s3b.txt): the later rows want the centre well ahead of the support's back
  edge, and from rest the only way there is a forward start the paws cannot give. Nothing at the start alone brought it
  in (NOTES.md): the plan's end margin taken off or stopped at the rest centre (var-s1a, s1b: further out), its pull
  toward the authored path eased in at the ends (s1d: the same to 3 decimals), the turn faded in over 40 ms (s1f, gated:
  further out, 143 -> 153% on the dog), the start solved again to 20000 iterations with the rest held (s2a to s2c: the
  same within 1 mm), a gentler authored start (s3a: the same within 2 mm). The whole plan solved to 20000 iterations
  (s1c) did bring it in (gated: the rabbit's step in 8 -> 3 readings, worst 110%; the dog's 5 -> 0), but every plan of
  the climb moved with it and the rabbit's climb read 162 readings, 126 of them in its hang, up to 6627% (1.423 s).

**The fix**, wall-climb.js: the step in takes the left foot 4.5 cm further back than it did (its Step in and Crouch keys
at x -.080-back, where they were -.035-back), and the crouch keeps it there for the take-off. In the first 50 ms the
support is what it was (the rabbit's and dog's outlines the same within 0.72 mm, the plans within 0.56 mm:
probe-start-ab.mjs, start-ab-f31l88-s5e.txt; by 0.1 s the left ankle has moved half a centimetre: feet-track-s5e.txt),
yet the plan starts more gently: its pressure point now lies up to 5.0 cm outside the rabbit's feet and 4.8 outside the
dog's (start-pp-s5e.txt), the nine others' inside as before, and the played body's 8.8 and 8.8 (played-pp.txt). What
eases it is the crouch keeping the foot back from 0.4 s, which the plan, solved over the whole climb, reads from the
start: its later rows wanted the centre well ahead of the support's back edge (var-s3b above), and that edge now lies
4.5 cm further back from 0.385 to 0.735 s, 4.3 to 4.5 to 0.81 s and 2.6 to 4.0 from 0.83 s to the take-off
(probe-start-ab2.mjs: start-ab2-f31l88-s5e-late.txt); the authored centre lies up to 5.1 mm further back too, with the
leg's mass, and these copies do not separate the two. The step in's support alone does not do it: back 5.5 cm for the
step in only (var-s5b), the outline reaches further back than here from 0.1 to 0.49 s (start-ab2-s5e-s5b-late.txt) (the
rabbit's 3.80 against 3.30 cm behind its first centre at 0.2 s, 6.55 against 5.55 at 0.4; the dog's 4.00 against 3.50
and 6.75 against 5.75: the extra centimetre of its key), and the plan's start lies 6.4 and 6.7 cm outside the rabbit's
and dog's feet (start-ab-s5e-s5b.txt), the played body's 10.3 and 11.2, which the gate reads as 95 and 101%. The gate
reads this fix's two starts as 81 and 79% of its limit (worst-by-phase.mjs: worst-by-phase-f31l88-s5e.txt). That is a
margin, not a cure: at the start the gate's reading turns on what the plan barely registers. With the keys 4 cm back, an
arc on the step in's key (var-s4b, against var-s5f without it) lifted no foot (a planted key keeps the foot on the
floor) and moved the ankles less than a millimetre (0.85 mm at most from 0 to 0.5 s: probe-ankles-ab.mjs,
ankles-s4b-s5f.txt), but tilted the left paw enough to take some of its points out of the 1 cm band: the rabbit's left
toe corner at 0.030 s, the dog's left heel at 0.025 s (probe-hull-points.mjs: hull-points-s5f-s4b.txt), the outlines as
filled polygons 18.7 and 31.1 mm apart at most in the first 50 ms (probe-start-ab2.mjs: start-ab2-s5f-s4b.txt). The
plans stayed within 0.08 and 0.12 mm of each other, yet at 0.020 s, 0.034 mm apart, they asked the dog for 108 N forward
without the arc and 55 with it (the body's mass times the plan's 5 ms second difference), where the gate, reading the
played body, required 135.0 and 14.8 N and read 102% and none; and at the rabbit's 0.025 s sample, the outline the same
and the forward force the gate requires within 1 N (92.5 without the arc, 91.7 with it), the played turn alone (the
gate's -0.4 N·m without, +16.8 with) took the reading from 85% to 64%. The first 50 ms' worst went from 102 to 55% on
the dog and from 85 to 71% on the rabbit.

Tried and not kept (gated as named; the first 50 ms's worst reading, and the worst in the phases at the limit, on every
copy: variants-table.mjs, variants-table.txt):
- The rabbit's push reads within a point of the limit at every distance from 4 to 5.5 cm, with the arc or without it:
  100.51% at 4 cm (var-s5f; 100.64 with the arc, var-s4b), 99.86 at 4.5 (here), 100.88 at 5 (var-s5g; 100.82 with the
  arc, var-s4c), 99.78 at 5.5 (var-s5a; 99.84 with the arc, var-s4e); with the arc, 98.52 at 6 cm (var-s4d) and 91.81 at
  6.5 (var-s4a). That reading does not tell 4 to 5.5 cm apart: here it is under the limit by 0.14 points, at 4 and 5 cm
  over it by 0.5 to 0.9.
- 4 cm (var-s5f): the dog's start reads 102% (its plan 6.4 cm outside the feet at 0.020 s: start-pp-s5f.txt; the played
  body's 11.3: played-pp.txt).
- 5 cm (var-s5g, without the arc, gated on the rabbit and the dog only): the rabbit's push reads 100.88%, its only
  reading over the limit; the first 50 ms read 78.0% on the rabbit and 48.8% on the dog (here 81.2 and 78.6; the dog's
  step in reads 62.6% at 0.135 s, here 64.7: motion/var-s5e's g12-wall-dog.json), and the dog's take-off 84.7% (here
  90.5); the dog's trunk goes 2.02 cm into the face in its hang read every millisecond (trunk-dog-f31l88-s5g.txt; 1.97
  here), 1.98 by the fit's own report, which the climb test reads and passes (test-s5g-t19f.log; probe-fit-report.mjs:
  fit-report-dog.txt, 1.92 here, 2.11 at 5.5 cm). Between 4.5 and 5 cm the readings at the limits are hairs either way,
  and the starts' readings swing by tens of points with details here (above), the dog's 30 points lower at 5 cm: 4.5 cm
  is kept as the one with none over the gate's limit and its trunk within 2 cm by either measure, not for a margin.
- 5.5 cm (var-s5a, all eleven): 22 -> 4 as here, but the climb test failed the dog, its trunk left 2.1 cm in the face in
  its hang (allowed 2; 2.14 cm read every millisecond: clear4dp-f31l88-s5a.txt).
- 6.5 cm with the arc (var-s4a): the rabbit's, dog's and sheep's starts and pushes read 92% at most, but the pig
  director's jump touched something near 1.045 s, its flight read as two (fineAir [[0.87,1.055],[1.04,1.221]]), with six
  new readings in it (647% of the airborne torque at 1.054 s). Not gated: 6.5 cm without the arc, and 5.5 and 6 cm with
  it on all eleven or through the climb test (var-s4e, s4d: the rabbit and the pig director alone).
- Back for the step in only, the crouch where it was (var-s5b): the foot slid 5.5 cm forward again under the crouch, and
  the push read more (the rabbit's 112 -> 118% and a new 100%; the dog's lead 107 -> 115%), the dog keeping one as it
  steps in (101%) and the sheep its two (109%).
- 5.5 cm for the step in and 2.5 or 4 for the crouch (var-s5c, s5d): the rabbit kept two and one (109 and 104%), the
  foot sliding forward under the crouch.

So (var-s5e, whose code lines the tree's are but for the spelling -0.080 of the same number), phantom-wrench 1.2.0
`--gate` on frozen copies: the eleven climbs read 4 readings against 22, the pig director's four in its drop as they
were (each within 0.0001 points: next-catch/rises17.mjs at no threshold; next-catch/readings.mjs:
readings-f31l88-s5e.txt). Gone: the rabbit's ten (the step in's eight, the push's two), the dog's six (the step in's
five, the one as its hooves leave) and the sheep's two in its push; none new. The rabbit, the dog and the sheep now pass
the gate's phantom-wrench rule, the rabbit by 0.14 points (its push 99.86% of the limit at 0.845 s).

Measured on var-s5e against var-f31l88:
- The worst reading in each of the gate's phases, over its 5 ms rows and 1 ms checks between them
  (worst-by-phase-f31l88-s5e.txt): the step in's fell on the rabbit (137.5 -> 81.2%) and the dog (143.5 -> 78.6%); the
  push's on eight climbs (the sheep's 114.7 -> 81.9, the rabbit's 111.5 -> 99.9, the bull's 92.0 -> 58.0); the
  take-off's (the gate's phase "Over the top", from the hooves leaving) on seven, the horse's most (98.1 -> 57.5) and
  the dog's 106.8 -> 90.5; the jump's catch on ten (the rabbit's 50.7 -> 4.3). Others rose by more than 5 points, all
  under the limit: the sheep's take-off 52.5 -> 80.1%, the pig director's step in 30.3 -> 62.0% (0.125 s) and push 19.3
  -> 42.8%, the dog's crouch 63.1 -> 75.8%, the skunk's take-off 60.0 -> 71.9%, the horse's, donkey's and pig foreman's
  crouches by 7 to 9 points (to 21, 26 and 34%). From the hang on, every phase reads as it did within 0.01 points. Over
  90% of the limit now: the pig director's drop (110.7%, as before), the rabbit's push (99.9), the donkey's and sheep's
  drops (92.5 and 90.7, as before) and the dog's take-off (90.5).
- The gate's other rules (verdicts-f31l88-s5e.txt): the pig director's capsule overlaps of its head with its left hand,
  2.84 -> 2.91 cm (1.169 s, as its hands reach for the top in the jump; the gate's phase "Over the top"), and with its
  left forearm, 1.69 -> 2.10 cm (1.333 s, in its hang), now a second pair over the rule's 2 cm; the required force's
  peaks within 0.1 of the body's weight (3.0 to 3.2 times it, against 5); two point speeds within 0.1 m/s (the pig
  foreman's palm 8.1 -> 8.2 m/s, over the rule's 8 as before).
- The support schedule: the donkey's second round catches at 1.245 s where it caught at 1.250 (its flight 0.875 to 1.240
  s, 5 ms shorter); the other ten as they were (tc2-full-s5e.txt against next-walkout/tc2-full-f31c.txt).
- What moves, every vertex every 1 ms (next-catch/probe-vertdiff-r4.mjs: vertdiff-f31l88-s5e.txt): to 0.4 s, the left
  leg as its foot steps back, by up to 48.5 mm (the pig foreman's trousers at 0.400 s); from 0.4 to 1.0 s, the crouch
  and the take-off from there, up to 66.3 mm (the dog's trousers at 0.699 s, in the crouch); after 1.0 s the jump's
  flight, catch and hang play differently, up to 53.4 mm (the pig director's head at 1.246 s), the rabbit's head 29.9,
  the other climbs 13.8 to 23.5.
- The feet slide along the floor through the step in (each ankle's net horizontal displacement from 0 to 0.5 s, its
  height within 1.2 cm of standing throughout, read every 1 ms on every climb: probe-feet-slide.mjs,
  feet-slide-0500-all-f31l88-s5e.txt): the left 3.2 -> 5.5 cm on nine climbs (the donkey's 5.6), 16.7 -> 21.1 on the pig
  foreman and 19.4 -> 23.8 on the pig director (the pigs stand further back and step back to their mark); the right as
  before, 19.8 cm on nine (the donkey's 19.7) and 9.3 on the pigs.
- Clearance, every vertex every 1 ms (next-walkout/probe-limbclear-4dp.mjs). By the fit's way out, to 0.001 mm (the near
  face until 2.265 s: clear4dp-f31l88-s5e.txt; next-walkout/clear-summary4.mjs and clear-falls.mjs:
  clear4dp-summary-f31l88-s5e.txt, clear-falls-f31l88-s5e.txt), in the take-off (0.77 to 0.82 s), the catch and hang
  (1.25 to 1.37 s) and the hands' next grips (1.46 to 1.49 s), where legs, forearms and hands lie against the face, 30
  parts' deepest rose, 14 of them by more than 1 mm: the donkey's right thigh most (11.6 -> 20.9 mm at 1.348 s), its
  right forearm 26.7 -> 30.4, the dog's right shin 2.9 -> 5.9, the rabbit's right shin 9.9 -> 12.6 (0.818 s), the
  donkey's trunk 0.6 -> 3.2, the dog's trunk 18.6 -> 19.7 (the climb test allows 2 cm, reading the fit's own report:
  1.86 -> 1.92 cm, fit-report-dog.txt), the horse's, skunk's and dog's right forearms 1.0 to 1.3 mm deeper, and five
  hands; 40 parts' deepest fell, 25 of them by more than 1 mm, the skunk's right thigh 28.0 -> 21.2 mm and shin 26.3 ->
  20.9 in the take-off, the sheep's right thigh 17.0 -> 13.5 and shin 13.3 -> 9.5 (their deepest before in the catch, at
  1.25 s). As the take-off's and the catch's timing moved, legs, forearms and trunks lie over 1 mm in where they were
  not for up to 84 ms (the dog's right thigh, up to 9.5 mm at 1.259 s), and out where they were in at other moments. The
  heads as before (the horse's 2.589 mm at 3.933 s). The fit's way out reads a hand lying on the top as deep as it lies
  past the top's near edge (some 5 cm), so the hands are read by the true depth too, the least way out of the box
  (clear-hands-true-f31l88-s5e.txt, 1.2 to 1.55 s): around the catch their deepest fell on most climbs (the left hands'
  28.2 to 29.8 mm -> 24.8 to 26.0 on the goat, bull, cow, sheep, rabbit and dog, the rabbit's right 9.0 -> 0.8) and rose
  on five hands, by more than 1 mm on the pig foreman's two (10.2 -> 14.6 and 15.7 -> 17.2 mm) and the donkey's left
  (20.4 -> 22.6). At the next grips (1.44 to 1.52 s), where the fit's way out reads a hand up to 5.1 cm in that was
  clear (the donkey's right at 1.493 s: the grips' timing moved), the true depth rose by 1.1 mm at most (the donkey's
  left hand, 1.5 -> 2.6 mm at 1.440 s), the deepest there the pigs' as before (10.1 and 9.2 mm:
  clear-hands-true-grips-f31l88-s5e.txt).
- The figures the climb test's comments give, read again by the probes part 38 names (next-catch/'s tc1-full-r10.mjs,
  tc2-full-r10.mjs, tm-full-r10.mjs, probe-farreach-r7.mjs, probe-wristheight-r9.mjs, probe-unread-r9.mjs and
  probe-gripgap4-f11.mjs on var-s5e: tc1-full-s5e.txt and the rest, against next-walkout/'s -f31c outputs;
  next-catch/cmp-full-r10.mjs: cmp-tc1-full-f31c-s5e.txt, cmp-tc2-full-f31c-s5e.txt), every one within its bound; those
  that moved, brought up to date in the comments: the lower hoof at the last foot sample 2.4 to 9.0 mm (1.6 to 9.1), the
  hands at the catch 0.0 to 0.6 mm (the donkey's 0.56; 0.0 to 1.2), the body's turning as the hooves leave 15 to 63 N·m
  (12 to 64), the flight's first 50 ms 0.4 to 1.3 N·m (0.3 to 1.2) and their angular momentum 0.0003 to 0.0016 N·m·s off
  the flight's median (0.0006 to 0.0015), the pig director's boot at 0.870 s 0.3 N·m (0.5), the last 50 ms before the
  hands land 0.1 to 0.9 N·m (0.1 to 4.1), the take-off's flight 0.03 to 0.11 m/s^2 off gravity (0.04 to 0.14;
  rate-director-0870-s5e.txt and tm-full-s5e.txt), and the plan's rows at rest met within 0.17 um at the worst, the
  rabbit's climb (0.30; the dog's 0.17 -> 0.09: unread-s5e.txt), the windows' and low walls' within 0.08
  (probe-rows-kind.mjs: rows-window-lowwall-s5e.txt). The far reach, the wrists and the dog's grip in the far hang read
  as before (farreach-s5e.txt, wrist-s5e.txt, gripgap4-dog-s5e.txt the same to the digit).
- The windows and the low walls do not change: wall-climb.js, the one file whose code changes, is imported by neither
  (only the battle adapter and the study page import it).
- The eleven climbs build in 71.8 s against 71.0 (the least of two builds each, 08274608's code lines and the tree's in
  turn: motion/probe-buildtime.mjs, buildtime-f31l88-s5e.txt), 1.2% more: the same within the run's noise, single climbs
  from 8.9% less to 13.0% more.

`tests/natural-traversal.test.mjs`: the climb test checks that stepping in, the body asks less of the feet than it did:
over the first 50 ms, at each of the balance's samples from 5 ms (each of which must stand on the feet with an outline,
or the check fails), the pressure point the played body asks for (its centre's acceleration and its angular momentum's
rate read over 0.5 ms chords, the floor's push placed where its moment about the centre meets that rate) lies at most 10
cm outside the sample's outline. The gate reads the same played body: over the rabbit's and dog's starts it reads 8.9 to
9.3% of its limit per cm of this point outside the outline (eleven samples on five copies, played-pp.txt against the
copies' gate results: the rabbit's 0.025 s and the dog's 0.020 s on var-s5e, var-f31l88, var-s5f and var-s5b,
var-f31l88's rabbit at 0.005 s, var-s4b's rabbit at 0.005 s and dog at 0.015 s), so 10 cm is about 90% of its limit.
With the foot where it stepped before (08274608) the rabbit and the dog fail it, 14.9 and 15.9 cm (the gate: 137 and
143%; test-f31l88-t19f.log, on var-f31l88-t19b); 4 cm back the dog fails it, 11.3 (102%: test-s5f-t19f.log), and back
5.5 cm for the step in alone the rabbit, 10.3 (95%, under the gate's limit: test-s5b-t19f.log; its dog fails first on
its trunk, 2.0 cm in its hang); 4 cm back with the arc and 5 cm pass it, as they pass the gate there (the rabbit's 8.0
and 8.5, the dog's 6.2 and 5.1: played-pp.txt; test-s4b-t19f.log, test-s5g-t19f.log). Now 8.8 and 8.8 (81 and 79%), the
nine others' 3.6 at most. The plan's own pressure point (the balance's rows: probe-start-ab2.mjs) does not follow the
gate at the start: its turn is the balance's 5 ms differences averaged over five samples (traversal-balance.js, turning)
and its force the plan's 5 ms second difference, where the gate reads the played body every millisecond. On var-f31l88
at the rabbit's 5 ms sample its turn is +29.0 N·m where the gate's row reads -6.5, and its forward force 94.1 N where
the gate's reads 132.1: the plan's point lies 5.5 cm outside and the played 14.4, where the gate reads 134%
(start-ab2-f31l88-s5e.txt); on var-s4b at the dog's 15 ms sample the plan's 6.4, the played 6.2, the gate 55%
(start-ab2-s5f-s4b.txt). The floor pushes from nowhere outside the outline at all: the bound guards the start the body
had (15 cm), not the physics. The test file passes (18 of 18 tests, the eleven climbs' among them: test-s5e-t19f.log, on
var-s5e-t19b, whose test is the tree's); on var-f31l88-t19b, var-s5f-t19b and var-s5b-t19b, which hold the same test, it
fails only those climbs (16, 17 and 16 of 18), and on var-s4b-t19b and var-s5g-t19b it passes (18 of 18).

**Left.**
- The pig director's let-go (four, up to 111%), now the climbs' only readings over the limits.
- The climbs' start: the played body's pressure point still lies up to 8.8 cm outside the rabbit's and dog's feet in the
  first 50 ms (the plan's 5.0 and 4.8; the gate 81 and 79% of its limit), a margin that details the plan barely
  registers move by tens of points; the start wants a plan that the paws can give from rest.
- The rabbit's push at the limit's edge (99.86% at 0.845 s), as at every distance both keys were set back from 4 to 5.5
  cm: the plan's turning on the take-off's lead.
- The step in's feet slide along the floor (the right 19.8 cm and the left 5.5 on nine climbs; the pigs' left 21.1 and
  23.8, their right 9.3): a step in that lifts them.
- The pig director's head against its left forearm in its hang (2.10 cm, over the gate's 2 for capsules), and the legs
  and forearms a few millimetres deeper against the face in the catch and hang.
- The tail fit's switch to its planned path on a single brush with its margin, and its 4 mm margin inside the rig's 1 cm
  band.
- The horse's head in the top's far edge (2.9 mm for 8 ms at 3.933 s).

### 2026-11-22 (physics balance, forty-first part): the hands let go over their last 10 ms

After the fortieth part (b6643d4a) the eleven climbs read 4 readings over the gate's limits, all the pig director's as
its hands leave the top's far edge: 111% at 4.231 s, 104 and 107% at 4.232 and 4.233 (on contact, between the 5 ms
samples) and 108% at 4.236 (in the air), in the gate's phase "Drop", from the let-go key (4.205 s) to 4.505. There too
the donkey's and the sheep's drops read 93 and 91% (4.232 s) and the skunk's 80 (4.241 s, in the air) (motion/var-s5e's
gate results, b6643d4a's code lines; scratchpad next-letgo/ holds every probe and output named here but the var-* copies
and those named with next-catch/, next-stepin/ or next-walkout/).

Read at the gate's rows and every millisecond:
- The pig director's rows (every 5 ms: rows-at.mjs; NOTES.md's table): the upward part of the support its body asks for
  falls some 80 N every 5 ms, from 478 N at 4.210 s to 103 at 4.235 and none by 4.240, as the hands' contact thins from
  48 points to one. With one point of the left palm left (4.235 s), the force must pass through it, and its moment about
  the centre of mass does not meet the body's turn: the gate reads the difference as 59.7 N of phantom force and 20.1
  N·m of torque at the sample (81% of its limit); between the samples 70 to 81 N from 4.231 to 4.234 s, and 79 N at
  4.236 in the air as the last point leaves.
- The plan does not see the contact thin: planCentre takes a grip sample as able to give whatever support the plan needs
  (up to fmax body weights), however few of its points still touch, and every climb's plan held its centre on the hands
  to the last sample a hand touched (4.240 s, the pigs' 4.235) and let it fall from the next. The six rows where one or
  two points of the palms alone touched asked 67 to 127 N (the donkey's 127 on two points at 4.235 s, the pig director's
  105 on one; the bull's, the sheep's and the skunk's at 4.240: thin-grip-force.mjs, thin-grip-s5e.txt), the gate
  reading 24 to 81% of its limit there. Read every millisecond around the hands' last touch on the top (their contacts
  read as the balance reads them, on the played pose, but for the climb's tails, whose roots the probe does not tell
  from the rest, which can only add feet on the top within DRAPE of the centre of mass, as no body hanging from the top
  is; from the sample before the last that touches to the next), the played body asked for 125 to 185 N, upward, 170 to
  252% of the gate's phantom-force limit (73.5 N), the pigs the most (probe-letgo-support2.mjs:
  letgo-support2-rel5-s5e.txt), most at that window's first instant (4.235 s, the pigs' 4.230), where 2 to 15 points
  still touched (2 to 12 of them the hands') and the gate read nothing over its limit (0% on nine climbs, the bull's 51
  and the donkey's 57%: rows-at.mjs): its readings over the limit, the pig director's (4.231 to 4.236 s), came as the
  last one or two points left and in the millisecond after (probe-hand-points.mjs: hand-points-director-s5e.txt).

**The fix**, traversal-balance.js: a grip run that a flight longer than LOST (60 ms) follows ends RELEASE, 10 ms (two
samples), before its last touch (releaseGrips, run last in each round's schedule, roundSchedule, after the authored
seat's restore and LOST's; both exported for a unit test). Those samples take the flight's first sample's kind and raw
contacts, keep their own centre and are marked released: they are the flight's for all that reads the samples' kind (the
centre's plan, the 5 ms turn's flights and their refinement, and the motion's refit, which holds the climb's head
through its flights) and for the 1 ms turn's flights, which read the raw contacts and now hold the turn from a released
flight's first sample (fineFlights), where they ramp it in over FINE_RAMP after the first sample of a flight off a grip:
a hand that holds nothing turns nothing either. It mirrors the onset, a grip counted from ONSET (20 ms) after its first
touch as a hold builds: a hand lets go before its last touch. A gap that a round gives back to its support (a seat the
plan's move lifted, or a flight of LOST or shorter where the authored motion lies on the floor) is restored before the
release looks, so it is never released; a flight of LOST or shorter (a slip between two grips, at most 40 ms before the
onset's lag makes it LOST), a grip that ends on the feet, on a hold or with the motion, and a grip the motion starts on
are left as they are (a height-only hold the plan lifts for longer than LOST, which no restore gives back, is a flight
like any other; roundSchedule on made-up schedules: try-round.mjs, try-round-rel7.txt). The window's and the low wall's
grips all end on the feet (probe-runs.mjs: runs-s5e-window-lowwall.txt), so neither changes. On the climbs the drop's
flight now opens 10 ms sooner (4.235 s, the pigs' 4.230: tc2-full-rel4.txt), and the support the played body asks for,
as the gate's rows read it, comes down over the grip's last samples before it: the pig director's upward part 326 N at
4.215 s (414 before) and 126 at 4.225 (268), then 28 N downward at 4.230, the release's first sample (184 upward
before), and 7 upward at 4.235 (103) (rows-at.mjs). The rows where one or two points of the palms alone touch ask 3 to
21 N (five rows, the gate reading 0 to 11%: thin-grip-rel4.txt). Around the hands' last touch the played body now asks
for 21 to 32 N (29 to 43% of the limit), all of it at the release's first sample and downward
(letgo-support2-rel5-s5e.txt; below).

At the release's first sample (4.235 s, the pigs' 4.230) every climb is asked for 18.5 to 27.7 N downward as the gate's
rows read it (rows-drop-start.mjs: rows-drop-start-s5e-rel4.txt; 20.8 to 31.3 by the 0.5 ms chords the test reads). The
plan's own flight meets gravity there (its 5 ms second difference to the probe's 0.001 m/s^2: probe-plan-drop-start.mjs,
plan-drop-start-rel5-s5e.txt), but the played centre, which meets the plan at its samples, cannot follow the plan's step
from the grip's support (1.07 to 1.57 m/s^2 upward at the sample before) into free fall, and dips past it, 0.28 to 0.42
m/s^2 faster than gravity by the chords, then 0.04 to 0.10 back above it at the next sample. On b6643d4a the same 17.1
to 25.8 N fell at the drop's first sample in the air (its step 0.84 to 1.28 m/s^2, its dip 0.26 to 0.39), which the gate
read as phantom force, 19 to 35% of its limit, the horse's and the pig foreman's worst readings in their drops (24.4 and
26.4%). Now 2 to 12 hand points still lie within the rig's centimetre there, and the gate, whose hand contacts may pull,
lets them give it (0 to 11%), as no palm sliding off the top could. So the drops' fall in the gate's reading is in part
that pull moving onto the hands: on the horse and the pig foreman wholly.

Tried and not kept (gated as named, all eleven climbs):
- 20 ms, ONSET's own length, on the plan's kinds alone (var-r1): every climb passes the gate's phantom-wrench rule, the
  drops' worst 10.7 to 38.5% (the skunk's 38.5 in the air at 4.241 s: worst-by-phase-s5e-r1.txt), but more moves: the
  heads 9 to 18 mm around the let-go on nine climbs and the skunk's tail plume 54.7 mm at 4.314 s, its fit switched
  (vertdiff-s5e-r1.txt), and the horse's, goat's, donkey's and dog's right toes pass the gate's 8 m/s at 4.12 s (7.84 to
  7.90 -> 8.04 to 8.08 m/s), before the let-go: the plan is solved over the whole climb.
- 10 ms on the plan's kinds alone (var-r2): the drops' worst up to 37.2% (the sheep's), and the climb test failed the
  rabbit, its drop flight turning at 11.5 N·m at 4.237 s (test-r2-t19b.log): the 1 ms turn reads flights by the raw
  contacts, which still touched, so it held nothing through the release.
- 10 ms on both, the turn ramped in after the release's first sample (var-r3): the drops' worst 10.9 to 20.2% (here 10.9
  to 20.6: the skunk's 17.5 against 11.9 held, the sheep's 19.3 against 17.6, the donkey's 20.2 against 20.6, the eight
  others' the same: next-stepin/worst-by-phase.mjs, worst-by-phase-r3-rel4.txt), and the climb test passes, but through
  the release the turn read 1.9 to 9.5 N·m (the rabbit's 9.5 at 4.236 s, against the test's 10 for the drop's flight),
  where, held from that sample, it reads 0.06 to 0.20 (probe-release-spin.mjs: release-spin-r3-rel4-s5e.txt). Its
  vertices move from b6643d4a's as here, the same to 0.01 mm (vertdiff-s5e-r3.txt, vertdiff-s5e-rel4.txt).

So (var-rel4, gated; the tree's code lines are var-rel8's, the release made a function run last in each round's schedule
with its guards, the held schedule (more than two rounds, which no caller uses) giving a sample the held one's fields
but its centre wherever its kind or its released flag differs, which moves every vertex of all 33 crossings as var-rel4
does, to the bit: probe-same.mjs, same-rel4-rel8-wall.txt and same-rel4-rel8-window-lowwall.txt), phantom-wrench 1.2.0
`--gate` on frozen copies: the eleven climbs read no readings over the gate's limits, against 4 (readings-s5e-rel4.txt);
the pig director passes its phantom-wrench rule.

Measured on var-rel4 against var-s5e:
- The worst reading in each of the gate's phases (worst-by-phase-s5e-rel4.txt): the drop's fell on all eleven, to 10.9
  to 20.6%: the pig director's 110.7 -> 12.0, the donkey's 92.5 -> 20.6, the sheep's 90.7 -> 17.6, the skunk's 79.7 ->
  11.9, the bull's 58.4 -> 13.2, the goat's 56.2 -> 16.9, the dog's 54.7 -> 11.2, the rabbit's 40.1 -> 12.0, the cow's
  40.0 -> 12.1, the pig foreman's 26.4 -> 15.4, the horse's 24.4 -> 10.9 (the horse's and the pig foreman's the pull
  above moving onto the hands). Up to the let-go every phase reads as it did; after the drop every phase within 0.03
  points (the pig director's left foot round the most, 36.55 -> 36.57%) but the weight on the right foot as the walk-out
  begins, the cow's 17.9 -> 16.8% (4.745 s) and the pig director's 9.5 -> 10.4 (4.930 s).
- The gate's other rules, from its JSONs' own maxima (each rig point's fastest, from 1 ms differences: speeds-diff.mjs,
  speeds-s5e-rel4.txt; its text verdicts round to 0.1 m/s and list only the points over the rule): every climb's right
  toe 0.019 to 0.058 m/s faster at 4.120 to 4.123 s, before the let-go, and the pigs' left toes 0.040 and 0.054 (the
  foreman's 11.114 -> 11.161 and 9.829 -> 9.869 m/s, the director's 11.079 -> 11.137 and 10.314 -> 10.368); the nine
  others' right toes stay under the rule's 8 m/s (7.401 to 7.957, the goat's the nearest, 7.898 before), the pigs' over
  it as before, and the points over it are the same four on each climb; no other point's fastest moves by more than
  0.005 m/s. The joint rule's extremes move 0.17 degrees at most (the sheep's right elbow's least bend, 2.92 -> 3.08
  degrees at 4.176 s), the pigs' elbows past the rig's range at the push-off as before (155.2 and 155.9 against 150
  degrees).
- The support schedule (tc2-full-rel4.txt against next-stepin/tc2-full-s5e.txt): the drop's flight from 4.235 s on nine
  climbs (4.245 before) and 4.230 on the pigs (4.240), the rest as before.
- What moves, every vertex every 1 ms (next-catch/probe-vertdiff-r4.mjs: vertdiff-s5e-rel4.txt): to 4.0 s within 1.65 mm
  (the cow's and the bull's heads at 4.000 s: the plan is solved over the whole climb); from 4.0 to 4.6 s 3.4 to 9.4 mm
  on ten climbs (the cow's head 9.4 at 4.097 s, the bull's 8.4 at 4.092, the legs and feet up to 7.3), but the donkey's
  head 57.8 mm at 4.254 s and 27.5 at 4.600, its mane 23.7 at 4.469; after 4.6 s within 0.9 mm on the ten. The climb's
  clearance fit turns a head only where the bare head comes within the fit's margin of the wall, taking the cheapest
  candidate turn that clears (traversal-fit.js, solveHead): on b6643d4a the donkey's came within it in its drop, and the
  fit turned the head -12 degrees about its turn axis from 4.26 to 4.46 s (eased in from 4.00 s and out to 4.74); on the
  tree's code the fit finds nothing to clear there and leaves the head unturned (probe-head-fit.mjs:
  head-fit-donkey-s5e-rel5.txt). That is all of it: the head bone lies up to 12.0 degrees from b6643d4a's (4.420 s),
  over 1 degree from 4.045 to 4.675 s, 4.9 of it its direction (5.05 at most, at 4.255) and 11.0 a twist about its long
  axis (probe-head-rot20.mjs: head-rot-donkey-s5e-rel4.txt); b6643d4a's twisted 13.9 degrees about that axis and back,
  the tree's 3.6 at most, its whole turn no faster (82 degrees a second at most from 4.0 to 4.75 s, against 114:
  probe-head-twist20.mjs, head-twist-donkey-s5e-rel4.txt). It is not the head's hold through the drop starting 10 ms
  sooner: refit with the air of b6643d4a's schedule, a copy turns the head the same to 0.01 degrees (review round 2's
  var-rel5h: review-fix20-r2/head-rot-donkey-s5e-rel5h.txt).
- The pig director's head passes 8.3 mm from the wall's top at 4.225 s (10.6 before: probe-head-gap.mjs,
  head-gap-director-s5e-rel4.txt), inside the rig's 1 cm band, so the gate counts it among the contacts from 4.215 to
  4.235 s, where the support asked falls from 328 N to 127, then 28 downward and 7, with the hands touching too. The pig
  foreman's passes 3.5 mm from the wall at 4.230 s (5.0 before: head-gap-pigs-s5e-rel6.txt,
  head-gap-foreman-s5e-rel6.txt), within that band before and after; neither touches.
- Clearance, every vertex every 1 ms from 4.0 to 4.7 s (next-walkout/probe-limbclear-4dp.mjs). By the fit's way out
  (clear4dp-s5e-rel4.txt; next-walkout/clear-summary4.mjs: clear4dp-summary-s5e-rel4.txt) 59 parts' deepest rose, by
  1.35 mm at most (the pig foreman's right fingers, 7.3 -> 8.7 mm), the rest by 1.0 at most (the horse's left forearm,
  33.0 -> 34.0); parts lie over 1 mm in where they were not for up to 19 ms (the pig director's right forearm); the
  heads in nowhere, as before. By the true depth, the least way out of the box (clear-hands-true-s5e-rel4.txt,
  clear-hands-true-summary-s5e-rel4.txt), the hands read as by the fit's way out here, past the top's far edge: the
  deepest of 21 hand and finger parts rose, by 1.35 mm at most (the pig foreman's right fingers, as above), the rest by
  0.74 at most (the donkey's right hand, 7.0 -> 7.8 mm), and a hand lies over 1 mm in where it was not for up to 18 ms
  (the rabbit's right).
- The figures the climb test's comments give, read again (next-catch/'s tc1-full-r10.mjs, tc2-full-r10.mjs and
  tm-full-r10.mjs on var-rel4: tc1-full-rel4.txt, tc2-full-rel4.txt, tm-full-rel4.txt, against next-stepin/'s -s5e
  outputs; next-catch/cmp-full-r10.mjs: cmp-tc1-full-s5e-rel4.txt, cmp-tc2-full-s5e-rel4.txt), every one within its
  bound: the nine's drop flights turn at 3.2 to 6.0 N·m (3.1 to 5.9 before), the pigs' at 12.1 and 11.7 (12.1 and 12.1);
  the hand point nearest the wall's surface lowering down the far face (3.85 to 4.15 s) rose on the horse (0.37 -> 0.45
  mm), the dog (0.46 -> 0.50) and the pig director (3.15 -> 3.16), under the test's 10 mm; the rest within 0.00002.
- The windows and the low walls do not change: the same to the bit, their schedules, plans and every vertex every 1 ms
  (probe-same.mjs: same-s5e-rel4-window-lowwall.txt).
- The eleven climbs build in 72.6 s against 73.7 (the least of two builds each, b6643d4a's code lines and var-rel4's in
  turn: motion/probe-buildtime.mjs, buildtime-s5e-rel4.txt), 1.5% less: the same within the run's noise, single climbs
  from 11.8% less to 4.0% more.

`tests/natural-traversal.test.mjs`: releaseGrips's unit test: on the balance's 5 ms grid a grip run that a flight longer
than LOST follows lets go 10 ms early, its last two samples the flight's (kind and raw contacts, their own centres
kept), and a flight of LOST or shorter, a slip between two grips as the onset leaves it, a grip that ends on the feet,
on a hold or with the motion, and a grip the motion starts on are left as they are and roundSchedule's order: a round
releases a let-go after its restores, a gap the plan made where the authored grip ended on the feet goes back to the
feet, and a seat the plan lifted for 65 ms (longer than LOST, so only the seat's restore gives it back) goes back to the
seat before the release looks; with the release first in roundSchedule the unit test fails on that seat (var-rel7x:
test-rel7x-unit.log). The climb test checks two things more. Letting go, around the hands' last touch on the top after
the let-go (their contacts read as the balance reads them, but for the climb's tails, whose roots it does not tell from
the rest, which can only add feet on the top within DRAPE (15 cm) of the centre of mass, as no body hanging from the top
is: contactProbe and supportAt on the played pose at each of its samples, a grip while a hand point lies within the
rig's centimetre of the wall; from the sample before the last that touches to the first that does not, between which the
touch ends), the support the played body asks for (its mass times its centre's acceleration less gravity's, read over
0.5 ms chords every millisecond) is at most 10% of its weight, the gate's phantom-force limit. It bounds that force's
size, not its direction nor the turn it asks for, and it guards the release's premise rather than a gate reading: at its
window's first instant b6643d4a asks for 125 to 185 N where the gate reads nothing over its limit on any climb. And
through the release's 10 ms (the drop's flight's first two samples, which must be marked released) the body's angular
momentum changes at most 1 N·m, a tenth of the rig's airborne limit; the gate sees the hold only in part (it reads the
hand points still within its centimetre as contacts there, the window's last 2 to 5 ms airborne on six climbs:
gate-air-release.mjs, gate-air-release-rel4.txt; and its drops' worst differ, ramped against held, on three climbs,
above), so the bound guards the plan's own premise, that a released hand holds nothing. Now 21 to 32 N (downward, above)
and 0.06 to 0.20 N·m. On b6643d4a's code every climb fails the first, 125 to 185 N, and the unit test fails, there being
no releaseGrips (test-s5e-t20e.log, on var-s5e-t20, whose test is the tree's: 7 of 19 pass); with the turn ramped in
after the release's first sample every climb fails the second, 1.9 to 9.5 N·m (test-rel8n.log, on var-rel8n, the tree's
code lines but the hold: 8 of 19). The drop's flight check, its flight now opening at the release, reads 3.2 to 6.0 N·m
against its 10. The test file passes (19 of 19 tests: test-rel8.log, on var-rel8, whose test is the tree's).

**Left.**
- The drop's centre dipping past gravity at the flight's first sample, now the release's, where its track cannot follow
  the plan's step into free fall: 19 to 28 N downward by the gate's rows, which the gate lets the hands still touching
  give. The 1 ms pass does not hold the centre off a grip (traversal-balance.js, fineFlights: eased in over 5 ms, before
  the release, it raised the pig director's let-go); held from a released flight's first sample, untried.
- The pigs' heads within the rig's 1 cm band of the top as they let go (the director's 8.3 mm at 4.225 s, newly; the
  foreman's 3.5 at 4.230, 5.0 before), so the gate counts them contacts there.
- The climbs' start: the played body's pressure point still lies up to 8.8 cm outside the rabbit's and dog's feet in the
  first 50 ms (the plan's 5.0 and 4.8; the gate 81 and 79% of its limit), a margin that details the plan barely
  registers move by tens of points; the start wants a plan that the paws can give from rest.
- The rabbit's push at the limit's edge (99.86% at 0.845 s), as at every distance both keys were set back from 4 to 5.5
  cm: the plan's turning on the take-off's lead.
- Around the let-go some parts lie a little deeper against the wall: 59 parts' deepest by up to 1.35 mm (the pig
  foreman's right fingers, 7.3 -> 8.7 mm into the top, by the fit's way out; the hands by the true depth the same).
- The step in's feet slide along the floor (the right 19.8 cm and the left 5.5 on nine climbs; the pigs' left 21.1 and
  23.8, their right 9.3): a step in that lifts them.
- The pig director's head against its left forearm in its hang (2.10 cm, over the gate's 2 for capsules), and the legs
  and forearms a few millimetres deeper against the face in the catch and hang.
- The tail fit's switch to its planned path on a single brush with its margin, and its 4 mm margin inside the rig's 1 cm
  band.
- The horse's head in the top's far edge (2.9 mm for 8 ms at 3.933 s).

### 2026-11-22 (physics balance, forty-second part): the window's hands to the floor

After the forty-first part (15a4e470) the eleven windows read 529 readings over the gate's limits (the horse 34, the
goat 44, the bull 29, the cow 53, the donkey 60, the sheep 37, the skunk 126, the pig foreman 11, the pig director 40,
the rabbit 79, the dog 16, the twenty-fourth part's counts), 197 of them in the gate's phase "Hands to the floor" and
157 in the roll; the low walls 2 and the climbs none (motion/var-f20w's gate results for the windows and the low walls,
var-rel4's for the climbs: var-rel4's code lines, which play every crossing as 15a4e470's to the bit,
next-letgo/same-rel4-rel8-wall.txt and same-rel4-rel8-window-lowwall.txt; scratchpad next-window/ holds every probe and
output named here but the var-* copies and those named with next-letgo/, and its NOTES.md is the log).

Diving through the window the right hand braces on the far face below the sill (window-dive.js BRACE, 1.42 to 2.06 s),
the left hand sets down on the floor (2.08 s) and the right follows it there (2.18 s). Two things went wrong there as
the gate reads it:
- The brace's end. The balance planned the brace as a grip to its last touch, and a grip as able to give any force
  (planCentre: up to fmax body weights, either way); as the right palm came off the far face its points thinned, as the
  climbs' palms did off the top (the forty-first part), and the gate read what they could not give: the cow's 631% of
  its limit at 2.089 s, the goat's 247% at 2.079 (kind-readings.mjs: readings-f20w-window.txt). The forty-first part's
  release lets a grip go only into a flight; this one ends on the feet, the left hand on the floor being the feet's
  outline.
- One palm alone. From the brace's end to the right hand's landing the left palm alone held the body, and on 29 of the
  phase's 41 rows over the gate's limits, on eight windows, the torque the gate found left over lay mostly about the
  vertical, 37 to 61 N·m (twist-rows.mjs: twist-rows-f20w-w2-f21.txt; torque-axis.mjs sorts every window's rows so).
  planCentre puts a feet sample's pressure point where the push meets the body's level turn, p = c - k a + (dL_z, -dL_x)
  / (M fy); so placed, the push turns the body about the vertical by -(dL_x a_x + dL_z a_z) / fy (the k terms cancel),
  and nothing in the plan meets that with the body's own turn about the vertical, dL_y. On two feet the patches' twist
  against the floor gives the difference; one palm, its seven points 1.3 cm from their middle on average, cannot: on
  those rows the push so placed asked -90 to 28 N·m of twist against the body's own -18 to 36, as the gate reads the
  force and the turn. A force through one point turns the body only about axes across the line from the centre of mass
  to that point (and across the force): one palm cannot change the body's spin about that line.

Two changes in traversal-balance.js:
- releaseGrips lets a grip go onto the feet where each of its last RELEASE samples already stands on an outline of its
  own, with an area, and the feet bear for longer than LOST after it: those samples are the feet's, on their own
  outline, their centre and raw contacts kept, marked released. supportAt keeps for this, on a grip sample, the outline
  of what stands on the floor or a top beside the grip (feetBox, feetHull and feetFloor, which planCentre does not
  read). Released so (probe-released.mjs: released-w5.txt against released-rel8.txt): every window's brace (from 2.075
  to 2.135 s, onto the left palm on the floor: the cow's at 2.085, an outline 1.3 cm from its middle on average:
  probe-released-outline.mjs, released-outline-f21.txt), the pig director's grip on the window's sill as it slides over
  (1.360 s, onto what lies on the sill beside its hands, a 7.3 cm outline), every low wall's hands as the feet absorb
  (1.670 to 1.685 s) and every climb's palms on the far face as the feet land (4.730 to 4.745 s). A grip whose last
  samples have no outline of their own (or one with no area, a single floor point's), or that the feet follow for LOST
  or less, is left.
- holdPatchSpin, in bodyTurn's contacts: over a run of samples on a support that cannot twist, the feet or a hold on one
  outline whose mean reach from its middle is under PATCH (4 cm: one palm, one hoof), the contacts' target angular
  momentum keeps its change along the line from the centre of mass to the outline's middle, at its floor, within a rough
  allowance for what the patch can give about that line (PATCH_TWIST, a half, of what friction, MU, gives at the body's
  weight over the outline's reach, per second: friction twists the patch about the floor's normal, only part of which
  lies along the line, and the push's point can wander across the patch), and what it kept eases back over PATCH_EASE
  (0.1 s) after the run, unless a flight cuts that easing back (a flight holds its own turn): the turn then holds the
  body's spin about that line as a flight holds all of it. It acts (probe-point-supports.mjs: point-supports-w3.txt) on
  every window's hands to the floor (runs from between 2.075 and 2.130 s to 2.160) and on small patches in five windows'
  rolls, and in the balance's first round on the pig foreman's feet on the sill as it slides over (1.390 to 1.410 s, a
  patch 3.0 to 3.3 cm in reach), which the played motion keeps (its slide over's worst 47.82% at 1.392 s against 50.72
  with the release alone); on no low wall; on the climbs only on single samples, the take-off's last foot sample, which
  turnAir already holds as flight. The climbs and the low walls play as without it, to the bit (probe-same-motion.mjs,
  every 5 ms: same-w3-w5-wall-lowwall.txt).

So (motion/var-f21, gated: the tree's code lines but the area guard on releaseGrips, which no crossing reaches: the
tree's own, motion/var-f21b, play every rig point of all 33 crossings as var-f21, every millisecond, to the bit,
same-f21-f21b.txt; and var-f21 plays them as var-w5, where the work was measured, same-w5-f21-window.txt and
same-w5-f21-wall-lowwall.txt, its eleven window gates equal to var-w5's), phantom-wrench 1.2.0 `--gate` on frozen
copies:
- The windows read 368 readings against 529 (readings-f21-window.txt): the horse 30, the goat 14, the bull 20, the cow
  19, the donkey 56, the sheep 21, the skunk 101, the pig foreman 11, the pig director 30, the rabbit 50, the dog 16.
  Hands to the floor 38 against 197 (phase-counts-f20w-f21-window.txt: the horse's 6 and the sheep's 19 to none, the
  goat's 36 to 7, the bull's 10 to 2, the cow's 36 to 3, the donkey's 27 to 19, the skunk's 29 to 4, the rabbit's 34 to
  3), and none of its rows over the limits by torque reads its leftover torque mostly about the vertical
  (twist-rows-f20w-w2-f21.txt); new among its readings (newreadings-hands-f20w-f21.txt), the donkey's four, 145% at
  2.136 and 2.137 s and 125 to 128% at 2.177 and 2.178 (their causes below), and the goat's 114% at 2.093 against 96.
  The pig director's slide over 10 against 20. The roll 166 against 157 (newreadings.mjs:
  newreadings-roll-f20w-f21.txt): the sheep's three new, 295 to 337% at 2.710 to 2.712 s against none, are its tail,
  which the tail fit now lifts off the floor there where it held the body (the row at 2.710 s lists the tail on the
  floor before, not now); the rest are readings near the limit crossing it either way as the turn the hand's stretch
  adds unwinds into the roll (UNWIND, 0.3 s; the bodies up to 10 to 26 mm off through the roll:
  vertdiff-rel8-f21-window-roll.txt), eleven that read 83 to 99% before now reading 101 to 125% (the horse's two, the
  donkey's four, the skunk's one, the rabbit's four) and five that read over now 84 to 97% (the goat's, the bull's, the
  skunk's, the rabbit's two). Not the hold on the roll's own small patches: PATCH 2 cm, which leaves out every one but
  the pig director's (2.690 to 2.715 s: point-supports-w5r-r02.txt), reads fix 21's readings over the limits instant for
  instant on every window (newreadings-f21-w5r.txt), and the roll's new readings fall on windows where it holds no roll
  patch. The cow's right foot in 11 against 12; every other phase's count the same.
- The worst readings (kind-readings.mjs): the goat's 154% against 247 (hands to the floor, 2.095 s); the cow's hands to
  the floor 134% against 631 (2.095 s; its worst, the right foot in's 472% at 3.194, as before); the pig director's
  slide over 215% against 347 (1.350 s); the rabbit's 291% against 298 (the roll). Three rise: the sheep's by 0.18
  points (732.8% at 2.837 s, in its roll). The skunk's, 457% at 2.093 s against 339, where its brace's contact thins to
  one point beside the left palm (a grip sample there): those points cannot give the force the body asks, some 650 N
  toward the far face with its sideways part, together with the moment about the centre of mass that comes with it (the
  physics check lets a hand on a face pull, so what it reads is that moment, not a pull); with the release alone
  (var-w2) it reads 367% there, and the hold adds 90 points through the force, its sideways part 405 N against 234 (212
  before), the push toward the face the same on all three, 37 ms before the hold's own run starts (2.130 s) (the gate's
  solve again with the demand swapped between the copies, probe-nnls-split.mjs and nnls-swap.mjs copied from the review:
  nnls-split-rel8-skunk.txt and the others, nnls-swap-skunk.txt). And the donkey's, 283% at 2.135 s against 239 there
  (its hands to the floor's worst before, 258% at 2.141, reads 205 now), on its left palm alone just after the brace's
  release (2.125 to 2.130 s), by force: there the level force the gate reads, 294 N (310 on fix 20), is more than the
  palm's friction holds (186 N on fix 20, at the rig's 1.2), and the release raises its part toward the wall, 149 -> 177
  N (with the release alone, var-w2, it reads 264%); the hold adds 19 points through the part of the body's turn across
  the line to the palm, 19.6 N·m apart, which the palm can give only with force. So the gate's solve again with one part
  of the demand swapped at a time between the copies (nnls-fparts.mjs and nnls-along.mjs copied from the review:
  fparts-donkey-mine.txt, along-donkey-f21b-w3-mine.txt): on fix 20's contacts and turn, the release's force toward the
  wall alone reads 262.7%, its push alone 243.1%; on fix 21's contacts and force, the release's turn across the line
  alone reads 265.9%, about the line alone 282.9% (the spin about the line, 40 N·m against 4, goes to the torque left
  over, 75 N·m, under the force's share). That spin is the hold's own start: over the first milliseconds of the donkey's
  stretch on one palm, 2.134 to 2.138 s, its spin about the line to the palm changes at 29 to 60 N·m with the hold, 5 to
  26 without. Of the donkey's four new readings the release makes three, over the limit with the release alone (var-w2:
  104.3% at 2.136 s, 102.0 and 100.6% at 2.177 and 2.178 with both palms down; fix 20 82.0, 98.0 and 96.8), and the hold
  raises them to 145, 128 and 125%: at 2.136 its turn, about 23 points of it its spin about the line, which makes that
  reading one by torque (121.9% with the release's spin about the line instead), the rest its turn across the line
  (105.9 with the release's whole turn), at 2.177 its force (83.9% with the release's level force; its turn lowers it
  there, 144.0 with the release's). The hold's own start makes the fourth, 145% at 2.137 s by torque (65.9 with the
  release alone, 70.6 on fix 20; 58.3 with the release's spin about the line) (probe-nnls-split.mjs,
  nnls6-f21b-donkey-mine.txt, along6-donkey-f21b-w3.txt, fparts6-donkey-f21b-w3.txt). The goat's new reading, 114% at
  2.093 s in its first stretch on one palm (2.086 to 2.096 s), is the hold's: 99.1% with the release alone, 95.6 on fix
  20 (readings-at.mjs). The hold lowers its stretch's start on seven windows (the horse's, the goat's, the bull's, the
  cow's, the sheep's, the skunk's and the pig director's, every millisecond of the first five) and the rabbit's first
  stretch, the pig foreman's after its first millisecond (22 to 14 N·m against 22 to 18); it raises the donkey's, the
  dog's (28 and 27 against 23 and 21 at 2.094 and 2.095 s, its stretch on one palm starting at 2.091 with the hold,
  2.094 without) and the first 2 ms of the rabbit's second stretch (27 and 27 against 9 and 9 at 2.136 and 2.137 s)
  (stretch-starts.mjs on patch-spin2-f21b-series.txt and patch-spin2-f21n2-series.txt; rows-donkey.mjs:
  rows-donkey-f20w-f21.txt). Under the limit the dog's hands to the floor's worst 85.0% at 2.161 s against 83.1 at 2.158
  (80.9 at 2.161), and as its brace lets go, from 2.090 to 2.093 s, 28 to 73% against 7 to 20.
- The gate's other phases, rules and points (gatediff2.mjs, at full precision: the rules' passes, the wrench rule's
  time, the contact force's peaks, every row's and 1 ms check's reading, every point's fastest, the joints' extremes,
  the overlaps, jumps, pops and unresolved instants: gatediff2-f20w-f21-window.txt; 30995 of the 68356 rows and 1 ms
  checks read differently by more than 1e-9 points, 4505 by more than 0.01): the wrench rule's time over its limits fell
  on nine windows, its count of spans over them on six while it rose on the donkey (7 -> 8) and the pig director (4 ->
  5) (the goat's 0.045 s and 35 instants between the samples to 0.010 and 12, the cow's 0.055 and 42 to 0.030 and 13).
  The phase after the hands land, "Back to the floor", reads up to 20 points higher under the limit on seven windows
  (the dog's 32.9 -> 52.9%, the rabbit's 34.2 -> 53.5, the cow's 27.2 -> 41.8), lower on three, and the donkey's 159.0
  -> 163.2% over it; the roll's worst rises by more than a point on five (the goat's 104.8 -> 111.4%, the pig director's
  206.1 -> 212.0, the donkey's 259.5 -> 264.1, the horse's 202.5 -> 206.1, the dog's 81.6 -> 82.8) and falls by more
  than a point on three (the cow's 94.9 -> 33.2%, the rabbit's 297.8 -> 290.5, the pig foreman's 138.2 -> 133.8); the
  horse's reach for the floor 200.5 -> 202.9%; the sheep's right foot in 25.8 -> 35.3%; the cow's left foot in 44.5 ->
  28.7%; the pig director's left foot in 2.9 -> 4.4%; any other phase within 3 points. Every rig point's fastest within
  0.12 m/s (the pig director's left toe 7.09 -> 7.21 m/s at 2.861 s), the points over the rule's 8 m/s the same (the pig
  foreman's left toe 8.36 -> 8.39); the joints' extremes within 2.6 degrees (the goat's left elbow's least bend 12.0 ->
  9.4 degrees at 2.031 s), none newly outside the rig's range; the contact force's peaks (every 1 ms) lower on six
  windows (the cow's 3.361 -> 3.319 body weights at 2.635 s, the others by 0.006 at most), the pig director's 0.0002
  higher and four others within 2e-6 higher, and at the 5 ms samples the donkey's 0.0022 higher (3.5593 -> 3.5615 at
  2.685 s), every other lower or within 1e-5 higher; every rule's pass, the overlaps, jumps and pops as before, the
  unresolved instants within 0.1 ms of where they were.
- The low walls read 2 readings, as before (readings-f21-low-wall.txt): the pig foreman's absorb 7.7 -> 2.9% as its
  hands let go onto the feet, every other reading within 0.86 points; every point's fastest within 0.08 m/s (the pig
  foreman's left elbow 8.51 -> 8.43, the pig director's 8.68 -> 8.71, both over the rule's 8 m/s before and after), the
  joints within 0.071 degrees; the contact force's peaks within 1e-5 body weights (the pig director's 7.7e-6), every
  rule, overlap, jump and pop as before, the unresolved instants within 0.2 ms of where they were (the pig foreman's
  1.6616 to 1.6624 s now 1.6614 to 1.6623: unres-phase.mjs) (gatediff2-f20w-f21-low-wall.txt).
- The climbs read none, as before (readings-f21-wall.txt): as the feet land (4.745 s) the weight on the right foot reads
  none on the goat, the bull and the cow, against 16.2, 15.8 and 16.8%, the phase's worsts now 8.6, 7.7 and 7.7% at
  4.945 s, and the sheep's worst there 10.5 against 9.1 (4.945 s); before 4.70 s no reading moves by more than 0.0022
  points, and from the landing single readings move by up to 21.5 points, none to the limit (the dog's 21.5% at 4.745 s
  to none, the cow's 16.8, the goat's 16.2 and the bull's 15.8 likewise; the horse's 12.8% at 4.985 s and the pig
  director's 6.1% at 4.741 from none); the contact force's peaks within 3e-5 body weights (the skunk's at the 5 ms
  samples 2.1e-5), every point's fastest within 1e-5 m/s and every joint within 2e-4 degrees (gatediff2.mjs:
  gatediff2-rel4-f21-wall.txt).

What moves, every vertex every 1 ms (probe-vertdiff-k.mjs, var-rel8 against var-f21: vertdiff-rel8-f21-window.txt,
-low-wall.txt, -wall.txt):
- The windows' bodies at most 11 to 37 mm, most from 2.04 to 2.31 s, as the brace lets go and the hold comes and eases
  back (the donkey's head 37.3 mm at 2.249 s, the dog's 34.4, the sheep's 33.0; the pig director's body the least,
  10.9), and from 2.45 s still up to 10 to 26 mm, on nine windows most at 2.45 as the hold's move dies away into the
  roll (from 2.45 to 3.00 s: vertdiff-rel8-f21-window-roll.txt; within it the pig director's 10.4 mm at 2.890, the cow's
  10.8 at 2.479).
- The tails: the tail fit (traversal-fit.js, solveTail), a choice among ways round the obstacles, takes another way on
  four windows for whole stretches of the dive (probe-tail-diff.mjs: tail-diff-rel8-f21-a.txt, -b.txt): the sheep's 28.7
  cm apart at 2.700 s (from 2.149 to 4.205 s), the pig director's 26.9 cm at 1.494 (1.186 to 1.953 s) and 23.7 at 2.614
  (2.504 to 4.202), the cow's 22.8 cm at 3.472 (from 1.644 to 5.685 s, in stretches), the skunk's plume 16.4 cm at 2.338
  (2.153 to 2.690); and on four low walls, whose bodies move 1.9 mm at most: the donkey's tail 9.6 cm at 1.500 s, the
  dog's 6.9 cm at 1.460, the pig director's 2.3 cm at 2.120 and the pig foreman's 1.2 cm at 1.599
  (vertdiff-rel8-f21-low-wall.txt). The cow's tail parts from where it was (by 1 cm) at 1.644 s with its body 0.04 mm
  from where it was, the pig director's at 1.186 with its body 0.69 mm off; the sheep's and the skunk's at 2.149 and
  2.153, their bodies by then 11.8 and 10.7 mm off (probe-tail-onset.mjs: tail-onset-rel8-f21-a.txt, -b.txt). The fit's
  choice flips on fractions of a millimetre (Left: the tail fit's switch); in the video the tails stay mostly behind the
  body.
- The low walls' bodies 1.9 mm at most (the goat's and the sheep's at 1.670 s, as their hands let go onto the feet); the
  climbs' 0.7 mm at most (from 4.72 to 4.74 s, as the palms let go onto the feet).

Tried and not kept:
- Holding the brace longer (BRACE's last key 2.06 -> 2.11 or 2.14 s: var-wb1, var-wb2; readings-wb1-window.txt,
  readings-wb2-window.txt): 501 and 556 readings against 529, the thin end's spike moving with the hand and growing (the
  cow's 631% to 1321% at 2.130 s with 2.11; 499% at 2.165 with 2.14).
- Bounding the push's twist in the plan instead (var-w4: a row per feet sample keeping -(dL_x a_x + dL_z a_z) / fy
  within the patch's twist of dL_y): 1359 readings (readings-w4-window.txt), the plan's centre 10 to 18 cm off its path
  (probe-plan-twist.mjs: plan-twist-w4-cow.txt): on one patch the pressure point's rows fix where the centre lies along
  the line and the twist row its acceleration there, which the authored turn does not agree with; the turn must hold the
  spin, not the centre's path.
- The hold's settings (var-w5r, var-w5t, var-w5e; readings-w5r-window.txt and the others): PATCH 2 cm (the palms, and
  the pig director's roll patch at 2.690 s) read the same readings over the limits, 368; PATCH_TWIST 1, 373; PATCH_EASE
  0.2 s, 380 (the roll 177).

`tests/natural-traversal.test.mjs`: supportAt's test adds that a grip keeps the outline of the boot on the floor beside
it (feetHull), with a boot on a top beside it too that of both, with nothing on the floor that of a boot on a top beside
it, at the top's height, and none with neither (a grip that drops the top's boot from either fails it). A unit test of
releaseGrips onto the feet: a grip the feet follow for longer than LOST gives its last two samples to the feet on their
own outline, their centre and raw contacts kept; with the feet for LOST or less, a released sample with no outline under
it (the first of the two too) or one with no area (a single floor point's), a grip that ends on a hold (the pigs' catch
on their climbs ends on the seat; a release onto a hold fails it), or a grip the motion starts on, the grip is left; the
released samples stand on the grip's own outline and floor (a sill's, 0.85 m up), not the feet's after it (a floor
written as 0, or taken from the feet after, fails it). A unit test of holdPatchSpin: on a palm about 2 cm across
standing on a top 0.85 m up, its corners unequally far from its middle, at the run's first sample 0.30 and 0.20 m to the
side of the centre of mass and 0.6 below it, the centre moving 4 mm a sample, the palm sliding 1.5 mm a sample and one
of its corners reaching out 1 mm a sample, the target's change along each sample's own line to it (to its outline's
middle, at its floor) is held to that sample's own allowance (from its own reach) the way it would go, passes as it was
where its own change is less (three samples a thousandth as large), either way round (one sample beyond the allowance
and one within it turned round), and across the line as it was (a line fixed at the run's first sample, drawn to height
0 or to the run's first middle, the run's first reach for the allowance, a kept change against the target's own, the
full allowance where the change is less, or a clamp that treats the two ways round differently fails it); a held sample
on the palm holds as the feet do (the hold on feet samples only fails it); a second run that starts while the first
eases back starts from where that easing has brought the target, holds on from there and eases back from what it kept
over the target as it was (one starting from the target as it was, or easing back over the first run's easing, fails
it); a flight cuts an easing back (one carrying on after it fails it); before the palm and at its first sample, after
PATCH_EASE, in the air and on a wider outline the target is as it was, and halfway through the easing back it keeps half
of what it held, a quarter of the way through 0.896 of it (the ease traversal-pose.js's smooth; a straight line's 0.75
fails). The window check: through the hands to the floor (2.06 to 2.20 s), every millisecond, where the played body
stands on one palm alone (its support read as the balance reads it on the played pose, contactProbe and supportAt, but
for the dive's tails, whose roots that probe does not tell from the rest: a tail on the sill's top could only widen the
outline, and that instant would not count; the feet on one outline whose mean reach from its middle is under 4 cm), from
10 ms after each such stretch starts to 10 ms before it ends, the played body's angular momentum about its centre of
mass (the climb checks' model, its rate over 2 ms chords) changes along the line from its centre of mass to that palm at
most 20 N·m, half the rig's limit of phantom torque on contact; the body stands on one palm for at least 20 ms, and the
bound reads at least 5 instants (5 to 7 on eight windows, whose longest stretches on one palm last 25 to 27 ms, the
goat's, the bull's, the cow's and the rabbit's 5 to 11 ms on one palm earlier too, until the brace touches the far face
again, too short to be read; 51 to 60 on the pig foreman, the pig director and the dog); within 10 ms of a stretch's
ends (where the brace leaves the far face or touches it again, and where the right hand lands) the rate reads 21.5 to
60.1 N·m (the donkey's 60.1 at 2.137 s, 3 ms into its stretch, where the hold's own start raises it, 26 without; 27.9 to
82.8 without the hold), unchecked (probe-patch-spin2.mjs: patch-spin2-f21b-e10.txt, patch-spin2-f21n2-e10.txt). Without
the hold (var-f21n2: the tree's code lines but holdPatchSpin's call) it fails ten windows, 28.4 to 60.3 N·m (the dog's
17.8 passes: test-f21n2.log); on 15a4e470's code lines (var-rel8t) it fails the same ten and the three unit tests above
fail too (test-rel8t-r1.log); now 5.3 to 15.5. The forty-first part's test reads a grip that ends on the feet with no
outline under it as left. The test file passes (21 of 21 tests: test-f21-tree-r12.log); the suite passes (2578 tests:
suite-fix21m.log).

Left: the brace's last point beside the palm, planned as a grip, which cannot give the body's force with its moment (the
skunk's 457% at 2.093 s); the donkey's palm as the brace lets go (283% at 2.135: a level force beyond the palm's
friction, whose part toward the wall the release raises, and the hold's turn across the line to the palm); the hold's
own start, at full strength from a run's second sample, its end alone eased, its spin about that line rising in a
stretch's first milliseconds (the donkey's new reading at 2.137 s; the dog's and the rabbit's starts rise too); what the
hold adds to the release's three new readings on the donkey (2.136, 2.177 and 2.178 s), and the goat's new reading, the
hold's (2.093 s); the tail fit's switch, which flips on millimetres; the roll's 166 readings, and the phase after the
hands land reading higher; the windows' other phases, among them stand on the tile 46, left foot in 32, left foot round
24, right foot in 17, sit up 17, slide over 10 (the pig director's 215% at 1.350 s) and reach for the floor 9 (the
horse's 202.9%).

### 2026-11-23 (physics balance, forty-third part): a foot that arrives takes the weight over ONSET

After the forty-second part (7ad0349f) the eleven windows read 368 readings over the gate's limits, 46 of them in their
last phase, "Stand on the tile" (3 to 6 on every window), and 24 in the step before it, "Left foot round"; four windows'
worsts were there (the horse's 226% at 5.835 s, the pig foreman's 192% at 5.950, the pig director's 215% at 6.140, the
dog's 261% at 6.445), each 0.22 s before its crossing's end (kr-f21-window.txt). There the window's last step lands: the
left foot comes round to its mark and sets down at the get-up's leftDown, END - 0.22 s (window-dive.js, GETUP), from 2.5
cm up over 40 ms. Through the step the plan's centre lies about 10 cm outside the standing hoof's outline (the horse's z
0.045 against 0.144 to 0.329: the authored hips cross to the middle with the left foot in the air), the body falling
sideways onto the new foot at 1.4 to 2.1 m/s^2 (probe-end-plan.mjs: end-plan-horse.txt). The rig and the plan both read
the arriving hoof from 1 cm up, and the plan counted it whole from that first reading; planCentre reads each sample's
outline clipped by those within two samples either side (outlineAt), so the outline it read took the new foot in whole
two samples later, 10 ms after that first reading, the hoof by then 0.4 to 1.0 mm above the lowest it reaches over the
next 100 ms (the horse's: on the standing foot at 5.820 and 5.825 s, both feet at 5.830, the hoof 0.58 mm up:
probe-read-outline.mjs; probe-hoof-down.mjs on var-f21b, hoof-table-f21b.txt), its pressure point jumping across in one
sample and its sideways acceleration turning over within it (-2.08 to +1.49 m/s^2 at 5.825 to 5.830 s; on the eleven,
the largest step 2.54 to 4.89 m/s^2 a sample: probe-land-step.mjs, land-step-f21b.txt); one row after, the gate read 157
to 192 N of phantom force along x on the horse, the dog and the pig director (end-rows.mjs). A foot's load builds up
over tens of milliseconds, as a hand's hold does.

`dist/tactics/traversal-balance.js`: a sample standing on feet alone (a tail beyond its root counts as neither) keeps
each foot's points by the probe's mesh (supportAt: footPts) and the tail's (tailPts). landOnset, the round schedule's
last step (roundSchedule, after the release; exported): where a foot's mesh has points on such a sample and none on the
sample before while another foot stands there, that sample's outline and the next ONSET/dt - 1 samples' (ONSET, the 20
ms a grip waits after its first touch before it counts whole, a foot drawn in through them: four samples) are the
standing feet's points as each sample has them and the tail's, with the arriving foot's points drawn toward the standing
feet's middle by traversal-pose.js's smooth at k/(lag+1), k = 1..4, stopping where the arriving foot is up again, or the
standing feet are; a released sample is left. A foot arriving inside another's run would be left out of the outline
until that run ends, then counted whole; a run stopping at its first sample would still pass over the next three; and a
short flight given back to the authored support from the second round on (LOST) would bring the first round's foot
points beside the points measured in that round. None of these happens on the 33 (in both rounds each of the 117 entries
takes in its four samples, no third foot arriving, no standing foot lifting: onset-paths-f22p-window.txt, -walls.txt,
below; no flight given back in either round: probe-giveback.mjs on var-f22q, the tree's balance with the give-back
logged, giveback-f22q-window.txt, -walls.txt, where a copy giving every flight back logs the horse's climb's two). Drawn
so, the outline stays inside the convex hull of what the body has on the floor. Read through outlineAt's clip, the
outline the plan reads grows from the run's fourth sample on, from 15 to 30 ms after the hoof's first reading, as the
hoof comes down its last 0.3 mm (on the eleven 0.27 to 0.35 mm above the lowest it reaches over the next 100 ms at the
run's fourth sample, 0.03 to 0.08 mm 30 ms after the first reading, where the outline read is whole: probe-hoof-down.mjs
on var-f22s, hoof-down-f22s-a.txt, -b.txt, hoof-table-f22s.txt, the hoof's heights the same to 0.01 mm on fix 21's
var-f21b, hoof-table-f21b.txt; the horse's 20, 63 and 93% of the way from the standing foot's edge to the new foot's at
5.835 to 5.845 s, whole at 5.850; on fix 21 whole at 5.830: probe-read-outline.mjs, the least z of each read outline).
It acts wherever a foot lands beside a standing one on feet alone (probe-onset-runs.mjs: onset-runs-f22-window.txt,
-wall.txt): on every window's three get-up steps (Left foot back, Right foot back, Left foot round) and four windows'
step in (the goat's, the bull's, the cow's, the sheep's, 0.48 to 0.52 s), on every climb's Left foot round (5.255 s) and
Turn onto the tile (5.850) and three climbs' step in (the pig director's, the rabbit's, the dog's, 0.37 to 0.395 s); on
no low wall, whose second hoof lands while the hands still grip the wall (on all eleven at 1.580 to 1.600 s, on grip
samples), nor wherever a hand grips or the motion holds the body as a foot lands (the pigs' climbs' absorb, 4.545 to
4.560 s, on grips; the rabbit's and the dog's hands on the sill, 0.750 and 0.675 s in the second round, the rabbit's on
grips, the dog's inside a grip's onset; the cow's sit up, 2.935 s, held; in the first round the roll on the horse, the
pig foreman and the pig director, 2.750 to 2.875 s, held, the body on the floor too): these are every foot that lands
beside a standing one and is not taken in, on the 33 in either round (probe-onset-paths-r3copy.mjs on var-f22p, the
tree's balance with logging added: onset-paths-f22p-window.txt, -walls.txt). The feet's points are kept afterwards only
where an onset reads them, its samples and the one before (kept on every sample on feet alone, the horse's window held
81157 points on 510 of its 1212 samples and 20.6 MB against fix 21's 14.5; so, 2329 points on 15 samples and 14.7 MB:
probe-heap.mjs). The horse's plan at its last landing now turns over across three samples (-2.08, -1.01, +1.13, +2.68
m/s^2: end-plan-horse-e3.txt), the largest step 2.15 to 2.38 m/s^2 a sample on nine windows, the rabbit's 3.04 and the
dog's 3.55 (land-step-f22.txt). Gated as var-e3 (the tree's code lines but for ONSET written out as a constant of its
own, 0.02, the outline's fields built inline, and the points kept on every sample), which plays all 33 crossings as the
tree's code to the bit, every rig point every 1 ms (same-e3-f22s.txt).

- The windows read 323 readings against 368 (kind-readings.mjs: kr-e3-window.txt): the horse 27, the goat 8, the bull
  14, the cow 16, the donkey 49, the sheep 17, the skunk 96, the pig foreman 8, the pig director 28, the rabbit 45, the
  dog 15. Stand on the tile 20 against 46 (the goat's 4, the bull's 3, the donkey's 4, the skunk's 4 and the pig
  foreman's 3 to none; the horse's 5 to 2, the cow's 4 to 2, the sheep's 4 to 2, the pig director's 4 to 2; the rabbit's
  6 to 6; the dog's 5 to 6), Left foot round 11 against 24, Left foot back none against 3, Weight on the left foot none
  against 2, Weight on the right again 1 against 2; every other phase's count as before (the roll 166, the hands to the
  floor 38); four readings new, all the dog's (100.0 and 100.3% at 6.382 and 6.383 s against 96.5 and 96.4 in Left foot
  round, 117.0 at 6.438 against 64.9 there, 154.9 at 6.443 against 92.9 in Stand on the tile), five of its gone (120.5,
  124.6 and 101.7% at 5.600 to 5.602 s, 100.2 at 6.026, 143.1 at 6.433), five of its kept higher (its worst, 261.1 to
  287.7% at 6.445 s; 114.6 to 139.3 at 6.439, 189.7 to 223.7 at 6.444, 231.6 to 238.3 at 6.446; 116.65 to 116.74 at
  6.025, in Weight on the right again); the rabbit's kept readings higher at its last step and stand (below); every
  other kept reading higher by 0.05 points at most, if at all (readings-at.mjs; kept-rises-f22.mjs:
  kept-rises-f21-e3-window.txt).
- The worst readings: the horse's 206% against 226 (its worst now its roll's, 206 before too), the pig foreman's 134%
  against 192 (now its roll's); the stands still over the limit: the horse's 142% against 226, the cow's 156 against
  232, the sheep's 161 against 218, the pig director's 149 against 215 (its worst now the slide over's 215, as before),
  the rabbit's 163 against 160 (its count 6 as before, five of its six readings higher: 146.2 to 162.6% at 6.044 s,
  147.9 to 162.0 at 6.043, 152.0 to 160.1 at 6.042, 141.4 to 155.5 at 6.045, 160.0 to 161.2 at 6.041; its last step's
  121.7 to 143.9 at 6.038 and 189.4 to 195.4 at 6.039), and the dog's 288% against 261 at 6.445 s. The dog's rise is the
  onset's: there the outline the plan reads reaches 23% of the way to its new foot (95% on fix 21:
  probe-read-outline.mjs), and the onset puts off its sideways catch, the sideways force the motion asks there -256 N
  against +109 (the floor's as the gate solves it -185: the gate's rows, F less what it leaves over); on fix 22's
  contacts and turn, the gate's solve with fix 21's sideways force alone reads 269.2%, with its forward force alone
  276.8%, with its turn 283.2% (nnls-fparts.mjs, nnls-along.mjs: fparts-dog-f22-f21b.txt, along-dog-f22-f21b.txt, from
  probe-nnls-split.mjs's dumps on var-f21b and var-f22).
- The windows' other phases under the limits (phase-moves-f21-e3.txt: every phase's worst that moves by half a point or
  more): Left foot round lower on all eleven (the dog's 206.6 to 143.9%, the bull's 178.3 to 88.8, the rabbit's 205.2 to
  195.4, the pig foreman's by 0.24 points, 85.56 to 85.32, its worst at the 5 ms samples alone 83.83 to 84.01); Left
  foot back higher on seven (the cow's 56.0 to 83.0%, the donkey's 61.7 to 75.5, the horse's 46.5 to 59.1, the sheep's
  64.9 to 71.3, the goat's 52.7 to 55.8, the pig foreman's 48.4 to 51.2, the bull's 46.8 to 49.3), lower on four (the
  rabbit's 127.0 to 70.7, the dog's 124.6 to 56.5, the pig director's 47.7 to 42.9, the skunk's 50.9 to 50.0); Weight on
  the left foot lower on four (the cow's 49.8 to 17.1, the skunk's 43.7 to 3.6, the rabbit's 120.2 to 44.6, the dog's
  101.7 to 37.2), higher on four (the sheep's 11.2 to 28.9, the pig foreman's 4.7 to 8.5, the pig director's 2.5 to 7.3,
  the donkey's 11.7 to 12.3); Weight on the right again higher on three (the pig foreman's 55.6 to 64.3, the cow's 79.6
  to 85.0, the horse's 85.4 to 86.2), lower on two (the pig director's 69.2 to 66.2, the sheep's 92.9 to 90.5); Right
  foot back lower on four (the pig foreman's 20.4 to 15.8, the donkey's 57.6 to 54.8, the dog's 68.9 to 66.5, the
  rabbit's 99.1 to 97.5), the cow's 62.8 to 63.8; Weight on the right foot the goat's 11.1 to 11.8, the pig foreman's
  15.4 to 14.7. The wrench rule's time over its limits lower on nine windows (the donkey's 0.070 s to 0.055, the
  rabbit's 0.065 to 0.055), the horse's and the pig director's the same, their instants 23 to 20 and 24 to 22; every
  point's fastest within 0.002 m/s, the joints within 0.04 degrees, the contact force's peaks within 0.001 body weights;
  every rule's pass as before (gatediff2.mjs: gatediff2-f21-e3-window.txt). Single instants under the limits rise by up
  to 84 points from the rise over the feet on (the dog's 7.3 to 91.5% at 6.437 s, in Left foot round), and by up to 24
  before it, in the back to the floor and the roll, where the bodies move 0.02 mm at most (the pig foreman's 0 to 24.5%
  at 2.228 s, the cow's 0 to 21.0 at 2.657: instant-moves-f22.mjs, instant-moves-f21-e3-window.txt, every instant moving
  5 points or more; probe-vertdiff-k.mjs, vertdiff-back-pigforeman.txt, vertdiff-roll-cow.txt).
- The low walls as before, to the bit (gatediff2-f21-e3-low-wall.txt: no row or check differs on any of the eleven):
  their second hoof lands while the hands still grip the wall, where landOnset does not act.
- The climbs read none, as before (kr-e3-wall.txt). Under the limits the walk-out's Left foot round's worst is higher on
  seven, by 3.4 to 9.2 points (the bull's 28.8 to 37.9%, the cow's 28.8 to 37.9, the goat's 26.4 to 35.4, the sheep's
  24.3 to 33.4, the pig director's 36.6 to 41.5, the horse's 38.5 to 42.3, the donkey's 38.6 to 42.0: 42.3% the
  highest), lower on the skunk (37.2 to 30.9), single instants there up to 21 points higher (the bull's 16.7 to 37.9% at
  5.265 s), elsewhere up to 18, each where the onset takes a foot in (the rabbit's Crouch 29.2 to 47.5% at 0.405 s and
  Turn onto the tile 0 to 13.0 at 5.865, the pig director's Step in 5.9 to 16.3 at 0.383, the dog's Crouch 17.7 to 25.7
  at 0.400 and Step in 18.6 to 25.3 at 0.399: instant-moves-f22.mjs, instant-moves-f21-e3-wall.txt, every instant moving
  5 points or more); Turn onto the tile lower on five (the bull's and the cow's 27.7 to 25.4, the pig foreman's 11.0 to
  8.6); Right foot round the goat's 28.7 to 26.7; Weight on the right foot the pig foreman's 10.0 to 10.6; the climbs'
  starts, where the onset takes a foot in on three: the dog's Step in 78.6 to 64.4%, its Crouch 75.8 to 77.0, the pig
  director's Push off 42.8 to 41.3; every point's fastest within 0.002 m/s (the rabbit's left palm 8.509 to 8.507, over
  the rule's 8 m/s before and after), the joints within 0.02 degrees, the contact force's peaks within 0.001 body
  weights (gatediff2-f21-e3-wall.txt).
- What moves, every vertex every 2 ms (probe-vertdiff-k.mjs: vertdiff-f21b-f22-window-a.txt, -b.txt,
  vertdiff-f21b-f22-wall-a.txt, -b.txt): the windows' bodies at most 4.1 to 7.6 mm, each where a foot lands in the
  get-up (the dog's 7.6 at 5.604 s, the rabbit's 7.3 at 5.204, the sheep's 4.9 at 5.928); the skunk's plume 14.5 cm at
  5.334 s, the tail fit taking another way round, and the pig director's tail 2.3 cm at 6.058; the climbs' bodies 1.1 to
  2.3 mm (the dog's 2.3 at 5.270 s); the low walls the same to the bit.
- Tried and not kept (next-tail/NOTES.md): the left foot set down over 80 ms instead of 40 (its swing 40 ms shorter: 457
  readings); the onset on any growth of an outline (335, but the hands to the floor and the roll worse: the donkey's
  430%, the skunk's 499%); on any growth of an outline on feet alone (324 over 20 ms, but 691 over 10 ms and 352 over
  30: fired by a hoof flattening onto its sole); a foot's arrival over 10 ms and 30 ms (360, 350); the tails fitted
  inside the window's and the low wall's balances (339, the donkey's worst 300% and the pig director's roll 242%).

`tests/natural-traversal.test.mjs`: supportAt's test adds that a sample on the boot alone keeps the boot's points by its
mesh, and none with a palm on the floor too. A unit test of landOnset: a foot arriving beside a standing one, both
sliding from sample to sample, is taken in over ONSET at smooth(1/5) to smooth(4/5), each sample's outline the standing
foot's points and the arriving one's as that sample has them, the arriving one drawn toward the standing one's middle
(the arriving foot well beside, so that the drawing shows from the first sample), after ONSET each sample's own outline;
the standing foot's own growth, a foot arriving with none standing, a sample with no foot points and a released sample
are left; the tail's points stay in the outline taken in, the arriving foot drawn toward the standing foot's middle, not
the tail's; the onset stops where the arriving foot is up again, or the standing foot is (a foot counted as arriving
where it already stood, LOST for ONSET, no drawing in, the tail dropped, a released sample taken in, the arriving foot
drawn out, either foot's points held from the run's first sample, no stop where the standing foot is up, or the arriving
foot drawn toward the standing foot's and the tail's middle fails it; no stop where the arriving foot is up fails it
with a TypeError; a released sample carries no foot points on any crossing, releaseGrips building it without, so that
case keeps a guard only). The window test checks, on every window, one foot taken in over ONSET in the last 0.30 to 0.15
s, each of its four samples' outline the standing foot's and the tail's points with the arriving foot's drawn in, as
that sample has them (the arriving foot drawn out, or either foot's points held, fails it; no window has a tail on the
floor there, so the unit test alone reads the tail's part). The window test's outline check (from the lean over the feet
on, every 20th sample, every corner of the balance's floor outline within 5 cm of something the played body has on the
floor) reads a sample landOnset takes a foot in on against the convex hull of what the body has there instead: its
corners lie between the feet, inside that hull, leaning on less, at the check's own samples 5 to 11 cm from any point
the body has on the floor on five windows; every other sample as before (the arriving foot drawn out fails it, 17 to 42
cm outside). supportAt counting a tail on the floor as any other part of the body (no foot points kept on such a sample:
var-f22m7) is seen by no check: it plays all 33 crossings the same, every 1 ms (same-f22-f22m7.txt), no tail lying on
the floor where a foot arrives. Nor is the clean-up (the foot points kept only on an onset's samples and the one
before): var-e3, keeping them on every sample, plays all 33 as the tree's code to the bit (same-e3-f22s.txt), and the
window check reads only the onset's samples and the one before. The test file passes (22 of 22 tests:
test-f22-tree-r5.log); the suite passes (2579 tests: suite-f22-r5.log).

Left: the windows' stands still over the limit (the dog's 288%, where the onset puts off its sideways catch; the
rabbit's 6 readings, 163%; the horse's, the cow's, the sheep's and the pig director's 2 each, 142 to 161%) and the dog's
four new readings (100.0, 100.3 and 117.0% in its last step, 154.9 at the stand); the plan leaning on a tail's stale
points between the hooves as the body rises over its feet (the cow's 9.2 and 11.7 cm from anything on the floor at 4.110
and 4.115 s, the bull's 10.1 and 11.6 at 4.715 and 4.720, on fix 21 too: probe-outline-every.mjs), between the outline
check's 100 ms samples; the roll's 166 readings; the hands to the floor's 38 (the skunk's 457%, the donkey's 283%); the
tail fit's switch; the windows' other phases, among them left foot in 32, sit up 17, right foot in 17, slide over 10 and
reach for the floor 9.

### 2026-11-23 (physics balance, forty-fourth part): the roll's hooves land with the seat still down

After the forty-third part (3f87e5d3) the eleven windows read 323 readings over the gate's limits, 166 of them in the
roll, and the worst of all, the sheep's 733% at 2.837 s, fell where its roll's hooves land (window-dive.js: the roll's
first rock row, FOOT_DOWN), as did the bull's 216% at 2.877, the horse's 206% at 2.774 (its worst), the pig director's
roll's 212% at 2.897 and the rabbit's late roll's 211% at 2.819 (phase-readings.mjs: 126 of the roll's readings at the
gate's 1 ms checks, 40 at its 5 ms rows; probe-roll-acc.mjs: each window's landing). There the played centre of mass's
vertical acceleration dipped for two milliseconds: the sheep's 4.3, -7.5, -7.9 and 0.6 m/s^2 at 2.835 to 2.838 s, the
body near free fall while it needed about a body weight sideways. The dip was the dive's own, not the balance's
(probe-dive-vs-played.mjs: the dive as authored and as played the same to the decimal there), and its hips' roll path's
(probe-trunk-parts.mjs on var-r23a, the hips' five parts: the roll path -14.6 and -14.5 m/s^2 at 2.836 and 2.837 s, the
sill's and the seat's pushes, the balance's shift and the fit smooth). The roll's simulation re-seats the body on its
lowest point at every step; at the landing's step that point is the arriving hoof, turned under the floor about the
seat, and the body rose onto it for that one step, then sat back on its seat the next, as the rock's steps keep it: a
one-step rise of the hips of 0.7 to 3.0 mm on eight windows, the goat's 0.1 (probe-land-bump.mjs: land-bump-a.txt,
-b.txt). The softening's triangle average spreads a one-sample rise into a triangle, whose apex is a corner in the hips'
fall; and its re-seat, reading each averaged pose's lowest point, lifted the body onto a tucked hoof under the floor for
the one sample before the rock, a second corner beside the first (probe-soft.mjs on var-r23a, the sheep's: the raw path
193.52 mm at 2.8366 s against 191.20 and 190.98 either side; the re-seat 2.013 mm there against -0.083 and -0.091),
together -10.7 m/s^2 on one 2.5 ms sample of the averaged path (probe-uni.mjs).

`dist/tactics/window-dive.js`: the landing's own step keeps the seat on the floor, re-seated on the seat's lowest point
(seatLow) as the rock's steps are; before the rock, the softening's re-seat reads the trunk's lowest point (trunkLow:
every point but the feet's, FEET the landing's own test, /hoof|boot|foot|toes/), for before the rock alone: FEET reads
the meshes' names, and a trouser cuff skinned to a hoof's bone, 9.1 cm or more above the trunk's lowest point before the
rock on every window, sinks up to 10.5 cm below the seat in it (round 4 of the review: review-fix23-r4\cuff-rv4c.txt,
rv4b-all.txt). The landing's row still names the arriving foot (its part and bone, as before): roll.rows records which
foot landed, and the window test's check of a stalled roll still meets a foot row on every roll that lands. The bodies
move 0.19 mm at most (the sheep's at 2.834 s, by its landing; the horse's at 2.468, as its roll starts, where of the
hips' five parts only the balance's shift moves, 0.13 mm, the roll path, the sill's and the seat's pushes and the fit
the same: probe-parts-diff.mjs on var-r23a and var-r23h), the others' 0.08 mm at most, the cow's and the skunk's not at
all, their rolls stalling before the hooves land (probe-vertdiff-k.mjs, every vertex every 2 ms:
vertdiff-f22s-r23c-window.txt). Gated as var-r23c, the tree's code lines but the landing row's record, which var-r23g
adds, and the landing flag's one name, which var-r23j has, the tree's code lines (the eleven window gates of each equal
var-r23c's to the byte); the low walls and the climbs the same to the byte, every one of their 22 gates (gate-lanes.sh
r23c).

- The windows read 308 readings against 323 (kind-readings.mjs: kr-r23c-window.txt): the roll 151 against 166 (the
  horse's 16 to 11, the bull's 12 to 11, the donkey's 28 to 27, the sheep's 15 to 13, the pig director's 16 to 14, the
  rabbit's 33 to 29), every other phase's count as before. Eighteen readings gone, all at the landings: the horse's
  206.1, 168.6, 125.1, 152.3 and 122.7% at 2.774 to 2.782 s, the bull's 152.9 and 216.4 at 2.876 and 2.877, the donkey's
  118.2 at 2.887, the sheep's 117.8, 175.6 and 126.5 at 2.829, 2.830 and 2.845, the pig director's 189.3 and 212.0 at
  2.896 and 2.897, the rabbit's 101.5, 109.1, 125.5, 210.9 and 119.5 at 2.803 to 2.822; three new: the bull's 103.3% at
  2.871 s and the sheep's 117.8 at 2.838, beside their landings, and the rabbit's 100.0 at 2.697 (99.96 before), 124 ms
  before its own (kept-rises-f22.mjs: kept-rises-e3-r23c-window.txt).
- The worst readings: the sheep's 342% against 733 (its worst now its roll's tail-flip at 2.712 s, 337 before), the
  bull's 167 against 216 (2.870 s, in its roll), the horse's 203 against 206 (now its reach for the floor's, 203 before
  too); the roll's worst lower on five (the sheep's, the bull's and the horse's above, the pig director's 212 to 175,
  the pig foreman's 133.8 to 133.0) and higher on the dog, under the limit (82.8 to 84.9% at 3.054 s: gatediff2.mjs,
  gatediff2-e3-r23c-window.txt, every phase's worst moving half a point or more); the rabbit's late roll's worst 211 to
  172 (its roll's worst, 291 at 2.604 s, as before). Readings kept and higher by more than 0.2 points: 30, all in the
  roll (kept-rises-e3-r23c-window.txt; by their exact values; each group's largest rise, and where it ends): the
  donkey's nine at 2.846 to 2.875 s, by 0.2 to 6.6 (to 113.0% at 2.874), the horse's six at 2.731 to 2.736, by 0.3 to
  5.4 (to 124.4 at 2.735), the sheep's tail-flip five by 2.8 to 5.6 (to 339.2 at 2.711; the highest of them 342.4, at
  2.712) and its 2.815 by 2.0, the pig director's five at 2.841 to 2.858 by 0.4 to 5.2 (to 110.4 at 2.858), the bull's
  three by 0.5 to 6.2 (to 159.4 at 2.865), the pig foreman's 2.820 by 0.2; every other kept reading by 0.2 points at
  most. Single instants under the limits rise by up to 99 points beside the removed ones (the sheep's 0 to 98.7% at
  2.839 s, the bull's 0 to 54.1 at 2.875, the donkey's 0 to 37.6 at 2.883, the horse's 15.7 to 53.2 at 2.800, the
  rabbit's 5.5 to 38.4 at 2.823, the pig director's 23.4 to 35.9 at 2.864, the dog's 10.4 to 16.8 at 3.045:
  instant-moves-f22.mjs, instant-moves-e3-r23c-window.txt, every move of 5 points or more).
- The wrench rule's time lower on three windows (the horse's 0.035 s to 0.025, the sheep's 0.030 to 0.020, the rabbit's
  0.055 to 0.050), its instants fewer on five; the contact force's peak the sheep's 2.4334 to 2.4359 body weights at
  2.714 s; every point's fastest within 0.002 m/s, the joints within 0.016 degrees; the donkey's capsule overlap (its
  lower trunk and left shank at 4.810 s) 11.849 to 11.851 mm, 1.18 to 1.19 cm as the gate prints it, and the phases'
  force maxima outside the roll within 0.35 N (the horse's back to the floor 14.85 to 15.20 N: round 4 of the review,
  review-fix23-r4\gdiff4-e3-r23j-window.txt); every rule's pass as before; the cow's and the skunk's gates the same to
  the byte.
- Each change alone (var-r23d, the landing step's; var-r23e, the re-seat's) leaves half the dip: the sheep's -3.6 and
  -3.8, -4.2 and -4.2 m/s^2 at 2.836 and 2.837 s, against -7.5 and -7.9 before and -0.3 and -0.1 with both
  (probe-roll-acc.mjs). Tried and not kept: the roll path drawn without the track's slope limiter (limit:false, the rule
  for a channel sampled from a solver): the sheep's landing the same to the decimal, no knot there an extremum
  (var-r23b).

`tests/natural-traversal.test.mjs`: the window test's roll block adds the landing: read every millisecond from 15 ms
before the roll's first rock row to 15 ms after, the centre of mass's vertical acceleration changes by at most 1.5 m/s^2
from one millisecond to the next. Fix 22's code fails it on seven windows, 2.14 to 11.81 m/s^2 (the sheep's at 2.836 s:
test-land-r23f.log, the test file on var-f22s's code with this check), the landing step's change alone (var-r23d) on
six, 1.88 to 5.35, the re-seat's alone (var-r23e) on six, 2.03 to 6.55 (test-land-r23d.log, -r23e.log); the tree reads
0.42 to 1.26, the dog's 14.5 ms before its landing (probe-land-jerk-grid.mjs on var-r23c, the check's own grid:
land-jerk-grid-r23c-a.txt, -b.txt). Only the cow's and the skunk's rolls never land: a window that stopped landing
fails, not skips the checks. The landing row names the foot that landed (its mesh and its hoof's bone), and stands
within 0.05 mm of its neighbours' mean height: 0.007 to 0.009 mm on the tree, 0.08 to 3.0 on fix 22's code and with the
re-seat's change alone, on all nine landings (probe-land-row.mjs: land-row-r23g.txt, -f22s.txt, -r23e.txt, -r23d.txt).
The jolt's bound passes a landing row lifted 1.1 mm (the donkey's with the re-seat's change alone, var-r23e: its row
1.111 mm up, 1.29), which the row's check fails, and a one-sample lift of 0.44 mm by the re-seat (the donkey's with the
landing step's change alone, var-r23d, 1.49: land-jerk-grid-donkey-halves.txt; on the tree's code its hoof is 0.498 mm
under the floor at 2.8873 s, its trunk 0.057: probe-reseat.mjs on var-r23i, the tree's dive with the re-seat logged,
reseat-r23i.txt); fix 22's pig foreman, its row 0.68 mm up, reads 1.13 (land-jerk-grid-f22s-pf-goat.txt). The bound
reads the corner at each kink's apex alone: 15 to 45 ms out, where the averaging's far corners lie, fix 22 read up to
11.4 (the dog's, 24.5 ms after its landing; the sheep's 5.6 and the horse's 4.9, 31 ms after), the tree 1.6 at most (the
dog's 1.57, 19.5 ms after: probe-land-jerk-ring.mjs, land-jerk-ring-f22s.txt, -r23g.txt); the 2.14 to 11.81 above are
figures within the 15 ms. Fix 22's code fails the row's check on all nine landings, 0.084 to 2.995 mm
(test-land2-r23f.log: the test file on var-f22s's code), and so does the re-seat's change alone (test-land2-r23e.log);
round 0 of this fix, which recorded the seat on the landing row, fails the foot's on all nine, and so does the landing
step's change alone, built on it (test-land2-r23c.log, -r23d.log); the cow and the skunk pass on every one. The test
file passes (22 of 22 tests: test-f23-tree-r4.log); the suite passes (2579 tests: suite-f23-r4.log).

Left: the roll's other 151 readings (phase-readings.mjs on var-r23c), by when they come: at the sheep's landing itself
3, up to 117.8% (113.9, 116.6 and 117.8 at 2.836 to 2.838 s, its 733% now 116.6); in the 70 ms before the hooves land 73
(the donkey's 23 at 2.828 to 2.880 s, the pig director's 12 at 2.838 to 2.858, up to 175%, the bull's 11 at 2.853 to
2.871, the horse's 11 at 2.728 to 2.750, the pig foreman's 8 at 2.815 to 2.835, the sheep's 5 at 2.777 to 2.815, the
rabbit's 2 at 2.804 to 2.805, 172%, the goat's 1 at 2.851), where the bull's centre of mass falls nearly freely about
its seat while it needs a sideways push the floor cannot give with so little weight on it (-9.3 to -9.7 m/s^2 from 2.866
to 2.870 s, asking 0.19 body weights: probe-roll-acc.mjs on var-r23g, acc-bull-r23g.txt; on fix 22's code -9.5 to -10.2,
0.18, acc-bull.txt); earlier in the roll 75: the skunk's 37 at 2.591 to 2.627 s (215%) as its roll stalls and it sits
up, the rabbit's 16 at 2.593 to 2.608 (291%) where the plan leans on its tail and its 11 at 2.695 to 2.710 (141%), the
sheep's tail-flip 5 at 2.708 to 2.712 (342%), the donkey's 4 at 2.677 to 2.702 (264%), the pig director's 2 at 2.673 to
2.675. On every window the softening's re-seat still jumps for one sample elsewhere in the roll, by 0.3 to 1.1 mm (the
pig director's -1.1 at 2.680 s, beside its two; the donkey's -0.67 at 2.687, beside its four; the goat's -0.63 at 2.707:
probe-reseat.mjs on var-r23i, reseat-r23i.txt), each the same corner after the averaging as this fix took out at the
landing, not yet weighed against the readings.

## Integration

The battle adapter matches the contract of Codex's `createSimpleTraversal(model, event, unit)`:
`{duration, climb: {skeleton, equipmentState}, apply(t) -> {worldRoot}, dispose()}`. That makes it a
drop-in for the `window` and `wall` kinds. In Codex's tree the battle picks the motion in `battle-traversal.js`
(`BattleTraversal.pose`: `simpleTraversal(event) ? createSimpleTraversal(...)`), so wiring is one branch there, once
`work/editor-3d` is on `main`. The waist-high wall needs a new edge kind, which is Codex's call. The proposal (geometry, cover, sight, route, art) goes in the handoff section of this doc.
