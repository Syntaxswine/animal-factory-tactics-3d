# Speaking heads

**Status (October 14, 2026): steps 1–3 of the workflow below are built for all twelve characters, and the grey sculpt is in independent review (round 1 of 5). Step 4, the paint, is working but not reviewed. Nothing here changes a character in the game.**

Each character's approved head, sculpted to speak:
- its lips part along its painted mouth line;
- behind them, a mouth with a tongue and teeth;
- its lower jaw is weighted to a jaw bone at the jaw joint.

Closed, a speaking head is the approved head: the same surface away from the mouth (within 3 mm, by test) and the same registered paint. Open it with one number, the jaw's angle.

Open `tactics/speaking-heads.html`. Each character's approved head is on the left and its speaking head on the right, at either mesh level. The page has a jaw slider and a spoken line, and paint, grey, wireframe, coverage and jaw-weight modes. Below them is the reference sheet: the mouth planned on the character's registered paint.

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

## The workflow, step by step

### 1. Reference sheet

The characters' identities are settled. Their turnarounds (`dist/assets/characters/model-references/`) and registered paint sheets (`dist/assets/characters/lowpoly-proof/*-model-paint-*.png`) are the reference. What a speaking head adds is its mouth, so the reference sheet is the mouth planned on each character's registered paint, in its side and front views:
- the lip line, where the lips part;
- the corners;
- the jaw joint;
- how far down and back the jaw's weight reaches;
- the cavity, the teeth and the tongue.

The viewer draws it from the same numbers that sculpt the head (`tools/speaking-heads/mouths.mjs`).

The lip lines were placed by drawing each sculpt's surface over its painting, 5 mm grid: `node tools/speaking-heads/registration.mjs <id> out.png`. The painted mouth lines are where the lips part. The first placement, by eye from the whole sheet, put the cow's 2.5 cm above its painted mouth; the overlay is the instrument.

### 2. Grey sculpt

The characters' heads were sculpted as signed-distance fields in their build tools (`tools/build-<character>.mjs`, and `horse-grey-model.js` for the horse). `tools/speaking-heads/heads.mjs` holds verbatim copies of the twelve head sculpts, with the placement each tool gave its skull. The first test proves the copies: every vertex of every shipped authoring skull lies on its copied sculpt (median distance under 0.02 mm).

`tools/speaking-heads/sculpt.mjs` opens a head for speech:
- **The slit.** A slit 1 cm wide parts the lips along the lip line, from the front of the mouth back to its corners, where it ends round. A beak's slit runs along the gape between its two mandibles.
- **The mouth.** The cavity behind the lips follows the head: everything inside it deeper than the lips' thickness (7–10 mm), within a slab around the lip line and a width either side. A long muzzle gets a long narrow mouth, a broad one a broad mouth, and the jaw keeps its walls.
- **The teeth and tongue** are separate parts. A tooth is a rounded block on an arch: incisors for the horse, donkey and rabbit, lower incisors against a dental pad for the cattle, sheep and goat, canines for the dog, skunk and pigs. The tongue lies on the floor of the mouth. All are kept 2.2 mm inside the approved head, so a closed mouth hides them.
- **The jaw.** Its weights break across the slit, so the lower lip rides the jaw and the upper lip stays. They blend over the cheeks, so the corners and cheeks stretch, and fade below a ray from the jaw joint, so the throat and jowls stay with the head.
- **Rest.** The rest pose seals the slit: each face moves halfway across it, and the lips within 1.8 cm follow.

Two heads needed more than an opening:
- **The bull.** His muzzle ends at its painted mouth line, leaving a lower lip a few millimetres thick. A small lower lip is sculpted under it, as his painting shows (`lowerLip` in `mouths.mjs`).
- **The hen.** Her head and beak are separate parts. Only her beak is replaced; it parts between its mandibles.

The grey stage's evidence is in `hybrid-review/speaking-heads/grey/`:
- one sheet per character: approved and speaking, closed and open 12° and 24°, from the side, three-quarter and front, authoring mesh;
- `overview.png`;
- `checks.json`, with how far the closed head differs on screen from the approved head. That difference is 0.03–0.4 of 255 mean, and 0.04–0.4% of pixels in a cutscene-scale crop.

### 3. Reduce

`node tools/build-speaking-heads.mjs` sculpts each speaking head at 2.5 mm (1.5 mm for the beak), finer than the characters' 4.5–5.5 mm, so the slit is four grid steps wide. It then reduces the head twice, as the characters were:
- to an authoring mesh, at the skull's own authoring budget plus a quarter;
- from that, to the game mesh, at the skull's game budget plus a quarter.

The reductions use the same simplifier (meshoptimizer) and tolerances as the characters' tools. Three things are added:
- **The mouth's edges are kept.** The lip edge (where the inside begins), the jaw's weight and the side of the mouth are carried as attributes, so the simplifier keeps them.
- **Pinches are prevented.** Where a collapse pinches a thin shell shut (a folded ear, a nostril), the vertices around the pinch are locked and the reduction is done again. Every part of every head is a closed surface, as the characters' are (tested).
- **Teeth are made, not reduced.** They are small closed props: each is a cube moved onto its tooth's surface, 48 triangles in the authoring mesh and 12 in the game mesh.

The build writes `dist/tactics/speaking-heads/<id>-author.json` and `<id>-10k.json`, about 40 seconds a head. It refuses to run if the approved sculpt no longer gives the placement frozen in `heads.mjs`.

| Character | Skull it replaces (game) | Speaking head (game): skin + teeth + tongue | Character, game mesh | Authoring speaking head |
| --- | ---: | ---: | ---: | ---: |
| horse | 2,498 | 3,404 (3120 + 72 + 72 + 140) | 10,300 → 11,206 | 9,116 |
| goat | 2,798 | 3,728 (3492 + 96 + 140) | 9,994 → 10,924 | 10,548 |
| bull | 2,720 | 3,636 (3400 + 96 + 140) | 9,998 → 10,914 | 10,554 |
| cow | 2,460 | 3,310 (3074 + 96 + 140) | 10,184 → 11,034 | 9,728 |
| donkey | 2,596 | 3,526 (3242 + 72 + 72 + 140) | 10,110 → 11,040 | 9,734 |
| sheep | 2,600 | 3,486 (3250 + 96 + 140) | 10,476 → 11,362 | 10,552 |
| skunk | 2,000 | 2,832 (2500 + 96 + 96 + 140) | 9,998 → 10,830 | 6,812 |
| pig foreman | 2,050 | 2,870 (2562 + 72 + 96 + 140) | 9,988 → 10,808 | 7,714 |
| pig director | 2,150 | 2,962 (2678 + 72 + 72 + 140) | 9,998 → 10,810 | 8,616 |
| rabbit | 2,490 | 3,300 (3112 + 24 + 24 + 140) | 10,156 → 10,966 | 9,612 |
| dog | 2,250 | 3,144 (2812 + 96 + 96 + 140) | 10,446 → 11,340 | 8,626 |
| hen (beak) | 650 | 1,096 (810 + 286) | 10,348 → 10,794 | 2,230 |

A speaking character is 10,794–11,362 triangles, about a tenth over its 10k. The mouth needs the extra triangles where it opens.

### 4. Painterly skin

The speaking head keeps its character's registered paint. Its skin is the approved surface away from the mouth and takes the skull's place in the character's part order, so `createAnimalPaint` projects the same sheet onto it, with every correction the character's paint already makes.

What the paintings never saw is the inside of the mouth. `speaking-head.js` paints it over the registered paint:
- the lip's inner face, then gum, darkening into the back of the mouth, with a painterly grain;
- teeth that darken toward their roots;
- a tongue lighter along its top, with a groove.

The colours are per character (`MOUTH_PAINT`).

This session has no image-generation tool. The builder's step 4 paints over registered renders; here the mouth's interior is painted in code instead. The registered renders it would need can be made from the viewer: open the jaw, grey mode, any view. A painted pass over them is the one piece of the workflow left to a builder who can paint.

### 5. Final inspection

Not yet run. The paint stage's evidence comes from `node tools/speaking-heads-review.mjs --stage=paint`: the game mesh, painted, with screen-space paint coverage, closed and open. It then goes to independent review, to 9/10.

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
- **Speech:** `jawAt` opens the jaw once a syllable, wider for stressed ones, as the intro's hen does.

## Checks

`tests/speaking-heads.test.mjs`, nine tests, about a second:
- the copied sculpts are the approved heads;
- every head was built from the current sources (a hash of the sculpt modules and build tool);
- every part is a closed surface;
- closed, a speaking head is its approved head away from the mouth, its teeth and tongue are inside, and its lips are on their own sides;
- the budgets;
- the head takes the skull's place and nothing else changes;
- the jaw turns its lips, teeth and tongue about its joint and leaves the crown and upper teeth;
- the beard rides the jaw;
- `jawAt`.

`tools/speaking-heads-review.mjs --stage=grey|paint` photographs every character in the real renderer and writes the evidence and `checks.json` described above. It needs the page served and a Playwright with Edge (`PLAYWRIGHT_PATH`).

## Not done

- **The paint stage's review** (step 5), and a painted pass over the mouth's interior by a builder who can paint (step 4).
- **Visemes.** A speaking head has one degree of freedom, its jaw. Lip shapes (wide, round, closed for m/b/p) would be morph targets on the same mesh.
- **Integration.** Nothing uses a speaking head yet. The intro's radio-room hen still has the beak split made for her line (`intro-sprites/room-set.js`); her speaking head would replace it.
- **Profile see-through.** Where a long muzzle's mouth opens along its sides (horse, donkey, dog), both sides open at the same place. In exact profile, a gap above the tongue can show what is behind the head.

## Reproduce

```bash
node tools/build-speaking-heads.mjs                 # all twelve, about 8 minutes; --only=cow,hen
node --test tests/speaking-heads.test.mjs
node tools/speaking-heads/preview.mjs cow out.png --weights      # clay renders of the raw sculpt, no browser
node tools/speaking-heads/registration.mjs cow out.png           # the sculpt over the painted mouth
PLAYWRIGHT_PATH=<playwright-core> node tools/speaking-heads-review.mjs --stage=grey --base=http://127.0.0.1:4499
```
