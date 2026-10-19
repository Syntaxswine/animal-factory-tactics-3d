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

Codex's climbing work, uncommitted in its own checkout on 2026-10-19, adds `dist/tactics/simple-traversal.js`:
"Lightweight presentation for ordinary tile ladders, windows, wall vaults and slips".

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
  the point of its skinned surface that touches the floor. That is rolling, so it cannot slide or float.
  The physics audit reads 0 N of phantom force through the roll.
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
  rise from the crouch do not pass yet.

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

## Integration

The battle adapter matches the contract of Codex's `createSimpleTraversal(model, event, unit)`:
`{duration, climb: {skeleton, equipmentState}, apply(t) -> {worldRoot}, dispose()}`. That makes it a
drop-in for the `window` and `wall` kinds. The waist-high wall needs a new edge kind, which is Codex's
call. The proposal (geometry, cover, sight, route, art) goes in the handoff section of this doc.
