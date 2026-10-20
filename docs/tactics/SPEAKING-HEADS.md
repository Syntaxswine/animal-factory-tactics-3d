# Speaking heads

Integration note (20 October): the following is the artist's historical handoff from `art/speaking-heads` at `f7dfd68`. The game now uses these meshes in isolated dialogue portraits; see [the presentation integration record](DIALOGUE-PRESENTATION-INTEGRATION-2026-10-20.md). Historical `hybrid-review` evidence remains on that artist branch.

**Status (October 15, 2026): review round 5 of 5 scored the grey sculpt 9/10, passing the gate (`hybrid-review/speaking-heads/reviews/round-5.md`). The architect's review the same day kept the study on its branch for a targeted correction: the mouth's corners at ordinary speech, one animation loop in the viewer, and the skeletons released when the character changes. This is that correction ("Round 5 → the architect's follow-up"). The mouth opens as a wedge along the whole lip line (round 3), open at its sides and its front, its roof and floor the mouth's inside, crimson: from the side it is seen through between the lips, as the hen's beak is (the user's sketch, round 4; rounds 3 and 4 stood a lining inside the lips along the sides, which the user had removed). The heads are meshed with a corrected copy of the characters' mesher, which turned triangles inside-out at the field's sharp edges. Steps 1–3 are rebuilt for all twelve characters; step 4, the paint, works but is not reviewed. Known defects are listed under Not done. Nothing here changes a character in the game.**

Each character's approved head, sculpted to speak:
- its lips part along its painted mouth line, from the painted corners: open, the mouth is a wedge from its corners forward, across the whole muzzle;
- behind them, a mouth: a cavity, crimson inside, with teeth, a tongue and a ruminant's dental pad; open, the wedge between the lips is open at its sides and front, its roof and floor the mouth's inside;
- its lower jaw is weighted to a jaw bone at the jaw joint.

Closed, a speaking head is the approved head: its outer skin lies on the approved surface (within the sculpt's own meshing error, 1.5 mm, by test), and shades as the approved head: its normals about the mouth are the approved head's own (the field's gradient; on the cow, the donkey and the pig director, their approved skulls' own mesh normals), at rest, and closed where the closed shape lays the lips' faces at the surface and moves the outer skin (by test; until round 5 they were not, and the closed crease showed whiskers and glints; until this follow-up the closed faces were weighted by their depth at rest, and hairlines stayed on the game meshes), and the lips meet in a crease along the painted line. Open it with one number, the jaw's angle.

Open `tactics/speaking-heads.html`. Each character's approved head is on the left and its speaking head on the right, at either mesh level, with a jaw slider, a spoken line, a tilt, and paint (flat, or lit as the battle paints its units), grey, wireframe, coverage and jaw-weight modes. Below them is the reference sheet: the mouth planned on the character's registered paint.

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

On round 5's heads (9/10), "thank you, this looks much better. let me pass it on to the architect for review." The architect's review (`docs/tactics/VISUAL-PUSH-REVIEW-2026-10-15.md`, 15 October 2026, with the foliage integration) kept the study on its branch for a targeted correction, and the user passed on its follow-up:

> For the speaking heads, the follow-up is small and specific: fix mouth-corner clipping at normal speech angles, keep the viewer to one animation loop, and release skeleton resources when changing characters. The character sculpts can stay as they are.

The review's three items, in its words: the mouth corners at ordinary speech openings ("inside-out lip-face slivers on 21 of 24 meshes, with some at speech angles, and one or two outer lip triangles intersected by mouth parts on seven game meshes plus the hen. Prioritize the ordinary 4.5–8.6 degree speech range and portrait front/three-quarter/low views. The donkey's separate 24-degree authoring-mesh intersection is outside normal speech and is lower priority"); one animation loop per viewer ("verify switching character/view/scale during speech never adds another loop"); and the skeletons disposed on character replacement ("release the viewer on page teardown. Validate repeated character changes without monotonic GPU resource growth"). Not blocking: at portrait size the horse's bright gum band and evenly spaced teeth draw more attention than the expression ("soften the exposed gum band and make the tooth row less mechanical"), and the goat's and donkey's nostril fills stay an open likeness decision.

On the follow-up's open items (16 October 2026) the user chose from pictures: "show me two or more pictures side by side and i can tell you what i like most". On the side nostrils, with the marks painted out on two of them: "fill in the holes i have covered please". On the donkey's, "on this one the skin at the crease of the mouth needs a slight tweak too", and of the shapes offered for it, "this is a skins not lining up issue, no changes to the model need to be made." Of the fills, the goat's "3: 32 mm cover"; the donkey's, "keep refining. it needs to go up a little higher than 3 and the color should be lighter. i can photoshop a desired outcome if it helps", then a photoshopped target, then "E: 25 mm, 3 mm forward". Of the horse's paints, "B: dusky gum, ivory teeth"; of its tooth rows, "Uneven row".

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

**The goat's and donkey's side nostrils.** Their approved sculpts carve a hole on each side of the nose, outside the painted nostrils (the user's "extra nostril on the side"; the approved skulls are open there, 13.7 and 32.2 mm² of hole). With a mouth inside the head, the teeth showed through them. The speaking heads are sculpted from the approved fields less those two carves (`heads.mjs`: `goatSpeaking`, `donkeySpeaking`, one line each); the approved characters keep theirs. Shown the holes, the holes filled, and the pits meshed cleanly, the user asked for the marks left on the filled heads to be painted out too ("fill in the holes i have covered please"): the carves stay out, and paint covers the marks (step 4). The goat's approved sculpt since has a rounded throat out to where its paintings draw it (17 October 2026, the user, of a pale patch with a hard outline under its jaw: "modify the base sculpt to go out to the dimensions where the patch are"; `docs/tactics/HYBRID-GOAT-WORKER.md`, The throat): both copies here carry it.

`tools/speaking-heads/sculpt.mjs` opens a head for speech. In rest space (the head's own sculpt space) the speaking head is the approved head with a mouth inside it. The lips part in an **expanded space**, which is what gets sculpted:
- **The cut** is the lip line's surface (a beak: the plane of its gape). Everything above it moves up by sigma (4 mm), everything below down by sigma; sigma tapers to nothing over a centimetre behind the corners.
- **The slab** between is air in front of the corners (the window): the lips part all along the lip line, their faces meeting round at the corners. Behind the corners, where sigma tapers, it is the head's section at the cut drawn out through it, so the cheeks behind the mouth blend across the lip line.
- **The open wedge.** Nothing stands in the slab: as the jaw opens, the wedge between the lips is open at its sides and at its front, its roof the upper lips' faces and the cavity's roof, its floor the lower lips' faces, the cavity's floor and the tongue, crimson beyond the lips' first millimetres (step 4), joined at the corners. In exact profile it is seen through between the lips, as a beak is (the user's sketch: the wedge's sides "should be a void space", its roof "should be red"). Rounds 3 and 4 stood a lining in the slab along the muzzle's sides, a centimetre inside the outer skin, so that from the side the parted lips opened onto the mouth's inside. Round 3's stopped where the muzzle's outline turned past 45°: a flat panel with a straight front edge standing in the opening, the user's "flaps". Round 4 first ran it to the cavity's front corner, crimson in the mouth's shape from the side, and the user: "opaque walls on the side of the mouth that should be open space". The cavity's **front corner** is where its side meets its front, 6 to 13 mm behind the lips' front (`head.mouth.frontCorner`); in front of it is the mouth's **front opening**, where the lips are thin and the incisors stand.
- Every vertex sculpted there maps back to rest space by the same shift; the slab's onto the cut. So a closed speaking head is the approved head: the lips' faces fold onto the cut and meet in a crease along the lip line.
- **The lips' edges at rest**: each lip face's edge row (its vertices next to the outer skin) moves out onto the approved surface's section at the cut, as far as turns none of its triangles inside-out, and the sculpted (open) shape moves with it. Round 3 moved the rest pose alone, and in full: 1 to 2% of the lips' edge triangles turned inside-out at rest (30 to 60 mm² a head), and the reductions, which work on the open shape, folded more.
- **A lip's face faces the slab.** What folds onto the cut is the slab and its faces, and the skin within 2 mm outside it where the slab's air shapes it. Where the cut passes within a grid step of another surface, that other surface's far side was folded too. Under the bull's overhang, its lower lip at the front is a millimetre thick, and where the cavity is held `wallMin` off the surface, its floor stands a shelf 0.7 mm over the slab. The grid draws such a flap thinner than it is, and both its sides fell within the 2 mm. Folded onto the cut, the far side lay on the lip's face inside-out, hidden closed and seen from behind first open. A folding vertex outside the slab whose lip's-face triangles all face away from the slab where it was sculpted is now left unfolded, shifted with its side, as the rest of the head is (`sculpt.mjs`, `FACING`). The lips' faces turned against their side at rest, in the twelve sculpts before any reduction, before and after:

  | Sculpt | Before, mm² (triangles) | After, mm² (triangles) |
  | --- | ---: | ---: |
  | horse | 5.46 (23) | 0.99 (8) |
  | goat | 2.89 (46) | 0.36 (19) |
  | bull | 51.21 (148), along its mouth's front corners | 0.68 (8) |
  | cow | 11.40 (31) | 0.40 (2) |
  | donkey | 9.65 (66) | 2.37 (17) |
  | sheep | 1.58 (20) | 0.33 (16) |
  | skunk | 8.92 (63) | 0.88 (3) |
  | pig foreman | 4.63 (40) | 0.94 (17) |
  | pig director | 7.50 (83) | 0.56 (47) |
  | rabbit | 5.77 (101) | 4.96 (96), slivers of 0.26 mm² at most |
  | dog | 2.42 (17) | 0.54 (6) |
  | hen | 1.18 (13) | 0 |

  What is left is small, 0.8 mm² a triangle at most (the skunk's): far sides whose vertices the near side shares, which stay folded with it; triangles near-vertical where sculpted; and a few that face the slab where sculpted but lie turned once flattened onto the cut (of the rabbit's 96: 69, 9 and 18).

**The mesher.** The heads are sculpted by marching tetrahedra in `tools/speaking-heads/surface.mjs`, a copy of the characters' own mesher (`dist/tactics/grey-surface.js` `sculptSurface`: the same grid, tetrahedra, vertices and triangles) with one change: each triangle faces from its tetrahedron's inside corners toward its outside corners, as the field's linear surface in that tetrahedron separates them. The shared mesher winds a triangle to agree with the field's gradient at its first vertex. At a sharp edge of the field (a lip's edge, the slab's faces, a wedge thinner than the grid) that gradient can be more than 90° off the triangle's own facing, so the triangle comes out inside-out and the renderer culls it. Through such triangles the open mouths showed the inside of the head and the background beyond it: round 3's review's holes. (The flips lean to the right, 1.2 to 2.2 times by area on 10 of 12 heads, as the tetrahedra's diagonals run one way, but round 4's review found round 3's heads' back faces seen first nearly as large from the left: the mesher explains the holes, not why round 3's review found them one-sided.) On round 4's first build (with the lining, measured by round 3's flood-filled instrument), the largest holes from the game's camera were 23 mm² (the bull's corner), 12 mm² (the donkey) and 6 mm² (the horse) before this change, and 0.1 mm² at most on those heads after it. The reductions also keep fewer triangles, since they no longer work around inside-out ones: on that build the game skins came out 280 to 720 triangles lighter. The approved characters were meshed with the shared mesher, which is not changed (its rule is a finding for whoever next rebuilds them).

Inside:
- **The cavity** behind the lips: from `floor` below the cut to `roof` above it, `front` behind the lips' front, never nearer the surface than `wallMin`, its edges rounded and its back rounded over 1.2 cm into a throat, within `width` of the middle (narrowing toward the back) and `wall` inside the outer skin.
- **A dental pad** on the front of the roof for the cattle, goat and sheep: their lower incisors close against it.
- **Teeth**: lathed incisors (spade-shaped, their roots a little over half as wide as their crowns) and canines (tapering to a point), on arches inside the lips: the cavity's outline at the cut moved inward (the true inward offset, rounded to 4 mm where a narrow snout's mouth comes to a point). Each is rooted in the gum as built, a millimetre inside a thin chin at most, and reaches past the cut by `tip`. Procumbent lower incisors lean straight back from their tips. (The skunk's lower incisors reach 4.6 mm past the cut, not 3.7: at 3.7 their crowns showed 3.5 mm at 12°, under the 4 mm bar the others meet, round 4.) Each row is as wide as leaves a hair between neighbours at every height; no two teeth touch (the build refuses). The horse's rows are uneven (`vary`): each tooth a little longer (up to a fifth), wider or narrower (a tenth) and turned on the arch (up to 7°), by a fixed sequence offset by row; never shorter, so no crown shows less (the architect's review: "make the tooth row less mechanical"; the user's choice of two, "Uneven row").
- **The tongue** lies on the floor behind the lower teeth, its top below the cut at the tip rising toward the back, its section an ellipse (domed), its tip rounded in plan over as much of its length as it is wide (the bull's, 7 cm wide, read as a pink slab across the open mouth: now 5.6 cm).

**The jaw's weight**: the mandible (below the lip line, above the jaw line read every millimetre off the head's own profile, in front of the line from the jaw's angle up to its joint) is rigid; the throat behind and below it blends; behind the corners the cheeks blend across the lip line; in front of them everything goes over to each lip's own side over `corner.open`, a lip's face with its lip's edge. Round 3 put the faces wholly on their own sides everywhere; near the corners they then left their lips' blended edges, and at speech the open jaw turned some 330 triangles inside-out about the horse's corners (924 mm²): the grey combs at the back of every wedge (round 3's review). The slab's skin (at the corners) is graded from the upper lip to the lower in its middle half only (`SLAB_GRADE`). Graded across the whole slab, its vertices near the lips' faces, which the grid samples irregularly where other skin meets them (round 4's lining did), took 0 to 0.15 at random, and the open jaw drew them into a sawtooth along every lip.

The hen is the exception: her head and beak are separate parts, and only her beak is replaced. It parts along its gape as two rigid mandibles, the lower one turning about the beak's root. Her beak opens from side to side all along its gape, as a beak does and as every mouth now does; its front opening is the whole gape. Her tongue's top stays below the gape all along (round 4: rising past it at the back, it showed through her closed gape).

### 3. Reduce

`node tools/build-speaking-heads.mjs` sculpts each speaking head at 2.5 mm (2 mm for the skunk, whose lower lip's front, a wedge thinner than 2.5 mm, came out sagging with its rim turned over at rest; 1.5 mm for the beak), finer than the characters' 4.5–5.5 mm, then reduces it twice, as the characters were: to an authoring mesh at the skull's own authoring budget plus a quarter, and from that to the game mesh at the skull's game budget plus a quarter (the dog, the heaviest character, a fifth). The reductions use the characters' simplifier (meshoptimizer) and tolerances, in two parts that meet along locked borders: the approved outer surface at the skull's own, the mouth at its own. Added:
- **The skin is simplified where it was sculpted, the open space, with its shape closed and open as attributes**: the rest positions and the positions with the jaw open 12° count at full weight, and the jaw's weight, the inside, the side of the lips and the fold too, so the reduction keeps them.
- **Pinches and crossings are prevented.** Where a collapse pinches a thin wall into edges shared by four triangles, or folds the outer skin through itself (closed, at 6°, 12° and 24°; a beak to 12°, past which its mandible turns through the upper one's base by construction), posed as the head is written (rest to the micrometre, jaw weights to 1e-4), the vertices there are locked and the reduction done again.
- **The lips meet closed: a closed shape.** The authoring mesh keeps the lips' edge rows whole (locked) all along the lip line. The game mesh cannot spend its mouth's few triangles on them: holding them, its gums and floor gave way by up to 7 mm. Reduced, the two lips' faces leave the crease differently, and where the cut meets the approved surface at a shallow angle, the lip's tip is thinner than the sculpt's grid: the band between the lip's outer skin and its rim is the lip's top when open, but inside-out closed, and the renderer culls it, so the teeth showed through (round 2: up to 24 mm²). So each skin carries a **closed shape**, a morph target the runtime blends in over the jaw's last 2° of closing, every moved vertex on the approved surface's section at the cut (C) or the approved surface: the lips' rims onto C; then the outer skin's whole boundary, its vertices in triangles that are not all outer skin, onto C too (a game mesh's reduction takes rims into the outer skin, and along the sides, with the lips parting the whole lip line, its upper lips kept edges 0.2 to 1.9 mm above the crease, at places straight into the cavity: the real renderer showed up to 23 mm² of teeth through the pig director's closed lips, at eye level); then, round by round, the outer vertices of any crease triangle still inside-out against the approved surface (at most 8 mm away, the cow's lower lip under her overhang); last, each lip's vertices on C onto the other lip's chords (the nearest point within 1 mm), so the two lips' creases are one line. Moved in the rest pose itself, they folded the open lips through themselves (the bull, 97 crossings); as a closed shape they lie in the crease only while it is closed. (Round 2's half-millimetre overlap of the faces passed an instrument that drew back faces and leaked in the renderer.)
- **Closed, no tooth shows.** After each level's reduction and its closed shape, the build looks at the closed head from the test's 120 directions (`view.mjs` `closedVisibility`, at 5 px/mm) and, where a tooth or the tongue shows over 0.25 mm² (half the test's bar), reduces the level again with the source's vertices kept within 4, then 7, then 10 mm of every triangle of it seen. With the lining gone, four game meshes' lips over the incisors first came out coarser: the horse's, the sheep's, the bull's and the skunk's showed 0.9 to 8.4 mm² of incisor closed by the test's instrument at 10 px/mm (1.1, 2.0, 1.5 and 8.6 mm² by the build's at 5 px/mm), the skunk's standing 1 mm through its lip. Kept, the horse's, the bull's and the sheep's game meshes cost 10 to 64 triangles more; the skunk's is 18 lighter. `view.mjs` (the posing, the z-buffer and the closed views it shares with the tests' instruments) is in the source hash.
- **At ordinary speech, no lip's face turned over and nothing through the lips** (the architect's review). The same loop then opens the head at ordinary speech (4.5°, midway, and the character's widest, `SPEECH_OPEN`), and passes it through the closed shape's fade (0.5°, 1° and 1.5°, the closed shape blended in as the runtime blends it), as every syllable does. It looks from the viewer's portraits (its front, its three-quarter and its view from below, either side) and the game's camera (either side), as the speech test does:
  - where a triangle is seen from behind first over 1 mm² (`holesThrough`; `SPEECH_FOLDS`), the level is reduced again with the source's vertices within 1.5 mm of every such triangle kept. Kept only round its corners, a game mesh's rim triangle of 31 mm², on the pig foreman's lower lip in one trial build, came back at 22 mm² three times over. In the fade, a coarse rim folded into the closed crease shows in the first millimetre the lips part: 12.5 mm² along the skunk's game mesh's front crease at 0.5° in a trial build that looked at speech only;
  - where a tooth or the tongue crosses the outer skin (`partsCrossSkin`), the level is reduced again with the source's vertices within 4 mm of the part's crossing triangles kept (7, then 10 mm, the next times a point is found; a beak's too, not `BEAK_ROOT`'s centimetre, which tripled the hen's game beak). The crossings were coarse triangles reaching from a lip's edge into the mouth, through which teeth or the tongue stood or were rooted: the bull's lower incisors through a floor triangle of 770 mm² from its lower lip's edge, the horse's upper incisors through a roof triangle of 267 mm² from its upper lip's edge, the tongues of the skunk's and the hen's game meshes through floors of 400 to 500 mm². Each such triangle has one vertex within a millimetre of the outer surface, so is outer skin by the instrument's class.
  - where an incisor shows under 4.2 mm of crown at 12° (`crownExposure`, the tests' 4 mm and a little), the level is reduced again with the source's vertices within 4 mm of that tooth kept (7, then 10). The game mesh's mouth is simplified to 4 mm, so its gum can come down over a crown: the skunk's game mesh, sculpted at 2 mm, first showed 3.6 mm of an upper incisor's, and in one trial build the pig foreman's 3.9;
  - up to three times, with the closed-teeth guard. Against round 5 the game meshes come out from 42 triangles lighter to 370 heavier (the bull's); every speaking character stays under 12,000 (the table below).
- **The game mesh's mouth is coarse, but not webbed.** At the game mesh's mouth tolerance of 8 mm, with the jaw's weight counted at 6 mm a full change, a few long floor triangles reached from the front to a corner's half-weighted vertex and rose across the open mouth, hiding the tongue (1 to 47% seen on the game meshes, round 3). The game mesh's mouth is simplified to 4 mm, and the jaw's weight counts 20 mm a full change, as in the authoring mesh. In round 3 that put the dog and the bull at 11,996 and 11,978 triangles, and the user raised the speaking character's cap from 11,500 to 12,000 ("i'm ok with raising the cap, but we really dont need a lot of detain inside the mouth"). With round 4's mesher the reductions no longer work around inside-out triangles, and every game mesh but the goat's (4 triangles heavier) is lighter than round 3's, by 80 to 870 triangles (table below; the dog's speaking character, the heaviest, is 11,728). The dog, the heaviest character, keeps its four-sided game teeth (`toothSides`).
- **Normals about the mouth are the approved surface's.** Within 20 mm of the lips' faces (blending back to the sculpt's own by 35 mm) the outer skin takes the approved surface's normal: the approved field's gradient at the vertex's rest position, carried to where it is written (the placement, and the donkey's neck revision) by the inverse transpose of the map's Jacobian (`outerNormals`). The sculpt's own there were the expanded field's at the lips' sharp edges, and the cow's, the director's and the donkey's mesh normals folded into the crease: within 15 mm of it 10 to 105 outer vertices a mesh were over 45° off the approved surface, and shaded the closed crease and the open lips' edges with whiskers (the pig director), a glint line (the cow) and white fangs at the corners (the donkey's game mesh), in grey at portrait scale and in the game's lit paint (round 4's review). Closed, the lips' faces where the closed shape lays them at the surface (in full within 1 mm of it by the approved field there, fading to none at 3 mm) take the approved surface's normal where they lie, as a morph of the normals with the closed shape (`closedNormal`): with their open facings they glinted along the cow's closed crease. So do the outer skin's vertices the closed shape moves (up to 8 mm, onto the crease). Round 5 weighted the faces by their depth at rest: a game mesh's rims, which the closed shape snaps onto the crease from deeper, kept their open facings, up to 177° off, and the moved outer vertices their rest normals, up to 57° off, and hairline whiskers stayed on the pig director's game mesh at close-up (round 5's review, SHOULD-FIX 1).
- **On the cow, the donkey and the pig director, the approved head's normal is its mesh's.** Their tools gave their approved heads the meshes' own normals, up to 12 to 31° off the field's near the mouth. Given the field's, their closed mouths shaded further from the approved heads in grey (round 5's review, SHOULD-FIX 4). Their speaking heads take the approved skull's own normal at the nearest point of its mesh, at the same level (its vertices' normals across the triangle, as it is drawn: `approvedMeshNormals`), where the others take the field's, about the mouth and closed alike.
- **A beak keeps its root.** The hen's game mesh keeps its authoring vertices within 1 cm of the hinge's line across the beak (`BEAK_ROOT`): reduced freely there, a lower mandible's triangles stood up through the upper's base as a fin a centimetre tall, and more of her tongue showed through her closed beak (round 4's review). It costs her game beak 70 triangles.
- **Normals for the mouth.** Each mesh's mouth (its lips' faces and inside) takes its own normals, its triangles' facings with the jaw open 6°, turned back to rest by each vertex's weight. The game mesh's kept the dense sculpt's normals through the reduction and its coarse triangles shaded as stripes (round 2). The authoring mesh's did the same until round 4; at the lips' rims they are the field's gradient at a sharp edge, and the rims shaded up to 17% of their area over 60° off their triangles. The skin between the parted lips (at the corners) has normals of its own, the band's (`bandNormals`): a vertex on a lip's edge keeps its own normal for the lip and has the band's for the band, and the runtime blends to the band's where a fragment is graded between the lips.
- **Vertices a hair apart in every pose become one** where the surface stays closed.
- **Teeth and the tongue are made, not reduced**: closed lathes, 140 (a tooth) and 336 triangles in the authoring mesh, 30 (the dog's 24) and 72 in the game mesh.

The build writes `dist/tactics/speaking-heads/<id>-author.json` and `<id>-10k.json`, 4–95 s a head (9 minutes in all), and refuses to run if the approved sculpt no longer gives the placement frozen in `heads.mjs`.

Triangles, as built (a tooth 140 in the authoring mesh, 30 in the game mesh, the dog's 24). The speaking character is the character's game mesh with its skull replaced by the game speaking head; its cap is 12,000 (the user, round 3; it was 11,500):

| Head | Authoring: skin + teeth + tongue | Game: skin + teeth + tongue | Speaking character (game) | Headroom to 12,000 |
| --- | ---: | ---: | ---: | ---: |
| horse | 10,468 = 8452 + 1680 + 336 | 3,738 = 3306 + 360 + 72 | 11,540 (was 10,300) | 460 |
| goat | 11,204 = 9748 + 1120 + 336 | 3,806 = 3494 + 240 + 72 | 11,002 (was 9,994) | 998 |
| bull | 11,970 = 10514 + 1120 + 336 | 4,198 = 3886 + 240 + 72 | 11,476 (was 9,998) | 524 |
| cow | 10,680 = 9224 + 1120 + 336 | 3,458 = 3146 + 240 + 72 | 11,182 (was 10,184) | 818 |
| donkey | 10,756 = 8740 + 1680 + 336 | 3,886 = 3454 + 360 + 72 | 11,400 (was 10,110) | 600 |
| sheep | 11,196 = 9740 + 1120 + 336 | 3,680 = 3368 + 240 + 72 | 11,556 (was 10,476) | 444 |
| skunk | 8,668 = 6372 + 1960 + 336 | 3,398 = 2906 + 420 + 72 | 11,396 (was 9,998) | 604 |
| pig foreman | 9,474 = 6898 + 2240 + 336 | 3,464 = 2912 + 480 + 72 | 11,402 (was 9,988) | 598 |
| pig director | 10,882 = 8306 + 2240 + 336 | 3,644 = 3092 + 480 + 72 | 11,492 (was 9,998) | 508 |
| rabbit | 9,892 = 8996 + 560 + 336 | 3,302 = 3110 + 120 + 72 | 10,968 (was 10,156) | 1032 |
| dog | 10,478 = 7902 + 2240 + 336 | 3,554 = 3098 + 384 + 72 | 11,750 (was 10,446) | 250 |
| hen | 2,738 = 2402 + 0 + 336 | 1,298 = 1226 + 0 + 72 | 10,996 (was 10,348) | 1004 |

### 4. Painterly skin

The speaking head keeps its character's registered paint. Its skin is the approved surface away from the mouth and takes the skull's place in the character's part order, so `createAnimalPaint` projects the same sheet onto it, with every correction the character's paint already makes.

What the paintings never saw is the inside of the mouth. `speaking-head.js` paints it over the registered paint, per fragment:
- the lip's inner face, then gum, deepening into the back of the mouth with depth below the approved surface, with a painterly grain: a crimson that stays red deep in, as in the user's reference (the back was near black and read as a hole);
- the skin stretched between the parted lips (at the corners) as the mouth at its deepest midway between them, and open, the lips' faces near the corners (where the lips part only in part);
- teeth that darken toward their roots, and a tongue lighter along its top, with a groove.

The inside is lit as it lies in its own shadow: nearly evenly, its normal mostly toward the eye, so its depth paint gives its form and a game mesh's facets do not. The grey sculpt shows the inside in the same crimson, so the open mouth reads as one there too. The lips' faces take the mouth's paint over the jaw's first 2° (`CHEEKS_SHOW`); closed, the crease's shadow falls on the faces only (round 2: the fold attribute interpolated across the outer skin's last triangles and darkened a 1–4 mm band). The colours are per character (`MOUTH_PAINT`).

**Painted where it lies closed.** The paintings were registered on the closed head; a speaking skin is built open, its lips parted by the cut. Its paint is projected from the closed shape (`paintedClosed` in `withSpeakingHead`: the closed shape's offsets added to the skin's paint positions, and the closed normals' to its paint normals), so the painted lip line falls on the closed crease. Read at rest, the donkey's painted mouth line ran above its closed crease, a second line with a pale band between, from its left and the front (the user: "a skins not lining up issue"). By test, the skin's paint positions and normals are the closed shape's and its own shape is untouched (the donkey, the pig foreman, the hen); with the offsets left out, the donkey's are 7.1 mm off. The pig foreman's cream crescents at its closed game crease (round 5's review) do not come from this: they are its lower lip's outer skin at the crease, under its snout, where no painting sees it, filled with paint reused from beside it (Not done).

**The horse's quieter mouth** (the architect's note; the user's choice of three). Its gum is a dusky rose (.56 .28 .28, the others' crimson .66 .20 .25) over a darker back (.30 .11 .11); its dark inner lip reaches from 5 to 18 mm deep before the gum shows (`lipDepth`; the others' 3 to 11 mm); its teeth are ivory (.87 .82 .69, to .64 .54 .42 at the roots), each a little older or younger than its neighbours, toward its roots' colour by a fixed sequence, and darker at its sides where it meets them (`toothShade` .6); its tongue is softer (.70 .42 .41). Photographed in the real viewer at the portrait (620 px/m) and close scales; the built-in paint renders the chosen picture to the pixel (`hybrid-review/speaking-heads/follow-up/horse-mouth.png`: before and now, with the uneven row, step 2).

**Paint covers.** Marks a speaking head does not want are painted over (`covers` in `MOUTH_PAINT`): each a sphere in paint space, on either side, filled with the paint a step along the skin, from the paintings the cover takes, with a soft edge (by default its outer 55%). The goat's side nostril mark is filled from 24 mm behind it (32 mm). The donkey's teardrop beside its nostril ring is the front painting's nostril, landing on the muzzle's side next to the side painting's, the ring: it is filled with the front painting's own cream from 30 mm toward the middle (25 mm, an 8 mm edge). Fills that took the side painting there showed its edge: the side painting stops 1 to 2 cm short of the muzzle's front, its last pixels a bright rim, and its 2 mm pixels showed as white steps; fills from all four paintings a step away (the first offered) came out darker than the muzzle, or pale with the teardrop's outline left. From the front the donkey's nostrils are now the rings at its muzzle's sides, as in the user's target. In the real viewer, the built-in covers render the pictures the user chose (the goat's identical, the donkey's within 1 pixel by 1 level).

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
- **Lifetime:** the rig belongs to the speaking character for its life. `speech.dispose()` releases the teeth and tongue; `worker.dispose()` releases the rest but its skeleton, which the jaw bone joins. A mammal's worker (`createLightHorse`'s and its kin's) leaves its skeleton and that skeleton's bone texture to its caller: dispose them (`skeleton.dispose()`) when the character goes, as the viewer does on each character change (the architect's review). The hen's worker disposes hers.
- **Speech:** `jawAt` opens the jaw once a syllable, wider for stressed ones. `SPEECH_OPEN` parts the lips about 2.5 cm at the front at full stress (4.5–8.6°, by the jaw's lever).

## Round 5 → the architect's follow-up

Round 5's review (9/10, `hybrid-review/speaking-heads/reviews/round-5.md`) passed the gate. The architect's review asked for three things, each small and specific (Direction). What changed:

### 1. The mouth's corners at ordinary speech

**What the slivers were.** Round 5 called them "triangles of the lips' faces near the corners, where the jaw's weight blends, turned inside-out as the jaw opens". Those looked at this time (the bull's, the skunk's, the pig foreman's) were inside-out before the jaw moved. They are triangles at or beside the lips' faces at rest, which the closed lips cover and the opening uncovers: seen from behind first, with the mouth's inside beyond, never the background. There were two sources:
- **The sculpt**, which folded the far side of flaps thinner than its grid onto the lips' faces (step 2, "A lip's face faces the slab"). That came to 113 mm² over the twelve sculpts, 51 of them the bull's along its mouth's front corners: its authoring mesh's 4 mm² at speech.
- **The reductions**, which keep the open shape from folding but carry the rest pose only as an attribute, and so can fold a lip's face or rim over at rest. The skunk's authoring mesh's 15 mm² from below was one: its first reduction still makes it with the sculpt mended. So was a rim triangle of 31 mm² on the pig foreman's game mesh in one trial build.

**The fixes.**
- The sculpt leaves those far sides unfolded (step 2).
- The skunk is sculpted at 2 mm. At 2.5 mm its lower lip's front, a wedge thinner than the grid, came out sagging, its rim turned over at rest.
- The build looks at every reduced head at ordinary speech, and through the closed shape's fade that every syllable passes, as the speech test does. It reduces a head again where a face is turned over, or where a tooth or the tongue stands through the outer skin (step 3, "At ordinary speech").
- With more of each mouth kept, the build also guards the incisors' crowns at 12°, the tests' bar, which the new meshes had pushed under on two game meshes (step 3).

**At ordinary speech** (4.5°, midway, and the widest the character speaks), from the viewer's portraits (its front, its three-quarter and its view from below, either side) and the game's camera (either side), on every mesh. Over 1 mm² in bold:

| Head, mesh | Round 5: largest sliver, portraits / game camera, mm² | Round 5: outer triangles crossed | Now: largest sliver, portraits / game camera, mm² | Now: outer triangles crossed |
| --- | ---: | ---: | ---: | ---: |
| horse, authoring | **1.69** / **2.00** | 0 | 0.50 / 0.63 | 0 |
| horse, game | **1.50** / **1.13** | 1 | 0.50 / 0.50 | 0 |
| goat, authoring | 0.44 / 0.25 | 0 | 0.44 / 0.00 | 0 |
| goat, game | 0.56 / 0.13 | 0 | 0.56 / 0.13 | 0 |
| bull, authoring | **4.00** / **2.63** | 0 | 0.06 / 0.06 | 0 |
| bull, game | **1.13** / **1.44** | 1 | 0.44 / 0.38 | 0 |
| cow, authoring | **1.44** / **2.63** | 0 | 0.31 / 0.25 | 0 |
| cow, game | **6.56** / **7.19** | 1 | 0.56 / 0.38 | 0 |
| donkey, authoring | **1.13** / 1.00 | 0 | 0.63 / 0.94 | 0 |
| donkey, game | **2.56** / 0.56 | 2 | 0.69 / 0.94 | 0 |
| sheep, authoring | **2.19** / **1.75** | 0 | 0.50 / 0.13 | 0 |
| sheep, game | 0.19 / 0.38 | 0 | 0.50 / 0.31 | 0 |
| skunk, authoring | **14.81** / **1.06** | 0 | 0.19 / 0.06 | 0 |
| skunk, game | **2.13** / **1.69** | 0 | 0.38 / 0.25 | 0 |
| pig foreman, authoring | **1.50** / **2.38** | 0 | 0.25 / 0.13 | 0 |
| pig foreman, game | 0.13 / 0.06 | 2 | 0.06 / 0.00 | 0 |
| pig director, authoring | **2.81** / **1.25** | 0 | 0.06 / 0.06 | 0 |
| pig director, game | **3.06** / **2.31** | 1 | 0.81 / 0.94 | 0 |
| rabbit, authoring | 0.13 / 0.19 | 0 | 0.06 / 0.13 | 0 |
| rabbit, game | 0.44 / 0.06 | 0 | 0.44 / 0.13 | 0 |
| dog, authoring | 0.63 / **1.38** | 0 | 0.19 / 0.13 | 0 |
| dog, game | 0.31 / 0.44 | 1 | 0.69 / 0.69 | 0 |
| hen, authoring | 0.06 / 0.00 | 1 | 0.06 / 0.06 | 0 |
| hen, game | 0.06 / 0.00 | 1 | 0.06 / 0.06 | 0 |

Over 1 mm²: 15 meshes in round 5, none now, the largest 0.94 mm² (round 5: 14.81, the skunk's authoring mesh from below). A tooth or the tongue through the outer skin: 9 meshes in round 5, none now. No background through any, before or after. Through the closing fade (0.5°, 1° and 1.5°), from the same views, the largest is now 3.75 mm² (the cow's authoring mesh from below at 0.5°, as in round 5), under the 4 mm² the build and the test hold there; round 5's largest there was 6.38 (the sheep's game mesh, from the game's camera). In the real renderer, with back faces drawn green, at the view where round 5 measured each of six meshes' largest at speech, the green is gone (`hybrid-review/speaking-heads/follow-up/speech-slivers-before-after.png`, grey, round 5 left, now right).

**A new test holds it:** at ordinary speech, from those seven views, every mesh shows no sliver over 1 mm² (through the closing fade, none over 4 mm²), no background, and no tooth or tongue through the outer skin, with no exceptions. A patch of the horse's upper lip's face turned over, and its lower incisors moved 8 mm forward, fail it.

**Over the hole test's 216 views**, which include 12° and 24°, past any speech: the slivers held as known fall from 21 meshes, 1.1 to 17.8 mm², to 14, 1.1 to 10.4. Three rose, each past ordinary speech: the dog's game mesh's at its corners' cheeks at 24° (10.07 to 10.38), the goat's game mesh's from its right at 24° (3.75 to 3.94) and the hen's game beak's in the closing fade (1.13 to 2.94). The rest fell: among them the skunk's authoring mesh's 17.75 to 1.38, the cow's game mesh's 13.38 to 1.25, and the pig foreman's authoring mesh's 8.82 to 0.31, no longer known. Round 5's teeth and tongue through the outer skin at 6°, 12° and 24°, on seven game meshes and the hen's beak, are gone, and with them the skunk's game mesh's striped rims (10% of their area over 60° off; now 0.4%).

**The cost** is triangles kept about the mouth (the budget table, step 3): against round 5 the game meshes come out from 42 triangles lighter (the cow's) to 370 heavier (the bull's): the bull +370, the skunk +364 (its finer grid too), the hen +262, the pig foreman +244, the donkey +210, the rest within 60. Every speaking character stays under the 12,000 cap; the dog's, the heaviest, is 11,750 (round 5: 11,728).

### 2. One animation loop in the viewer

`render()` now draws once. While a line is said, `tick()` draws each frame, one request pending at most. Before, `render()` asked for its next frame whenever a line was being said, and every control, load and resize that called it started a loop of its own. `tools/speaking-heads-viewer-check.mjs` counts animation-frame requests and frames in the real browser:

| Viewer | Requests pending while speaking: on starting, then after each of five controls, a resize and a character change | Frames a second while speaking: before the changes / after them | Stopped |
| --- | --- | ---: | --- |
| Round 5's (02cdd5a) | 1, 2, 3, 4, 5, 6, 6, 7 | 61 / 427 | 0 pending |
| Now | 1, 1, 1, 1, 1, 1, 1, 1 | 61 / 61 | 0 pending |

### 3. Skeletons released on a character change

`release()` now disposes every skeleton the pair's meshes are bound to, with their bone textures. The mammals' workers leave theirs to the caller. The hen's worker disposes hers, and a second dispose does nothing. Leaving the page releases the viewer: its loop, the pair on show and the renderer. The same check loads six characters (goat, bull, horse, skunk, pig director, hen) three times over:

| Viewer | Held after rounds 1 / 2 / 3: geometries, textures, programs |
| --- | --- |
| Round 5's | 27, 37, 3 / 27, 47, 3 / 27, 57, 3 |
| Now | 27, 23, 3 / 27, 23, 3 / 27, 23, 3 |

Round 5's viewer kept ten more textures a round: the five mammals' two skeletons each. The check exits 1 on failure; it fails on round 5's viewer and passes now. `speaking-head.js`'s note on the rig's lifetime said `worker.dispose()` releases the rest; it now names the skeleton as the caller's (Using a speaking head).

### 4. Round 5's should-fixes

The user asked for them too (16 October). In one rebuild of all twelve heads, with the horse's uneven tooth row:
- **1, the closed normals by where the closed shape lays the lips** (step 3). Measured on both meshes of every head, against the approved head (the field's gradient; the cow's, donkey's and pig director's skulls' own normals at the nearest point), the most degrees off:

  | | Outer skin about the mouth | Closed, the faces where the closed shape lays them at the surface | Closed, the outer skin the closed shape moves |
  | --- | ---: | ---: | ---: |
  | before, the 22 mammal meshes | 0 to 27.5 (the cow, donkey and pig director, against their own) | 106.7 to 177.0, on every one | 8.4 to 57.2 (the goat's) |
  | before, the hen's beak | 0.1 | 0.9 / 1.0 | 143.3 / 144.3 |
  | now, all 24 | 0.1 at most | 0.1 at most | 0.0 |

  In grey at 2,000 px a unit the pig director's game mesh's closed hairlines and the cow's specks along its crease are gone, and the goat's closed crease is no longer a hard dark line (`hybrid-review/speaking-heads/follow-up/closed-normals.png`: each approved head, the heads before, now).
- **4, the cow's, donkey's and pig director's approved normals** (step 3): their speaking heads take their approved skulls' own about the mouth and closed.
- **5, lit paint on the viewer's own renderer.** The viewer paints lit, as the battle paints its units (createAnimalPaint with scene lighting: Lit). `speakingHeads.set()` loads the pair again for a character, a mesh level or Lit. The registered paint shows lit, closed and open (`follow-up/lit-paint.png`: the horse, goat, donkey, cow and both pigs).
- **6, the open sides.** Measured per column along the lip line, as the review proposed, the lips' faces alone cover runs of 1 to 21% of the opening's length at its corners, where they meet, and a wall over the back 40% of the lip line reads 22 to 38%: no bar parts them. A back-40% wall takes 12 to 25 points off every other mammal mesh's share and none off the rabbit's, whose mouth runs across her face; a wall over her front 20% takes 22 to 68 off hers. So each mesh is held to its own share as built, less 5 points (a ratchet, `SIDES_SEEN`), besides the 70% bar, and the falsifier runs on every mammal mesh: a back-40% wall on each, the front-20% wall on the rabbit.
- **7, the hen's closed game tongue,** in the renderer: 0 px over 48 views at 10 px/mm (12 azimuths, 4 elevations); the same count sees 260.8 mm² in 10 of them with her beak open 8°.
- **2, the rim sawtooth,** and **8, the box tongue** (held by the user): Not done.

### Not blocking, not changed

The horse's gum band: quieter, the user's choice (step 4). Its tooth row: uneven, the user's choice (step 2). The goat's and donkey's nostril fills: painted over, the user's choices (step 4).

### Round 5's false or overstated claims

From round 5's review, each corrected where it stood:
1. **"Photographed ... in the game's lit paint at 620 and 1,500 px a unit".** Those images were lit flat fallback colour, the paint built on a second renderer. Round 5's review's real lit paint agrees with the conclusion.
2. **"Closed, the lips' faces where the closed shape lays them at the surface (within 3 mm of it) take the approved surface's normal too".** The code weighted them by their depth at rest, not by where the closed shape lays them; it now weights them where they lie closed (step 3).
3. **"Closed, the lips' faces at the crease take them too ... at most 0.1° off".** True only for faces within 1 mm of the surface at rest, the test's selection, which is the build's own.
4. **"Shades as it", "True in shading now too, by test".** A speaking head shaded as the approved surface, by test, at rest; the cow's, the donkey's and the pig director's approved heads shade with their meshes' normals, up to 12 to 31° off near the mouth. Their speaking heads now take those (step 3), and the test checks them, closed too.
5. **"No outer vertex is now more than 0.1° off".** True at rest. The outer vertices the closed shape moves were drawn closed up to 57° off, unmeasured; they now take the approved normal where they lie closed, by test (step 3).
6. **S3's tongue figures** mixed instruments. They are now given by instrument.
7. **S5, "a wall over the back half ... fails it".** True, but the bar was tighter, not tight: a wall over the back 40% passed on 9 of 22 mammal meshes. Each mesh is now held to its own share as built too, and every mammal mesh fails with a wall (Checks).
8. **N4, "Headings are named in the viewer's terms".** True of the prose only. The tests' messages now give the viewer's azimuth.

The nits: "216 views a mesh (6 groups)" now says four groups. The slivers held as known are a ratchet at what they measure, not a bar, and are named so (Not done).

The acceptance numbers, measured on both meshes at the test's own views (`measure.mjs`; the heads posed as the runtime poses them, the closed shape blended in at 0° and through its fade, drawn as the renderer draws them):

| Head, mesh | Open sides: the opening between the lips seen through in exact profile at 24° (the less of either side) | The head’s inside seen first (a hole, crack or inside-out triangle), the largest one, mm², all round: eye level (speech, 12°, 24°) / above (30°) / below (15°, 30°) / closing (0.5–1.5°) | At ordinary speech (4.5°, midway, the widest), the viewer’s portraits and the game’s camera: the head’s inside seen first, largest, mm² / outer triangles crossed | Normals off the approved head: outer skin about the mouth / closed, the faces at the crease / closed, the outer skin the closed shape moves (most, degrees) | Closed: teeth or tongue / background through, mm² (10 px/mm) | Through the outer skin: closed (most, mm) / open (triangles) / unrooted teeth | Through a lip’s face, open | Incisor crown at 12° (least, mm) | Tongue seen from the front at 12° | Mouth shading over 60° off (worst of 6°, 12°) | Outer skin crossing itself at 6°/12°/24° | Jaw line under 0.9 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| horse, authoring | 92% | 1.56 / 0.88 / 1.00 / 0.31 | 0.63 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 5 | 5.9 | 69% | 0% | 0 / 0 / 0 | 0 |
| horse, game | 81% | 1.50 / 0.94 / 0.31 / 1.31 | 0.50 / 0 | 0.0 / 0.0 / 0.0 | 0.05 / 0.00 | 0.00 / 0 / 0 | 2 | 5.9 | 72% | 0% | 0 / 0 / 0 | 0 |
| goat, authoring | 84% | 0.13 / 0.19 / 0.19 / 0.44 | 0.44 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 6.1 | 80% | 0% | 0 / 0 / 0 | 0 |
| goat, game | 88% | 3.94 / 0.94 / 1.56 / 1.19 | 0.56 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 6 | 5.8 | 86% | 0% | 0 / 0 / 0 | 0 |
| bull, authoring | 91% | 1.94 / 0.13 / 0.13 / 0.25 | 0.06 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 9 | 5.2 | 88% | 0% | 0 / 0 / 0 | 0 |
| bull, game | 90% | 2.00 / 0.50 / 1.13 / 2.13 | 0.44 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 12 | 4.9 | 90% | 0% | 0 / 0 / 0 | 0 |
| cow, authoring | 90% | 0.50 / 0.31 / 0.50 / 1.88 | 0.31 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 7 | 4.7 | 80% | 0% | 0 / 0 / 0 | 0 |
| cow, game | 87% | 0.44 / 0.63 / 0.69 / 1.25 | 0.56 / 0 | 0.0 / 0.0 / 0.0 | 0.31 / 0.09 | 0.00 / 0 / 0 | 4 | 4.5 | 81% | 0% | 0 / 0 / 0 | 0 |
| donkey, authoring | 90% | 1.50 / 0.81 / 0.56 / 0.19 | 0.94 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 8.7 | 69% | 0% | 0 / 0 / 2 | 0 |
| donkey, game | 90% | 1.56 / 0.94 / 0.56 / 0.25 | 0.94 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 7.3 | 51% | 0% | 0 / 0 / 0 | 0 |
| sheep, authoring | 90% | 0.31 / 0.13 / 0.50 / 0.25 | 0.50 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 5.2 | 78% | 0% | 0 / 0 / 0 | 0 |
| sheep, game | 80% | 1.13 / 0.69 / 0.75 / 0.50 | 0.50 / 0 | 0.0 / 0.0 / 0.0 | 0.03 / 0.00 | 0.00 / 0 / 0 | 4 | 5.2 | 73% | 1% | 0 / 0 / 0 | 0 |
| skunk, authoring | 86% | 0.31 / 0.13 / 0.56 / 1.38 | 0.19 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 4.7 | 86% | 0% | 0 / 0 / 0 | 0 |
| skunk, game | 86% | 0.63 / 0.63 / 1.00 / 0.50 | 0.38 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.03 | 0.00 / 0 / 0 | 3 | 4.7 | 15% | 0% | 0 / 0 / 0 | 0 |
| pig foreman, authoring | 91% | 0.31 / 0.25 / 0.31 / 0.13 | 0.25 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 1 | 5.9 | 90% | 0% | 0 / 0 / 0 | 0 |
| pig foreman, game | 82% | 0.06 / 0.00 / 0.06 / 0.06 | 0.06 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 4.9 | 91% | 0% | 0 / 0 / 0 | 0 |
| pig director, authoring | 92% | 0.13 / 0.06 / 0.19 / 0.13 | 0.06 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 1 | 6.3 | 73% | 0% | 0 / 0 / 0 | 0 |
| pig director, game | 94% | 0.88 / 1.00 / 0.94 / 1.31 | 0.94 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.01 | 0.00 / 0 / 0 | 1 | 6.2 | 74% | 0% | 0 / 0 / 0 | 0 |
| rabbit, authoring | 76% | 0.31 / 0.13 / 0.25 / 0.06 | 0.13 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 0 | 6.9 | 83% | 0% | 0 / 0 / 0 | 0 |
| rabbit, game | 80% | 0.81 / 0.38 / 0.38 / 1.00 | 0.44 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 3 | 6.1 | 86% | 0% | 0 / 0 / 0 | 0 |
| dog, authoring | 92% | 0.31 / 0.25 / 0.44 / 0.13 | 0.19 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.00 | 0.00 / 0 / 0 | 2 | 5.3 | 87% | 0% | 0 / 0 / 0 | 0 |
| dog, game | 79% | 10.38 / 0.50 / 1.25 / 0.50 | 0.69 / 0 | 0.0 / 0.0 / 0.0 | 0.00 / 0.01 | 0.00 / 0 / 0 | 3 | 5.3 | 92% | 0% | 0 / 0 / 0 | 0 |
| hen, authoring | – (her whole gape is her front opening) | 0.75 / 0.13 / 0.13 / 0.13 | 0.06 / 0 | 0.1 / 0.1 / 0.0 | 0.00 / 1.11 | 0.00 / 0 / 0 | 0 | – | 0% (from 30° above) | 0% | 0 / 0 / – | – |
| hen, game | – (her whole gape is her front opening) | 0.06 / 0.06 / 0.06 / 2.94 | 0.06 / 0 | 0.1 / 0.0 / 0.0 | 0.00 / 0.02 | 0.00 / 0 / 0 | 0 | – | 0% (from 30° above) | 0% | 0 / 0 / – | – |

The bars, held by `tests/speaking-heads.test.mjs`:
- **Open sides.** In exact profile at 24°, from either side, at least 70% of the opening between the lips shows the background, measured against the background through the outer skin alone, and each mesh no less than its own share as built, less 5 points (`SIDES_SEEN`, a ratchet). The lips' own faces, seen obliquely, and the teeth and tongue fill the rest. The hen is excepted: her front opening, which the instrument closes, is her whole gape.
- **Nothing through the head.** No background is seen through the head from any of the 216 views above. The largest one sliver of the head's inside seen first (a hole, crack or inside-out triangle) is at most 1 mm²; the known meshes are held to what they measure (a ratchet, not a bar).
- **At ordinary speech.** At 4.5°, midway and the widest, from the viewer's portraits and the game's camera, either side: no sliver of the head's inside over 1 mm² (through the closing fade, 0.5° to 1.5°, over 4 mm²), no background, and no tooth or tongue through the outer skin. Every mesh meets it, with no exceptions.
- **Normals.** The outer skin within 15 mm of the crease, and closed the lips' faces where the closed shape lays them at the surface and the outer skin it moves, where they lie, are within 20° of the approved head's normal (the field's gradient; the cow's, the donkey's and the pig director's skulls' own at the nearest point).
- **Closed.** At most 0.5 mm² of tooth or tongue, and of background through the head, from any of 120 directions, each framed on the whole crease.
- **Teeth through the outer skin.** None closed (outside the skin's solid on its outer side, beyond 0.05 mm, half a pixel at 10 px/mm) and none open (crossing its triangles). Every tooth is rooted, closed and at 6°, 12° and 24°.
- **Crowns.** Incisor crowns of at least 4 mm at 12°, on both meshes.
- **Tongue.** At least 30% of it seen from the front at 12° (the authoring mesh).
- **Self-crossing.** No outer skin crosses itself at 6°, 12° and 24° (a beak to 12°).
- **Shading.** No more than 6% of the open mouth's lips' faces and the band between them shade over 60° off their triangles.
- **Jaw line.** No jaw-line column under 0.9 (the authoring mesh).

Every head meets them except those held as known (Not done).

## Round 4 → round 5

Round 4 (7/10, `hybrid-review/speaking-heads/reviews/round-4.md`) found one thing blocking painting. What changed, finding by finding:

- **MUST-FIX 1, the lips' outer skin shaded with streaks.** Closed, whiskers ran along the pig director's crease, a glint line along the cow's, and white fangs stood at the donkey game mesh's corners. Open, the same fringe ran along the lips' edges. It showed in grey at portrait scale and in the game's lit paint; the viewer's default paint is unlit and hid it. Both causes are fixed in the build (step 3, "Normals about the mouth"):
  - The outer skin about the mouth takes the approved surface's own normals. Within 15 mm of the crease no outer vertex is now more than 0.1° off them at rest, on any mesh. Round 4 had 10 to 105 a mesh over 45°, up to 167°. (At rest only: the outer vertices the closed shape moves, up to 7.9 mm, are drawn closed at positions where they are up to 57° off, the goat's game mesh's, and nothing measures that; round 5's review.)
  - Closed, the lips' faces within 1 mm of the surface at rest take them too, as a morph of the normals with the closed shape, at most 0.1° off; the weight fades to none at 3 mm. The cow's last specks, which stayed with its teeth hidden, were those faces lit by their open facings. (The weight is by depth at rest, not by where the closed shape lays a face: a game mesh's rims, which the closed shape snaps onto the crease from deeper, keep their open facings, 8 to 165 a mammal mesh over 20° off, up to 177°, and hairline whiskers remain on the pig director's game mesh at close-up; round 5's review, SHOULD-FIX 1, Not done.)
  - A test holds both to 20°, against the approved surface's normal computed independently of the build: the gradient of the approved field, pulled back to where the head is written, with the donkey's neck revision inverted by Newton's method. It can fail: the outer skin turned 30°, and the closed faces given back their open facings, both show, by test.
  - Photographed before and after in grey at portrait and close scale: the whiskers, the glint line and the fangs are gone, closed and open. (This said "and in the game's lit paint at 620 and 1,500 px a unit". Those images were not the game's paint: the tool built the paint on a second WebGL renderer, whose visibility atlas the viewer cannot sample, so they showed lit flat fallback colour. Round 5's review photographed the real lit paint, built on the viewer's own renderer, and found the streaks gone there too, at portrait and gameplay scale.)
- **S1, the box and the card tongue from the front.** Not changed: the mouth's inside is to stay coarse (the user).
- **S2, the rim sawtooth on the authoring meshes.** Not changed (Not done). The streaks over it are gone; the sawtooth is geometry.
- **S3, the hen's game beak.** It keeps its root (step 3), and the fin is gone. Closed, it shows 5.7 mm² of tongue by the test's instrument (round 4: 8.3 by the same instrument) and 4.1 mm² of background through its slit; her approved beak shows 33 mm² through its gape. In the renderer, round 5's review measured 6.62 mm² of tongue, 2.9 times round 3's 2.31 there (and round 4's review 9.21). It costs 70 triangles: her speaking character is 10,734.
- **S4, the open bar's views.** `holesThrough` now looks from 216 views a mesh, in four groups:
  - every 15° all round at eye level, at speech, at 12° and at 24°;
  - from the game's camera, 30° above, at speech;
  - from 15° and 30° below at speech;
  - through the closed shape's fade at 0.5°, 1° and 1.5°, every 30°, at eye level and from 30° above.

  It also reports what the renderer shows through each sliver. Background shows through none, on any mesh, from any view: by test, a gate with no exceptions. The slivers themselves, with the mouth's inside seen through them, measure 1.1 to 17.8 mm² on 21 meshes over these views (round 4: 17 meshes, at its 30 views). They are held at what they measure (Not done).
- **S5, the open-sides bar.** It is now 70%. A wall over the back half of the lip line, where round 3 stood its flaps, reads 54% on the horse and fails it, by test (57 to 62% on the pig director, the dog and the goat). The least head is the rabbit's, 76%. (Tighter, not tight: a wall over the back 40% passes on 9 of the 22 mammal meshes, and the rabbit's mouth, across her face, has no back for one to stand over; round 5's review, SHOULD-FIX 6.)
- **S6, the closed-teeth guard.** Unchanged. Its first readings are now given in both rigs (step 3).
- **S7, teeth against the lips' inner faces, and the skunk's game tongue.** Unchanged, held by the user's guidance.
- **The nits:**
  - **N1.** The evidence sheets now photograph the widest speech opening too, and from below.
  - **N2.** The guard's first readings are given at the build's 5 px/mm as well as the test's 10 px/mm.
  - **N3.** The dead `known('closed')` branches are gone.
  - **N4.** Headings are named in the viewer's terms (front, side, from below) in the prose. (Not, until the architect's follow-up, in the tests' messages, which printed `holesThrough`'s azimuth, the viewer's negated; they now give the viewer's.)
  - **N5.** The goat's and donkey's side nostrils are still the user's to answer.
- **Round 4's false or overstated claims:**
  1. **S2 "each fixed".** The streaks are fixed in round 5; the rim sawtooth is not (Not done).
  2. **"Under a pixel when painted".** False, as the review showed in grey and in the game's lit paint. Fixed in round 5, and the claim is gone.
  3. **"Closed, a speaking head is the approved head".** This said "True in shading now too, by test", itself overstated (round 5's review): the test holds the normals to the approved field's gradient, at rest, on the build's own selection. The cow's, the donkey's and the pig director's approved heads are shaded with their mesh normals, which differ from that gradient by up to 12 to 31° near the mouth, and the game meshes keep close-up whiskers the test cannot see. Closed, a speaking head shades as the approved surface; not, for those three, as the approved head.
  4. **"Teeth and tongue fill the rest".** The lips' own faces, seen obliquely, cover 8 to 22% of the opening, and teeth and tongue 0.6 to 2.1% (round 4's review).
  5. **The shading bar's scope.** Now stated: the lips' faces and the band. The outer skin is held by the normals test.
  6. **"Held to what they measure".** That was at the test's views only; they are now 216 a mesh.
  7. **The one-sided holes.** The mesher explains round 3's holes, not why they were one-sided (step 2).
  8. **`prepare`'s comment on normals.** Corrected.
  9. **The skunk's lower incisors.** Their 4.6 mm reach is now stated (step 2).

(Round 5's acceptance numbers are in its review and in git history; the current ones are under Round 5 → the architect's follow-up.)

## Checks

`tests/speaking-heads.test.mjs`:
- **The approved heads:** the copied sculpts are the approved heads (the goat's and donkey's speaking fields less their side-nostril carves).
- **Up to date:** every head was built from the current sources (a hash of the sculpt modules, the mesher, the build tool and `view.mjs`, whose closed and open views the build's guards use).
- **Closed surfaces:** every part is a closed surface.
- **The painted mouth line:** each mouth parts on it. `mouths.mjs` is the fit to the traces, the fit is within 2.5 mm (rms) of the painted line, and a line moved 4 mm fails it.
- **Closed:** the outer skin lies on the approved surface (within the meshing error), and the lips are on their own sides.
- **The acceptance numbers,** on both meshes, by the instruments in the tree. They pose the heads as the runtime does (the closed shape blended in at 0°) and draw them as the renderer does (back faces culled):
  - open, the mouth open at its sides in exact profile, each mesh against its own share as built (a wall standing in the opening fails it, and on every mammal mesh one over the back 40% of the lip line, the rabbit's across her front corners), no background seen through the head and no hole, crack or inside-out triangle seen, all round at eye level, from above and below and as the jaw closes. That instrument can fail: a hole punched in a cheek and a patch of the floor turned inside-out show, the hole shows the background from the side, and a head it cannot see throws.
  - at ordinary speech (4.5°, midway, the widest), from the viewer's portraits and the game's camera, either side: no sliver of the head's inside over 1 mm², no background at all, and no tooth or tongue through the outer skin, on every mesh, with no exceptions (the architect's review). It can fail: the horse's upper lip's face turned over within 15 mm of its front middle shows from below, and its lower incisors moved 8 mm forward cross its lower lip.
  - the outer skin about the mouth, and closed the lips' faces at the crease and the outer skin the closed shape moves, shading as the approved head: their normals against its own, computed independently of the build (turned normals fail it, the closed faces with their open facings, and the goat's moved outer skin with its rest normals).
  - closed, no tooth or tongue and no background, framed on the whole crease. A tooth put through the dog's crease at its corner shows.
  - teeth and tongue in the skin at every opening: rooted, through the outer skin neither closed nor open, incisor crowns showing.
  - the tongue seen from the front.
  - no outer self-intersection to 24° (a beak to 12°).
  - the lips' rims shading as surfaces.
  - the jaw's weight along the jaw line (and a flap fails it).
- **Known defects** are held as todo tests, so they show in every run: the cases in `KNOWN` (Not done), each at the bar the others meet (the slivers are also held to what they measure, a ratchet, so none grows unseen); the hen's closed beak and tongue; the skunk's game tongue; teeth against the lips' inner faces.
- **The rest:** the budgets; the head takes the skull's place and nothing else changes; the jaw turns about its joint; the beard rides the jaw; `jawAt` and `SPEECH_OPEN`.

The suite takes about six minutes, most of it the open views (216 a mesh) and the closed views framed on the whole crease.

`tools/speaking-heads-viewer-check.mjs` checks the viewer in the real browser (the architect's review): one animation loop through controls, a resize and a character change made while speaking, and no growth in what the renderer holds over three rounds of six characters. It exits 1 on failure, and fails on round 5's viewer (`--ref=02cdd5a`).

`tools/speaking-heads-review.mjs --stage=grey|paint` photographs every character in the real renderer and writes the evidence in `hybrid-review/speaking-heads/<stage>/`. The views are the side from the character's left and right, three-quarter, front, below, and the game's camera from its left and right; the poses are closed, the widest speech, 12° and 24°. It needs the page served and a Playwright with Edge (`PLAYWRIGHT_PATH`).

## Not done

- **Known defects, held as todo tests** (`KNOWN` in the test file, as measured; every other head is held to the bar):
  - open, the head's inside is seen first through slivers of 1.1 to 10.4 mm² on 14 of the 24 meshes, over the hole test's 216 views, none of them at ordinary speech from the portraits and the game's camera (the speech test holds that to 1 mm² on every mesh) and no background through any. The largest are the dog's game mesh's at its corners' cheeks at 24° (10.4 mm²), the goat's game mesh's from its right at 24° (3.9) and the hen's game beak's in the closing fade (2.9); the rest are 1.1 to 2.1. Each is held to what it measures, a ratchet;
  - the donkey's authoring mesh's outer skin crosses itself at 24° (2 pairs), past any speech opening (the architect's review: lower priority);
  - inside the open mouth, which is to stay coarse (the user: "we really dont need a lot of detain inside the mouth"): teeth and tongue graze the lips' inner faces on all eleven mammals (up to 12 triangles on a mesh, the bull's game mesh), and the skunk's game mesh shows 15% of the tongue from the front at 12°.
- **The hen.**
  - Closed, her beak leaves a slit along the gape from the side, as her approved beak does (33 mm² through its own): 1.1 and 0.02 mm² of background through it (authoring, game; round 5: 3.2 and 4.1).
  - Her tongue no longer shows through the game mesh's closed gape (round 5: 5.7 mm² by the test's instrument; in the renderer, 0 px over 48 views at 10 px/mm), her game beak's floor kept finer about her tongue by the crossings guard (step 3; 262 triangles).
  - Her tongue hides open behind her upper mandible's hook, and her lower mandible's tip shows from the front.
  - She is the one character with a speaking use, the intro's radio room, where she is far away and hardly visible (the user).
- **The tongue and the cavity from the front** (round 3's S1): from the front the tongue's rise reads as a card and the cavity's roof is flat.
- **The rim sawtooth** (round 4's S2): along the authoring meshes' lips the outer skin's and the faces' triangles interleave, so at close range (6 px/mm) the rim is a saw blade with teeth 3 to 4 mm wide, worst on the pig director; about 2 px at portrait scale. In exact profile the silhouette is clean (0.5 mm, p95). Round 5's review asked for it again (SHOULD-FIX 2). Its cause, seen in the class view: the sculpt snaps each lip's edge row onto the crease only as far as keeps its triangles facing out (step 2), and the partial snaps, with the grid's corner cuts beside them, leave lip-face vertices 1 to 2 mm above the edge's line; the outer skin's and the faces' shading and paint follow them. The fix is a re-meshed lip edge, an edge loop along the line.
- **A hairline at the horse's closed front.** Closed, at 3,000 px a unit, a 1 px line at the front of the horse's game mesh's crease shows its teeth (with the teeth hidden, the mouth's paint): the two lips' creases meet there with a crack the renderer draws and the closed test, at 10 px/mm, does not see. It is in the heads before this rebuild too; under a pixel at portrait scale.
- **The pig director's chin** (round 3's S7).
- **The rabbit's painted trace** stops at 6 cm across her face (N3); her crease runs to 7.25 cm.
- **The shared mesher.** `dist/tactics/grey-surface.js` winds triangles by the field's gradient at one vertex, which fails at sharp edges (step 2). The approved characters were meshed with it; whoever next rebuilds them should know.
- **Visemes.** A speaking head has one degree of freedom, its jaw. Lip shapes (wide, round, closed for m/b/p) would be morph targets on the same mesh.
- **Integration.** Nothing uses a speaking head yet. The intro's radio-room hen still has the beak split made for her line (`intro-sprites/room-set.js`); her speaking head would replace it.
- **Step 4's painted pass and step 5's review.**
- **The architect's art note's tooth row** (not blocking): at portrait size the horse's evenly spaced teeth draw attention; make the tooth row less mechanical, keeping the likeness and the jaw's motion. The user chose an uneven row (a build change). The gum band is quieter (step 4).
- **Round 5's review's should-fixes:** 1, 3 to 7 done (Round 5 → the architect's follow-up, 4). Left: 2 and 8, the rim sawtooth and the box tongue (above), and SHOULD-FIX 3's pig foreman's cream crescents, reused paint on its lower lip's outer skin under its snout (step 4).

## Reproduce

```bash
node tools/build-speaking-heads.mjs                 # all twelve, 4-95 s each, about 9 min in all; --only=cow,hen
node --test tests/speaking-heads.test.mjs
node tools/speaking-heads/fit-lips.mjs --check      # the lip lines against the painted lines
node tools/speaking-heads/preview.mjs cow out.png --weights      # clay renders of the raw sculpt, no browser
PLAYWRIGHT_PATH=<playwright-core> node tools/speaking-heads-review.mjs --stage=grey --base=http://127.0.0.1:4499
PLAYWRIGHT_PATH=<playwright-core> node tools/speaking-heads-viewer-check.mjs --base=http://127.0.0.1:4499
```

To trace a painted mouth line again: open the viewer, load a head (`speakingHeads.load(id,'author')`), and run `speakingHeads.traceMouth('side')` and `('front')`; the points go in `painted-mouths.json`.
