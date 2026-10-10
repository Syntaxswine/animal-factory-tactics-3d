# Clothing and skinning on the game's characters

**Direction (the boss, 2026-10-09):** "yeah, i sent it to you because i like the work you have done so far
and thought you could add it to the existing models in the game where needed"

"It" is the [clothing and skinning handoff](IDLE-SKINNING-V5-HANDOFF.md) (`b546dfb`). The handoff collects
the corrections the idle study's fifth version
([PR #4](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/4), not merged) made to how the
characters' clothes follow their bones. Those corrections live inside the idle and are undone when it
ends, so none of the game's other motions has them.

The first version ([PR #6](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/6), `ffda21f`) reached
main through the [integration review](INTEGRATION-REVIEW-2026-10-09.md) while its own review was under way.
Review round 1 then found it changing more than the neck. This version keeps what it fixed and puts the rest
back as it was. Below, "main" means main before the fit (`b546dfb`).

## What changed

**The cloth on the neck and the hair follow what they lie on** (`createLightHorse` in
`horse-light-model.js`, which builds all eleven mammals). A part's weights come from its name and height
alone, so every layer round the neck (a collar, a neckerchief with its knot and ends, the tops of a shirt,
waistcoat, jacket, bib or braces) belonged wholly to the chest while the neck skin under it blends into the
head, and hair (the horse's and the donkey's manes, the goat's beard) belonged wholly to the head while the
neck it grows from does not. As the head turned to aim or throw, the skin slid through the collar and the
mane stood off the neck. Now, as a character is made:

- a layer on the neck takes the weights of the layer under it (within 1.5 cm), or else of the skin under
  it: the skull's nearest point no higher up the neck than the layer (1 cm, about a triangle, to spare; the
  nearest point outright would put a collar's top edge on the jaw above it). It takes them in full within 3 cm
  of the neck's radius, easing to its own weights 13 cm out or at the shoulder joints, whichever is nearer, and
  from the neck's base up (fading in over a tenth of the neck either side of the base);
- only the share of a vertex's weight off the arms moves: its arm weights stay exactly as its name gave them;
- hair takes the weights of the skin it grows from, in full: the beard hangs off the throat rather than the
  collar as the head nods, and the manes run down the crest as the head turns.

It runs once per mesh file: the first character made from a file fits it and the rest copy the fit (the
battle renderer builds every unit of a species from one parsed file; the ladder worker, off the main thread,
fits once a job). Building the first character of a mesh file takes 23-81 ms longer than on main (56-115
ms against 31-37; nine interleaved rounds, medians, with seven sweeps running beside them); every later one
copies the fit and costs what it did on main (31-35 ms).

Each changed vertex is recorded (`userData.layerFit`):

| character | vertices changed | of the shirt | other layers | hair |
|---|---|---|---|---|
| horse | 279 of 5,228 | 119 of 852 | overalls 80 | the mane, 80 of 152 |
| goat | 288 of 5,075 | 108 of 827 | overalls 78 | the beard, 102 of 102 |
| bull | 180 of 5,084 | 97 of 827 | overalls 83 | |
| cow | 363 of 5,174 | 125 of 826 | overalls 82, neckerchief 156 | |
| donkey | 270 of 5,079 | 67 of 752 | neckerchief 134 | the mane, 69 of 127 |
| sheep | 279 of 5,256 | 69 of 702 | waistcoat 57, neckerchief 153 | |
| skunk | 175 of 5,067 | 100 of 776 | overalls 75 | |
| pig foreman | 231 of 5,012 | 149 of 927 | trousers and braces 82 | |
| pig director | 133 of 5,011 | 133 of 1,177 (with his waistcoat) | | |
| rabbit | 366 of 5,160 | 117 of 826 | overalls 80, neckerchief 169 | |
| dog | 337 of 5,253 | 129 of 902 (with his jacket) | neckerchief 164, collar flaps 44 | |

No skin, forearm, hoof, boot, tail or cap vertex changes, and no arm weight anywhere (test 3).

**Whatever reads the rig by its parts' names reads them as main had them.** The record keeps each changed
vertex's weights from the name rules, and the three things in the game that choose vertices by their weights
read those: the idle's rig key (`idle-motion.js`; it seeds the loops and keys the fitted limits), the casualty
pose's contact sets (`casualty-pose.js`) and the burning fire's cards (one a bone, round the vertices it weighs
most; `painted-fire-zones.js`). Round 1 found all three changed by the first version: every idle loop of every
character played differently (the key hashes the weights), the horse's fallen hand lay on his muzzle (the fit
had taken arm weight off 58 shirt vertices at his shoulders, and his fallen arm turned to suit), and six
characters' flame cards changed size. Now the eleven rig keys, the four fallen poses and the cards are main's
(test 3, with the idle's seed-1 looks), and so are all 88 look plans of seeds 1 to 8. With the arm weights kept,
the casualty would settle the same falls from the fitted weights too, on these meshes; reading the names' weights
keeps that so for any mesh.

**The battle posture and the ladder keep the fit.** The posture's hem tuck (`battle-posture.js`) rewrote all
four weights of every shirt vertex, which would have taken the head's weight off every collar. It now keeps
the weight on any bone besides the hips, the spine and that side's arm, and writes exactly what it wrote
before for every vertex without such weight. The same holds for the dog's and the rabbit's inner sleeve
corridor on the ladder (`ladder-motion.js`). The integration review found the same in the older
`createMammalMotion` and `createDogMotion` adapters (the motion viewers and the horse chair study): installing
them erased the fitted head share (the horse's 203 garment vertices). `clothing-weights.js` keeps it, with
`tests/clothing-motion-adapters.test.mjs`; see [the integration review](INTEGRATION-REVIEW-2026-10-09.md).

**The idle study is unchanged.** It bends the neck on a bone of its own and fits the cloth on the neck to that
bone from the name rules' weights, as fitted and approved, so it puts those weights back while it runs (and
the rest of the rig's on dispose). Left in, the character's fit cost the idle's fitter range (the cow's nod
25 to 20 degrees, the dog's 20 to 10, the sheep's turn 40 and 10 to 30 and 25). Its key reads the names'
weights. The study plays as on main ([idle.jpg](hybrid-review/clothing/idle.jpg): 44 frames, no pixel
changed).

**The outfits** (the red hats; the donkey guide's blue Hawaiian shirt and straw hat) are paint and rigid hats
on the head bone, so they carry the same change ([outfits-throw.jpg](hybrid-review/clothing/outfits-throw.jpg)).

## Where it was needed: the game's own motions

The game drives its characters with the battle posture (stand, kneel, prone, the fall, down, dead),
locomotion, rifle firing (aim and recoil, standing, kneeling and prone), the grenade throw, the flamethrower,
the burning victim, the ladder, the roof mantle, the ledge descent and the weapon draw. None of them fitted the
clothes at the neck. The idle's surface census (`tools/clothing-census.mjs`: points 4 mm apart on every
triangle near another part, skinned as the GPU draws them; a point that shows at rest may sink no more than
3 mm deeper) was lifted out of the idle's tests and run through all of them (`tools/clothing-sweep.mjs`), on
the whole body, on main's characters and these: all eleven, 657 frames a character.

A pair-frame is one pair of parts crossing, in one region of the body (the neck, an arm, the torso, the legs),
in one frame. The census cannot tell an inner part going under an outer one (a bib's edge covering more shirt,
the neck under its collar, the cloth under a mane: natural) from an outer one sinking into an inner one or into
the body, or a part folding through itself (a crossing), so each pair is read for its direction by the fit's
layer order (the skin innermost, then the shirt, the trousers or overalls, the waistcoat or jacket, a collar,
belt or pouch, the neckerchief; hair outermost); "crossings" leaves the covering pairs out. Nor does it see a
gap: the mane standing off the neck, which the renders show. The motions are sampled at different rates (the
throw at 30 a second, the mantle and the ladder in 101 frames each), so read a motion against itself.

Above the shoulders the fit takes away 5,165 pair-frames and adds 1,250: 14,475 become 10,560 (-27%), the
crossings alone 8,286 become 7,617 (-8%). Elsewhere almost nothing moves: the arms 29,036 to 29,036, the torso
67,838 to 67,815, the legs 26,853 to 26,828.

By region:

| region | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| neck | 14,475 | 10,560 | -5,165 | +1,250 | -27% | 8,286 -> 7,617 (-8%) |
| arm | 29,036 | 29,036 | -5 | +5 | 0% | 28,385 -> 28,385 (0%) |
| torso | 67,838 | 67,815 | -25 | +2 | -0% | 61,429 -> 61,424 (-0%) |
| legs | 26,853 | 26,828 | -25 | +0 | -0% | 26,428 -> 26,403 (-0%) |

By motion:

| motion | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| stance | 2,791 | 2,739 | -76 | +24 | -2% | 2,523 -> 2,516 (-0%) |
| fall | 3,951 | 3,862 | -114 | +25 | -2% | 3,594 -> 3,589 (-0%) |
| walk | 9,339 | 9,339 | -0 | +0 | 0% | 8,642 -> 8,642 (0%) |
| aim | 23,850 | 23,590 | -685 | +425 | -1% | 20,860 -> 20,950 (0%) |
| throw | 18,419 | 17,227 | -1,579 | +387 | -6% | 15,987 -> 15,798 (-1%) |
| fire | 11,656 | 11,656 | -0 | +0 | 0% | 10,996 -> 10,996 (0%) |
| burn | 16,974 | 16,698 | -276 | +0 | -2% | 15,641 -> 15,499 (-1%) |
| mantle | 20,663 | 19,810 | -1,057 | +204 | -4% | 18,762 -> 18,546 (-1%) |
| descent | 9,269 | 9,074 | -203 | +8 | -2% | 8,836 -> 8,746 (-1%) |
| ladder | 20,506 | 19,460 | -1,230 | +184 | -5% | 17,912 -> 17,772 (-1%) |
| draw | 784 | 784 | -0 | +0 | 0% | 775 -> 775 (0%) |

By character:

| character | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| horse | 11,119 | 10,631 | -722 | +234 | -4% | 9,912 -> 9,908 (-0%) |
| goat | 11,047 | 10,356 | -764 | +73 | -6% | 9,953 -> 9,710 (-2%) |
| bull | 11,902 | 11,659 | -282 | +39 | -2% | 10,799 -> 10,797 (-0%) |
| cow | 12,144 | 11,878 | -386 | +120 | -2% | 11,073 -> 11,049 (-0%) |
| donkey | 11,605 | 11,070 | -535 | +0 | -5% | 10,715 -> 10,426 (-3%) |
| sheep | 15,891 | 15,346 | -820 | +275 | -3% | 13,857 -> 13,688 (-1%) |
| skunk | 10,708 | 10,440 | -269 | +1 | -3% | 9,932 -> 9,923 (-0%) |
| pig-foreman | 14,420 | 14,198 | -389 | +167 | -2% | 13,281 -> 13,309 (0%) |
| pig-director | 10,356 | 10,274 | -82 | +0 | -1% | 9,463 -> 9,425 (-0%) |
| rabbit | 12,120 | 11,964 | -393 | +237 | -1% | 10,983 -> 11,073 (1%) |
| dog | 16,890 | 16,423 | -578 | +111 | -3% | 14,560 -> 14,521 (-0%) |

**What got worse.** 91 pairs got worse by 10 frames or more, or 1 mm or more deeper: 68 crossings and 23 covering,
every one in [sweeps/summary.md](hybrid-review/clothing/sweeps/summary.md). All 91 are at the neck (84) or meet a
neckerchief or the goat's beard (7). The crossings are mostly cloth on cloth where one layer's faces now follow
different things:

- a neckerchief folds through itself, or into the layer under it, as the head turns: its inner face follows the shirt
  and its outer face the skin (the rabbit's in the aim, 60 of its 70 frames at up to 5.6 mm; the dog's, 50 at
  8.8; the sheep's in the throw, 36 at 8.5; the sheep's into its shirt in the aim, 10 at 14.6, and the dog's into its
  jacket, 10 at 12.8);
- a bib's, a strap's or braces' top against the shirt (the horse's overalls into his shirt in the aim, 50
  frames at 9.8 mm; the pig foreman's braces into his shirt in the aim, 10 frames to 50 at the 15.3 mm main has, and
  in the throw 28 to 55 at main's 16.6);
- the goat's beard, which now hangs from its throat, into its bib in the throw (5 frames to 25, 15.7 mm), and its
  rifle hand into the beard in the kneeling aim at a high target (35 frames, as on main, 18.6 mm deep against 10.0);
- the horse's mane through itself in the throw (20 frames, 5.8 mm) and in the prone aim (10 frames, 12.8 mm; below);
- a few pose-level crossings main has, a millimetre or two deeper: a forearm through a neckerchief's knot on the roof
  mantle, the rabbit's shirt folding on the ladder (27.9 mm, against 26.3), the sheep's waistcoat into its shirt on
  the mantle (past 23 mm, as on main, in 16 frames rather than 3).

Centred on their deepest points at 1,500 px a metre ([worst-close-1.jpg](hybrid-review/clothing/worst-close-1.jpg)
to [-3](hybrid-review/clothing/worst-close-3.jpg): the twelve that gained most frames and the six deepest), none reads
as a tear or a fold, several are hidden from every side (no pixel changes), and at gameplay size none shows. The
crossings alone fall on every character but two: the rabbit (+1%, its neckerchief) and the pig foreman (+0%, his
braces). The most frequent pair counted as covering is not: the sheep's wool ruff hangs over its neckerchief, so its
sinking behind it on the ladder (2 frames on main, 95 here, 4.0 mm) is a crossing; so, in the totals, is the
director's jowls going behind his collar.

## The sheets

Main (before) against the fit (after), with the difference (red where a pixel changed by more than 24 of 255),
in `hybrid-review/clothing/`:

- `heads-<character>.jpg`, one for each of the eleven: standing with a rifle carried, the head at rest, turned 30
  degrees either way and glancing down 20, from the front, its right side, the rear and three-quarter, close up.
  At rest not one pixel changes (the weights do not move anything at rest); turned or glancing, the collar, the
  neckerchief, the bib's top and the hair move with the neck (a few hundred to a few thousand pixels, all of them at
  the neck).
- `gameplay-throw.jpg`: all eleven at gameplay size (130 px a metre), at the moment the throw turns the head
  furthest on the chest, from the four sides: 7 to 300 pixels change a view.
- `throw-close.jpg`: the same moment close up, three-quarter and side.
- `motions-climb.jpg`: the ladder, the roof mantle and the ledge descent, each at the moment it turns the head
  furthest; `motions-aim-walk-draw.jpg`: the kneeling aim at a low target (250 to 1,000 pixels change), the walk and
  the weapon draw (none: they barely turn the head on the chest, and with the head where the chest has it the fitted
  weights move the cloth as the old ones did).
- `mane-horse.jpg`, `mane-donkey.jpg`: the manes in the throw, the ladder and the mantle, from the rear, the left and
  three-quarter left; on main the mane stands off the turning neck, here it runs down it. `mane-fold.jpg`: the
  prone aim's fold (below), in round 1's views.
- `outfits-throw.jpg`: the red hats on all eleven and the donkey guide's blue Hawaiian shirt and straw hat, at the
  throw's widest turn.
- `idle.jpg`: the idle study at 3, 7, 12 and 18 seconds on all eleven: no pixel changes.
- `worst-close-1.jpg` to `-3.jpg`: the worst crossings the fit adds (above): the twelve that gained most frames and the
  six deepest of the rest, each centred on its deepest point at the frame it is deepest, at 1,500 px a metre.
- `paint-not-geometry.png` (from the first version; the rest pose is the same): the goat's throat, the director's
  collar seam and the sheep's neckerchief edges in paint and in plain grey.

## Tried and dropped

- **The idle's arm corrections** (the forearm's weight stripped from a shirt's sides beyond 10-12 cm of the
  forearm bone; a sleeve's end glued to the forearm in it, 1-3 cm). In the idle they kept a shirt's side from
  tearing at the hip and a forearm from turning out of its sleeve. Through the game's throws the sleeve ends
  followed the bent elbow out of the sleeve (pale patches on the forearm: the pig director, the sheep, the pig
  foreman). The strip, measured on the horse through four motions: in the throw it sank the shirt into his left
  forearm in 79 frames past 23 mm (58 frames at 19.4 mm without it) and his right forearm into the shirt in 28
  (none without it), against fewer frames of the shirt into the skull (4, not 11); in the aim it deepened the
  sleeve's fold at the arm from 18.7 to 31.6 mm (the fold at the torso eased, 29.2 to 27.6); on the ladder it
  deepened the shirt's fold at the torso from 30.6 to 36.3 mm (at the arm it eased, 38.0 to 35.1); in the
  flamethrower it eased the shirt's fold from 20.1 to 18.6 mm. The sleeve masks the builder gives each species
  were made for these motions, and the idle keeps its own strip.
- **The field out to 13 cm beyond the neck whatever stood there**, and the arm weights in the mix (the first
  version). On the horse, whose neck's radius is 12.8 cm, the field ran past his shoulder joints (20.5 cm out): it
  took up to a quarter of the arm's weight off 58 shirt vertices at his shoulders, and his fallen arm turned to
  suit. The field now ends at the shoulder joints, and no arm weight moves.
- **The mane eased off the skin back to its own weights** (in full within 1 cm of the skin, the head's 4 cm out;
  the first fix after round 1, to keep its tip from folding out beside the collar in the prone aim). Through every
  motion it was the worst of four rules (the census above the shoulders, every pair-frame with a mane in it):

  | mane rule | horse | of which through itself | donkey |
  |---|---|---|---|
  | main (the head's weights, wholly) | 623 | 0 | 555 |
  | eased off the skin, 1-4 cm | 378 | 102 | 51 |
  | eased off the skin, 1-8 cm | 227 | 26 | 20 |
  | the skin's, in full (this) | 232 | 31 | 20 |

  Eased, the mane sheared through itself in the throw (35 frames, 14.7 mm), the roof mantle (46, 10.8 mm) and the
  ledge descent (8, 5.1 mm), and folded in the prone aim all the same (10 frames, 8.7 mm). Eased further it is much
  the same as in full, and one rule for all hair is simpler. The fold it was meant to cure is the skin's (below).
- **A longer reach for every layer** (3 cm, not 1.5). Measured above the shoulders through every motion on all
  eleven: 19,479 pair-frames became 19,876 (+2%), and the crossings alone 16,226 became 16,450 (+1.4%), better
  for the horse (-6%) and the goat (-2%), worse for the sheep (+12%), the cow and the rabbit (+5%), the dog (+2%)
  and the bull (+1%), the same for the other four. It freed the horse's and the goat's bibs and straps from their
  shirts (the horse's overalls into his shirt in the aim, 50 frames at 9.8 mm, became 10 at 4.8; the goat's shirt
  under its overalls in the throw, 22 frames, none) and cost the cow's and the sheep's neckerchiefs, which folded
  through themselves (the sheep's in the aim from 10 frames at 8.1 mm to 70 at 15.6 mm, the cow's in the mantle
  from none to 43), and the sheep's waistcoat against its wool ruff (in the mantle from 12 frames to 46, 16.5 mm).
  At 3 cm a neckerchief follows
  three things at once, the shirt, the bib or the waistcoat, and the skin (of the cow's 112 fitted vertices 42, 27
  and 43, against 18, 17 and 77 at 1.5 cm; the sheep's 39, 36 and 49, against 5, 4 and 115; counted by the nearest
  vertex), and it folds where they part.

## Not attempted

- **Reshaping the clothes** (the plan's third step): the sheep's neckerchief under its wool ruff, the pig
  director's collar under his jowls, the pig foreman's hem and waistband against his forearms, the goat's collar
  through its throat at rest. Each is a change to an approved mesh's shape, which is the boss's call, not a weight.
  What the census says of each in the game's motions:
  - the sheep's ruff and the director's jowls sweep over their collars as the head turns (below);
  - the foreman's hem: the handoff saw it in the idle's leans (which v5 limited to a quarter lean). In the game's
    motions his forearms are inside his shirt and his belt in every frame, on main as here, as deep as the census
    reads (past 23 mm): the rifle carry and the aim hold them across his belly, and the throw, the mantle, the
    descent and the ladder swing them through it. That is the arm poses against an approved mesh; a hem that
    followed the forearm would tear from the shirt;
  - the goat's throat: paint, not geometry (below).
- **Motions not swept:** the tank's blast, the wooden ladders and the hatch, which pose the neck as the ladder and
  the fall do; the hen, who is built apart (and whose wings the idle study left out).
- **The studies:** the look-around idle and the armed idle are played by their study pages only (no battle code
  imports them); the idle's part is above. The motion viewers and the horse chair study use the older adapters,
  which the integration review fixed.
- **Smoothing the fitted weights across a layer** (so a neckerchief whose inner face follows the shirt and outer face
  the skin does not shear between them). The crossings that would cure are mostly 3-10 mm (up to 15), at the neck,
  and do not show at gameplay size; it would be a new rule with its own review.

## What the census finds that this does not touch

Most of what a sweep finds is the poses' own, on main as here: a carried rifle's forearm pressed into the bib,
the overalls or the shirt (past 23 mm in every frame of the stances, the walk and the flamethrower, on all
eleven), the trousers folding through themselves at a kneel or prone (3.5 to 8 cm), the throat and the jaw swept
through the collar where the aim nods the head down (past 23 mm in 50 to 70 of the aim's 70 frames on main, 40 to
70 here; all but the donkey). The aim nods the head down up to 72 degrees standing and back 87 prone, on the
horse, and turns it at most 31 (the head's turn on the chest, split into a turn, a nod and a roll: there is no
roll). These are poses, not weights.

- **The pig director's collar under his jowls, and the sheep's neckerchief under its wool ruff.** The skin
  over these collars is the head's own overhang, and a collar is not glued to the jaw above it (it would fold
  as the jaw turned), so as the head turns the jowls and the ruff sweep over the cloth (68.5 mm on the
  director's collar, 40.2 mm on the sheep's; 75.0 and 63.2 mm on the chest's weights). On screen the overhang
  covers it. A collar set clear of the jowls, a ruff ending above the neckerchief: asset changes.
- **The prone aim's mane fold.** The prone aim bends the horse's neck back 87 degrees, and his crest's skin
  folds through itself there on main (25 points, 13.0 mm, all behind the head joint); the mane, which follows
  the skin, folds with it (32 points, 12.8 mm, in the same place), so its tip shows as a small flap beside the
  collar close up ([mane-fold.jpg](hybrid-review/clothing/mane-fold.jpg), at 2,200 px a metre). On main the mane
  instead swings with the head into the shirt and the back, past 23 mm, unseen. Held to the head's weights off
  the skin, the mane sheared through itself in the throw, the mantle and the descent (above).
- **Paint, not geometry:** the goat's throat (a red blush and two red marks between its beard and its
  neckerchief), the seam where the director's collar meets his jowls and the sawtooth edges of the sheep's
  neckerchief show at rest and in every motion, but rendered in plain grey the surfaces there are clean
  ([paint-not-geometry.png](hybrid-review/clothing/paint-not-geometry.png)). They are the paint's, for the
  painted atlases.

## Tests and tools

`tests/clothing-layers.test.mjs`, written apart from the builder's fit (skull and layer vertices, the census, main's
hem tuck and corridor restated, main's own numbers in a fixture):

1. The layers on the neck keep within 12 mm (95th percentile) of the skin under them as the head turns 30 degrees
   either way, nods, raises and tilts: 3.8-9.6 mm on nine mammals, 19-66 mm on the name rules' weights; hair within
   1 cm; the sheep and the director no worse than on the chest's weights (40.2 against 63.2 mm, 68.5 against 75.0).
2. The battle posture's hem tuck and the dog's and rabbit's ladder corridor, restated from main's code for every
   shirt vertex: the collar keeps its head weight, and every other weight is what main wrote.
3. Against `tests/fixtures/clothing-main.json` (`tools/clothing-main-fixture.mjs` run on main before the fit,
   `b546dfb`): every weight as the parts' names give it, every arm weight as drawn, the casualty's four fallen poses,
   the burning fire's cards and the idle's seed-1 looks are main's.
4. The fit moves hair and the cloth inside the field (no lower than a tenth of the neck below its base, no further
   out than 13 cm past the neck or the shoulder joints), nothing else.
5. The census above the shoulders, the head in the five poses: no layer in another or through itself; the skin and
   a layer crossing at no more than 60 points and 8 mm on the nine (measured: 39 points, 5.7 mm; on the name rules'
   weights 219-4,095 points at 10.6-16.0 mm, the donkey at none).
6. A layer slides less than 4 mm against the layer under it (0.3-3.6 mm; 0.8-5.1 mm if each layer took the skin for
   itself).
7. A character made from mesh data already fitted copies the fit exactly (the weights and the record).
8. Through the throw, the cloth at the arms (the census's arm: within 7 cm of the arm bones) lies where the name
   rules put it, within 1 mm (three vertices there, the tops of the horse's overall straps: 0.6 mm).
9. Hair does not fold through itself in the roof mantle or the ledge descent, nor deeper than 8 mm in the throw
   (measured: none, none, 5.8 mm on the horse).
10. A neckerchief keeps its shape in the prone aim, where the neck bends furthest: it folds through itself no deeper
    than 1 cm (measured: 8.8 mm on the dog, 8.1 on the sheep, 5.5 on the cow; with a 3 cm reach the sheep's, 15.6).

Mutation passes, on scratch copies of the tree outside the repository: 41 mutants of the fit, the posture's hem tuck,
the ladder's corridor, the idle, the casualty and the fire cards, review round 1's thirteen among them (eleven ported
to this code, two already in the set). 39 fail the tests. The two that pass change nothing on these eleven:

- a hard step for the fade at the neck's base: no cloth vertex lies where the fade is partial with skin under it
  whose weights differ from its own, so no weight moves;
- the casualty reading the fitted weights rather than the names': with the arm weights kept, its contact sets settle
  the same four falls.

Round 1's 3 cm reach passed the first nine tests; the tenth fails it.

Tools:

- `tools/clothing-census.mjs`: the census, on any posed character (options for each of its numbers; a focus on
  part of the body).
- `tools/clothing-sweep.mjs`: the census through the game's motions on one character (`--root` reads another
  checkout, such as main before a change; `--focus neck|arms`); `--compare` for two runs; `--summary` for every
  character's before and after: the pair-frames that went and came, by motion, by character and by region, the
  crossings apart, and every pair that got worse by 10 frames or more or 1 mm or more deeper.
- `tools/clothing-main-fixture.mjs`: test 3's fixture, from any checkout.

The sweeps behind the tables above are in `hybrid-review/clothing/sweeps/`, main's and this branch's for each
character, and `node tools/clothing-sweep.mjs --summary docs/tactics/hybrid-review/clothing/sweeps` remakes the
tables and the list. To remake the sweeps, with main before the fit checked out at `<main>`:

```
node tools/clothing-sweep.mjs horse --root <main> --out sweeps/horse-before.json
node tools/clothing-sweep.mjs horse --out sweeps/horse-after.json
```

for each of horse, goat, bull, cow, donkey, sheep, skunk, pig-foreman, pig-director, rabbit and dog: about an hour a
character for the whole body on this machine (more under load); `--focus neck` reads only above the shoulders, and
is quicker.
