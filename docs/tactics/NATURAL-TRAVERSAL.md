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

## Integration

The battle adapter matches the contract of Codex's `createSimpleTraversal(model, event, unit)`:
`{duration, climb: {skeleton, equipmentState}, apply(t) -> {worldRoot}, dispose()}`. That makes it a
drop-in for the `window` and `wall` kinds. In Codex's tree the battle picks the motion in `battle-traversal.js`
(`BattleTraversal.pose`: `simpleTraversal(event) ? createSimpleTraversal(...)`), so wiring is one branch there, once
`work/editor-3d` is on `main`. The waist-high wall needs a new edge kind, which is Codex's call. The proposal (geometry, cover, sight, route, art) goes in the handoff section of this doc.
