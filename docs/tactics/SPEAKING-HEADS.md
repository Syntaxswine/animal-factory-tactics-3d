# Speaking heads

**Status (October 14, 2026): the grey sculpt failed independent review round 1 (3/10, `hybrid-review/speaking-heads/reviews/round-1.md`); this is the rework, for review round 2 of 5. Steps 1–3 are rebuilt for all twelve characters; step 4, the paint, works but is not reviewed. Three known defects are listed under Not done (the hen's closed beak among them). Nothing here changes a character in the game.**

Each character's approved head, sculpted to speak:
- its lips part along its painted mouth line, from the painted corners;
- behind them, a mouth: a cavity, teeth, a tongue, a ruminant's dental pad;
- along the sides of the open mouth, skin stretched from lip to lip closes it (the cheeks); at the front, a window opens onto the teeth and tongue;
- its lower jaw is weighted to a jaw bone at the jaw joint.

Closed, a speaking head is the approved head: its outer skin lies on the approved surface (within the sculpt's own meshing error, 1.5 mm, by test), and the lips meet in a crease along the painted line. Open it with one number, the jaw's angle.

Open `tactics/speaking-heads.html`. Each character's approved head is on the left and its speaking head on the right, at either mesh level, with a jaw slider, a spoken line, a tilt, and paint, grey, wireframe, coverage and jaw-weight modes. Below them is the reference sheet: the mouth planned on the character's registered paint.

## Direction (the user, October 14, 2026)

> i'd like a variant of the heads for all the animals that's sculpted to speak. there was a sculpting workflow the other builder was using that worked well where they used a high detail sculpt and reduced it down.

The builder's workflow, as the user passed it on:

> You're remembering the roughly 3:1 reduction. For our characters, it's usually 30,000 triangles → 10,000 triangles.
> Our workflow is:
>
> 1. Reference sheet: establish front, side and back views, proportions, clothing and character identity.
> 2. Grey sculpt: build the silhouette and major forms, checking scale against existing characters. Independent review to 9/10 before painting.
> 3. Reduce the mesh: simplify the actual authoring model to roughly 10k triangles, preserving silhouettes, joints and important features.
> 4. Painterly skin: paint directly over registered renders of the model. Fur, stitching, folds, wear and fine detail mostly live in the texture.
> 5. Final inspection: compare both meshes from multiple angles at close and gameplay size; check deformation, paint coverage and attachments. Fix issues until the independent review reaches 9/10.
>
> Props use smaller budgets appropriate to their size—we don't force a chair or weapon up to 10k.

And on the first painted open mouths (the goat, jaw 14°):

> the bottom line of the mouth looks ok, but the top line of the mouth does not extend to the far corner. it also looks like there is an extra nostril on the side of the sheep too.

## The workflow, step by step

### 1. Reference sheet

The characters' identities are settled. Their turnarounds (`dist/assets/characters/model-references/`) and registered paint sheets (`dist/assets/characters/lowpoly-proof/*-model-paint-*.png`) are the reference. What a speaking head adds is its mouth, so the reference sheet is the mouth planned on each character's registered paint, side and front: the lip line where the lips part, the corners, the jaw joint, the jaw line and the jaw's angle, the cavity, the teeth and the tongue. The viewer draws it from the same numbers that sculpt the head (`tools/speaking-heads/mouths.mjs`).

**The lip line is the painted mouth line, as the approved head shows it.** The first lip lines were straight, placed by eye on the paint sheets. On the approved heads the painted lines run further back and curve: the goat's opening stopped 1.8 cm short of its painted corner, and its painted line, up to 11 mm below the cut, rode down on the lower lip. Now the line is traced off the paint and the cut fitted to it:

1. **Trace.** `speakingHeads.traceMouth('side'|'front')` in the viewer draws the approved head, painted, from the side or the front at 5000 px per unit. In columns 2 mm apart it scores every row within 2.5 cm of the cut by how much darker it is than 1.5 mm above and below, and joins the darkest rows by dynamic programming (2.5 contrast per millimetre jumped). The traces are `tools/speaking-heads/painted-mouths.json`.
2. **Curate.** A trace also finds nostrils, fur edges and the rim of a pink muzzle. Which stretch of each trace is the mouth was read off the traces drawn over the paint, and is set per head in `fit-lips.mjs` (`CURATED`), with the painted corner.
3. **Fit.** `node tools/speaking-heads/fit-lips.mjs` fits the cut as a spline along the head (`lip.line`, knots about 1.5 cm apart) by least squares weighted by contrast, with a bend penalty. The rabbit's mouth is on the front of its face, so its line is level and the fit is across it (`lip.across`, the lobes of its upper lip). The corner is the painted line's back end, half a taper forward. `--check` (and a test) holds `mouths.mjs` to the fit.

| Head | Corner (cm forward of the skull's origin) | Painted line from the cut along the side (rms), straight → fitted | Painted line from the fitted cut across the front (rms) |
| --- | --- | ---: | ---: |
| horse | 17 → 16.8 | 8.9 → 1.2 mm | 1.3 mm |
| goat | 13 → 11.2 | 6.0 → 0.4 mm | 3.0 mm (the ends of its W) |
| bull | 14 → 12 | 3.6 → 0.9 mm | 1.8 mm |
| cow | 11.9 → 11.2 | 8.8 → 1.4 mm | 1.6 mm |
| donkey | 15 → 14.5 | 8.7 → 1.4 mm | 1.3 mm |
| sheep | 11 → 10 | 7.3 → 1.0 mm | 1.2 mm |
| skunk | 10 → 10 | 7.1 → 1.0 mm | (its front trace follows the lower lip's pale edge, not the mouth: not used) |
| pig foreman | 15 → 13 | 3.5 → 0.9 mm | 1.9 mm |
| pig director | 10 → 13.8 (its corner was held to the snout's front, z < 7.5 cm; now the face's sides) | 11.0 → 1.8 mm | 1.8 mm |
| rabbit | (on the front of its face; the window to z 6.8 cm) | 0.9 → 0.5 mm | 4.8 → 1.6 mm |
| dog | 13.5 → 7.9 | 9.7 → 1.0 mm | 1.2 mm |
| hen | (her gape: unchanged) | | |

Fitted, every line is within 2 mm (rms) of its painted line along the side. Across the front the fit uses the middle (the front traces' ends ride up the muzzle's edges); the whole front trace is 1.2–3.0 mm from the fitted cut.

### 2. Grey sculpt

The characters' heads were sculpted as signed-distance fields in their build tools (`tools/build-<character>.mjs`, and `horse-grey-model.js` for the horse). `tools/speaking-heads/heads.mjs` holds verbatim copies of the twelve head sculpts, with the placement each tool gave its skull. The first test proves the copies: every vertex of every shipped authoring skull lies on its copied sculpt.

`tools/speaking-heads/sculpt.mjs` opens a head for speech. In rest space (the head's own sculpt space) the speaking head is the approved head with a mouth inside it. The lips part in an **expanded space**, which is what gets sculpted:
- **The cut** is the lip line's surface (a beak: the plane of its gape). Everything above it moves up by sigma (4 mm), everything below down by sigma; sigma tapers to nothing over a centimetre behind the corners.
- **The slab** between is the head's section at the cut drawn out vertically: along the sides of the mouth it is the skin that stretches from lip to lip as the jaw opens (the cheeks), closing the mouth from the side. Painted as the mouth's inside once open, it reads as the open mouth in shadow.
- **The window** at the front is air: within `cheeks.window` of the middle (1.1–2.5 cm), from the corners forward, walled at its ends. It opens onto the teeth and tongue.
- Every vertex sculpted there maps back to rest space by the same shift; the slab's onto the cut. So a closed speaking head is the approved head: the lips' faces fold onto the cut and meet in a crease along the lip line. Faces the window's air shapes fold too, though the field's blend leaves them a hair outside the slab (else the closed lips keep a crack: the horse's showed its incisors).

Inside:
- **The cavity** behind the lips: from `floor` below the cut to `roof` above it, `wall` inside the cheeks, `front` behind the lips' front, never nearer the surface than `wallMin`, its edges rounded.
- **A dental pad** on the front of the roof for the cattle, goat and sheep: their lower incisors close against it.
- **Teeth**: lathed incisors (spade-shaped, their roots a little over half as wide as their crowns) and canines (tapering to a point), on arches inside the lips: the cavity's outline at the cut moved inward (the true inward offset, rounded to 4 mm where a narrow snout's mouth comes to a point). Each is rooted in the gum as built, a millimetre inside a thin chin at most, and reaches past the cut by `tip`. Procumbent lower incisors lean straight back from their tips. Each row is as wide as leaves a hair between neighbours at every height (their sections are compared through the height both reach); no two teeth touch (the build refuses).
- **The tongue** lies on the floor behind the lower teeth, its top below the cut at the tip rising toward the back.

**The jaw's weight**: the mandible (below the lip line, above the jaw line read every millimetre off the head's own profile, in front of the line from the jaw's angle up to its joint) is rigid; the throat behind and below it blends; behind the corners the cheeks blend across the lip line; in front of them each lip belongs wholly to its own side; the slab is graded from the upper lip to the lower.

The hen is the exception: her head and beak are separate parts, and only her beak is replaced. It parts along its gape as two rigid mandibles, the lower one turning about the beak's root.

### 3. Reduce

`node tools/build-speaking-heads.mjs` sculpts each speaking head at 2.5 mm (1.5 mm for the beak), finer than the characters' 4.5–5.5 mm, then reduces it twice, as the characters were: to an authoring mesh at the skull's own authoring budget plus a quarter, and from that to the game mesh at the skull's game budget plus a quarter (the dog, the heaviest character, a fifth). The reductions use the characters' simplifier (meshoptimizer) and tolerances, in two parts that meet along locked borders: the approved outer surface at the skull's own, the mouth at its own. Added:
- **The skin is simplified where it was sculpted, the open space, with its shape closed and open as attributes**: the rest positions and the positions with the jaw open 12° count at full weight, and the jaw's weight, the inside, the side of the lips and the fold too, so the reduction keeps them.
- **Pinches and crossings are prevented.** Where a collapse pinches a thin wall into edges shared by four triangles, or folds the outer skin through itself (closed, at 6° or at 12°, posed as the head is written: rest to the micrometre, jaw weights to 1e-4), the vertices there are locked and the reduction done again.
- **The lips meet closed.** The authoring mesh keeps the lips' edge rows across the front whole (locked), so its closed lips meet on the approved surface's section. The game mesh cannot spend its mouth's few triangles on them: holding them, its gums and floor gave way by up to 7 mm (the horse's incisors hid, 14% of its tongue showed). Reduced each on its own, though, the two lips' faces leave the crease a little differently, and a ray along it (seen edge on, from the front) passed between them to the teeth: a hairline. So, closed, each face sits a little past the crease into the other's side (a beak's gape too): 0.5 mm in the game mesh, 0.2 mm in the authoring mesh (hidden inside the closed mouth; open, the lips are that much less apart).
- **Vertices a hair apart in every pose become one** where the surface stays closed.
- **Teeth and the tongue are made, not reduced**: closed lathes, 140 (a tooth) and 336 triangles in the authoring mesh, 30 and 72 in the game mesh.

The build writes `dist/tactics/speaking-heads/<id>-author.json` and `<id>-10k.json`, 15–130 s a head, and refuses to run if the approved sculpt no longer gives the placement frozen in `heads.mjs`.

Triangles, as built (a tooth 140 in the authoring mesh, 30 in the game mesh). The speaking character is the character's game mesh with its skull replaced by the game speaking head:

| Head | Authoring: skin + teeth + tongue | Game: skin + teeth + tongue | Speaking character (game) | Headroom to 11,500 |
| --- | ---: | ---: | ---: | ---: |
| horse | 10,136 = 8120 + 1680 + 336 | 3,554 = 3122 + 360 + 72 | 11,356 (was 10,300) | 144 |
| goat | 11,202 = 9746 + 1120 + 336 | 3,802 = 3490 + 240 + 72 | 10,998 (was 9,994) | 502 |
| bull | 11,206 = 9750 + 1120 + 336 | 3,874 = 3562 + 240 + 72 | 11,152 (was 9,998) | 348 |
| cow | 10,378 = 8922 + 1120 + 336 | 3,384 = 3072 + 240 + 72 | 11,108 (was 10,184) | 392 |
| donkey | 10,758 = 8742 + 1680 + 336 | 3,678 = 3246 + 360 + 72 | 11,192 (was 10,110) | 308 |
| sheep | 11,204 = 9748 + 1120 + 336 | 3,558 = 3246 + 240 + 72 | 11,434 (was 10,476) | 66 |
| skunk | 7,914 = 5618 + 1960 + 336 | 2,988 = 2496 + 420 + 72 | 10,986 (was 9,998) | 514 |
| pig foreman | 9,196 = 6620 + 2240 + 336 | 3,110 = 2558 + 480 + 72 | 11,048 (was 9,988) | 452 |
| pig director | 10,196 = 7620 + 2240 + 336 | 3,278 = 2726 + 480 + 72 | 11,126 (was 9,998) | 374 |
| rabbit | 9,894 = 8998 + 560 + 336 | 3,304 = 3112 + 120 + 72 | 10,970 (was 10,156) | 530 |
| dog | 9,712 = 7136 + 2240 + 336 | 3,250 = 2698 + 480 + 72 | 11,446 (was 10,446) | 54 |
| hen | 2,508 = 2172 + 0 + 336 | 1,330 = 1258 + 0 + 72 | 11,028 (was 10,348) | 472 |

### 4. Painterly skin

The speaking head keeps its character's registered paint. Its skin is the approved surface away from the mouth and takes the skull's place in the character's part order, so `createAnimalPaint` projects the same sheet onto it, with every correction the character's paint already makes.

What the paintings never saw is the inside of the mouth. `speaking-head.js` paints it over the registered paint, per fragment:
- the lip's inner face, then gum, darkening into the back of the mouth with depth below the approved surface, with a painterly grain;
- the cheeks between the parted lips as the mouth at its deepest midway between them: from the side, the open mouth in shadow;
- teeth that darken toward their roots, and a tongue lighter along its top, with a groove.

The cheeks and the lips' faces take that paint over the jaw's first 2° (`CHEEKS_SHOW`). Closed, they lie folded in the crease, where no view of the registered paint sees them: there they darken to the crease's shadow. The colours are per character (`MOUTH_PAINT`).

This session has no image-generation tool. The builder's step 4 paints over registered renders; here the mouth's interior is painted in code instead. A painted pass over registered renders (the viewer: open the jaw, grey mode, any view) is the one piece of the workflow left to a builder who can paint.

### 5. Final inspection

Not yet run. `node tools/speaking-heads-review.mjs --stage=paint` photographs the game mesh, painted, with screen-space paint coverage, closed and open. It then goes to independent review, to 9/10.

## Using a speaking head

```js
import {speakingHeadFile,withSpeakingHead,rigSpeakingHead,jawAt,SPEECH_OPEN} from './speaking-head.js';
const head=await fetch(speakingHeadFile(profile.id)).then(r=>r.json());   // or (id,'author')
const worker=profile.create(withSpeakingHead(data,head));                 // the skull replaced, in its place
const speech=rigSpeakingHead(worker,head);                                // jaw bone, weights, teeth, tongue
const paint=await createAnimalPaint(renderer,worker,profile,loader,outfit,lit);
for(const p of worker.parts)p.material=paint.material;
speech.applyPaint(paint);                                                 // the mouth's own paint
speech.setJaw(jawAt(t,{start,open:SPEECH_OPEN[profile.id],syllables}));    // radians open
```

- **The jaw bone** hangs from the head bone at the jaw joint and turns about the character's left–right axis.
- **Hair on the face** (the goat's beard) takes the skin's weights where it grows, so it rides the jaw.
- **Teeth and tongue are rigid:** the upper teeth on the head, the lower teeth and tongue on the jaw.
- **Lifetime:** the rig belongs to the speaking character for its life. `speech.dispose()` releases the teeth and tongue; `worker.dispose()` releases the rest.
- **Speech:** `jawAt` opens the jaw once a syllable, wider for stressed ones. `SPEECH_OPEN` parts the lips about 2.5 cm at the front at full stress (3–9°, by the jaw's lever).

## Round 1 → round 2

Round 1 (3/10) found the heads did not read as sculpted to speak. What changed, finding by finding:

- **M1, the open mouth a see-through hole.** The slit is gone. Along the sides, the slab between the parted lips is skin (the cheeks); only the window at the front is air, and its ends are walls (ends drawn out to nothing tore into strips with holes). Measured below: nothing seen through the cheeks.
- **M2, the jaw a flap.** The jaw's weight is the mandible read off each head's own profile (the jaw line, every millimetre, and the line from the jaw's angle to its joint): rigid down to the jaw line, the throat blending behind and below. Lips belong wholly to their sides in front of the corners.
- **M3, the bull's sausage lip.** Removed; the bull's jaw is his mandible, like the others'.
- **M4, the seal collapsing the mouth.** There is no seal: the expanded space keeps the cavity, floor and roof as sculpted; closed, only the lips' faces fold onto the cut.
- **M5, closed mouths showing teeth.** The lips' faces fold onto the cut exactly (faces the window's air shapes too); the authoring mesh keeps the crease at the front, and the game mesh's lips overlap by half a millimetre when closed; teeth are rooted inside thin chins. Measured below. The hen's beak is the exception (see Not done).
- **M6, floating teeth.** Teeth are rooted in the gum as built, at every opening (measured).
- **M7, the pig-director's frill.** The reduction keeps the rest and open shapes as attributes and refuses pinches and crossings.
- **M8, pillars and folds.** The cavity's walls are not stretched across the lips any more (the slab is the cheeks); the reductions lock where the outer skin would fold through itself.
- **S1, teeth as dice.** Lathed incisors (spade-shaped) and canines (pointed), a dental pad for the ruminants, the pig-director's canines.
- **S2, chomping.** `SPEECH_OPEN` parts the lips about 2.5 cm at the front, by each jaw's lever.
- **S3, teeth through each other.** The layout refuses any two teeth touching; the tongue is narrower than the teeth beside it.
- **S6, the pig-director's lip line.** Every lip line is now fitted to the painted line (step 1).
- **S7, tests blind to the defects.** The reviewer's instruments are in the tree (`tools/speaking-heads/measure.mjs`) and the tests hold their acceptance numbers (below).
- **S8, the closed-difference crop.** Replaced by the outer skin's distance from the approved surface (tested) and the instruments.

The acceptance numbers round 1 suggested, measured on both meshes (`measure.mjs`):

| Head, mesh | Seen through, open (worst, mm²) | Teeth/tongue seen closed (mm²) | Teeth through the skin / unrooted | Incisor crown at 12° (least, mm) | Tongue seen from the front at 12° | Outer skin crossing itself at 6°/12° | Jaw line under 0.9 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| horse, authoring | 0.1 | 0.0 | 0 / 0 | 6.4 | 52% | 0 / 0 | 0 |
| horse, game | 0.0 | 0.0 | 0 / 0 | 4.8 | 54% | 0 / 0 | 0 |
| goat, authoring | 0.0 | 0.0 | 0 / 0 | 4.9 | 66% | 0 / 0 | 0 |
| goat, game | 0.0 | 0.0 | 0 / 0 | 3.5 | 70% | 0 / 0 | 0 |
| bull, authoring | 0.0 | 0.0 | 0 / 0 | 5.2 | 64% | 0 / 0 | 0 |
| bull, game | 0.1 | 0.1 | 0 / 0 | 2.4 | 60% | 0 / 0 | 0 |
| cow, authoring | 0.2 | 0.0 | 0 / 0 | 4.0 | 60% | 0 / 0 | 0 |
| cow, game | 1.6 | 0.0 | 0 / 0 | 3.4 | 60% | 0 / 0 | 0 |
| donkey, authoring | 0.0 | 0.0 | 0 / 0 | 6.1 | 56% | 0 / 0 | 0 |
| donkey, game | 0.0 | 0.0 | 0 / 0 | 4.2 | 60% | 0 / 0 | 0 |
| sheep, authoring | 0.0 | 0.0 | 0 / 0 | 5.4 | 57% | 0 / 0 | 0 |
| sheep, game | 0.0 | 0.0 | 0 / 0 | 4.2 | 61% | 0 / 0 | 0 |
| skunk, authoring | 0.0 | 0.0 | 0 / 0 | 4.1 | 60% | 0 / 0 | 0 |
| skunk, game | 0.0 | 0.3 | 0 / 0 | 2.9 | 54% | 0 / 0 | 0 |
| pig foreman, authoring | 0.0 | 0.0 | 0 / 0 | 6.3 | 60% | 0 / 0 | 0 |
| pig foreman, game | 0.2 | 0.0 | 0 / 0 | 3.9 | 59% | 0 / 0 | 0 |
| pig director, authoring | 0.0 | 0.0 | 0 / 0 | 6.6 | 45% | 0 / 0 | 0 |
| pig director, game | 0.0 | 0.0 | 0 / 0 | 1.4 | 43% | 0 / 0 | 0 |
| rabbit, authoring | 0.0 | 0.0 | 0 / 0 | 6.8 | 60% | 0 / 0 | 0 |
| rabbit, game | 0.0 | 0.0 | 0 / 0 | 6.5 | 65% | 0 / 0 | 0 |
| dog, authoring | 0.0 | 0.0 | 0 / 0 | 5.4 | 59% | 0 / 0 | 0 |
| dog, game | 0.0 | 0.0 | 0 / 0 | 4.2 | 61% | 0 / 0 | 0 |
| hen, authoring | – (a beak) | 5.4 | 0 / 0 | – | 0% (from 30° above) | 0 / 0 | – |
| hen, game | – (a beak) | 3.6 | 0 / 0 | – | 0% (from 30° above) | 0 / 0 | – |

The bars, from round 1: nothing seen through open (at most 3 mm², where the wall closing the window meets the lips); closed, at most 0.5 mm² of tooth or tongue from any of 120 directions; no tooth through the outer skin and every tooth rooted, closed and at 6°, 12° and 24°; incisor crowns at least 4 mm at 12° (the authoring mesh); at least 30% of the tongue seen from the front at 12°; no outer skin crossing itself at 6° or 12°; no jaw-line column under 0.9 (the authoring mesh). The hen's closed beak and tongue and the game meshes' crowns miss theirs (Not done).

## Checks

`tests/speaking-heads.test.mjs`, about 50 seconds:
- the copied sculpts are the approved heads;
- every head was built from the current sources (a hash of the sculpt modules and build tool);
- every part is a closed surface;
- each mouth parts on its painted mouth line: `mouths.mjs` is the fit to the traces, the fit is within 2.5 mm (rms) of the painted line, and a line moved 4 mm fails it;
- closed, the outer skin lies on the approved surface (within the meshing error) and the lips are on their own sides;
- the round-1 acceptance numbers, on both meshes, by the reviewer's instruments: nothing seen through the head open; no tooth or tongue seen closed; teeth and tongue in the skin at every opening, rooted, incisor crowns showing; the tongue seen from the front; no outer self-intersection as the jaw opens; the jaw's weight along the jaw line (and a flap fails it);
- three known defects held as todo tests, so they show in every run: the hen's closed beak, the hen's tongue, the game meshes' incisor crowns;
- the budgets; the head takes the skull's place and nothing else changes; the jaw turns about its joint; the beard rides the jaw; `jawAt` and `SPEECH_OPEN`.

`tools/speaking-heads-review.mjs --stage=grey|paint` photographs every character in the real renderer and writes the evidence in `hybrid-review/speaking-heads/<stage>/`. It needs the page served and a Playwright with Edge (`PLAYWRIGHT_PATH`).

## Not done

- **The hen's closed beak.** Closed, her mandibles' edges leave a slit along the gape, 0.2 to 0.9 mm, open from side to side behind her hook: her tongue shows through it from the side and from three-quarters front (5.4 mm² in the authoring mesh, 3.6 in the game mesh), and in profile the background does (4.0 mm²). Her round-1 beak was closed. Her cut is a plane in the groove between her mandibles, and where the lower mandible's edge lies below it nothing folds onto the cut. Moving her tongue back or down, pulling the cavity's tip back, moving the plane half a millimetre, locking her crease or overlapping her mandibles by up to 1.5 mm did not close it (the overlap above takes it from 6.5 mm² to 5.4). A todo test holds it.
- **The hen's tongue** does not show when her beak opens (0% from the front, and from 30° above): her upper mandible's hook covers the gape.
- **The game meshes' incisor crowns.** Reduced to the game budget, the gums swell over some incisors: at 12° the least crown is 1.4 to 3.9 mm on six heads (the authoring meshes' 4.0 or more). A todo test holds it.
- **Visemes.** A speaking head has one degree of freedom, its jaw. Lip shapes (wide, round, closed for m/b/p) would be morph targets on the same mesh.
- **Integration.** Nothing uses a speaking head yet. The intro's radio-room hen still has the beak split made for her line (`intro-sprites/room-set.js`); her speaking head would replace it.
- **The goat's and donkey's carved nostrils.** Their approved sculpts carve a hole on each side of the nose, outside the painted nostrils (the user: "an extra nostril on the side"). The speaking heads keep the approved surface, so filling the holes changes the approved characters too: that waits on the user's call.
- **Step 4's painted pass and step 5's review.**

## Reproduce

```bash
node tools/build-speaking-heads.mjs                 # all twelve, 15-130 s each; --only=cow,hen
node --test tests/speaking-heads.test.mjs
node tools/speaking-heads/fit-lips.mjs --check      # the lip lines against the painted lines
node tools/speaking-heads/preview.mjs cow out.png --weights      # clay renders of the raw sculpt, no browser
PLAYWRIGHT_PATH=<playwright-core> node tools/speaking-heads-review.mjs --stage=grey --base=http://127.0.0.1:4499
```

To trace a painted mouth line again: open the viewer, load a head (`speakingHeads.load(id,'author')`), and run `speakingHeads.traceMouth('side')` and `('front')`; the points go in `painted-mouths.json`.
