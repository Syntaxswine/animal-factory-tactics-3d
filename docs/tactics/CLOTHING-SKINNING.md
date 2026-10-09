# Clothing and skinning on the game's characters

**Direction (the boss, 2026-10-09):** "yeah, i sent it to you because i like the work you have done so far
and thought you could add it to the existing models in the game where needed"

"It" is the [clothing and skinning handoff](IDLE-SKINNING-V5-HANDOFF.md) (`b546dfb`). The handoff collects
the corrections the idle study's fifth version
([PR #4](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/4), not merged) made to how the
characters' clothes follow their bones. Those corrections live inside the idle and are undone when it
ends, so none of the game's other motions has them.

## What changed

- **The characters' clothes on the neck follow what they lie on**
  (`createLightHorse` in `horse-light-model.js`, which builds all eleven mammals). Each part's weights come
  from its name and height alone, so every layer round the neck (a collar, a neckerchief with its knot and
  ends, the tops of a shirt, waistcoat, jacket, bib or braces) belonged wholly to the chest, while the neck
  skin under it blends into the head; and hair (the horse's and donkey's manes, the goat's beard) belonged
  wholly to the head, while the neck it grows from does not. As the head turns to aim or throw, the skin slid
  through the collar and the mane came away from the neck. Now each layer on the neck takes the weights of
  the layer under it (within 1.5 cm) or of the skin under it, fading out 13 cm from the neck and in at its
  base, and hair takes the weights of the skin it grows from. This is the idle's v5 rule, run once when a
  character is made, on the meshes as drawn.
- **The battle posture keeps it.** Its hem tuck (`battle-posture.js`) rewrote all four weights of every shirt
  vertex, which would have taken the head's weight off every collar; it now keeps weight on any bone besides
  the hips, the spine and that side's arm, and writes exactly what it wrote before for every vertex without
  one. The same for the dog's and the rabbit's inner sleeve corridor on the ladder (`ladder-motion.js`).
- **The idle study is unchanged.** It bends the neck on a bone of its own and fits the cloth on the neck to
  that bone, from the plain weights, as it was fitted and approved. The builder keeps each changed vertex's
  plain weights (`geometry.userData.layerFit`), and the idle puts them back while it runs; its fitted limits
  are the same for all eleven (`idle-fits.js` re-keyed by `tools/fit-idle-rigs.mjs`, since the key hashes the
  weights).
- **Nothing else moves.** The fit changes 9-21% of a shirt's vertices (those round the neck), the tops of the
  bibs and braces, the neckerchiefs, the dog's collar flaps, the manes and the beard; no skin, forearm, hoof,
  boot, tail or cap. The outfits (red hats, the Hawaiian shirt) are paint and rigid hats on the head bone, so
  they carry the same change. Building a character takes 16-60 ms longer (Node, this machine).

## Where it was needed: the game's own motions

The game drives its characters with the battle posture (stand, kneel, prone, down, dead), locomotion, rifle
firing (aim and recoil, standing, kneeling and prone), the grenade throw, the flamethrower, the ladder, the
roof mantle, the ledge descent and the weapon draw. None of them fitted the clothes at the neck. The idle's
surface census (`tools/clothing-census.mjs`: points 4 mm apart on every triangle near another part, skinned
as the GPU draws them; a point that shows at rest may sink no more than 3 mm deeper) was lifted out of the
idle's tests and run through all of them (`tools/clothing-sweep.mjs`), on main's characters and on these, for
all eleven: 589 frames a character.

The sweeps read the body above the shoulders, every motion, before (main) and after; a pair-frame is one
pair of parts crossing in one frame there:

| motion | frames | pair-frames at the neck, main -> fit |
|---|---|---|
| stance (stand, kneel, prone, down, dead, and between) | 121 | 155 -> 104 (-33%) |
| walk | 451 | 0 -> 0 |
| aim and recoil (standing, kneeling, prone; five bearings, three heights) | 770 | 5,860 -> 5,640 (-4%) |
| grenade throw | 1,529 | 2,547 -> 1,318 (-48%) |
| flamethrower | 484 | 0 -> 0 |
| roof mantle | 1,111 | 1,799 -> 927 (-48%) |
| ledge descent | 671 | 322 -> 123 (-62%) |
| ladder | 1,111 | 2,629 -> 1,555 (-41%) |
| weapon draw | 231 | 8 -> 0 |

By character: the donkey -63%, the goat -47%, the skunk -38%, the bull -37%, the dog -31%, the horse -29%, the
cow -22%, the sheep -20%, the pig foreman -17%, the rabbit -12%, the pig director -3%.

- **The largest gains:** the skull through the shirt collar in the throw (the dog 112 frames to none, the bull
  110 to none, the skunk and the rabbit 101 to none, the pig foreman 131 to 14); the donkey's mane off its neck
  in the throw (109 to none) and on the ladder (97 to none); the horse's mane on the ladder (98 to none); the
  goat's beard on the ladder (94 to none).
- **What got worse** (to the census; none of it shows in the renders): a neckerchief folding through itself in
  the aim (the rabbit, 60 frames at most 5.6 mm; the dog, 50 at 8.8 mm) and in the sheep's throw (36, 8.5 mm),
  where its outer surface lies more than 1.5 cm off the layer under it and follows the skin instead; braces and
  bibs against the shirt under them (the pig foreman's braces 28 to 55 frames in the throw, at the 16.6 mm the
  throw's first frame has on main too; the horse's bib 50 frames, 10.1 mm, in the aim); the sheep's wool into its
  neckerchief on the ladder (2 to 95 frames, 4 mm).
- **The aim changes least:** its head roll (49 degrees on the horse, to lay the cheek on the stock) sweeps the jaw
  and throat through the collar on main as here, and the head itself covers it.

What the renders show, before and after (`docs/tactics/hybrid-review/clothing/`):

- [neck-throw.png](hybrid-review/clothing/neck-throw.png): six characters at the throw's widest turn of the head.
  On main the collar band opens above the neckerchief as the head turns; with the fit it stays on the neck.
- [mane.png](hybrid-review/clothing/mane.png): the horse's mane runs down the turning neck instead of breaking
  away from it, in the red hats outfit too.
- The aim, prone, the flamethrower, the walk and the draw look the same before and after, close up and at
  gameplay size: they hardly turn the head against the chest, or (the aim) turn it so far that the head covers
  the collar.

## Tried and dropped

- **The idle's arm corrections** (the forearm's weight stripped from a shirt's sides beyond 10-12 cm of the
  forearm bone; a sleeve's end glued to the forearm in it, 1-3 cm). In the idle they kept a shirt's side from
  tearing at the hip and a forearm from turning out of its sleeve. Through the game's throws the sleeve ends
  followed the bent elbow out of the sleeve (pale patches on the forearm, the pig director, the sheep, the
  pig foreman), and the strip made the horse's throw worse (the shirt into the left forearm: 58 frames,
  19 mm, became 79 frames, past 23 mm), changing nothing in the aim, the flamethrower or the ladder. The
  sleeve masks the builder gives each species were made for these motions; the idle keeps its own strip.
- **A wider reach for every layer** (3 cm, not 1.5). It freed the horse's straps from its shirt and cost the
  sheep's waistcoat against its wool ruff (15 new frames, 11.7 mm) and the dog's neckerchief.

## What the census finds that this does not touch

Most of what a sweep finds is the poses' own, on main as here: a carried rifle's forearm pressed into the bib
or overalls (deeper than 23 mm, in every standing, walking and flamethrower frame), cloth folding through
itself at a kneel or prone (3-4 cm), the jaw and throat swept through the collar by the aim's head roll (the
horse's head rolls 49 degrees to the stock). These are poses, not weights.

- **The pig director's collar under his jowls, and the sheep's neckerchief under its wool ruff.** The skin
  over these collars is the head's own overhang, and a collar is not glued to the jaw above it (it would fold
  as the jaw turned), so as the head turns the jowls and the ruff sweep over the cloth (68 mm on the
  director's collar for a 30 degree turn, 40 mm on the sheep's; 75 and 63 mm before). On screen the
  overhang covers it. A collar set clear of the jowls, a ruff ending above the neckerchief: asset changes.
- **Paint, not geometry:** the goat's throat (a red blush and two red marks between its beard and its
  neckerchief), the seam where the director's collar meets his jowls and the sawtooth edges of the sheep's
  neckerchief show at rest and in every motion, but rendered in plain grey the surfaces there are clean
  ([paint-not-geometry.png](hybrid-review/clothing/paint-not-geometry.png)). They are the paint's, for the painted atlases.

## Tests and tools

- `tests/clothing-layers.test.mjs`, written apart from the builder's fit (skull and layer vertices, the census,
  main's hem tuck restated), with the head turned 30 degrees either way, nodded, raised and tilted:
  - the layers on the neck of nine mammals keep within 12 mm (95th percentile) of the skin under them (2-10 mm
    measured; 19-66 mm on the name rules' weights), hair within 1 cm, the sheep and the director no worse than
    on the chest's weights;
  - the census above the shoulders finds no layer in another or through itself on any of the eleven, and the
    skin and a layer crossing at no more than 60 points and 8 mm on the nine (measured: 39 points, 6 mm; on the
    name rules' weights hundreds, 11-16 mm);
  - a layer slides less than 4 mm against the layer under it (0.3-3.6 mm; 0.8-5.1 mm if each layer took the skin
    for itself);
  - the battle posture keeps every collar's head weight and tucks every other hem vertex exactly as main did;
    the dog's and rabbit's ladder keeps it while it plays.

  Eight mutants of the fit, the posture and the ladder each fail them: no fit, hair kept on the head, no
  layer-on-layer, no height cap, a narrower field, the posture or the ladder dropping a collar's head weight, the
  hem tuck's waist band moved.
- `tools/clothing-census.mjs`: the census, any posed character (options for each of the rule's numbers; a
  focus on part of the body).
- `tools/clothing-sweep.mjs`: the census through the game's motions on one character, and `--compare` for two
  runs (`--root` reads another checkout, main before a change).
