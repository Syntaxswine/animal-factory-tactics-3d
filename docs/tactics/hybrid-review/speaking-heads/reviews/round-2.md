# Speaking heads, grey sculpt: independent review, round 2 of 5

Reviewed: worktree `animal-factory-tactics-3d-heads`, branch `art/speaking-heads`, commit bfde47b. The review was read-only. No repo file was changed, the build was not run, and `git status` stayed clean (checked at the end). All evidence is in
`C:/Users/baals/AppData/Local/Temp/claude/C--Users-baals-Local-Storage-AI/50314748-b796-400a-ae0b-6e785e35a369/scratchpad/review-heads-2/`. Paths below are relative to that folder.

## Score: 6/10. This does not pass the 9/10 gate. Do not start painting yet.

**Verdict.** The rework fixed the structure that failed round 1:
- The cheeks close the mouth's sides, so there is no hole through the head.
- The jaw is a mandible, rigid down to its jaw line.
- The bull has a real jaw, and his closed silhouette is the approved one.
- There is no seal, so the mouth keeps its sculpted cavity. The tongue shows 43–70% from the front at 12°.
- Every tooth is rooted at every opening. No tooth or tongue pokes through the outer skin, and no two teeth touch.
- The lip lines sit on the painted lines: `fit-lips --check` passes at 0.4–1.8 mm rms.
- Speech opens about 2.5 cm at the lips.
- At speech amplitude (4.5–8.6°), painted, at portrait scale, every muzzle reads as a mouth talking. The user's complaint about the goat's top line is answered: the opening now starts at the painted corner.

**Two things block painting.**

1. **Closed, the mouths do not close in the real renderer.** The viewer draws the skin FrontSide (back faces culled; checked in the live page). The closed crease is full of inside-out triangles. Through them, teeth, tongue, gum and even background show on 11 of 12 heads:
   - up to 24 mm² of teeth (pig-foreman game mesh, from straight in front);
   - up to 11 mm² of background (pig-foreman game mesh, from the front and above);
   - a dotted seam at the viewer's own close-up scale.

   In grey, every muzzle shows a broken light seam where the approved head is smooth. The tree's closed-mouth test reports 0.0 because its rasteriser draws back faces. This is round 1's M5 again, now hidden by the instrument. The doc claims it is fixed.
2. **Open, the mouth reads as a box with striped curtains:**
   - The window at the front is a rectangle with flat vertical end walls and a flat back.
   - The tongue is a flat slab that the window walls crop into a pink card.
   - On the game meshes, the stretched cheek skin shades as zebra stripes. At 6–12°, 17–29% of its area has shading normals more than 60° off its faces.

Three known defects are listed in the doc: the hen's closed beak, the hen's tongue, and short game-mesh crowns. They remain, and the hen's closed beak is a regression.

## Method
- Read `SPEAKING-HEADS.md` and every module it names, plus round 1's report.
- Ran `node --test tests/speaking-heads.test.mjs`: 16 pass, 3 todo, 56 s (`test-run.txt`).
- Ran `fit-lips.mjs --check` (passes) and `registration.mjs` for the goat, pig-director, dog and rabbit (`shots/reg-*.png`).
- **Real renderer.** Drove `speaking-heads.html` on :4499 with Playwright/Edge. `shoot.mjs` calls the page's own `speakingHeads.capture` (same scene, materials, MSAA) at any angle, jaw, scale and level, in grey, paint, wire or weights. It can also use a magenta background or hide parts. `viewer-shot.mjs` screenshots the viewer itself.
- **The in-tree instruments** (`tools/speaking-heads/measure.mjs`) were rerun on both meshes (`measure-all.mjs` → `meas-all.log`). I reproduce the doc's acceptance table with them.
- **My own checks** (scripts in the folder):

| Script | What it measures |
|---|---|
| `closed-fine.mjs`, `closed-holes.mjs` | Closed mouth at 25 px/mm, back faces culled as the renderer does; teeth/tongue seen and background through the closed head, 63 directions |
| `renderer-closed.mjs` | The same in the real renderer: teeth and tongue drawn pure green, magenta background, 84 views, at 1.15, 4 and 10 px/mm |
| `why-teeth.mjs` | What the tree's (unculled) instrument draws where the culled render sees teeth |
| `crease-band.mjs` | Thickness of the closed crease in geometry and in paint |
| `see-cull.mjs` | The see-through test's views, culled |
| `parts-x.mjs` | Teeth/tongue crossing skin, by skin class |
| `selfx.mjs` | Where the skin crosses itself |
| `normals.mjs` | Shading normals against faces on the open cheeks |
| `jawbins.mjs` | Round 1's coarse jaw-line bins, located |
| `side-check.mjs` | The materials' `side` in the live page |
| `raw-preview.mjs` | Raw 2.5 mm sculpt render (the repo's `preview.mjs` crashes) |

## Round 1's findings

| # | Status | Evidence |
|---|---|---|
| M1 see-through hole | **Fixed** | Cheeks close the sides. With the tree's instrument (wall at the window ends), ≤2.8 mm² at 6/12/24° from profile to 60° off, both meshes (`meas-all.log`). Culled, the test's views give ≤1.9 mm² except the cow game mesh (5.4 mm², 24°) and the donkey authoring mesh (5.4 mm², 6°) (`see-cull.log`). Round 1's wall at the middle still gives 0–6.2 cm² in exact profile (bull authoring, 24°). That is the mouth's front opening seen edge on, not a hole (`shots/profile-front-all.png`, `shots/magenta-*-10k.png`). |
| M2 jaw a flap | **Fixed** | Weight ≥0.97 in every profile jaw-line column on all 11 muzzles. Round 1's coarse bins under 0.9 are cheek vertices 14–127 mm above the line, lip-face vertices, or throat and double-chin vertices behind or below the mandible (skunk, pig-director) (`jawbins.log`). The jaws open as jaws (`shots/weights-*.png`, `shots/jaw-side-*.png`). Pig-director caveat under SHOULD-FIX S7. |
| M3 bull sausage, changed silhouette | **Fixed** | `shots/grey-bull-author.png` column 2; outer skin ≤1.5 mm from the approved field (test). |
| M4 seal collapsing the mouth | **Fixed** | No seal. Tongue from the front at 12° is 45–66% (authoring), 43–70% (game). Authoring incisor crowns ≥4.0 mm. |
| M5 closed mouths show teeth / stand outside | **Partly** | Nothing stands outside the skin at 0/6/12/24° (`meas-all.log`). But in the renderer, teeth and tongue show through the closed crease on 11 of 12 heads. See MUST-FIX 1. |
| M6 floating teeth | **Fixed** | Every tooth has vertices in the skin at 0/6/12/24°, both meshes. |
| M7 pig-director frill | **Mostly fixed** | Closed, the frill is gone. Open, the lip edges are still sawtoothed on the pig-foreman (authoring), pig-director and bull (game) (S4). |
| M8 pillars, folds at 24° | **Partly** | The geometric pillars are gone. The cheeks shade as stripes on the game meshes (MUST-FIX 2). The outer skin still crosses itself at 24° on the hen, rabbit, skunk and sheep (S5). |
| S1 teeth as dice | **Fixed** | Lathed spade incisors, pointed canines, dental pad. The game mesh's 30-triangle teeth read as teeth at portrait scale (`shots/teeth-*.png`). |
| S2 chomping | **Fixed** | `SPEECH_OPEN` 4.5–8.6° gives about 2.5 cm at the lips. |
| S3 teeth through each other | **Fixed** | No tooth–tooth or tongue–tooth crossings at 0–24° on either mesh (`parts-x.log`). New: teeth through the lips' inner faces (S3 below). |
| S4 game mesh worse | **Partly** | Game-mesh crowns are 1.4–3.9 mm on six heads (known, todo). |
| S5 hen | **Not fixed / regressed** | Closed beak now leaks (it was closed in round 1). Tongue is 0% from the front and above. |
| S6 pig-director registration | **Fixed** | 1.8 mm rms; `shots/reg-pig-director.png`. |
| S7 tests blind | **Partly** | Instruments are in the tree, and the jaw-line and lip-fit tests have negative controls. But the closed-visibility check does not cull back faces, so it misses MUST-FIX 1. Nothing tests 24°, and lip faces are excluded from the poke check. |
| S8 closed-difference crop | **Replaced** | Replaced by the outer-skin test. `checks.json` still prints the diluted crop. |
| Nits | **Mostly fixed** | Doc status: fixed. Tilt slider: added. Rabbit slit tears: now a full-width seam (MUST-FIX 1). Hen z-fighting: approved, pre-existing. |

## MUST-FIX (blocks painting)

### 1. Closed, the crease leaks: teeth, tongue, gum and background show through (11 of 12 heads, both meshes)

**The cause.**
- At rest, the lips' faces and the cheek skin are folded flat onto the cut.
- After the reductions, the overlap (±0.5 mm game, ±0.2 mm authoring) and the edge-row snap, many of these near-degenerate triangles end up inside-out.
- The viewer draws the speaking skin FrontSide in both grey and paint (`side-check.log`: `side: 0` for skin, teeth and tongue). The inside-out triangles are culled, and the crease has holes.
- The tree's rasteriser (`measure.mjs raster`) draws back faces too, so those triangles hide the holes from `closedVisibility`.
- `why-teeth.mjs` checks this directly. At every pixel where a culled render sees a tooth, the unculled instrument shows a back-facing skin triangle: 100% of 12,801 px on the pig-foreman game mesh from straight in front (`why-teeth.log`, `shots/why-pig-foreman-10k-az0-el0.png`). In that image, white is tooth and black is background through the closed mouth.

**Measured.** Worst view; the bar from round 1 is ≤0.5 mm² from any direction.

| Head | Real renderer: partly-green px at the viewer's close-up scale (1150 px/unit), author / game | Real renderer, 10 px/mm (mm²), author / game | Culled raster, 25 px/mm: teeth+tongue (mm²), author / game | Background through the closed head (mm²), author / game |
|---|---:|---:|---:|---:|
| pig-foreman | 44 / 60 | 16.4 / 23.9 | 13.4 / 20.5 | 3.0 / 11.4 |
| donkey | 42 / 40 | 12.5 / 12.6 | 8.0 / 9.9 | 6.5 / 7.5 |
| hen | 27 / 24 | 10.7 / 6.9 | 9.0 / 4.9 | 3.3 / 3.5 |
| bull | 33 / 22 | 10.2 / 6.1 | 7.6 / 4.7 | 1.0 / 1.4 |
| horse | 15 / 14 | 4.7 / 5.4 | 3.5 / 4.3 | 1.1 / 2.3 |
| dog | 14 / 14 | 4.0 / 4.6 | 3.2 / 3.7 | 1.4 / 2.3 |
| sheep | 9 / 8 | 4.2 / 3.0 | 3.5 / 2.3 | 2.4 / 1.9 |
| pig-director | 9 / 10 | 2.9 / 3.0 | 2.2 / 2.3 | 0.9 / 2.3 |
| goat | 8 / 8 | 2.6 / 2.4 | 2.2 / 2.0 | 2.1 / 2.4 |
| cow | 8 / 9 | 2.2 / 2.7 | 1.8 / 2.1 | 5.2 / 4.0 |
| skunk | 3 / 4 | 0.9 / 0.8 | 0.7 / 0.7 | 0.7 / 1.3 |
| rabbit | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

- The tree's instrument reports 0.0 for all but the bull game mesh (0.06), the skunk game mesh (0.31) and the hen (5.4/3.6). Unculled, my raster also gives 0 for the horse (`closed-fine-nocull-horse_hen.json`).
- Data: `renderer-closed-*.json`, `closed-fine-cull.log`, `closed-holes.log`.

**Seen in the real renderer.**
- `shots/crop-pf-left.png` vs `shots/crop-pf-right.png`: the viewer's own close-up screenshot, straight in front, painted, game mesh, enlarged 4×. The approved mouth is a clean painted shadow; the speaking one is a dotted seam of light and dark specks.
- `shots/closeup-closed-A.png` and `shots/closeup-closed-B.png`: all 12 at close-up scale, enlarged 3×. Columns are approved and speaking, painted then grey. Every muzzle's grey crease is a broken light seam; the approved head has none.
- `shots/closedteeth-pig-foreman-author.png` (teeth in the crease; `-hidden` shows the gum slivers with the teeth hidden), `shots/closedteeth-donkey-10k.png`, `shots/closedzoom-horse-10k.png`.
- The skunk's and donkey's seams are jagged, with blocky chips: `shots/closeup-closed-skunk-x3.png`, `shots/closeup-closed-donkey-x3.png`.

**Fix.**
- **Make the instruments draw what the renderer draws.** Cull back faces in `measure.mjs raster`. That covers `closedVisibility`, and also `seeThrough` and `tongueVisible`, which are optimistic for the same reason. Hold the bar at ≥10 px/mm, not 4.
- **Make the closed crease watertight and front-facing at rest:**
  - give each lip's crease row the same rest positions (one shared polyline);
  - drop the cross-over overlap;
  - fold the faces inward (recessed, never across the other lip) or collapse them to exactly zero area;
  - or add a closing strip that is front-facing closed and collapses open.
- **Re-check in the real renderer.** Pure-green teeth and a magenta background, from 120 directions, both meshes: 0 px of mouth parts and 0 px of background (`renderer-closed.mjs` does this).

### 2. Open, the mouth reads as a box with striped curtains (all muzzles; stripes worst on the game meshes)
- **The window is a box.**
  - Its ends are flat vertical walls (`windowEnd` 2 mm rounds only the corners), and the cavity's back is a flat plane.
  - From the front at 12°, every head shows a rectangular slot. At 24° it is a tall "door" (`shots/grey-*-author.png` rows 3–4; `shots/cavity-horse.png` and `shots/cavity-dog.png` with the tongue hidden show the flat back).
  - **In the user's own view** (goat, 14°, three-quarter, painted), the far end of the opening is now the window's flat end wall, a vertical panel with a straight edge, not a mouth corner (`shots/goat-14-three-zoom.png`, `shots/viewer-goat-10k-three-14-close-painted.png`).
- **The tongue is a card.**
  - Its top is a flat ramp, and it is wider than the window (dog 22 mm half-width against a 15 mm window). The window walls crop it into a rectangle with straight vertical sides.
  - Painted, every head's open mouth from the front is a dark band around a pink rectangle (`shots/speech-*-10k.png` row 3; `shots/paint-pig-director-10k.png`).
- **The cheeks shade as stripes (game meshes).**
  - The stretched cheek skin keeps the dense sculpt's vertex normals through the reduction.
  - At 6–12°, the share of cheek and lip-face area whose shading normals are more than 60° off their own faces:

    | Mesh | Game | Authoring |
    |---|---:|---:|
    | bull | 29% | 3% |
    | dog | 23% | 3% |
    | horse | 19% | 1% |
    | pig-foreman | 17% | – |
    | goat | 10% | – |
    | skunk | 9% | – |

    (`normals.log`; up to 14% even face away.)
  - In grey this reads as black-and-white zebra curtains (`shots/grey-bull-10k.png` columns 3–5, `shots/speech-bull-10k.png`, `shots/grey-pig-foreman-10k.png`). Painted, it shows as vertical stripes in the red (`shots/paint-skunk-10k.png`, 14–24°).
  - The checklist names boxes and curtains. Round 1's goat "letterbox slot" is now every head's front view.
- **Fix.**
  - Round the window's ends with a radius on the order of the opening's height, so the opening is an oval or a rounded "D" that blends into the cheek, not a wall. Round the cavity's back into a throat.
  - Make the tongue narrower than the window, with a domed cross-section and a rounded tip, so its sides read inside the opening.
  - After the game reduction, recompute the mouth part's normals from the reduced geometry (posed open, about 6°), or at least re-average them over the reduced triangles.

## SHOULD-FIX
- **S1. Hen.**
  - The closed beak leaks tongue through a slit: renderer 10.7/6.9 mm²; the doc's unculled 5.4/3.6. It was closed in round 1.
  - Her tongue is 0% from the front and from 30° above at 12° (27–57% from three-quarter).
  - From the front at 14–24°, the lower mandible's tip reads as a square post (`shots/hen-author-grey.png` row 3).
  - The outer skin crosses itself 14 (authoring) and 6 (game) times at 24° (`selfx.log`).
  - Visually her closed gape is close to the approved head's own jaggy gape (`shots/hen-closed-side.png`). But she is the one character with a speaking use (the intro radio room), so fix her with MUST-FIX 1.
- **S2. Game-mesh crowns at 12° (known, todo).**
  - Pig-director: all six lower incisors 1.4–1.8 mm, so they read as specks (`shots/paint-pig-director-10k.png`, front 14°).
  - Bull 2.4; skunk incisors 2.9 and upper canine 2.5; cow 3.4; goat 3.5; pig-foreman 3.9 (canine 3.7); dog canines 3.6–3.9.
- **S3. Teeth pass through the lips' inner faces on the game meshes.**
  - 1–4 lip-face/cheek triangles crossed at 6–24°: bull, cow, donkey, skunk, pig-director, pig-foreman, dog, horse (`parts-x.log`).
  - The bull's, cow's and donkey's authoring meshes do it too (3–9 triangles).
  - `partsAgainstSkin` cannot see it: it counts pokes only next to outer skin.
- **S4. Open lip edges are ragged.**
  - A sawtooth fringe runs along the lower lip at 6–12° on the pig-foreman (authoring: `shots/lipfront-pig-foreman-author.png` row 3; `shots/grey-pig-foreman-author.png`), the pig-director (`shots/grey-pig-director-author.png` rows 3–4) and the bull (game, below: `shots/grey-bull-10k.png`).
  - A thin white "tick" sliver sticks forward at the lower lip's front on the pig-director, pig-foreman, dog and skunk in profile at 6–24° (`shots/jaw-side-pig-director.png` row 1, `shots/grey-dog-author.png` side 12°).
- **S5. 24° is untested, and folds remain.**
  - Outer skin crossings at 24°: hen 14/6, rabbit 4/4 (the upper lip's middle), skunk game 4, sheep game 1 (`selfx.log`, `meas-all.log`).
  - The test and the build's crossing check stop at 12°.
- **S6. The paint's crease shadow bleeds onto the outer skin.**
  - The closed darkening uses the interpolated `fold` attribute, and the crease row has fold = 1. So it covers about 64% of every outer triangle touching the crease.
  - Closed, the painted mouth line becomes a 1–4 mm jagged dark band (`band-paint.log`): front-view p90 is 1.8–4.4 mm; from below, p90 reaches 7 mm.
  - The geometric crease is far thinner: median 0.04–0.8 mm in front and three-quarter views (`band-geom.log`).
  - On the skunk it draws a dark line where the approved paint has a pale lip edge (`shots/closed-skunk-10k.png`).
  - This is a stage-4 shader matter, but it breaks "closed it is the approved head".
- **S7. The pig-director's jaw is only the small chin.**
  - At 12–24° the chin swings out over the static double chin, leaving a step in profile (`shots/jaw-side-pig-director.png`).
  - The jaw-line test covers only 3 cm of him (60 columns against a floor of 50) and 6 cm of the pig-foreman.

## NITS
- **N1.** `tools/speaking-heads/preview.mjs` crashes on line 15 (`S.parts` is undefined; `sculptSpeaking` returns `teeth` and `tongue` layouts). The doc's Reproduce section and the review brief both point to it (`preview-crash.log`). `raw-preview.mjs` shows the fix.
- **N2.** `checks.json` still reports the cutscene-crop "closed difference" that round 1 showed cannot discriminate.
- **N3.** The rabbit's painted trace stops at |z| 6 cm (`traceMouth` half = .06). Her crease runs to 7.25 cm and her parting to 6.5 cm, so the ends are extrapolated.
- **N4.** The see-through test's wall moved from the lips' middle to the window ends. It is documented, and I accept it (see M1). Say in the doc's table header that the bar changed.
- **N5.** The goat's and donkey's carved "extra nostril" is still on both the approved and speaking heads, pending the user's call. That is reasonable. Note that the user wrote "sheep".

## Per character

| Character | Grade | Main problems (closed: renderer, authoring/game) |
|---|---|---|
| horse | not ready | Closed: 15/14 px at close-up, 4.7/5.4 mm² of incisor through the crease (`shots/closedzoom-horse-10k.png`). Open: game cheeks stripe (19% of normals >60° off), box window, card tongue. Crowns 6.4/4.8 mm; tongue 52/54%. |
| goat | not ready | Closed 2.6/2.4 mm². User's view: the near corner is now reached, but the far end is a flat wall panel (`shots/goat-14-three-zoom.png`). Painted crease band p90 3.6–4.2 mm. Game crown 3.5. Carved side nostril pending the user. |
| bull | not ready | Closed 10.2/6.1 mm² (33 px at close-up). Worst cheek stripes (29%, `shots/grey-bull-10k.png`). Lower teeth through 4 lip-face triangles (game). Game crown 2.4. Jaw and silhouette fixed. |
| cow | not ready | Closed 2.2/2.7 mm²; background 5.2/4.0 mm² from below. Culled see-through 5.4 mm² at 24° (game). Crowns 4.0/3.4. |
| donkey | not ready | Closed 12.5/12.6 mm² (42/40 px), background 6.5/7.5 mm². Jagged grey seam (`shots/closeup-closed-donkey-x3.png`). Culled see-through 5.4 mm² at 6° (authoring). Carved side nostril pending. |
| sheep | not ready | Closed 4.2/3.0 mm². One outer crossing at 24° (game). Otherwise among the cleanest open. |
| skunk | not ready | Closed 0.9/0.8 mm² (marginal). Jagged, chipped grey seam; painted crease adds a dark line where the approved paint is pale (`shots/closed-skunk-10k.png`). Game crowns 2.9 (incisor) and 2.5 (canine). 4 outer crossings at 24° (game). |
| pig-foreman | not ready (worst closed) | Closed 16.4/23.9 mm² of teeth from straight in front; 11.4 mm² of background (game, front and above); visible at the viewer's close-up (`shots/crop-pf-right.png`). Sawtooth lower lip open (authoring). Cheek stripes (17%). |
| pig-director | not ready | Closed 2.9/3.0 mm². Game lower incisors 1.4–1.8 mm. Chin swings over the double chin (step at 12–24°). Lower-lip tick sliver. Registration fixed (S6 of round 1). |
| rabbit | closest | Only head with a clean closed mouth in the renderer (0 px). Grey seam runs the full face width at close-up. 4 outer crossings at the upper lip's middle at 24°. Box window and card tongue like the others. |
| dog | not ready | Closed 4.0/4.6 mm². Game cheek stripes (23%). Game canine crowns 3.6. One tooth through a lip face (game). |
| hen | not ready | Known slit: tongue through the closed beak 10.7/6.9 mm². Tongue 0% from the front and above. 14/6 outer crossings at 24°. Square-post lower mandible tip from the front at 14–24°. |

## False or overstated claims (doc and tests)
1. **"M5 … The lips' faces fold onto the cut exactly … Measured below."** The acceptance table's "Teeth/tongue seen closed (mm²)" column is 0.0 for 10 heads, and the test says "closed, a mouth shows nothing of its inside: no tooth or tongue from any direction". All three are false for what the viewer draws: 0.8–23.9 mm² on 10 of 11 muzzles plus the hen, and background too. The instrument draws back faces; the renderer culls them.
2. **§2: "(else the closed lips keep a crack: the horse's showed its incisors)".** The horse still shows its incisors closed: 15 px at close-up, 4.7–5.4 mm² at 10 px/mm (`shots/closedzoom-horse-10k.png`).
3. **§3: "The authoring mesh keeps the lips' edge rows … so its closed lips meet" and "each face sits a little past the crease … (hidden inside the closed mouth)".** The authoring meshes leak too (pig-foreman 16.4 mm²). The overlapping faces are inside-out from outside, so they are culled, not hidden.
4. **§4: "Closed, they lie folded in the crease, where no view of the registered paint sees them".** The crease shadow is drawn over the adjacent outer triangles as a 1–4 mm jagged band (S6).
5. **"S7 … the tests hold their acceptance numbers".** Partly. The closed-visibility check cannot see culled holes. Nothing checks 24°, which round 1 asked for ("no visible folds at 24°"). Lip faces are left out of the poke check.
6. **"M8 … the reductions lock where the outer skin would fold through itself".** Only at 0/6/12°. Outer crossings remain at 24° on four heads.
7. **Reproduce: `node tools/speaking-heads/preview.mjs cow out.png --weights`.** It crashes.

## Verified true
- **Copies and inputs:**
  - The copied sculpts are the approved heads (test).
  - The source hash matches.
  - Every part is edge-manifold.
  - `fit-lips --check` passes, with residuals as in the doc's table.
- **Triangle tables** match the JSON exactly, e.g. horse 10,136 / 3,554 / 11,356. Ratios are 2.65–3.15, the hen 1.89.
- **The doc's own instrument numbers reproduce:**
  - see-through (window wall) ≤2.8 mm²;
  - authoring crowns ≥4.0 mm;
  - tongue at 12° 43–70% from the front;
  - no outer crossing at 6/12°;
  - jaw line 0 columns under 0.9.
- **Teeth and tongue:**
  - All teeth rooted at 0/6/12/24°; none through the outer skin; no tooth–tooth or tongue–tooth crossings.
  - Upper teeth ride the head, lower teeth and tongue the jaw.
  - The beard follows the jaw.
- **Speech:** `SPEECH_OPEN` is 2.5 cm divided by the lever, 4.5–8.6°.
- **Closed shape:** the outer skin is within 1.5 mm of the approved surface. Away from the crease, the closed silhouettes match the approved heads at every scale I looked at.
