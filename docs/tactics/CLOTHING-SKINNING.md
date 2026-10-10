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
back as it was. Review round 2 (8/10, no must-fix) asked for the measure in census points, a test that could see
the cache fail, and a list of corrections; both reports are in
[hybrid-review/clothing/reviews/](hybrid-review/clothing/reviews/). Below, "main" means main before the fit
(`b546dfb`).

## What changed

**The cloth on the neck and the hair follow what they lie on** (`createLightHorse` in
`horse-light-model.js`, which builds all eleven mammals). A part's weights come from its name and height
alone, so every layer round the neck (a collar, a neckerchief with its knot and ends, the tops of a shirt,
waistcoat, jacket, bib or braces) belonged wholly to the chest while the neck skin under it blends into the
head, and hair (the horse's and the donkey's manes, the goat's beard) belonged wholly to the head while the
neck it grows from does not. As the head turned to aim or throw, the skin slid through the collar and the
mane stood off the neck. Now, as a character is made:

- a layer on the neck takes the weights of the layer under it, in full, where one lies within 1.5 cm; or else
  those of the skin under it, the skull's nearest point no higher up the neck than the layer (1 cm, about a
  triangle, to spare; the nearest point outright would put a collar's top edge on the jaw above it), in full
  within 3 cm of the neck's radius and easing to its own weights 13 cm out or at the shoulder joints, whichever
  is nearer. Both hold from the neck's base up, fading in over a tenth of the neck either side of the base (on
  these eleven a hard step there would move no weight: the skin at the base has the cloth's own). A mesh whose
  shoulder joints lay within 3 cm of the neck is refused, since the easing would turn inside out (the horse's are
  4.7 cm clear);
- only the share of a vertex's weight off the arms moves: its arm weights stay exactly as its name gave them;
- hair takes the weights of the skin it grows from, in full: the beard hangs off the throat rather than the
  collar as the head nods, and the manes run down the crest as the head turns.

It runs once per mesh file: the first character made from a file fits it and the rest copy the fit (the
battle renderer builds every unit of a species from one parsed file; the ladder worker, off the main thread,
fits once a job). Each character gets its own copy of the weights and of the record, so nothing one does to them
(the posture's hem tuck, a ladder) reaches another (test 7). On an idle machine (nine interleaved rounds,
medians) the first character of a mesh file takes 29-60 ms against main's 15-17 (the fit: 14-44 ms, once a species
in a battle), and every later one 16-17 ms, as on main.

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
characters' flame cards changed size. Now the eleven rig keys, the four fallen poses and the cards at rest are
main's (test 3, with the idle's seed-1 looks), and so are all 88 look plans of seeds 1 to 8 (one helper,
`namedWeights` in `clothing-weights.js`, reads the names' weights for all three). With the arm weights kept, the
casualty would settle the same falls from the fitted weights too, on these meshes; reading the names' weights keeps
its contact sets main's for any mesh. The game builds a burning unit's cards in the pose it caught fire in, and
there they wrap the cloth and hair where the fit now puts them: up to 8.1 cm off main's (the horse's head card in
the throw, 75.4 cm wide on main and 67.3 here, its centre 3.8 cm away; the donkey's in the standing aim, 63.8 and
70.8).

**The battle posture and the ladder keep the fit.** The posture's hem tuck (`battle-posture.js`) rewrote all
four weights of every shirt vertex, which would have taken the head's weight off every collar. It now keeps
the weight on any bone besides the hips, the spine and that side's arm, and writes exactly what it wrote
before for every vertex without such weight. The same holds for the dog's and the rabbit's inner sleeve
corridor on the ladder (`ladder-motion.js`). The integration review found the same in the older
`createMammalMotion` and `createDogMotion` adapters (the motion viewers and the horse chair study): installing
them erased the fitted head share (the horse's 203 garment vertices). `clothing-weights.js` keeps it, with
`tests/clothing-motion-adapters.test.mjs`; see [the integration review](INTEGRATION-REVIEW-2026-10-09.md). The
horse's prone study (`animal-prone-motion.js`) then tucked its shirt by slot, and so wrote the hips' share onto the
head bone wherever the helper had kept a collar's head share; it now tucks those vertices by bone, the share kept
(the same test file).

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

Two measures, per pair of parts in one region of the body (the neck, an arm, the torso, the legs): the
pair-frames, one pair crossing in one frame, and the points, one census point found crossing in one frame, which
weigh how much of a crossing there is (a pair-frame may be a graze of 3 points or a crossing of 6,000). The census
cannot tell an inner part going under an outer one (a bib's edge covering more shirt, the neck under its collar,
the cloth under a mane: natural, "covering") from an outer one sinking into an inner one or into the body (a
"crossing"), so each pair is read for its direction by the fit's layer order (the skin innermost, then the shirt,
the trousers or overalls, the waistcoat or jacket, a collar, belt or pouch, the neckerchief; hair outermost); a part
through itself is a "fold", counted apart. Nor does the census see a gap: the mane standing off the neck, which the
renders show. The motions are sampled at different rates (the throw at 30 a second, the mantle and the ladder in
101 frames each), so read a motion against itself.

Above the shoulders the fit takes away 5,165 pair-frames and adds 1,250: 14,475 become 10,560 (-27%). In census
points (a point found in a frame, summed over the frames) all of them go 27.75 M to 21.39 M (-23%), the crossings
between parts 14.49 M to 11.54 M (-20%), and the folds of a part through itself grow, 426 pair-frames to 791 and
6,900 points to 8,717 (+26%). Elsewhere almost nothing moves: the arms 29,036 to 29,036 pair-frames, 67.36 M to
67.38 M points; the torso 67,838 to 67,815 pair-frames, 118.51 M to 118.51 M points; the legs 26,853 to 26,828
pair-frames, 52.96 M to 52.97 M points.

By region:

| region | pair-frames | went, came | points | crossings, points | folds |
|---|---|---|---|---|---|
| neck | 14,475 -> 10,560 (-27%) | -5,165 +1,250 | 27.75 M -> 21.39 M (-23%) | 14.49 M -> 11.54 M (-20%) | 426 -> 791 fr, 6,900 -> 8,717 (26%) |
| arm | 29,036 -> 29,036 (0%) | -5 +5 | 67.36 M -> 67.38 M (0%) | 66.82 M -> 66.84 M (0%) | 14,966 -> 14,966 fr, 502 k -> 502 k (0%) |
| torso | 67,838 -> 67,815 (-0%) | -25 +2 | 118.51 M -> 118.51 M (-0%) | 102.91 M -> 102.92 M (0%) | 16,119 -> 16,119 fr, 623 k -> 623 k (0%) |
| legs | 26,853 -> 26,828 (-0%) | -25 +0 | 52.96 M -> 52.97 M (0%) | 51.83 M -> 51.85 M (0%) | 5,800 -> 5,800 fr, 406 k -> 406 k (0%) |

By motion:

| motion | pair-frames | went, came | points | crossings, points | folds |
|---|---|---|---|---|---|
| stance | 2,791 -> 2,739 (-2%) | -76 +24 | 6.53 M -> 6.36 M (-3%) | 6.12 M -> 6.03 M (-2%) | 832 -> 839 fr, 32 k -> 32 k (0%) |
| fall | 3,951 -> 3,862 (-2%) | -114 +25 | 12.95 M -> 12.82 M (-1%) | 12.10 M -> 12.06 M (-0%) | 859 -> 860 fr, 46 k -> 46 k (0%) |
| walk | 9,339 -> 9,339 (0%) | -0 +0 | 19.55 M -> 19.55 M (0%) | 18.81 M -> 18.81 M (0%) | 3,062 -> 3,062 fr, 93 k -> 93 k (0%) |
| aim | 23,850 -> 23,590 (-1%) | -685 +425 | 63.23 M -> 60.25 M (-5%) | 51.30 M -> 50.09 M (-2%) | 5,520 -> 5,670 fr, 240 k -> 241 k (0%) |
| throw | 18,419 -> 17,227 (-6%) | -1,579 +387 | 16.17 M -> 15.34 M (-5%) | 14.16 M -> 13.84 M (-2%) | 4,323 -> 4,452 fr, 213 k -> 214 k (0%) |
| fire | 11,656 -> 11,656 (0%) | -0 +0 | 26.30 M -> 26.30 M (0%) | 25.45 M -> 25.45 M (0%) | 2,487 -> 2,487 fr, 60 k -> 60 k (0%) |
| burn | 16,974 -> 16,698 (-2%) | -276 +0 | 39.06 M -> 38.96 M (-0%) | 34.89 M -> 34.85 M (-0%) | 4,721 -> 4,721 fr, 201 k -> 201 k (0%) |
| mantle | 20,663 -> 19,810 (-4%) | -1,057 +204 | 34.28 M -> 32.66 M (-5%) | 30.56 M -> 29.50 M (-3%) | 6,201 -> 6,253 fr, 294 k -> 294 k (0%) |
| descent | 9,269 -> 9,074 (-2%) | -203 +8 | 19.29 M -> 19.04 M (-1%) | 17.97 M -> 17.86 M (-1%) | 2,352 -> 2,352 fr, 109 k -> 109 k (0%) |
| ladder | 20,506 -> 19,460 (-5%) | -1,230 +184 | 28.97 M -> 28.72 M (-1%) | 24.43 M -> 24.40 M (-0%) | 6,640 -> 6,666 fr, 247 k -> 247 k (0%) |
| draw | 784 -> 784 (0%) | -0 +0 | 253 k -> 253 k (0%) | 249 k -> 249 k (0%) | 314 -> 314 fr, 3,413 -> 3,413 (0%) |

By character:

| character | pair-frames | went, came | points | crossings, points | folds |
|---|---|---|---|---|---|
| horse | 11,119 -> 10,631 (-4%) | -722 +234 | 15.02 M -> 13.83 M (-8%) | 12.49 M -> 11.91 M (-5%) | 3,007 -> 3,040 fr, 103 k -> 103 k (0%) |
| goat | 11,047 -> 10,356 (-6%) | -764 +73 | 15.68 M -> 15.42 M (-2%) | 14.26 M -> 14.17 M (-1%) | 3,370 -> 3,370 fr, 125 k -> 125 k (0%) |
| bull | 11,902 -> 11,659 (-2%) | -282 +39 | 23.03 M -> 22.76 M (-1%) | 19.42 M -> 19.36 M (-0%) | 3,565 -> 3,563 fr, 128 k -> 128 k (0%) |
| cow | 12,144 -> 11,878 (-2%) | -386 +120 | 16.45 M -> 15.95 M (-3%) | 14.69 M -> 14.41 M (-2%) | 3,261 -> 3,294 fr, 111 k -> 111 k (0%) |
| donkey | 11,605 -> 11,070 (-5%) | -535 +0 | 16.84 M -> 16.52 M (-2%) | 15.45 M -> 15.20 M (-2%) | 3,513 -> 3,513 fr, 131 k -> 131 k (0%) |
| sheep | 15,891 -> 15,346 (-3%) | -820 +275 | 26.15 M -> 25.02 M (-4%) | 24.06 M -> 23.25 M (-3%) | 3,591 -> 3,690 fr, 143 k -> 143 k (0%) |
| skunk | 10,708 -> 10,440 (-3%) | -269 +1 | 19.76 M -> 19.54 M (-1%) | 18.24 M -> 18.19 M (-0%) | 3,396 -> 3,396 fr, 129 k -> 129 k (0%) |
| pig-foreman | 14,420 -> 14,198 (-2%) | -389 +167 | 47.61 M -> 47.03 M (-1%) | 42.37 M -> 42.30 M (-0%) | 3,772 -> 3,797 fr, 202 k -> 202 k (0%) |
| pig-director | 10,356 -> 10,274 (-1%) | -82 +0 | 42.58 M -> 41.79 M (-2%) | 36.63 M -> 36.46 M (-0%) | 3,290 -> 3,290 fr, 225 k -> 225 k (0%) |
| rabbit | 12,120 -> 11,964 (-1%) | -393 +237 | 16.66 M -> 16.21 M (-3%) | 15.00 M -> 14.76 M (-2%) | 3,181 -> 3,264 fr, 112 k -> 112 k (0%) |
| dog | 16,890 -> 16,423 (-3%) | -578 +111 | 26.79 M -> 26.19 M (-2%) | 23.45 M -> 23.14 M (-1%) | 3,365 -> 3,459 fr, 129 k -> 129 k (0%) |

By garment, every pair a garment is in at the neck (crossings and folds, every motion), the points fall for all but
the pig foreman's trousers and braces:

| character | points at the neck, by garment |
|---|---|
| horse | shirt -55%, bib -18%, mane -71% |
| goat | shirt -9%, bib -25%, beard -16% |
| bull | shirt -8%, bib -13% |
| cow | shirt -14%, bib -11%, neckerchief -28% |
| donkey | shirt -28%, neckerchief -0%, mane -100% |
| sheep | shirt -17%, waistcoat -43%, neckerchief -29% |
| skunk | shirt -8%, bib -14% |
| pig foreman | shirt -4%, trousers and braces +1% |
| pig director | shirt and waistcoat -12% |
| rabbit | shirt -12%, bib -13%, neckerchief -23% |
| dog | jacket and shirt -15%, neckerchief -30%, collar flaps -8% |

In pair-frames several of these read worse (the horse's bib 148 to 268, the rabbit's neckerchief 425 to 520, the
foreman's braces 371 to 474): more frames, less in each.

**What got worse.** 97 pairs got worse by 10 frames or more, 1 mm or more deeper, or a quarter more points (and 50
or more): 48 crossings, 22 folds and 27 covering, every one in
[sweeps/summary.md](hybrid-review/clothing/sweeps/summary.md). All are at the neck or meet a neckerchief or the
goat's beard. The crossings with the most points:

- the neckerchiefs into the shirt in the prone aim, where the neck bends back furthest (10 frames each: the sheep's
  16,465 points at 14.6 mm, the dog's into its jacket 11,070 at 12.8, the cow's 9,270, the rabbit's 4,505);
- the pig foreman's braces into his shirt on the ladder (32 frames, 13,947 points at 10.3 mm) and, as deep as on
  main, in more frames of the aim and the throw;
- the goat's beard, which now hangs from its throat, against its rifle hand in the kneeling aim at a high target
  (5,055 to 13,585 points, 17.9 mm against 9.1) and into its bib in the throw (1,338 to 9,614 points);
- the sheep's neckerchief into its forearm in the aim (23,445 to 29,870 points; past 23 mm on main as here);
- a few pose-level crossings main has, a millimetre or two deeper: a forearm through a neckerchief's knot on the
  roof mantle, the sheep's waistcoat into its shirt on the mantle (past 23 mm, as on main, in 16 frames rather
  than 3).

The folds are the fit's own new kind of crossing: above the shoulders 426 pair-frames become 791, and 6,900 points
8,717. They are the neckerchief wraps (the rabbit's in 60 of the aim's 70 frames, the dog's in 50, the sheep's in
36 of the throw's, the cow's in 23), the horse's mane (20 frames of the throw, and the prone aim's fold below) and
the sheep's waistcoat: a few hundred points each, 3 to 9 mm deep, but for the mane's 12.8.

**The handoff's bib check.** The handoff asks that a downward glance not pull the bib through the shirt. On the
horse it does: in the aim his bib's top sinks into his shirt at the neck in 50 of the 70 frames, up to 9.8 mm and
1,405 points, where main has none (unseen at its deepest frame, in
[worst-close-1.jpg](hybrid-review/clothing/worst-close-1.jpg)), and in 19 frames of the throw (7.1 mm); the goat's
does in 11 frames of the throw (3.7 mm), and the bull's, the cow's and the rabbit's graze it in 10 aim frames (270,
10 and 10 points). Parts of the bib's top stand more than 1.5 cm off the shirt, so they follow the skin while the
rest follows the shirt. A 3 cm reach for the bibs, trousers and braces alone would cure most of it, at as much
cost to the cow's neckerchief ("Tried and dropped").

Centred on their deepest points at 1,500 px a metre ([worst-close-1.jpg](hybrid-review/clothing/worst-close-1.jpg)
to [-4](hybrid-review/clothing/worst-close-4.jpg): the twelve that gained most frames, the six deepest of the rest
and the six that gained most points), none reads as a tear, several are hidden from all three sides rendered (no
pixel changes), and at gameplay size ([worst-gameplay.jpg](hybrid-review/clothing/worst-gameplay.jpg)) nothing
reads as a fault. The most frequent pair counted as covering is not: the sheep's wool ruff hangs over its
neckerchief, so its sinking behind it on the ladder (2 frames on main, 95 here, 4.0 mm, 1,133 points) is a
crossing; so, in the totals, is the director's jowls going behind his collar.

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
  furthest; `motions-aim-walk-draw.jpg`: the kneeling aim at a low target (243 to 1,029 pixels change), the walk and
  the weapon draw (none: they barely turn the head on the chest, and with the head where the chest has it the fitted
  weights move the cloth as the old ones did).
- `mane-horse.jpg`, `mane-donkey.jpg`: the manes in the throw, the ladder and the mantle, from the rear, the left and
  three-quarter left; on main the mane stands off the turning neck, here it runs down it. `mane-fold.jpg`: the
  prone aim's fold (below), in round 1's views.
- `outfits-throw.jpg`: the red hats on all eleven and the donkey guide's blue Hawaiian shirt and straw hat, at the
  throw's widest turn.
- `idle.jpg`: the idle study at 3, 7, 12 and 18 seconds on all eleven: no pixel changes.
- `worst-close-1.jpg` to `-4.jpg`: the worst crossings the fit adds (above): the twelve that gained most frames, the
  six deepest of the rest and the six that gained most points, each centred on its deepest point at the frame it is
  deepest, at 1,500 px a metre; `worst-gameplay.jpg`: the same twenty-four at gameplay size, 130 px a metre (a few
  hundred pixels change in a 140 px view, along the collars and neckerchiefs where they now lie; nothing reads as
  a fault).
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
  motion it was the worst of the three rules that follow the skin, if better than main's (the census above the
  shoulders, every pair-frame with a mane in it):

  | mane rule | horse | of which through itself | donkey |
  |---|---|---|---|
  | main (the head's weights, wholly) | 623 | 0 | 555 |
  | eased off the skin, 1-4 cm | 378 | 102 | 51 |
  | eased off the skin, 1-8 cm | 227 | 26 | 20 |
  | the skin's, in full (this) | 232 | 31 | 20 |

  Eased, the mane sheared through itself in the throw (35 frames, 14.7 mm), the roof mantle (46, 10.8 mm) and the
  ledge descent (8, 5.1 mm), and folded in the prone aim all the same (10 frames, 8.7 mm). Eased further, to 8 cm,
  it is a shade better on the horse (227 against 232) and the same on the donkey; one rule for all hair, the
  beard's, is simpler. The fold it was meant to cure is the skin's (below).
- **A longer reach for every layer** (3 cm, not 1.5). Measured above the shoulders through every motion on all
  eleven: 19,479 pair-frames became 19,876 (+2%); the crossings between parts held even (11,565 to 11,553), better
  on the horse (-12%) and the goat (-1%), worse on the sheep (+5%), the dog (+3%) and the bull (+2%); the folds
  of a part through itself grew 5% (4,661 to 4,897: the cow's, the sheep's and the rabbit's neckerchiefs). It
  freed the horse's and the goat's bibs and straps from their shirts (the horse's overalls into his shirt in the
  aim, 50 frames at 9.8 mm, became 10 at 4.8; the goat's shirt under its overalls in the throw, 22 frames, none)
  and cost the cow's and the sheep's neckerchiefs, which folded through themselves (the sheep's in the aim from 10
  frames at 8.1 mm to 70 at 15.6 mm, the cow's in the mantle from none to 43), and the sheep's waistcoat against its
  wool ruff (in the mantle from 12 frames to 46, 16.5 mm). At 3 cm a neckerchief follows three things at once, the
  shirt, the bib or the waistcoat, and the skin (of the cow's 112 fitted vertices 42, 27 and 43, against 18, 17 and
  77 at 1.5 cm; the sheep's 39, 36 and 49, against 5, 4 and 115; counted by the nearest vertex), and it folds where
  they part.
- **Smoothing the fitted weights across a layer**: each fitted vertex taking its own part's average within 2 cm, so
  that a neckerchief's two faces could not follow different things. Through the aim's 70 frames the neckerchiefs
  folded in more frames, not fewer: the cow's in 30 (10 without it, 5.5 mm, now 7.4), the sheep's in 70 (10;
  shallower, 6.9 mm against 8.1), the rabbit's in 70 (60), the dog's in 50 as before (8.1 mm against 8.8).
- **A 3 cm reach for the bibs, trousers and braces alone**, which round 2 measured (the aim, the throw, the mantle and
  the ladder above the shoulders, all eleven): the horse's bib into his shirt in the aim fell from 50 frames to 10
  (4.8 mm), the horse's and the goat's in the throw went, the cow's neckerchief folded in 30 aim frames rather than
  10, and the horse's bib sank about a tenth more into his neck; even overall (6,872 to 6,782 pair-frames of
  crossings, 10.82 M to 10.84 M points).

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
  imports them); the idle's part is above. The motion viewers, the horse chair study and the horse prone study use
  the older adapters, which keep the fit (above).

## What the census finds that this does not touch

Most of what a sweep finds is the poses' own, on main as here: a carried rifle's forearm pressed into the bib,
the overalls or the shirt (past 23 mm in every frame of the stances, the walk and the flamethrower, on all
eleven), the trousers folding through themselves at a kneel or prone (3.5 to 8 cm), the throat and the jaw swept
through the collar where the aim nods the head down (in all 70 of the aim's frames on main and 50 to 70 here, at
their deepest past 23 mm; all but the donkey). The aim nods the head down up to 72 degrees standing and back 87
prone, on the horse, and turns it at most 31 (the head's turn on the chest, split into a turn, a nod and a roll:
there is no roll). These are poses, not weights.

- **The pig director's collar under his jowls, and the sheep's neckerchief under its wool ruff.** The skin
  over these collars is the head's own overhang, and a collar is not glued to the jaw above it (it would fold
  as the jaw turned), so as the head turns the jowls and the ruff sweep over the cloth (68.5 mm on the
  director's collar, 40.2 mm on the sheep's; 75.0 and 63.2 mm on the chest's weights). On screen the overhang
  covers it; at the throw's widest turn of the head the sheep's neckerchief slips under its ruff, close up, though
  from the game's camera it still shows. A collar set clear of the jowls, a ruff ending above the neckerchief:
  asset changes.
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
7. A character made from mesh data already fitted copies the fit exactly (the weights and the record), after the
   one made before it has gone on to the posture's hem tuck and a ladder, and after one has been scribbled on.
8. Through the throw, the cloth at the arms (the census's arm: within 7 cm of the arm bones) lies where the name
   rules put it, within 1 mm (three vertices there, the tops of the horse's overall straps: 0.6 mm; no other
   mammal has a fitted vertex there).
9. Hair does not fold through itself in the roof mantle or the ledge descent, nor deeper than 8 mm in the throw
   (measured: none, none, 5.8 mm on the horse). These bounds are the shipped rule's own results, set to fail the
   eased manes (10.8, 5.1 and 14.3 mm): a guard against them, not a claim that main folds too (it does not).
10. A neckerchief keeps its shape in the prone aim, where the neck bends furthest: it folds through itself no deeper
    than 1 cm (measured: 8.8 mm on the dog, 8.1 on the sheep, 5.5 on the cow; with a 3 cm reach the sheep's, 15.6).
    Pitched between the two, it guards against the rejected reach; main has no such fold.

Mutation passes, on scratch copies of the tree outside the repository: 44 mutants of the fit, the cache, the
posture's hem tuck, the ladder's corridor, the idle, the casualty and the fire cards, review round 1's thirteen
among them (eleven ported to this code, two already in the set) and round 2's two cache mutants (the cache keeping
the first character's live arrays; later characters sharing the cache's) with a third, the record shared again.
42 fail the tests. The two that pass change nothing on these eleven:

- a hard step for the fade at the neck's base: no cloth vertex lies where the fade is partial with skin under it
  whose weights differ from its own, so no weight moves;
- the casualty reading the fitted weights rather than the names': with the arm weights kept, its contact sets settle
  the same four falls.

Round 1's 3 cm reach passed the first nine tests; the tenth fails it. The cache mutants passed the first test 7
and fail it now. Round 2's own fourteen: ten failed then, two changed no weight (a fade at the base twice as wide;
the hem tuck without its arm keep), and the other two were the cache pair.

Tools:

- `tools/clothing-census.mjs`: the census, on any posed character (options for each of its numbers; a focus on
  part of the body).
- `tools/clothing-sweep.mjs`: the census through the game's motions on one character (`--root` reads another
  checkout, such as main before a change; `--focus neck|arms`; each pair keeps its frames, its deepest point and
  where it lay at rest, and its census points); `--compare` for two runs; `--summary` for every character's before
  and after: the pair-frames that went and came and the points, all, crossings between parts and folds, by motion,
  by character and by region, and every pair that got worse by 10 frames or more, 1 mm or more deeper, or a quarter
  more points.
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
