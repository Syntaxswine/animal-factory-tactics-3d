# Speaking heads, grey sculpt: independent review, round 3 of 5

Reviewed: worktree `animal-factory-tactics-3d-heads`, branch `art/speaking-heads`, commit b4bfc5a. The review was read-only: no repo file was changed, no build was run, and `git status` was clean at the end. All evidence is in
`C:/Users/baals/AppData/Local/Temp/claude/C--Users-baals-Local-Storage-AI/50314748-b796-400a-ae0b-6e785e35a369/scratchpad/review-heads-3/`. Paths below are relative to that folder.

View convention for the real-renderer captures (the viewer's `capture`): azimuth 0 = from the character's left (+z), 90 = from the front, 180 = from its right; elevation positive = from above. The game's camera is elevation 30 at any heading.

## Score: 6/10. This does not pass the 9/10 gate. Do not start painting yet.

**Verdict.** Round 3 did what the user asked, and it fixed round 2's main defect.
- **The user's wedge.** The lips part along the whole painted lip line.
  - From the side, 10 of the 11 muzzles open as a crimson wedge from the corner to the front (`shots/profile-speech-magenta-10k.png`).
  - From the front, the opening spans the muzzle. The bull at 12° is no longer a small square window (`shots/portrait-bull-10k.png`, front row).
  - The goat's top line now reaches its corner (`shots/goat14.png`).
  - The inside is crimson in grey and in paint.
- **The closed mouth closes.** I checked the whole crease, corner to corner, which no earlier check framed. Real renderer, back faces culled, 171 directions, 10 px/mm, both meshes. On 9 of 12 characters no tooth or tongue shows, and no background shows beyond what the approved head itself shows.
  - Dropping the closed shape brings 2–77 mm² of teeth back, so the closed shape does the work.
  - Round 2's worst case (the pig foreman, 24 mm²) is now 0.
- **The zebra curtains are gone.** Light-only renders show the inside lit evenly.
- **At portrait scale, painted,** 10 of 12 heads read as talking (`shots/contact-paint-10k-1.png`, `-2.png`).
- **The doc's numbers are honest copies of its instruments.** Both tables reproduce exactly (`tables-repro.txt`). `fit-lips --check` passes. The budgets hold (dog 11,996, bull 11,978 of 12,000).

**Two things block painting.**
1. **Open, heads are see-through at eye level, and the pig director's whole mouth is a hole through its head.**
   - The new inner walls stop 7–38 mm short of the lips' front. The pig director has none at all.
   - In exact profile at speech amplitude, the background shows through:
     - pig director: 16–17 cm²;
     - cow: 6.6 cm²;
     - horse, bull and sheep: 1–2.5 cm².
   - At portrait scale the pig director's lower jaw reads as detached (`shots/portrait-pig-director-10k.png`, side row).
   - The doc says the inner walls close exact profile.
2. **The test that guards "never through the head" cannot see.**
   - On four game meshes (horse, goat, pig foreman, dog) its instrument frames nothing and returns 0. The doc's acceptance table prints those four zeros as measurements.
   - It looks from one side only. From the other side, the real renderer finds holes of 3.1–12.8 mm² on five characters. KNOWN lists the donkey's as 3.8; it is 12.8.

**Also open:**
- From the front, the inside still reads as a box with a card tongue (round 2's MUST-FIX 2, partly fixed).
- The ragged lip edges (round 2's S4) now run the whole lip line.
- The cow's game mesh still leaks closed: background from below, which no test measures.
- The closed test's 9 cm field misses the dog's mouth corners.

## Method
- Read `SPEAKING-HEADS.md`, rounds 1 and 2, every source named in the brief, and the built JSON.
- **Ran the suite:** `node --test tests/speaking-heads.test.mjs` → 27 tests: 16 pass, 0 fail, 11 todo, 91 s, exit 0 (`test-run.txt`).
- **Reproduced the doc's tables** with the builder's `tables.mjs` (`tables-repro.txt`): identical. Ran `fit-lips.mjs --check` (passes, `fit-lips-check.log`) and `preview.mjs cow` into my folder (runs, 26 s, `preview-cow.png`).
- **Real renderer** (`speaking-heads.html` on :4499; I checked the server serves this worktree's files by md5). Scripts:

  | Script | What it does |
  |---|---|
  | `shoot3.mjs` | A copy of the builder's `diagshoot.mjs`: grey, paint, and the debug columns `class` and `light` |
  | `shoot3w.mjs` | The same, plus hiding the inner walls (the mixed upper/lower band triangles) |
  | `closed-full.mjs` | Closed, the whole crease framed per view, teeth drawn pure green, 171 views. Background holes are counted with the head alone, so the body cannot enclose any background. Controls: `CONTROL=skinless` (6,134 mm² seen: the detector works), `CONTROL=nomorph` (closed shape off), `PANE=approved` (the approved head's own enclosures) |
  | `closed-compare.mjs` | The speaking head against the approved head, view by view |
  | `game-sweep.mjs` | The game's camera at all 24 headings, at each head's widest speech, head alone, magenta background, with an approved-head control. This is a lower bound: it has no front-opening wall |
  | `see-real.mjs` | Single views, the same way |

- **The in-tree instruments beyond the tests' views:**
  - `see-eye.mjs` and `see-profile.mjs`: eye level, below, and the other side.
  - `liptips.mjs`: does `seeThrough` draw anything?
  - `see-testviews.mjs`: the test's exact views with `lipTips` fixed in a copy (`mut/measure-fixtips.mjs`).
  - `seemask*.mjs`: the instrument's masks.
  - `parts-check.mjs`: teeth and tongue against the skin at speech, 6, 12 and 24°, including the dropped open poke rule.
  - `field-extent.mjs`: the closed test's field against the crease.
  - `sideend.mjs`: where the inner walls end, from the repo's own `mouthGeometry`.
- **Mutations** (in memory, or in copies in `mut/`):
  - a 4 mm tooth through the closed crease at a corner (`mut/closed-field-mutant.mjs`);
  - the closed shape removed (`mut/closed-shape-mutant.mjs`);
  - `lipTips` given a radius per lip (`mut/measure-fixtips.mjs`).
- I looked at every sheet I cite.

## Round 2's findings, graded

| Round 2 | Round 3's answer | Grade | Evidence |
|---|---|---|---|
| **MUST-FIX 1**, the closed crease leaks (11 of 12) | A closed shape blended in over the last 2°; culled instruments | **Mostly fixed** | Clean on 9 of 12, both meshes. Exceptions: cow game mesh 0.99 mm² of teeth (6 views) and background through the crease from below, up to 1.93 mm², 53 of 171 views; bull game 0.63 mm² (22 views, from below); cow authoring 0.54 mm² (2 views, not in KNOWN); hen 1.36 / 2.31 mm². Files: `closed-full-grey.log`, `closed-compare.log`, `closed/cow-10k-grey-hole.png` |
| **MUST-FIX 2**, a box with striped curtains | The cheeks went; throat; domed tongue; band normals; even light inside | **Partly fixed** | Stripes: fixed (`shots/light-bull-10k.png`, `light-cow-10k.png`). Box: the window's end walls are gone, but from the front the cavity still has a flat roof and vertical sides. The tongue, rising to the back, has a flat-sided card silhouette; at 24° the mouth is a "door" (`shots/wide-grey-goat-10k.png`, `wide-grey-dog-10k.png`, `contact-grey-author-1.png` front columns). New curtains: the inner walls' front ends stand in the opening at three-quarter (`shots/goat14.png`, `class-horse-author.png`). See S1 |
| The user's redirect (a wedge, crimson inside) | The lips part along the whole line | **Done in shape**; it regressed see-through | MUST-FIX 1 |
| S1, the hen | Closed 0.9 / 1.8 (instrument); tongue still todo; 24° dropped for a beak | **Partly** | Renderer: 1.36 / 2.31 mm² closed (round 2: 10.7 / 6.9). Tongue 0% open. Lower mandible tip unchanged |
| S2, game crowns | Todo | **Not fixed (held)** | Least 2.6 (skunk), 3.5 (goat), 3.9 (pig foreman); the test's todo text is stale (N1) |
| S3, teeth through the lips' inner faces | Todo, interior per the user | **Accepted as held** | 1–8 triangles per part (`parts-check.log`) |
| S4, ragged lip edges | Not fixed | **Not fixed, and longer now** | Pig director's fringe of spikes (`shots/class-pig-director-author.png`), goat game upper lip (`shots/grey-goat-10k.png` side row), torn shards and combs at the corners (`shots/corner-bull-10k.png`, `wide-grey-horse-author.png`), rabbit's corner "flags" (`wide-grey-rabbit-author.png`). The game camera's background slivers line these edges (`seereal/sheet.png`) |
| S5, 24° | Tested to 24° (a beak to 12) | **Fixed** | Only the donkey crosses (2 / 3 pairs at 24°, known) |
| S6, crease shadow band | Shadow on the faces only | **Fixed** | `speaking-head.js`; `shots/closedzoom-*.png` paint columns |
| S7, the director's chin | Not changed | **Not fixed (stated)** | |
| N1 preview crash | Fixed | **Fixed** | `preview-cow.log` |
| N2 diluted difference | Gone | **Fixed** | `checks.json` has no difference metric |
| N3 rabbit trace | Not re-traced | **Not done (stated)** | |
| N4 bar changed | Stated | **Stated, but the new bar's test is vacuous** | MUST-FIX 2 |
| N5 nostrils | Filled in the speaking heads | **Fixed in the speaking heads**; the user's answer is still pending | `shots/goat14.png` col 1 vs 2 |
| False claims 1 and 3 (closed leaks) | Culled, posed | **Fixed**, two gaps left | The closed test's 9 cm field misses long creases, and nothing counts background (S3) |
| False claim 2 (horse crack) | 0.0 | **True** | 0.00 / 0.02 mm² |
| False claims 4–7 | | **True** | |

## MUST-FIX (blocks painting)

### 1. Open, the head is see-through at eye level; the pig director's whole mouth is a hole

**The cause.** The inner walls run from the corner only until the muzzle's outline at the cut turns past 45° (`sculpt.mjs` `sideEnd`). In front of that the mouth is open from side to side.
- Computed with the repo's `mouthGeometry` (`sideend.log`), this leaves the front of the lip line open across:

  | Head | Open across at the front |
  |---|---|
  | dog | 11 mm (9%) |
  | goat | 9 mm (11%) |
  | skunk | 7 mm (11%) |
  | pig foreman | 12 mm (15%) |
  | donkey | 12 mm (16%) |
  | bull | 21 mm (24%) |
  | horse | 23 mm (25%) |
  | sheep | 21 mm (27%) |
  | cow | 38 mm (45%) |
  | rabbit | 34 mm (59%) |

- **The pig director's outline is already steeper than 45° at its corner, so it has no inner walls at all.** Its 108 mm mouth is open side to side.

**Measured.** Background seen through the head in exact profile at eye level, both sides, cm² (`see-profile.log`; in-tree `seeThrough` with `lipTips` fixed, see MUST-FIX 2):

| Head | Speech opening, authoring / game | 12°, authoring / game |
|---|---:|---:|
| pig director | 16.2 / 17.0 | 38.2 / 40.0 |
| cow | 6.6 / 6.6 | 13.0 / 13.0 |
| horse | 2.5 / 1.1 | 7.5 / 3.1 |
| bull | 2.5 / 1.3 | 5.5 / 3.0 |
| sheep | 1.8 / 2.0 | 3.3 / 3.5 |
| hen (a beak) | 2.3 / 2.4 | 3.2 / 3.3 |
| pig foreman | 0.5 / 2.0 | 1.0 / 4.0 |
| rabbit | 1.7 / 0.0 | 2.7 / 0.0 |
| goat, donkey, dog, skunk | 0.0–1.0 | 0.0–1.9 |

**Seen.**
- `shots/profile-speech-magenta-10k.png` (exact profile at each head's speech opening, magenta background):
  - the pig director's mouth is a magenta crescent with teeth hanging in it;
  - the cow's front half is magenta.
- `shots/magenta-pig-director-10k.png`: every eye-level row shows magenta through the mouth, both sides.
- `shots/portrait-pig-director-10k.png`, side row, painted at 620 px/unit: background through the mouth at 2.6°, 5.17° and 12°; the lower jaw reads as a separate strip.
- Masks: `masks/pig-director-author-12-az0-el0.png` (the whole wedge red = background) and `masks/cow-10k-12-az0-el0.png`.

**Fix.**
- Run the mouth's lining to the front on every muzzle: end it at the cavity's front or the lower incisors (`frontX(z) − cavity.front`), not at the outline's 45° turn. The director's zero-length walls are a bug of that rule.
- Re-measure in exact profile and out to ±45° on both sides, at speech, 12° and 24°. The bar should be round 1's: 0 mm², the beak excepted.
- If instead the user wants the sides open, as a beak's are, show them the choice first: `shots/nowalls-horse-author.png` approximates `cavity.inner` 0, and its side column is background through the whole wedge. Then write that down as their decision. Either way the doc's claim must go.

### 2. The see-through test is vacuous on four game meshes and blind to one side; KNOWN understates

**Vacuous.**
- `measure.mjs` `lipTips` picks both lip tips within one radius of the middle. On the horse, goat, pig-foreman and dog game meshes no upper-lip folding vertex lies in it, so `up` is −1, the view centre is NaN, the raster draws 0 pixels, and `seeThrough` returns 0 (`liptips.log`; the mask `masks/horse-10k-12-az0-el0.png` is blank).
- So the test "open, the game's camera sees the mouth's inside, never through the head" passes these four without looking.
- The doc's acceptance table prints them as "0.0 (0.0)".
- There is no guard that anything was drawn.

**One side.**
- The test looks from +z only, every 30°.
- The real renderer at all 24 headings (`game-sweep-el30.log`, `sweep/worst-sheet.png`, head alone, approved head as control) finds the largest hole above the 3 mm² bar on five characters:

  | Head | Largest hole, authoring / game (mm²) | Headings (viewer az) | Approved head's own |
  |---|---:|---|---:|
  | donkey | 12.6 / 12.8 | 105–165 | ≤ 4.2 |
  | dog | 4.4 / 8.9 | 105–120 | 0 |
  | pig foreman | 5.9 / 5.6 | 105–165 | ≤ 3.1 |
  | horse | 4.3 / 4.6 | 135–180 | 0 |
  | sheep | 3.4 / 3.1 | 120–150 | 0 |

  - These are a vertical slit beside the inner wall's front end (donkey, dog) and slivers along the ragged lower lip.
  - All of them are on the side the test never looks from. At the test's own views the renderer finds at most 2.75 mm² on every head (the skunk's game mesh).
- KNOWN lists the donkey game mesh at 3.8; it is 12.8. The donkey's authoring mesh, the dog's and the horse's are not listed at all.

**The instrument over-reports too.**
- The front-opening strip is drawn wherever background shows. From some views it closes pockets of background outside the head.
- With `lipTips` fixed, it reports 8.2 mm² on the goat game mesh and 6.75 mm² on the pig-foreman game mesh at the test's own az 0 (`see-testviews.log`). The renderer there shows 0.0 and 0.8.
- It also reports 34.6 mm² on the pig foreman's authoring mesh from the rear three-quarter, where the renderer finds 5.9.

**Fix.**
- Give each lip its own radius in `lipTips` (the fix in `mut/measure-fixtips.mjs`). Assert that the raster drew the head and the mouth: a check that fails when it measures nothing.
- Draw the front opening as a posed cap mesh in the z-buffer, not a 2D fill, so it cannot enclose background outside the head.
- Sweep both sides at 15° steps, at speech and at 12°.
- Re-measure KNOWN; cross-check with the real renderer.
- Correct the doc's table.

## SHOULD-FIX
- **S1. From the front, the inside is still a box** (round 2's MUST-FIX 2, partly fixed).
  - In grey, every head at 12° shows the cavity's flat roof and straight vertical sides around a card-shaped tongue. At 24° it is a tall "door" (horse, goat, dog, bull: `shots/wide-grey-*-author.png` front rows).
  - At three-quarter, the far inner wall's front end stands as a flat crimson curtain with a straight edge across the opening (`shots/goat14.png` rows 1–2, `class-horse-author.png`).
  - Painted at portrait scale this mostly reads as a mouth, and the user wants little interior detail, so it is not blocking. But the box shape is a major form, not detail.
  - Fix: round the cavity's section (its roof and floor curving into its sides), so the tongue's rise does not present a flat-sided card from the front. Make the lining a curved pouch into the cavity, not a sheet with a round end.
- **S2. Ragged lip edges** (round 2's S4) now run the whole lip line.
  - The pig director's upper lip has a fringe of white spikes, visible in grey at portrait scale (`shots/portrait-pig-director-10k.png` grey columns).
  - Torn shards at the bull's corners at speech, in grey and paint (`shots/corner-bull-10k.png`).
  - Striped "combs" at the horse's and donkey's corners (`shots/wide-grey-horse-author.png` side row).
  - The rabbit's corner "flags" (`shots/wide-grey-rabbit-author.png` front row).
  - Background slivers along the lower lip from the game camera: 8–22 mm² in total (`seereal/sheet.png`).
  - Fix: smooth or relax the lips' edge rows in an open corrective shape, the twin of the closed shape, so the closed crease is not pulled off the surface.
- **S3. Closed, the cow's game mesh and the closed test's reach.**
  - The cow's game mesh shows background through the closed crease from below: up to 1.93 mm² in 53 of 171 views. Nothing measures it; round 2 asked for background to be counted.
  - It also shows 0.99 mm² of teeth from the front, not the 0.6 in KNOWN. The bull's 0.63 mm² is from below, not "at eye level". The cow's authoring mesh shows 0.54 mm² (not in KNOWN; the instrument reads 0.3).
  - Painted, the same: the cow's game mesh 0.98 mm² of teeth and 1.94 mm² of background; the bull's 0.58 mm². The painted materials are FrontSide too.
  - The closed test's field is 9 cm about the folds' centroid. It leaves out 233 of the dog's 568 authoring crease vertices from the side (the pig director's: 203 of 659) (`field-extent.log`).
  - Mutation: a 4 mm tooth through the dog's closed crease at its corner reads 0.0 mm²; with a 24 cm field it reads 20.8 mm² (`mut/closed-field-mutant.log`).
  - Fix: frame each view on the whole crease (as `closed-full.mjs` does) and count background through the head.
- **S4. The stripe test holds no head.**
  - The whole test is todo, though 15 of 24 meshes meet its 6% bar: horse, donkey, sheep, pig director, rabbit, dog and hen on both meshes, and the skunk's game mesh.
  - A regression in those would pass unseen.
  - Fix: hold the passing meshes; list the others in KNOWN (goat 11/14%, bull 7/13%, cow 8/19%, pig foreman 7/11%, skunk authoring 7%).
- **S5. Closed, in grey at close range, the crease is not the approved groove.**
  - The horse's authoring mesh: a crumpled, serrated band (`shots/closedzoom-horse-author.png` col 2).
  - The rabbit's authoring mesh: a torn line (`shots/wide-grey-rabbit-author.png` col 2).
  - The goat's game mesh: a crisp seam that cuts across the painted mouth from the front and below (`shots/closedzoom-goat-10k.png` paint cols).
  - At portrait scale, painted, it is invisible.
- **S6. The hen** (the one speaking use): closed beak 1.36 / 2.31 mm² of tongue in the renderer; tongue never seen open (both known).
- **S7. The game meshes' crowns** (2.6–3.9 mm on three heads) stay todo.

## NITS
- **N1.** Stale todo texts in the test file:
  - the hen's closed beak says "5.4 mm² in the authoring mesh" (now 0.9 instrument, 1.36 renderer);
  - the crowns say "1.4 to 3.9 mm on six heads" (now 2.6–3.9 on three).
- **N2.** The doc says the open mouth "keeps some 350 to 750 more triangles … than round 2's closed cheeks". Against round 2's commit bfde47b, the game meshes grew by +2 (goat) to +826 (bull).
- **N3.** KNOWN's closed entries say "at eye level"; the bull's worst view is from below.
- **N4.** The doc says only the hen has no inner walls; the pig director has none either.
- **N5.** `mouthShading` says excluded fragments' normals are "at least 40% the eye's". `mix(n, v, .4)` of a normal facing away still faces away. The light-only renders show it does not matter in practice.
- **N6.** In grey, the horse game mesh's nostril, closed, is a sharp notch where the approved game mesh has a soft dimple: the same field, a different reduction (`shots/wide-grey-horse-10k.png` cols 1–2). Invisible in paint.

## The inner walls (the judgement the brief asks for)
- **From the side** they read as the mouth's inside: a crimson wedge (`shots/wide-grey-dog-10k.png`, side row). That is what the user asked for ("make the inside that color"), and it is what keeps most of each profile from being see-through.
- **From the front and three-quarter**, their front ends stand as flat vertical curtains splitting the opening (`shots/goat14.png`, `shots/class-horse-author.png`). That reads as the walls the user asked to remove.
- **They are also incomplete.** They are absent from 9–59% of each lip line, and from the pig director's entirely. So they do not do the job the doc gives them.
- **Hiding them** (`shots/nowalls-horse-author.png`, an approximation of `cavity.inner` 0) shows the alternative: background through the whole wedge in profile. That is round 1's M1 on every head.
- **Recommendation:** keep a lining, but as a curved cheek pouch that runs to the front and into the cavity, recessed so its edge never stands in the opening. Show the user the two options side by side, since they asked for side walls to go.

## The user's words, view by view
Speech (4.5–8.6°), 12° and 24°:
- **Front:** a large opening across the muzzle, crimson; grey shows a box and a card tongue inside (S1).
- **Three-quarter:** a crimson wedge, cut by an inner-wall curtain.
- **Side:** a crimson wedge from corner to front on 10 of 11 muzzles:
  - background at the front on the cow, horse, bull and sheep, and through the whole mouth on the pig director (MUST-FIX 1);
  - combs and shards at the corners (S2).
- **Below:** crimson with vertical curtain streaks; ragged lower lips.
- **Game camera:** crimson with teeth; holes of 3–13 mm² from the character's right (−z) on five characters (MUST-FIX 2), slivers along ragged edges. At gameplay scale (58 px/unit) all of this is sub-pixel.
- **Painted portrait:** reads as speaking except the pig director's profile and the rabbit's corners.

## Per character

| Character | Grade | Main problems (authoring / game) |
|---|---|---|
| horse | not ready | Profile at speech 2.5 / 1.1 cm² (front 23 mm open across). Game camera 4.3 / 4.6 mm² from the right (the test is vacuous on the game mesh). Box and card tongue from the front; comb at the corners. Closed: clean. Game upper teeth cross 1 outer triangle (known) |
| goat | close | Profile 0.05 / 1.0 cm². Front at 12–24° a narrow slot framed by vertical walls; three-quarter curtain. Spikes on the game upper lip. Closed clean; the carved side nostrils are filled. Game crown 3.5 |
| bull | not ready | The user's wide opening is done. Profile 2.5 / 1.3 cm². Torn shards at the corners at speech. Closed game 0.63 mm² (22 views); closed poke 0.33 mm (known). Front box |
| cow | not ready | Profile 6.6 / 6.6 cm² (front 45% open across). Closed game: 0.99 mm² of teeth, and background from below up to 1.9 mm² in 53 views (untested). Closed authoring 0.54 mm² |
| donkey | not ready | Game camera 12.6 / 12.8 mm²: a slit beside the inner wall's front end, from the right. Profile 0.4 / 0.4 cm². 24° crossings (known). Closed clean; nostrils filled |
| sheep | close | Profile 1.8 / 2.0 cm². Game camera 3.4 / 3.1 mm² from the right. Closed clean |
| skunk | close | Profile 0.04 / 0.2 cm². Slivers along the ragged lower lip (largest 2.6–2.8). Closed poke 0.36 mm (known); game crown 2.6 |
| pig foreman | not ready | Game camera 5.9 / 5.6 mm² from the right (vacuous in the test). Profile 0.5 / 2.0 cm². Closed clean. Game crown 3.9 |
| pig director | fail | No inner walls: the whole mouth is see-through at eye level (16 / 17 cm² at speech, 38 / 40 at 12°), visible at portrait scale. Spiky fringe on the upper lip. Closed clean; chin unchanged (S7) |
| rabbit | not ready | Ragged corners with vertical "flags"; striped curtains under the smile. Inner walls only 24 mm (59% open). Profile 1.7 cm² (authoring). Torn-looking closed crease in grey. Closed clean in the renderer |
| dog | close | Cleanest profile wedge. Game camera 4.4 / 8.9 mm² slit beside the far inner wall (vacuous in the test). Front box and card tongue. Closed clean, but the closed test cannot see its corners |
| hen | as known | Closed beak 1.36 / 2.31 mm² of tongue; tongue never seen open. The beak opens cleanly; profile see-through 2.3 cm², as a beak does |

## False or overstated claims (doc and tests)
1. **"The mouth's inner walls … close it" (Round 2 → 3) and "in exact profile the parted lips open onto them, the mouth's inside, not onto the far side's gap and the background beyond it" (step 2).**
   - False on the front 9–59% of every lip line, and on the pig director's whole mouth.
   - At speech: 16–17 cm² (pig director), 6.6 cm² (cow), 1–2.5 cm² (horse, bull, sheep).
   - The doc's own bar sentence ("at eye level the mouth shows what is beyond it") contradicts this claim.
2. **"From the game's camera the opening shows the inside (Checks)" and the test name "never through the head".**
   - The test is vacuous on four game meshes and one-sided.
   - The real renderer finds 3.1–12.8 mm² single holes on five characters from the unchecked side.
3. **The acceptance table's "0.0 (0.0)" for the horse, goat, pig-foreman and dog game meshes.** Not measurements: the instrument drew 0 pixels.
4. **"Every head meets them but those held as known."** False for the see-through bar (item 2). Marginal for the cow's authoring mesh closed (0.54 mm² in the renderer).
5. **KNOWN and Not done:** "the largest one 3.1 to 4.3 mm² on four game meshes".
   - The donkey's game mesh is 12.8. The dog's (8.9), horse's (4.6) and the donkey's authoring mesh (12.6) are not listed.
6. **"Closed … the mammals show at most 0.6 mm² of tooth … and round 2's own real-renderer check agrees."**
   - The renderer over the whole crease: cow game 0.99, bull game 0.63 (from below, not "at eye level"), cow authoring 0.54.
   - The cow's game mesh lets background through, which no check counts.
7. **"MUST-FIX 2 … The box went with the cheeks."** Overstated (S1).
8. **"(the hen) Her closed beak shows less (0.9 and 1.8 mm²…)."** The renderer shows 1.36 and 2.31.
9. **The inner walls stand "along the muzzle's sides"; only the hen's beak has none.** The pig director has none either.
10. **"Some 350 to 750 more triangles"** (N2).
11. **Test todo texts** (N1).

## Verified true
- **Tests:** 27 tests: 16 pass, 0 fail, 11 todo. The todo tests fail as their texts say: the KNOWN cases, the hen, the game tongue (horse 25%), game crowns, face crossings, stripes.
- **The doc's two tables** reproduce exactly (`tables-repro.txt`). Budgets and headroom are as stated; ratios are inside 1.8–3.6.
- **`fit-lips --check`** passes, with the residuals in the doc's table (side 0.4–1.8 mm, across 1.2–3.0 mm).
- **The instruments pose the closed shape** as `setJaw` does: in full at 0°, gone by 2°, the same smoothstep. They cull back faces, as the renderer does: grey and paint materials are FrontSide (`side: 0` in the live page).
- **The closed test can fail:** without the closed shape it reads 4.7–36 mm² (`mut/closed-shape-mutant.log`).
- **Closed, over the whole crease, in the renderer:**
  - horse, goat, donkey, sheep, skunk, both pigs, rabbit and dog show no tooth over 0.5 mm² and no background beyond the approved head's, on both meshes;
  - without the closed shape, 2–77 mm² of teeth show.
- **Teeth and tongue against the skin:**
  - every tooth is rooted at speech, 6, 12 and 24°;
  - closed pokes only on the bull and skunk game meshes (0.33 / 0.36 mm, known);
  - open outer crossings only on the horse game (1), rabbit game (4) and hen (1 / 2), all known;
  - no outer self-crossing at speech, 6, 12 or 24° except the donkey at 24° (2 / 3, known).
- **The open inside is lit evenly** (light-only renders); round 2's stripes are gone.
- **The crease shadow** darkens only the folded faces.
- **The goat's and donkey's carved side nostrils** are filled in their speaking heads, and the approved characters keep theirs.
- **Speech amplitudes** match `speechOpen` (4.5–8.6°).
- **Lathe triangle counts** are as stated: 140 / 336 (authoring); 30 / 24 / 72 (game).
- **`preview.mjs`** runs (26 s, the cow). `checks.json` has no screen difference.
- **The opening** reaches each muzzle's painted corner, and the goat's top line reaches its corner.
