# Speaking heads

**Status (October 15, 2026): review round 3 of 5 scored the grey sculpt 6/10 (`hybrid-review/speaking-heads/reviews/round-3.md`); this is the rework, for review round 4. The mouth opens as a wedge along the whole lip line (round 3), open at its sides and its front, its roof and floor the mouth's inside, crimson: from the side it is seen through between the lips, as the hen's beak is (the user's sketch, round 4; rounds 3 and 4 stood a lining inside the lips along the sides, which the user had removed). The heads are meshed with a corrected copy of the characters' mesher, which turned triangles inside-out at the field's sharp edges. Steps 1–3 are rebuilt for all twelve characters; step 4, the paint, works but is not reviewed. Known defects are listed under Not done. Nothing here changes a character in the game.**

Each character's approved head, sculpted to speak:
- its lips part along its painted mouth line, from the painted corners: open, the mouth is a wedge from its corners forward, across the whole muzzle;
- behind them, a mouth: a cavity, crimson inside, with teeth, a tongue and a ruminant's dental pad; open, the wedge between the lips is open at its sides and front, its roof and floor the mouth's inside;
- its lower jaw is weighted to a jaw bone at the jaw joint.

Closed, a speaking head is the approved head: its outer skin lies on the approved surface (within the sculpt's own meshing error, 1.5 mm, by test), and the lips meet in a crease along the painted line. Open it with one number, the jaw's angle.

Open `tactics/speaking-heads.html`. Each character's approved head is on the left and its speaking head on the right, at either mesh level, with a jaw slider, a spoken line, a tilt, and paint, grey, wireframe, coverage and jaw-weight modes. Below them is the reference sheet: the mouth planned on the character's registered paint.

## Direction (the user, October 14 and 15, 2026)

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

On the first painted open mouths (the goat, jaw 14°):

> the bottom line of the mouth looks ok, but the top line of the mouth does not extend to the far corner. it also looks like there is an extra nostril on the side of the sheep too.

On round 3's open mouths (the bull, jaw 12°, grey, front), with a painted open mouth for reference, its inside a deep crimson:

> you are still doing the mouth as a small square opening instead of a large wedge opening

> i think if you just remove these side walls and make the inside that color you are fine

And on the triangles the open mouth needs (asked whether to raise the speaking character's cap, take them from the back of the head, or coarsen the mouth):

> i'm ok with raising the cap, but we really dont need a lot of detain inside the mouth.  even in the cut scene that sparked the need for the open mouth model, the chicken on the microphone, its far away and hardly visible.

During round 4, on round 3's inner walls (a lining inside the lips that stopped where the muzzle's outline turned forward: a flat panel with a straight front edge standing in the opening), outlined on a wireframe screenshot:

> hey, it still looks like you have those flaps on either side of the mouth, remember we are getting rid of all those.

Outlining round 3's open mouth from the side (round 3's review, `nowalls-horse-author.png`):

> the profile should follow the shape of the mouth rather than a regular rectangle

On the horse with its lining run to the front of the mouth, as the viewer showed it mid-round: "oh, the horse is looking much better", "thats what i was hoping for". Shown that horse beside the same horse with no lining at all, the background through its mouth from the side: "oh, those are better". Asked "Seen from the side with the jaw open, what should show between the lips?", the user chose **crimson, shaped to the mouth** (a crimson lining inside the lips that runs the full wedge to the front of the lips, so from the side the whole opening reads as the mouth's inside, no straight-edged flap stopping partway) over **nothing, seen through** (as the hen's beak).

On the pig director built to that choice (grey, the lining crimson in the opening from the side, three-quarter and front):

> hey, i cant help but notice, you still have opaque walls on the side of the mouth that should be open space

> the part thats in red there is the part you need to remove.  you only need a U shaped fill that covers the wedge shape void of the open mouth

And with a sketch of the open mouth as a wedge, its roof marked A, its front B and its near side C:

> if the mouth is an open wedge, you currently have an open space in B.
> A should be red, its the inside of the mouth (the top of the roof of the mouth).
> C is the part that i want you to remove.  right now its a solid wall when it should be a void space

So the lining is gone from every head: the open mouth is the wedge's roof and floor, the mouth's inside, crimson, joined at its back (the corners and the throat); its sides and front are open. In exact profile it is seen through between the lips, as the hen's beak is.

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
| rabbit | (on the front of its face, parting to z 6.5 cm) | 0.9 → 0.5 mm | 4.8 → 1.6 mm |
| dog | 13.5 → 7.9 | 9.7 → 1.0 mm | 1.2 mm |
| hen | (her gape: unchanged) | | |

Fitted, every line is within 2 mm (rms) of its painted line along the side. Across the front the fit uses the middle (the front traces' ends ride up the muzzle's edges); the whole front trace is 1.2–3.0 mm from the fitted cut.

### 2. Grey sculpt

The characters' heads were sculpted as signed-distance fields in their build tools (`tools/build-<character>.mjs`, and `horse-grey-model.js` for the horse). `tools/speaking-heads/heads.mjs` holds verbatim copies of the twelve head sculpts, with the placement each tool gave its skull. The first test proves the copies: every vertex of every shipped authoring skull lies on its copied sculpt.

**The goat's and donkey's side nostrils.** Their approved sculpts carve a hole on each side of the nose, outside the painted nostrils (the user's "extra nostril on the side"; the approved skulls are open there, 13.7 and 32.2 mm² of hole). With a mouth inside the head, the teeth showed through them. The speaking heads are sculpted from the approved fields less those two carves (`heads.mjs`: `goatSpeaking`, `donkeySpeaking`, one line each); the approved characters keep theirs. The user was asked whether to fill them and has not answered; it is one line to undo.

`tools/speaking-heads/sculpt.mjs` opens a head for speech. In rest space (the head's own sculpt space) the speaking head is the approved head with a mouth inside it. The lips part in an **expanded space**, which is what gets sculpted:
- **The cut** is the lip line's surface (a beak: the plane of its gape). Everything above it moves up by sigma (4 mm), everything below down by sigma; sigma tapers to nothing over a centimetre behind the corners.
- **The slab** between is air in front of the corners (the window): the lips part all along the lip line, their faces meeting round at the corners. Behind the corners, where sigma tapers, it is the head's section at the cut drawn out through it, so the cheeks behind the mouth blend across the lip line.
- **The open wedge.** Nothing stands in the slab: as the jaw opens, the wedge between the lips is open at its sides and at its front, its roof the upper lips' faces and the cavity's roof, its floor the lower lips' faces, the cavity's floor and the tongue, crimson beyond the lips' first millimetres (step 4), joined at the corners. In exact profile it is seen through between the lips, as a beak is (the user's sketch: the wedge's sides "should be a void space", its roof "should be red"). Rounds 3 and 4 stood a lining in the slab along the muzzle's sides, a centimetre inside the outer skin, so that from the side the parted lips opened onto the mouth's inside. Round 3's stopped where the muzzle's outline turned past 45°: a flat panel with a straight front edge standing in the opening, the user's "flaps". Round 4 first ran it to the cavity's front corner, crimson in the mouth's shape from the side, and the user: "opaque walls on the side of the mouth that should be open space". The cavity's **front corner** is where its side meets its front, 6 to 13 mm behind the lips' front (`head.mouth.frontCorner`); in front of it is the mouth's **front opening**, where the lips are thin and the incisors stand.
- Every vertex sculpted there maps back to rest space by the same shift; the slab's onto the cut. So a closed speaking head is the approved head: the lips' faces fold onto the cut and meet in a crease along the lip line.
- **The lips' edges at rest**: each lip face's edge row (its vertices next to the outer skin) moves out onto the approved surface's section at the cut, as far as turns none of its triangles inside-out, and the sculpted (open) shape moves with it. Round 3 moved the rest pose alone, and in full: 1 to 2% of the lips' edge triangles turned inside-out at rest (30 to 60 mm² a head), and the reductions, which work on the open shape, folded more.

**The mesher.** The heads are sculpted by marching tetrahedra in `tools/speaking-heads/surface.mjs`, a copy of the characters' own mesher (`dist/tactics/grey-surface.js` `sculptSurface`: the same grid, tetrahedra, vertices and triangles) with one change: each triangle faces from its tetrahedron's inside corners toward its outside corners, as the field's linear surface in that tetrahedron separates them. The shared mesher winds a triangle to agree with the field's gradient at its first vertex. At a sharp edge of the field (a lip's edge, the slab's faces, a wedge thinner than the grid) that gradient can be more than 90° off the triangle's own facing, so the triangle comes out inside-out and the renderer culls it. Through such triangles the open mouths showed the inside of the head and the background beyond it, more from the right than the left, because the tetrahedra's diagonals run one way: round 3's review's one-sided holes. On round 4's first build (with the lining, measured by round 3's flood-filled instrument), the largest holes from the game's camera were 23 mm² (the bull's corner), 12 mm² (the donkey) and 6 mm² (the horse) before this change, and 0.1 mm² at most on those heads after it. The reductions also keep fewer triangles, since they no longer work around inside-out ones: on that build the game skins came out 280 to 720 triangles lighter. The approved characters were meshed with the shared mesher, which is not changed (its rule is a finding for whoever next rebuilds them).

Inside:
- **The cavity** behind the lips: from `floor` below the cut to `roof` above it, `front` behind the lips' front, never nearer the surface than `wallMin`, its edges rounded and its back rounded over 1.2 cm into a throat, within `width` of the middle (narrowing toward the back) and `wall` inside the outer skin.
- **A dental pad** on the front of the roof for the cattle, goat and sheep: their lower incisors close against it.
- **Teeth**: lathed incisors (spade-shaped, their roots a little over half as wide as their crowns) and canines (tapering to a point), on arches inside the lips: the cavity's outline at the cut moved inward (the true inward offset, rounded to 4 mm where a narrow snout's mouth comes to a point). Each is rooted in the gum as built, a millimetre inside a thin chin at most, and reaches past the cut by `tip`. Procumbent lower incisors lean straight back from their tips. Each row is as wide as leaves a hair between neighbours at every height; no two teeth touch (the build refuses).
- **The tongue** lies on the floor behind the lower teeth, its top below the cut at the tip rising toward the back, its section an ellipse (domed), its tip rounded in plan over as much of its length as it is wide (the bull's, 7 cm wide, read as a pink slab across the open mouth: now 5.6 cm).

**The jaw's weight**: the mandible (below the lip line, above the jaw line read every millimetre off the head's own profile, in front of the line from the jaw's angle up to its joint) is rigid; the throat behind and below it blends; behind the corners the cheeks blend across the lip line; in front of them everything goes over to each lip's own side over `corner.open`, a lip's face with its lip's edge. Round 3 put the faces wholly on their own sides everywhere; near the corners they then left their lips' blended edges, and at speech the open jaw turned some 330 triangles inside-out about the horse's corners (924 mm²): the grey combs at the back of every wedge (round 3's review). The slab's skin (at the corners) is graded from the upper lip to the lower in its middle half only (`SLAB_GRADE`). Graded across the whole slab, its vertices near the lips' faces, which the grid samples irregularly where other skin meets them (round 4's lining did), took 0 to 0.15 at random, and the open jaw drew them into a sawtooth along every lip.

The hen is the exception: her head and beak are separate parts, and only her beak is replaced. It parts along its gape as two rigid mandibles, the lower one turning about the beak's root. Her beak opens from side to side all along its gape, as a beak does and as every mouth now does; its front opening is the whole gape. Her tongue's top stays below the gape all along (round 4: rising past it at the back, it showed through her closed gape).

### 3. Reduce

`node tools/build-speaking-heads.mjs` sculpts each speaking head at 2.5 mm (1.5 mm for the beak), finer than the characters' 4.5–5.5 mm, then reduces it twice, as the characters were: to an authoring mesh at the skull's own authoring budget plus a quarter, and from that to the game mesh at the skull's game budget plus a quarter (the dog, the heaviest character, a fifth). The reductions use the characters' simplifier (meshoptimizer) and tolerances, in two parts that meet along locked borders: the approved outer surface at the skull's own, the mouth at its own. Added:
- **The skin is simplified where it was sculpted, the open space, with its shape closed and open as attributes**: the rest positions and the positions with the jaw open 12° count at full weight, and the jaw's weight, the inside, the side of the lips and the fold too, so the reduction keeps them.
- **Pinches and crossings are prevented.** Where a collapse pinches a thin wall into edges shared by four triangles, or folds the outer skin through itself (closed, at 6°, 12° and 24°; a beak to 12°, past which its mandible turns through the upper one's base by construction), posed as the head is written (rest to the micrometre, jaw weights to 1e-4), the vertices there are locked and the reduction done again.
- **The lips meet closed: a closed shape.** The authoring mesh keeps the lips' edge rows whole (locked) all along the lip line. The game mesh cannot spend its mouth's few triangles on them: holding them, its gums and floor gave way by up to 7 mm. Reduced, the two lips' faces leave the crease differently, and where the cut meets the approved surface at a shallow angle, the lip's tip is thinner than the sculpt's grid: the band between the lip's outer skin and its rim is the lip's top when open, but inside-out closed, and the renderer culls it, so the teeth showed through (round 2: up to 24 mm²). So each skin carries a **closed shape**, a morph target the runtime blends in over the jaw's last 2° of closing, every moved vertex on the approved surface's section at the cut (C) or the approved surface: the lips' rims onto C; then the outer skin's whole boundary, its vertices in triangles that are not all outer skin, onto C too (a game mesh's reduction takes rims into the outer skin, and along the sides, with the lips parting the whole lip line, its upper lips kept edges 0.2 to 1.9 mm above the crease, at places straight into the cavity: the real renderer showed up to 23 mm² of teeth through the pig director's closed lips, at eye level); then, round by round, the outer vertices of any crease triangle still inside-out against the approved surface (at most 8 mm away, the cow's lower lip under her overhang); last, each lip's vertices on C onto the other lip's chords (the nearest point within 1 mm), so the two lips' creases are one line. Moved in the rest pose itself, they folded the open lips through themselves (the bull, 97 crossings); as a closed shape they lie in the crease only while it is closed. (Round 2's half-millimetre overlap of the faces passed an instrument that drew back faces and leaked in the renderer.)
- **Closed, no tooth shows.** After each level's reduction and its closed shape, the build looks at the closed head from the test's 120 directions (`view.mjs` `closedVisibility`, at 5 px/mm) and, where a tooth or the tongue shows over 0.25 mm² (half the test's bar), reduces the level again with the source's vertices kept within 4, then 7, then 10 mm of every triangle of it seen. With the lining gone, four game meshes' lips over the incisors first came out coarser: the horse's, the sheep's, the bull's and the skunk's showed 0.9 to 8.4 mm² of incisor closed, the skunk's standing 1 mm through its lip. Kept, the horse's, the bull's and the sheep's game meshes cost 10 to 64 triangles more; the skunk's is 18 lighter. `view.mjs` (the posing, the z-buffer and the closed views it shares with the tests' instruments) is in the source hash.
- **The game mesh's mouth is coarse, but not webbed.** At the game mesh's mouth tolerance of 8 mm, with the jaw's weight counted at 6 mm a full change, a few long floor triangles reached from the front to a corner's half-weighted vertex and rose across the open mouth, hiding the tongue (1 to 47% seen on the game meshes, round 3). The game mesh's mouth is simplified to 4 mm, and the jaw's weight counts 20 mm a full change, as in the authoring mesh. In round 3 that put the dog and the bull at 11,996 and 11,978 triangles, and the user raised the speaking character's cap from 11,500 to 12,000 ("i'm ok with raising the cap, but we really dont need a lot of detain inside the mouth"). With round 4's mesher the reductions no longer work around inside-out triangles, and every game mesh but the goat's (4 triangles heavier) is lighter than round 3's, by 80 to 870 triangles (table below; the dog's speaking character, the heaviest, is 11,728). The dog, the heaviest character, keeps its four-sided game teeth (`toothSides`).
- **Normals for the mouth.** Each mesh's mouth (its lips' faces and inside) takes its own normals, its triangles' facings with the jaw open 6°, turned back to rest by each vertex's weight. The game mesh's kept the dense sculpt's normals through the reduction and its coarse triangles shaded as stripes (round 2). The authoring mesh's did the same until round 4; at the lips' rims they are the field's gradient at a sharp edge, and the rims shaded up to 17% of their area over 60° off their triangles. The skin between the parted lips (at the corners) has normals of its own, the band's (`bandNormals`): a vertex on a lip's edge keeps its own normal for the lip and has the band's for the band, and the runtime blends to the band's where a fragment is graded between the lips.
- **Vertices a hair apart in every pose become one** where the surface stays closed.
- **Teeth and the tongue are made, not reduced**: closed lathes, 140 (a tooth) and 336 triangles in the authoring mesh, 30 (the dog's 24) and 72 in the game mesh.

The build writes `dist/tactics/speaking-heads/<id>-author.json` and `<id>-10k.json`, 4–95 s a head (9 minutes in all), and refuses to run if the approved sculpt no longer gives the placement frozen in `heads.mjs`.

Triangles, as built (a tooth 140 in the authoring mesh, 30 in the game mesh, the dog's 24). The speaking character is the character's game mesh with its skull replaced by the game speaking head; its cap is 12,000 (the user, round 3; it was 11,500):

| Head | Authoring: skin + teeth + tongue | Game: skin + teeth + tongue | Speaking character (game) | Headroom to 12,000 |
| --- | ---: | ---: | ---: | ---: |
| horse | 10,428 = 8412 + 1680 + 336 | 3,750 = 3318 + 360 + 72 | 11,552 (was 10,300) | 448 |
| goat | 11,206 = 9750 + 1120 + 336 | 3,808 = 3496 + 240 + 72 | 11,004 (was 9,994) | 996 |
| bull | 11,200 = 9744 + 1120 + 336 | 3,828 = 3516 + 240 + 72 | 11,106 (was 9,998) | 894 |
| cow | 10,378 = 8922 + 1120 + 336 | 3,500 = 3188 + 240 + 72 | 11,224 (was 10,184) | 776 |
| donkey | 10,760 = 8744 + 1680 + 336 | 3,676 = 3244 + 360 + 72 | 11,190 (was 10,110) | 810 |
| sheep | 11,198 = 9742 + 1120 + 336 | 3,624 = 3312 + 240 + 72 | 11,500 (was 10,476) | 500 |
| skunk | 7,986 = 5690 + 1960 + 336 | 3,034 = 2542 + 420 + 72 | 11,032 (was 9,998) | 968 |
| pig foreman | 9,420 = 6844 + 2240 + 336 | 3,220 = 2668 + 480 + 72 | 11,158 (was 9,988) | 842 |
| pig director | 10,910 = 8334 + 2240 + 336 | 3,634 = 3082 + 480 + 72 | 11,482 (was 9,998) | 518 |
| rabbit | 9,892 = 8996 + 560 + 336 | 3,302 = 3110 + 120 + 72 | 10,968 (was 10,156) | 1032 |
| dog | 10,432 = 7856 + 2240 + 336 | 3,532 = 3076 + 384 + 72 | 11,728 (was 10,446) | 272 |
| hen | 2,410 = 2074 + 0 + 336 | 966 = 894 + 0 + 72 | 10,664 (was 10,348) | 1336 |

### 4. Painterly skin

The speaking head keeps its character's registered paint. Its skin is the approved surface away from the mouth and takes the skull's place in the character's part order, so `createAnimalPaint` projects the same sheet onto it, with every correction the character's paint already makes.

What the paintings never saw is the inside of the mouth. `speaking-head.js` paints it over the registered paint, per fragment:
- the lip's inner face, then gum, deepening into the back of the mouth with depth below the approved surface, with a painterly grain: a crimson that stays red deep in, as in the user's reference (the back was near black and read as a hole);
- the skin stretched between the parted lips (at the corners) as the mouth at its deepest midway between them, and open, the lips' faces near the corners (where the lips part only in part);
- teeth that darken toward their roots, and a tongue lighter along its top, with a groove.

The inside is lit as it lies in its own shadow: nearly evenly, its normal mostly toward the eye, so its depth paint gives its form and a game mesh's facets do not. The grey sculpt shows the inside in the same crimson, so the open mouth reads as one there too. The lips' faces take the mouth's paint over the jaw's first 2° (`CHEEKS_SHOW`); closed, the crease's shadow falls on the faces only (round 2: the fold attribute interpolated across the outer skin's last triangles and darkened a 1–4 mm band). The colours are per character (`MOUTH_PAINT`).

This session has no image-generation tool. The builder's step 4 paints over registered renders; here the mouth's interior is painted in code instead. A painted pass over registered renders (the viewer: open the jaw, grey mode, any view) is the one piece of the workflow left to a builder who can paint.

### 5. Final inspection

Not yet run. `node tools/speaking-heads-review.mjs --stage=paint` photographs the game mesh, painted, closed and open, with screen-space paint coverage. It then goes to independent review, to 9/10.

## Using a speaking head

```js
import {speakingHeadFile,withSpeakingHead,rigSpeakingHead,jawAt,SPEECH_OPEN} from './speaking-head.js';
const head=await fetch(speakingHeadFile(profile.id)).then(r=>r.json());   // or (id,'author')
const worker=profile.create(withSpeakingHead(data,head));                 // the skull replaced, in its place
const speech=rigSpeakingHead(worker,head);                                // jaw bone, weights, closed shape, teeth, tongue
const paint=await createAnimalPaint(renderer,worker,profile,loader,outfit,lit);
for(const p of worker.parts)p.material=paint.material;
speech.applyPaint(paint);                                                 // the mouth's own paint
speech.setJaw(jawAt(t,{start,open:SPEECH_OPEN[profile.id],syllables}));    // radians open
```

- **The jaw bone** hangs from the head bone at the jaw joint and turns about the character's left–right axis.
- **The closed shape** is the skin's morph target; `setJaw` blends it in over the last 2° of closing.
- **Hair on the face** (the goat's beard) takes the skin's weights where it grows, so it rides the jaw.
- **Teeth and tongue are rigid:** the upper teeth on the head, the lower teeth and tongue on the jaw.
- **Lifetime:** the rig belongs to the speaking character for its life. `speech.dispose()` releases the teeth and tongue; `worker.dispose()` releases the rest.
- **Speech:** `jawAt` opens the jaw once a syllable, wider for stressed ones. `SPEECH_OPEN` parts the lips about 2.5 cm at the front at full stress (4.5–8.6°, by the jaw's lever).

## Round 3 → round 4

Round 3 (6/10) found two things blocking painting, and during round 4 the user redirected the mouth's inside twice (Direction). What changed, finding by finding:

- **The user's direction: the sides open, the roof and floor crimson.** Round 3's lining (the user's "flaps") is gone from every head, and so is round 4's first answer to it, the lining run to the cavity's front corner, which the user saw as "opaque walls on the side of the mouth that should be open space" and sketched away. The open mouth is the wedge's roof and floor, crimson, joined at the corners; its sides and front are open (step 2). In exact profile at 24°, 76 to 92% of the opening between the lips shows the background from either side, the rest teeth and tongue (the rabbit's mouth, across the front of her face, the least), by test; the lining showed none.
- **MUST-FIX 1, see-through at eye level** (round 3's review: 16 to 17 cm² of background through the pig director's mouth in exact profile). Answered by the user's direction: in exact profile the open mouth is seen through between the lips, as the hen's beak is. What the open head must not show is its own inside through a hole, a crack or an inside-out triangle, and the instrument for that is new (MUST-FIX 2). It finds slivers of 1.1 to 9.4 mm² on 17 of the 24 meshes where the eye meets a surface from behind first. Those looked at (the horse's and the cow's from the game's camera, the dog's game mesh at 24°) are triangles of the lips' faces near the corners, where the jaw's weight blends, turned inside-out as the jaw opens, and the dog's cheeks at its corners: held as known at what they measure (Not done). Round 3's holes were the mesher's inside-out triangles (step 2), gone.
- **MUST-FIX 2, the see-through instrument vacuous and one-sided.**
  - `lipTips` looks for each lip within its own reach and throws if a lip has no face. Both instruments throw if the head is not in the frame (both lips' tips inside it, the skin over 2% of it); round 3's read 0 on four game meshes while drawing nothing.
  - `holesThrough` draws the head with back faces and counts where the eye's first surface is seen from behind: there it looks into the head, whatever the renderer then shows. A line of sight through the open mouth meets the mouth's inside, which faces it, or nothing, so the mouth's openings need no curtain. Round 3's instrument and round 4's first counted background the border's flood fill could not reach, the front opening closed by a curtain over the lips' edges: with the sides open that counts the open mouth itself (7 to 35 mm² from the game's camera through the goat's game mesh and the skunk's, by design), and a hole that shows the mouth's inside, not the background, counts nothing.
  - The test looks in exact profile from either side at speech, 12° and 24°, and from the game's camera every 15° all round, and holds the largest one to 1 mm², the known meshes to what they measure. It can fail, by test: a hole 12 mm across punched in the horse's cheek reads 150 mm² from the game's camera, where the mouth's floor shows through it; three of the floor's triangles turned inside-out read 79 mm²; a head it cannot see throws.
  - From the character's right, round 3's review found single holes of 3.1 to 12.8 mm² (the donkey's 12.8, the dog's 8.9, the pig foreman's 5.9, the horse's 4.6, the sheep's 3.4): the mesher's inside-out triangles, worse on one side than the other because the tetrahedra's diagonals run one way.
  - `seeThrough`, with its curtain, now measures the open sides: the background through the head against the background through the outer skin alone (`outerOnly`). A wall over the lips' whole edges, standing in the opening as the lining did, leaves none of the horse's opening seen through, by test.
- **S1, the box.** The lining is gone. The tongue's card-like front and the cavity's flat roof are not changed; the mouth's inside is to stay coarse (the user).
- **S2, ragged lip edges and the corners' combs.** Three causes, each fixed (step 2):
  - the mesher's inside-out triangles along the lips' edges;
  - the faces left behind by their lips' blended edges near the corners: round 3's rule, the combs. On the same sculpt it turned some 330 triangles inside-out about the horse's corners at speech.
  - the slab graded linearly across the faces' junction with the lining: a sawtooth.

  Round 3 also moved the lips' edge rows onto the crease in the rest pose alone, in full, which turned 1 to 2% of the edge triangles inside-out. Now each moves only as far as turns none, and the open shape moves with it.
- **S3, closed.** The closed instrument frames every view on the whole crease, and counts background through the closed head as well as teeth. Round 3's fixed 9 cm field missed the dog's corners; a tooth put through its crease there now reads 6.9 mm², by test. Closed, no mammal mesh shows more than 0.02 mm² of tooth or 0.02 mm² of background, from 120 directions at 10 px/mm. That includes round 3's cow's and bull's game meshes (0.99 and 0.63 mm² of tooth in round 3's review's renderer). With the lining gone, four game meshes first came out with their lips over the incisors coarser, and showed 0.9 to 8.4 mm² of incisor closed (the skunk's standing 1 mm through its lip): the build now looks at each closed head from the test's directions and reduces again with the lips kept round any tooth it sees (step 3).
- **S4, the stripe test held no head.** It now holds every mesh but one, the skunk's game mesh, held as known at its measured share (10% of the lips' rims; Not done). Both meshes' mouths take normals from their own triangles (step 3). The light-only renders show the inside lit evenly and a thin fringe along the lips' edges.
- **S5, the closed crease at close range.** Not changed. At 5 px/mm in grey the crease is faceted where the approved surface is smooth; painted at portrait scale it is under a pixel.
- **S6, the hen.**
  - Her tongue's top stays below her gape (step 2): her closed authoring beak shows 0.05 mm² of it (round 3: 0.9 by instrument, 1.36 in round 3's review's renderer).
  - Her game beak is coarser with round 4's mesher: 894 triangles, against 1,304 in round 3, when its reduction locked its way round inside-out triangles. It shows 8.3 mm² of tongue closed.
  - Both beaks show a slit along the gape, as her approved beak does (Not done).
- **S7, the game meshes' crowns.** Met: the game meshes' incisor crowns are 4.1 mm at the least (the pig foreman's), by test; round 3's were 3.6 to 3.9 mm on five of them.
- **The nits:**
  - **N1.** The tests' todo texts are re-measured.
  - **N2.** Round 3's claim of 350 to 750 more triangles is gone (step 3).
  - **N3.** No closed case is held as known.
  - **N4.** No head has a lining.
  - **N5.** `mouthShading`'s comment says what the renderer does.
  - **N6.** The horse game mesh's nostril is not addressed.
- **Round 3's false claims:**
  - **1.** The lining closing exact profile: the lining is gone, by the user's direction; exact profile is open by design.
  - **2 and 3.** The camera instrument and its table: see MUST-FIX 2. The table below is the test's own views.
  - **4.** Every head meeting the bars: the known cases are listed under Not done.
  - **5.** KNOWN's holes: there are none; the slivers are held as known (`backFirst`).
  - **6.** The closed leaks: see S3.
  - **7.** The box: see S1.
  - **8.** The hen: see S6.
  - **9.** The pig director's walls: see N4.
  - **10.** The triangle counts: see N2.
  - **11.** The todo texts: see N1.

The acceptance numbers, measured on both meshes at the test's own views (`measure.mjs`; the heads posed as the runtime poses them, the closed shape blended in at 0°, drawn as the renderer draws them):

| Head, mesh | Open sides: the opening between the lips seen through in exact profile at 24° (the less of either side) | The head’s inside seen first (a hole, crack or inside-out triangle), the largest one, mm²: exact profile either side (speech, 12°, 24°) / the game’s camera all round (speech) | Closed: teeth or tongue / background through, mm² (10 px/mm) | Through the outer skin: closed (most, mm) / open (triangles) / unrooted teeth | Through a lip’s face, open | Incisor crown at 12° (least, mm) | Tongue seen from the front at 12° | Mouth shading over 60° off (worst of 6°, 12°) | Outer skin crossing itself at 6°/12°/24° | Jaw line under 0.9 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| horse, authoring | 92% | 0.25 / 2.38 | 0.00 / 0.00 | 0.00 / 0 / 0 | 4 | 5.6 | 70% | 0% | 0 / 0 / 0 | 0 |
| horse, game | 88% | 5.00 / 2.06 | 0.00 / 0.00 | 0.00 / 1 / 0 | 3 | 5.6 | 70% | 1% | 0 / 0 / 0 | 0 |
| goat, authoring | 84% | 0.00 / 0.38 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 6.1 | 80% | 0% | 0 / 0 / 0 | 0 |
| goat, game | 87% | 3.75 / 0.88 | 0.00 / 0.00 | 0.00 / 0 / 0 | 6 | 5.5 | 86% | 0% | 0 / 0 / 0 | 0 |
| bull, authoring | 91% | 0.44 / 2.69 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 5.7 | 88% | 0% | 0 / 0 / 0 | 0 |
| bull, game | 86% | 1.63 / 1.44 | 0.01 / 0.00 | 0.00 / 1 / 0 | 7 | 6.0 | 71% | 0% | 0 / 0 / 0 | 0 |
| cow, authoring | 90% | 0.50 / 2.94 | 0.00 / 0.00 | 0.00 / 0 / 0 | 8 | 4.8 | 81% | 0% | 0 / 0 / 0 | 0 |
| cow, game | 88% | 6.06 / 8.63 | 0.00 / 0.00 | 0.00 / 1 / 0 | 4 | 4.9 | 42% | 1% | 0 / 0 / 0 | 0 |
| donkey, authoring | 89% | 0.25 / 1.06 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 8.7 | 69% | 0% | 0 / 0 / 2 | 0 |
| donkey, game | 86% | 0.69 / 1.25 | 0.01 / 0.00 | 0.00 / 2 / 0 | 2 | 7.8 | 46% | 0% | 0 / 0 / 0 | 0 |
| sheep, authoring | 91% | 1.75 / 2.63 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 5.7 | 78% | 0% | 0 / 0 / 0 | 0 |
| sheep, game | 83% | 0.06 / 0.19 | 0.02 / 0.00 | 0.00 / 0 / 0 | 1 | 5.7 | 83% | 1% | 0 / 0 / 0 | 0 |
| skunk, authoring | 88% | 0.69 / 1.13 | 0.00 / 0.00 | 0.00 / 0 / 0 | 6 | 4.7 | 86% | 1% | 0 / 0 / 0 | 0 |
| skunk, game | 90% | 3.38 / 1.88 | 0.02 / 0.02 | 0.00 / 0 / 0 | 5 | 4.7 | 23% | 10% | 0 / 0 / 0 | 0 |
| pig foreman, authoring | 91% | 0.19 / 2.69 | 0.00 / 0.00 | 0.00 / 0 / 0 | 2 | 5.8 | 89% | 1% | 0 / 0 / 0 | 0 |
| pig foreman, game | 89% | 0.06 / 0.06 | 0.00 / 0.00 | 0.00 / 2 / 0 | 4 | 4.1 | 91% | 0% | 0 / 0 / 0 | 0 |
| pig director, authoring | 92% | 0.81 / 2.38 | 0.00 / 0.00 | 0.00 / 0 / 0 | 1 | 6.3 | 73% | 0% | 0 / 0 / 0 | 0 |
| pig director, game | 91% | 0.75 / 2.81 | 0.00 / 0.01 | 0.00 / 1 / 0 | 4 | 4.7 | 75% | 0% | 0 / 0 / 0 | 0 |
| rabbit, authoring | 76% | 0.31 / 0.19 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 6.9 | 83% | 0% | 0 / 0 / 0 | 0 |
| rabbit, game | 80% | 0.63 / 0.38 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 6.1 | 86% | 0% | 0 / 0 / 0 | 0 |
| dog, authoring | 91% | 0.25 / 1.38 | 0.00 / 0.00 | 0.00 / 0 / 0 | 2 | 5.3 | 87% | 0% | 0 / 0 / 0 | 0 |
| dog, game | 84% | 9.38 / 0.50 | 0.00 / 0.00 | 0.00 / 1 / 0 | 1 | 5.4 | 77% | 0% | 0 / 0 / 0 | 0 |
| hen, authoring | – (her whole gape is her front opening) | 0.69 / 0.06 | 0.05 / 3.16 | 0.00 / 1 / 0 | 0 | – | 0% (from 30° above) | 0% | 0 / 0 / – | – |
| hen, game | – (her whole gape is her front opening) | 0.94 / 0.06 | 8.27 / 2.32 | 0.00 / 1 / 0 | 0 | – | 0% (from 30° above) | 0% | 0 / 0 / – | – |

The bars, held by `tests/speaking-heads.test.mjs`:
- **Open sides:** in exact profile at 24°, from either side, at least half the opening between the lips (the background through the outer skin alone) shows the background through the head: teeth and tongue fill the rest. The hen is excepted: her front opening, which the instrument closes, is her whole gape.
- **The head's inside:** no hole, crack or inside-out triangle seen, the largest one at most 1 mm², in exact profile from either side at speech, 12° and 24°, and from the game's camera (30° above) every 15° all round at the widest speech. The known meshes are held to what they measure.
- **Closed:** at most 0.5 mm² of tooth or tongue, and of background through the head, from any of 120 directions, each framed on the whole crease.
- **Teeth through the outer skin:** none closed (outside the skin's solid on its outer side, beyond 0.05 mm, half a pixel at 10 px/mm) or open (crossing its triangles), and every tooth rooted, closed and at 6°, 12° and 24°.
- **Crowns:** incisor crowns at least 4 mm at 12° (the authoring mesh).
- **Tongue:** at least 30% of it seen from the front at 12° (the authoring mesh).
- **Self-crossing:** no outer skin crossing itself at 6°, 12° and 24° (a beak to 12°).
- **Shading:** no more than 6% of the lips' rims shading over 60° off their triangles.
- **Jaw line:** no jaw-line column under 0.9 (the authoring mesh).

Every head meets them except those held as known (Not done).

## Checks

`tests/speaking-heads.test.mjs`:
- **The approved heads:** the copied sculpts are the approved heads (the goat's and donkey's speaking fields less their side-nostril carves).
- **Up to date:** every head was built from the current sources (a hash of the sculpt modules, the mesher, the build tool and `view.mjs`, whose closed views the build's guard uses).
- **Closed surfaces:** every part is a closed surface.
- **The painted mouth line:** each mouth parts on it. `mouths.mjs` is the fit to the traces, the fit is within 2.5 mm (rms) of the painted line, and a line moved 4 mm fails it.
- **Closed:** the outer skin lies on the approved surface (within the meshing error), and the lips are on their own sides.
- **The acceptance numbers,** on both meshes, by the instruments in the tree. They pose the heads as the runtime does (the closed shape blended in at 0°) and draw them as the renderer does (back faces culled):
  - open, the mouth open at its sides in exact profile (a wall standing in the opening fails it), and no hole, crack or inside-out triangle seen, in exact profile from either side or from the game's camera all round. That instrument can fail: a hole punched in a cheek and a patch of the floor turned inside-out show, and a head it cannot see throws.
  - closed, no tooth or tongue and no background, framed on the whole crease. A tooth put through the dog's crease at its corner shows.
  - teeth and tongue in the skin at every opening: rooted, through the outer skin neither closed nor open, incisor crowns showing.
  - the tongue seen from the front.
  - no outer self-intersection to 24° (a beak to 12°).
  - the lips' rims shading as surfaces.
  - the jaw's weight along the jaw line (and a flap fails it).
- **Known defects** are held as todo tests, so they show in every run: the cases in `KNOWN` (Not done), each at the bar the others meet (the slivers are also held to what they measure, so none grows unseen); the hen's closed beak and tongue; the skunk's game tongue; teeth against the lips' inner faces.
- **The rest:** the budgets; the head takes the skull's place and nothing else changes; the jaw turns about its joint; the beard rides the jaw; `jawAt` and `SPEECH_OPEN`.

The suite takes about three minutes, most of it the closed views framed on the whole crease and the open views drawn twice.

`tools/speaking-heads-review.mjs --stage=grey|paint` photographs every character in the real renderer and writes the evidence in `hybrid-review/speaking-heads/<stage>/`. The views are the side from the character's left and right, three-quarter, front, and the game's camera from its left and right; the poses are closed, 12° and 24°. It needs the page served and a Playwright with Edge (`PLAYWRIGHT_PATH`).

## Not done

- **Known defects, held as todo tests** (`KNOWN` in the test file, as measured; every other head is held to the bar):
  - open, the head's inside is seen first through slivers of 1.1 to 9.4 mm² on 17 of the 24 meshes: those looked at are triangles of the lips' faces near the corners, where the jaw's weight blends, turned inside-out as the jaw opens, the largest on the game meshes (the cow's 8.6 mm² from the game's camera; the dog's 9.4 mm² at its corners' cheeks in exact profile at 24°, past any speech opening). Each is held to what it measures;
  - open, teeth or the tongue cross 1 or 2 triangles of the outer skin at the lips on seven game meshes (the horse's, the bull's, the cow's, the donkey's, the pig foreman's, the pig director's and the dog's) and the hen's beak;
  - the donkey's authoring mesh's outer skin crosses itself at 24° (2 pairs), past any speech opening;
  - the skunk's game mesh's lips' rims shade over 60° off their triangles on 10% of their area: in the light-only renders, a thin fringe along the lips' edges;
  - inside the open mouth, which is to stay coarse (the user: "we really dont need a lot of detain inside the mouth"): teeth and tongue graze the lips' inner faces on all eleven mammals (up to 8 triangles on a mesh), and the skunk's game mesh shows 23% of the tongue from the front at 12°.
- **The hen.**
  - Closed, her beak leaves a slit along the gape from the side, as her approved beak does: 3.2 and 2.3 mm² of background through it (authoring, game).
  - Through the game mesh's coarse gape, 8.3 mm² of her tongue shows closed.
  - Her tongue hides open behind her upper mandible's hook, and her lower mandible's tip shows from the front.
  - She is the one character with a speaking use, the intro's radio room, where she is far away and hardly visible (the user).
- **The tongue and the cavity from the front** (round 3's S1): from the front the tongue's rise reads as a card and the cavity's roof is flat.
- **The pig director's chin (S7)** and **the closed crease at close range in grey (S5)**.
- **The rabbit's painted trace** stops at 6 cm across her face (N3); her crease runs to 7.25 cm.
- **The shared mesher.** `dist/tactics/grey-surface.js` winds triangles by the field's gradient at one vertex, which fails at sharp edges (step 2). The approved characters were meshed with it; whoever next rebuilds them should know.
- **Visemes.** A speaking head has one degree of freedom, its jaw. Lip shapes (wide, round, closed for m/b/p) would be morph targets on the same mesh.
- **Integration.** Nothing uses a speaking head yet. The intro's radio-room hen still has the beak split made for her line (`intro-sprites/room-set.js`); her speaking head would replace it.
- **Step 4's painted pass and step 5's review.**

## Reproduce

```bash
node tools/build-speaking-heads.mjs                 # all twelve, 4-95 s each, about 9 min in all; --only=cow,hen
node --test tests/speaking-heads.test.mjs
node tools/speaking-heads/fit-lips.mjs --check      # the lip lines against the painted lines
node tools/speaking-heads/preview.mjs cow out.png --weights      # clay renders of the raw sculpt, no browser
PLAYWRIGHT_PATH=<playwright-core> node tools/speaking-heads-review.mjs --stage=grey --base=http://127.0.0.1:4499
```

To trace a painted mouth line again: open the viewer, load a head (`speakingHeads.load(id,'author')`), and run `speakingHeads.traceMouth('side')` and `('front')`; the points go in `painted-mouths.json`.
