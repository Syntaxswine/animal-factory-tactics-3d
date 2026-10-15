# Speaking heads, grey sculpt: independent review, round 4 of 5

Reviewed: worktree `animal-factory-tactics-3d-heads`, branch `art/speaking-heads`, commit 1f24219 (pushed). Read-only: no repo file changed, no build run; `git status` was clean before and after. All evidence is in
`C:/Users/baals/AppData/Local/Temp/claude/C--Users-baals-Local-Storage-AI/50314748-b796-400a-ae0b-6e785e35a369/scratchpad/review-heads-4/`; paths below are relative to it.

Conventions. Viewer captures (`speakingHeads.capture`): azimuth 0 = from the character's left (+z), 90 = front, 180 = right; elevation + = from above. `measure.mjs holesThrough` uses the opposite sign (its +90 is the rear): viewer az = -holesThrough az. "Portrait" = the viewer's 620 px/unit, "close" = 1150.

## Score: 7/10. Does not pass the 9/10 gate. Do not start painting yet.

**Verdict.** Round 4 did what the user drew, and fixed both of round 3's blockers.
- **The user's wedge, open at its sides.** No head has a lining. In exact profile the opening between the lips is seen through on every mammal (76-93% of it at 24°, both sides); from three-quarter, front, below and the game's camera the roof and floor read crimson and nothing stands at the sides (`shots/open-*-A.png`, `shots/mag-horse-author.png`). The bull's torn corner shards are gone (`shots/corner-bull-10k.png` against round 3's `review-heads-3/shots/corner-bull-10k.png`).
- **The hole instrument is real now.** `holesThrough` looks from both sides, throws when it frames nothing, and agrees with the real renderer: I painted back faces red in the viewer and got the same slivers within antialiasing (cow game mesh 8.63 vs 8.38 mm²). No back-face-first pixel shows the background anywhere: 0.00 mm² on 24 meshes, 194 views each. The falsifiers work: the punched cheek reads 150.4 mm², the flipped floor 79.4 mm², and one flipped cheek triangle (my own mutation) 34-90 mm².
- **Closed leaks are gone.** In the real renderer over the whole crease (171 views, 10 px/mm, both meshes), no mammal shows over 0.12 mm² of tooth or 0.03 mm² of background.
- **The mesher diagnosis is right.** The shared mesher breaks surface orientation 137-834 times per head near the lips; the copy breaks it 0 times (the bull 3).
- **The doc's numbers are honest.** Both tables reproduce byte for byte. Suite: 30 tests, 22 pass, 0 fail, 8 todo, 188 s.

**One thing blocks painting.**
- The lips' outer skin shades with streaks the approved heads don't have.
  - Closed: whiskers and glints along the crease.
  - Open: the same fringe along the lips' edges.
- It shows in grey at portrait scale (on the builder's own `grey/cow.png`) and in the game's lit paint at portrait and close scale.
- The cause is the outer vertices' normals near the lips. A one-line-of-logic normal change removes most of it (MUST-FIX 1).
- The doc says this was fixed (S2) or is under a pixel when painted (S5).

**Also open (should-fix).**
- The box and card tongue from the front, unchanged by intent.
- A geometric sawtooth along the authoring meshes' rims, worst on the pig director.
- The hen's game beak regressed: 9.21 mm² of tongue closed (round 3: 2.31), and a new fin at its root.
- The open bars look from too few views: slivers up to 17.75 mm² sit below eye level and in the 0-2° fade, though none shows the background.
- The open-sides bar is loose: a flap over the back half of the lip line passes it (51-59% seen through) on all ten mammals where such a flap can be cut; the rabbit's mouth runs across the front of her face.

## Method

- **Read.** `SPEAKING-HEADS.md` in full, rounds 1-3, every source named in the brief, the commit diff against fa3132a, and the builder's build and review logs (`scratchpad/r4/build-all-6.log`, `review-all.log`).
- **Tests.** `node --test tests/speaking-heads.test.mjs`: 30 tests, 22 pass, 0 fail, 8 todo, 188 s, exit 0 (`test-run.txt`).
- **Tables.** `tools/tables5.mjs` (the builder's, copied) reproduces both of the doc's tables identically (`logs/tables5-repro.md`, diffed against the doc in `logs/doc-*.md`).
- **Server.** I checked by md5 that :4499 serves this worktree's viewer, runtime and head JSON.
- **Real renderer.** Playwright and Edge against the served viewer:

  | Script | What it does |
  |---|---|
  | `tools/shoot4.mjs` | The builder's shooter, copied. Sheets `shots/open-*-{A,B}.png` (2.5 px/mm), `shots/portrait-*.png` (620 px/unit), `shots/mag-*.png` (magenta, head alone), corners, zooms with the debug columns |
  | `tools/backprobe.mjs` | The renderer's own holesThrough: every head material double-sided, back faces pure red, magenta background. It counts back-face-first pixels (largest 4-connected), and whether the normal render shows background there. View sets: the test's (`bp-all/`), plus 4 heights × 24 headings and 12°/24° all round, plus the closed-shape fade (`bp-fade/`) |
  | `tools/r3-closed-full.mjs` | Round 3's whole-crease closed check, 171 views, 10 px/mm. The approved hen beak is the control (`logs/closed-full-grey.log`) |
  | `tools/litpaint.mjs` | Approved and speaking heads with the game's lit paint (`createAnimalPaint(..., sceneLighting=true)`, as `battle-renderer.js` paints units) (`shots/lit-*.png`) |
  | `tools/views.mjs` | Single views with enclosed background marked yellow (`shots/enclosed-worst.png`) |

- **In-tree instruments, run beyond the tests' views** (read-only imports):

  | Script | What it measures |
  |---|---|
  | `known-check.mjs` | KNOWN re-measured; the falsifiers; holes during the 0-2° fade; round 3 against round 4 triangle counts |
  | `below-holes.mjs` | holesThrough below eye level and all round |
  | `opening-mask.mjs` | What covers the opening in profile |
  | `flap-mutant.mjs` | A half-length flap against the open-sides bar |
  | `r3-holes.mjs` | Round 4's holesThrough on round 3's meshes (`git show fa3132a`) |

- **The mesher.** `mesher-compare.mjs` meshes the round-4 expanded field with both meshers on the same grid. The triangles align one for one, so only the winding differs. It counts orientation breaks and flips by side.
- **Shading near the crease:**
  - `outer-normals.mjs`: written normals against the approved field's gradient.
  - `normal-jumps.mjs`: normal jumps between neighbouring vertices; also run on round 3's meshes.
  - `crease-shading*.mjs`, `crease-folds*.mjs`, `crease-depth.mjs`.
- **Mutations** (copies in `mut/`, served to the viewer with `HEADS_DIR`):
  - `mut/rim`: the folding rim vertices' normals.
  - `mut/rim2`: the outer normals near the crease set to mesh normals.
  - `mut/rim3`: both.
- I opened every image cited here.

## Round 3's findings, graded

| Round 3 | Round 4's answer | Grade | Evidence |
|---|---|---|---|
| **MUST-FIX 1**, see-through at eye level | The user's redesign: the sides are open by design. Holes are measured as back faces seen first | **Fixed (by redesign)** | 76-93% of the opening seen through in profile at 24° (`logs/known-check-known-sides-fade.log`); no back face seen first shows background, 24 meshes × 194 views (`logs/backprobe-all.log`); `shots/mag-horse-author.png` |
| **MUST-FIX 2**, instrument vacuous and one-sided | Each lip has its own reach; it throws unless framed; both sides every 15°; `holesThrough` | **Fixed**, with coverage gaps (S4) | Renderer agreement table below; falsifiers (`logs/known-check-falsifiers-budget.log`); on round 3's meshes it reads 11.9-83 mm² where round 4's read ≤2.69 (`logs/r3-holes.log`) |
| S1, the box | Not changed (stated) | **Not fixed (held by the user's guidance)** | Front rows of `shots/open-*-A.png`; `shots/mag-horse-author.png` front 12/24 |
| S2, ragged edges and combs | "Three causes, each fixed" | **Partly fixed** | The bull's shards and round 3's red sawteeth and background slivers along the lips are gone (`shots/corner-bull-10k.png`, `shots/corner-horse-author.png` against round 3's). The streak fringe and a rim sawtooth remain (MUST-FIX 1, S2 here) |
| S3, closed | Whole-crease framing, background counted, build guard | **Fixed** | `logs/closed-full-grey.log`: mammals ≤0.12 mm² tooth (sheep game, az 120), ≤0.03 background |
| S4, stripe test held no head | Holds 23 of 24 | **Fixed in scope**; its selection misses the rims (false claim 5) | `test-run.txt`; skunk game 9.6% |
| S5, closed crease in grey | Not changed; "painted at portrait scale it is under a pixel" | **Not fixed; visible at portrait** (MUST-FIX 1) | `shots/portrait-cow-10k.png`, the builder's `grey/cow.png` row 4 col 2, `shots/lit-pig-director-10k-620.png` |
| S6, the hen | Tongue below the gape; game beak coarser | **Partly; game beak regressed** | Authoring 0.17 mm² of tongue closed (renderer). Game beak 9.21 mm² (round 3: 2.31). A fin at the left root of the game beak, absent in round 3's (`shots/zoom-hen-root.png` against `shots/r3-zoom-hen-root.png`) |
| S7, game crowns | Met, ≥4.1 mm | **Fixed** | Test passes. The skunk's lower incisors were lengthened 3.7 → 4.6 mm to get there (`mouths.mjs` diff; the doc doesn't say) |
| N1, todo texts | Re-measured | **Fixed** | Every todo text matches my measurements |
| N2, 350-750 triangles | Gone | **Fixed** | Game heads 78-872 lighter than round 3, the goat +4 (`logs/known-check-falsifiers-budget.log`) |
| N3, "at eye level" in KNOWN | No closed case known | **Fixed** | |
| N4, the pig director's walls | No lining anywhere | **Fixed** | `mouths.mjs` `inner` removed |
| N5, `mouthShading` comment | Rewritten | **Fixed** | |
| N6, the horse game nostril | Not addressed (stated) | **Not fixed (stated)** | |
| False claims 1-11 | Answered one by one | **Fixed**, except that the new instruments carry new overstatements | See below |

**Renderer against instrument, largest single sliver, mm²:**

| Mesh | `holesThrough`, profile / game camera (the test's views) | Real renderer, same views | Renderer, other views (worst; viewer az) | `holesThrough`, 0.25-2° fade | Background behind any of them |
|---|---|---|---|---|---|
| horse authoring / game | 0.25 / 2.38; 5.00 / 2.06 | 0.19 / 1.69; 3.94 / 1.94 | 3.63 (24°, az −120); 4.81 (24°, az 150) | 1.88; 1.63 | 0 |
| goat | 0 / 0.38; 3.75 / 0.88 | 0 / 0; 3.63 / 0.56 | 0.13; 3.44 | 0.44; 0.81 | 0 |
| bull | 0.44 / 2.69; 1.63 / 1.44 | 0.06 / 2.50; 1.63 / 1.25 | 5.44 (speech, az 45, el −15); 2.56 | 1.44; 1.25 | 0 |
| cow | 0.50 / 2.94; 6.06 / 8.63 | 0.31 / 2.63; 5.69 / 8.38 | 2.81; **12.63** (24°, front) | 2.50; **6.94** | 0 |
| donkey | 0.25 / 1.06; 0.69 / 1.25 | 0.13 / 0.81; 0.44 / 1.13 | 1.00; 2.50 | 1.00; 0.81 | 0 |
| sheep | 1.75 / 2.63; 0.06 / 0.19 | 1.63 / 2.19; 0 / 0.25 | 2.88; 0.19 | 2.06; **12.50** (0.25°, front, from above) | 0 |
| skunk | 0.69 / 1.13; 3.38 / 1.88 | 0.75 / 0.81; 2.63 / 1.63 | **16.44** (speech, az 45, el −30); 2.81 | 1.25; 3.81 | 0 |
| pig foreman | 0.19 / 2.69; 0.06 / 0.06 | 0 / 2.19; 0 / 0 | **7.88** (24°, az 165); 0.31 | 2.44; 0.94 | 0 |
| pig director | 0.81 / 2.38; 0.75 / 2.81 | 0.50 / 1.94; 0.69 / 2.13 | 3.06; 2.25 | 1.81; 2.94 | 0 |
| rabbit | 0.31 / 0.19; 0.63 / 0.38 | 0.19 / 0.06; 0.25 / 0.31 | 0.19; 0.44 | 0.19; 1.06 | 0 |
| dog | 0.25 / 1.38; 9.38 / 0.50 | 0.06 / 0.75; 6.31 / 0.19 | 1.31; 6.88 (24°, az 30) | 1.31; 3.13 | 0 |
| hen | 0.69 / 0.06; 0.94 / 0.06 | 0.06 / 0; 0.44 / 0 | 0.06; 1.25 | 0.19; 0.50 | 0 |

Sources: `logs/tables5-repro.err`, `logs/backprobe-all.log`, `logs/known-check-known-sides-fade.log`, `logs/below-holes.log`. The in-tree instrument outside the test's views:
- below eye level at speech: skunk authoring **17.75**, cow game 7.94, bull authoring 7.38;
- at eye level all round at 12° and 24°: cow game **13.38**, dog game 10.06, pig foreman authoring 8.81, skunk authoring 7.38, horse game 5.63, hen game 3.06.

## MUST-FIX (blocks painting)

### 1. The lips' outer skin shades with streaks: closed, the crease shows whiskers and glints the approved head lacks; open, the lips' edges carry the same fringe

**Seen.**
- **Pig director, both meshes.** A fringe of vertical whisker strokes along the closed mouth and along both open lips.
  - In grey at portrait scale: `shots/portrait-pig-director-author.png`, closed column, three-quarter, front and below rows.
  - In the game's lit paint at portrait and close scale: `shots/lit-pig-director-10k-620.png`, `shots/lit-pig-director-author-1150.png`, closed column against the approved column.
  - This is round 3's "fringe of white spikes".
- **Cow.** Closed, a white glint line along the crease at portrait scale in grey. From below it reads as a row of teeth showing through a shut mouth (`shots/portrait-cow-10k.png` col 2, front and below rows). The builder's own evidence sheet shows it too (`docs/tactics/hybrid-review/speaking-heads/grey/cow.png`, row 4 col 2).
- **Donkey, game mesh.** Closed, white "fangs" 5-10 mm long at the mouth's corners:
  - grey at 2.5 and 8 px/mm: `shots/open-donkey-10k-A.png` col 2, `shots/zoom-donkey-10k-closed.png`;
  - lit paint at 620 and 1500 px/unit: `shots/lit-donkey-10k-620.png`, `shots/lit-donkey-10k-1500.png`.
- **Open.** The horse's upper lip near the corner shows a fan of streaks rising from the edge (`shots/corner-horse-author.png`). The pig director's rises up the face (`shots/corner-pig-director-author.png`).
- **The viewer's default paint is unlit**, so it hides all of this. The closed cow there reads as the approved head (`shots/paint-closed-cow-10k-1150.png`, painted against grey columns). That is why the doc's "painted at portrait scale it is under a pixel" looks true in the viewer and is false in grey and in the game's lit paint.

**Cause.**
- The outer skin's normals near the lips are the expanded field's central-difference gradient at the lips' sharp edge (`build-speaking-heads.mjs prepare`, `normal=N.slice()`). They are not the approved surface's.
- `openNormals` replaces only the mouth's vertices (fold, or inside ≥ .5).
- Outer vertices within 15 mm of a folding vertex whose written normal is over 45° off the approved field's own gradient (`logs/outer-normals.log`; 30-60 mm away, the control, 0-2 per mesh):

  | Head | Authoring / game | Over 90° |
  |---|---|---|
  | pig director | 105 / 90 | 18 / 15 |
  | goat | 48 / 47 | |
  | cow | 42 / 41 | 6 / 6 |
  | sheep | 33 / 33 | |
  | bull | 31 / 30 | 3 / 3 |
  | pig foreman | 28 / 28 | |
  | dog | 22 / 19 | |
  | horse | 20 / 19 | |
  | skunk | 19 / 19 | |
  | rabbit | 10 / 10 | |

- The donkey is left out of that check because of its neck revision. Its outer-outer normal jumps near the crease: 274 edges over 45° on the game mesh, against 0 on the approved skull (`logs/normal-jumps.log`).
- Each such vertex drags a shading gradient across every long reduced triangle around it: a streak.
- Round 3's meshes had the same jumps (`logs/normal-jumps-r3.log`), so this is round 3's S2/S5 left in place, not new.

**Proven by mutation.** Copies served to the viewer:
- **Outer normals within 15 mm of the crease set to mesh normals** (`mut/rim2`):
  - the donkey game mesh's closed and open corner fangs disappear (`shots/rimtest2-donkey-10k-AB.png`; originals in columns 1, 3 and 5);
  - the pig director's closed whiskers mostly go (`shots/rimtest2-pd-author-AB.png`);
  - so do the vertical streaks up its face when open (`shots/rimtest3-pd-author-corner-ABC.png`).
- **Only the folding rim vertices' normals changed** (`mut/rim`): no visible change (`shots/rimtest-pd-author-AB.png`).

**Not measured by any test.**
- The stripe test (`mouthShading`) samples the lips' faces and the band, not the outer skin.
- The closed tests count teeth and background, not shading.
- The new hole instrument cannot see shading.

**Fix.**
- Give every outer vertex (fold < .5, inside < .5) the approved surface's normal: the gradient of `head.speaking ?? head.field` at its rest position, mapped to placed space by the placement's inverse transpose. Mesh normals over the outer skin, as in my mutation, are second best.
- Then add a test that fails on it. Two options:
  - outer vertices within 15 mm of the crease no more than, say, 20° off the approved field's normal;
  - closed, a grey A/B against the approved head per view over the crease region.
- Re-photograph closed in grey at portrait and close scale, and in lit paint.
- The rim sawtooth that remains is S2 below.

## SHOULD-FIX

**S1. The box and the card tongue from the front** (round 3's S1, unchanged by intent).
- At 12-24° the cavity's vertical side walls and flat roof read as a box or door round a flat white tongue (`shots/open-pig-director-author-A.png`, `shots/open-horse-author-A.png`, front rows).
- On the game meshes, floor triangles cut the tongue into white shards from the front:
  - cow: `bp-all/cow-10k-extra-other-24.0-az90-el0.png`, `shots/portrait-cow-10k.png`;
  - donkey: `shots/open-donkey-10k-A.png`;
  - dog: `shots/open-dog-10k-A.png`.
- The user asked for little detail inside, so this does not block painting. But a box is a major form.
- Fix: round the cavity's section and dome the tongue's rise.

**S2. A geometric sawtooth along the authoring meshes' rims.**
- Along the lips the outer skin and the faces' triangles interleave, so the rim is a saw blade with teeth about 3-4 mm wide.
  - The class debug colours show it (`shots/zoom-pig-director-author-side.png`, column "speech class").
  - It survives the normal fixes, so it is geometry (`shots/rimtest3-pd-author-corner-ABC.png`, right pair).
- Worst on the pig director, visible in grey and paint at 6 px/mm; about 2 px at portrait scale.
- In exact profile the silhouette is clean: the lips' edges deviate p95 ≤ 0.5 mm, max 3.3 mm, on every mammal but the rabbit, whose front-facing mouth this column measure cannot read (`logs/lipedge.log`).
- Fix: after the closed shape, relax the rim rows along the lip line, or make each lip face's edge row a single strip in the reduction.

**S3. The hen's game beak regressed (the one character with a speaking use).**
- Closed, 9.21 mm² of tongue shows from the front-right in the renderer, in 6 of 171 views (`closed/closed/hen-10k-grey-teeth.png`). Round 3 showed 2.31.
- A fin about 1 cm tall stands at the root of the upper mandible, left side. Round 3's beak has none (`shots/zoom-hen-root.png` against `shots/r3-zoom-hen-root.png`, both at 8 px/mm). It is faint at portrait scale.
- Both are held as known. The beak's slit is not a regression: 2.45 / 2.90 mm² of background, where the approved beak itself shows 33.4 mm².
- Fix: lock the beak root's vertices, or keep round 3's beak budget (1,304 triangles). Headroom is 1,336.

**S4. The open-mouth bar looks from too few views.**
- `holesThrough` looks in exact profile (elevation 0) at speech, 12° and 24°, and from the game's camera (30° above, every 15°) at speech only.
- It never looks:
  - below eye level, where the viewer's "below" portrait looks;
  - all round at eye level;
  - during the closed shape's fade, 0-2°, which every syllable crosses.
- There the same slivers are larger than KNOWN holds (table above):
  - skunk authoring 17.75 mm², against a KNOWN ceiling of 1.13;
  - cow game 13.38, against 8.63;
  - pig foreman authoring 8.81, against 2.69.
- Two meshes not in KNOWN exceed the 1 mm² bar: sheep game 12.5 mm² at 0.25° (`bp-fade/sheep-10k-test-other-0.3-az90-el30.png`, a thin sliver along the front crease) and hen game 3.06 mm².
- None shows the background, and none is visible in my renders. So this is coverage, not a visible defect.
- Fix: add elevations −15 and −30 all round, eye level all round at 12° and 24°, and jaw angles 0.25-2°. Record whether background shows behind each sliver.

**S5. The open-sides bar (≥ 50%) is loose.**
- The test's own wall cut to the back half of the lip line (round 3's flaps) leaves 51-59% seen through. It passes on all ten mammals besides the rabbit; a flap over the back 70% fails at 22-33%, a flap over the back 90% at 0-5% (`logs/flap-mutant.log`).
- The rabbit's mouth is at the front of her face, so an x-cut flap leaves her 78%.
- The current minimum is 76%.
- Fix: a bar around 0.7, or per column along the lip line (no run of covered columns longer than, say, 10 mm outside the teeth).

**S6. The closed-teeth guard** (judged as asked).
- **Sound.** It poses the closed shape as the test does. It checks teeth at half the test's bar (5 px/mm). It locks the source around every tooth triangle seen. It never refuses: the test is the gate.
- **It generalizes.** My renderer check over 171 views, a superset of its 120, found at most 0.12 mm².
- **Cost** (from `scratchpad/r4/build-all-6.log`): extra reductions on four game meshes (horse 3, sheep 2, bull 1, skunk 1). The horse went 1.08 → 1.08 → 3.16 → pass, so the process is not monotone. The doc's 10 to 64 triangles needs a build to check; I ran none.
- It checks teeth only, not background. The test catches background, so that is fine.

**S7. Teeth and tongue graze the lips' inner faces** (0-8 triangles per mesh), and the skunk's game tongue shows 23% from the front.
- Interior, and held by the user's guidance.
- The seven game meshes' crossings of the outer skin are 1-2 triangles each. No tooth vertex stands outside the skin's solid on its outer side at 12° (`logs/outer-cross-where.log`), so they are not visible.

## NITS

- **N1.** The evidence sheets (`speaking-heads-review.mjs`):
  - photograph closed, 12° and 24°, but not the speech opening (4.5-8.6°) that speech uses;
  - have no view from below;
  - show the game mesh only in the paint stage.
- **N2.** The doc says the guard first saw "0.9 to 8.4 mm² of incisor closed" on four game meshes. The committed build's log says 1.08, 1.48, 2.04 and 8.56 mm² (5 px/mm).
- **N3.** The test file still calls `known('closed',…)` and `known('closedHole',…)`. KNOWN has neither kind, so these are dead branches.
- **N4.** The two azimuth conventions are opposite in sign. The doc's "the cow's 8.6 from the game's camera" gives no heading. My `tables5` run puts it at `holesThrough` az −105, viewer az 105: front-right.
- **N5.** The goat's and donkey's carved side nostrils are filled in the speaking heads (the approved heads keep them). The user's answer is still pending.

## Per character

| Character | Grade | Notes, authoring / game |
|---|---|---|
| horse | close | Open sides 92 / 88%. Slivers 2.38 / 5.00 mm² (known); up to 5.63 all round. Closed clean (renderer). Normals off the approved surface: 20 / 19 (MUST-FIX 1). Fan of streaks at the corner at 12°. Game lower tooth crosses 1 outer triangle (not visible) |
| goat | close | 84 / 87%. Slivers 0.38 / 3.75. Streak comb at the corner at 24° from the side (`shots/open-goat-author-A.png`). Normals 48 / 47. Front reads as a tall slot (S1). Side nostrils filled (N5) |
| bull | close | 91 / 86%. Slivers 2.69 / 1.63; 7.38 below eye level (authoring). Corner shards gone (`shots/corner-bull-10k.png`). Normals 31 / 30 (3 over 90°) |
| cow | not ready | 90 / 88%. Slivers 2.94 / 8.63; up to 13.38 (game, 24° front). Closed: glints along the crease at portrait scale in grey, both meshes (MUST-FIX 1). Normals 42 / 41 (6 over 90°). Game tongue in shards from the front at 12-24° (S1) |
| donkey | not ready | 89 / 86%. Slivers 1.06 / 1.25. Closed: white fangs at the corners on the game mesh, grey and lit paint, removed by the normal mutation. 274 normal jumps on the game mesh. Outer skin crosses itself at 24° (authoring, known). Side nostrils filled |
| sheep | close | 91 / 83%. Slivers 2.63 / 0.19; game 12.5 during the 0.25° fade (not held, S4). Normals 33 / 33. Closed 0.12 mm² of tooth (renderer, az 120) |
| skunk | close | 88 / 90%. Slivers 1.13 / 3.38; 17.75 below eye level (authoring, S4). Stripes 9.6% on the game mesh, game tongue 23% (both known). Lower incisors lengthened 0.9 mm for the crown bar. Normals 19 / 19 |
| pig foreman | close | 91 / 89%. Slivers 2.69 / 0.06; 8.81 all round (authoring). Normals 28 / 28. Game mesh: teeth and tongue cross 2 outer triangles (not visible) |
| pig director | not ready | 92 / 91%. Slivers 2.38 / 2.82. The worst streak fringe, closed and open, in grey and lit paint at portrait scale (MUST-FIX 1). Normals 105 / 90 (18 / 15 over 90°). Saw-blade upper lip at close range (S2) |
| rabbit | close | 76 / 80%, the least: her lips' own faces cover about 20% of the opening. Slivers 0.31 / 0.63 (pass). Closed crease looks torn in grey at close range (`shots/open-rabbit-author-A.png` col 2). Normals 10 / 10, the cleanest |
| dog | close | 91 / 84%. Slivers 1.38 / 9.38; 10.06 all round (game, 24°). The cleanest wedge in profile (`bp-all/dog-10k-test-profile-24.0-az0-el0.png`). Normals 22 / 19 |
| hen | known plus a regression | Closed slit 2.45 / 2.90 mm² (the approved beak shows 33.4). Game beak 9.21 mm² of tongue closed (round 3: 2.31), and a fin at the left root (S3). Tongue never seen open (known) |

## The open mouth against the user's words, view by view

Speech (4.5-8.6°), 12° and 24°:

| View | What it shows | Evidence |
|---|---|---|
| Exact profile, both sides | Void between the lips, as the hen's beak. The lips' faces show as thin crimson edges and the teeth hang in the gap. The wedge runs from the corners. Of the opening, 76-93% is background, 0.6-2.1% is teeth and tongue, and 8-22% is the lips' own faces seen obliquely. No wall, flap or panel | `opening/*.png`, `logs/opening-mask.log`; side rows of `shots/open-*-A.png` |
| Three-quarter | The far side's lip faces as crimson bands, then tongue and teeth. Nothing stands on the near side. At 24° the far lower lip's face is a tall crimson band: the floor's edge, not a wall | |
| Front | Crimson roof and floor, read as a box or door at 12-24° (S1) | |
| Below (the viewer's preset, el −22°) | The crimson roof with the upper teeth. Off profile, a thin slit of background along the lips at shallow angles, by the open-sides design (largest 15.2 mm², donkey game, az 30, el −15) | `shots/enclosed-worst.png` |
| Game camera, both sides | A crimson U with teeth | |
| Gameplay scale | Nothing reads broken; everything is sub-pixel | `shots/native-all-10k.png` |
| Corners | The apex reads as the wedge's back. Round 3's combs are gone; streak fans remain (MUST-FIX 1) | |

## The instruments and the bars (as asked)

- **`holesThrough`.** It measures back faces seen first. In the renderer that is exactly where a culled triangle reveals something behind it.
  - **It can fail.** All the falsifiers fire. On round 3's meshes it reads 11.9-83 mm² from the game's camera, where round 3's own flood-fill instrument read at most 4.3. It throws when it frames nothing.
  - **It misses** views below eye level, eye level off profile, and the fade (S4). It also misses all shading defects (MUST-FIX 1), and it cannot tell a sliver that shows the mouth's inside from one that shows the background. All of round 4's show the mouth's inside.
  - **Holding 17 of 24 meshes as known.** Defensible as ceilings, since none is visible. But the "1 mm²" bar is then met by 7 meshes, and the ceilings hold only at the test's views.
- **`seeThrough` `outerOnly`** measures the right thing (the share of the outer-skin opening seen through), but the 50% bar is loose (S5).
- **The mesher.** Verified. The copy differs only in winding (`surface.mjs` against `grey-surface.js`). The flips cluster within 12 mm of the cut (99-100%) and lean right on 10 of 12 heads (1.2-2.2× by area; `logs/mesher-compare.log`).
  - Round 3's back-face-first patches, though, were nearly as large from the left (horse authoring 68.0 right / 75.6 left; dog 57.2 / 54.8; `logs/r3-holes.log`).
  - So the mesher explains round 3's holes, but this evidence does not show why they were one-sided.

## False or overstated claims

1. **S2, "Three causes, each fixed".** Overstated: the shards and red sawteeth are gone, but the streak fringe (MUST-FIX 1) and the rim sawtooth (S2) remain. The pig director's fringe is round 3's.
2. **S5 and Not done, "painted at portrait scale it is under a pixel".** True only for the viewer's unlit paint. In grey at portrait scale the closed glints and whiskers show, including on the builder's own `grey/cow.png`. In the game's lit paint at 620 px/unit they show (`shots/lit-pig-director-10k-620.png`).
3. **"Closed, a speaking head is the approved head."** True in shape (within 1.5 mm), not in shading (MUST-FIX 1).
4. **"the rest teeth and tongue" (Round 3 → round 4) and the test comment "teeth and tongue fill the rest: 7 to 24% of it".** False. Teeth and tongue cover 0.6-2.1% of the opening; the lips' own faces cover 8-22% (`logs/opening-mask.log`; skin-only shares in `logs/known-check-known-sides-fade.log`).
5. **"Shading: no more than 6% of the lips' rims shading over 60° off".** `mouthShading` samples only triangles all folding or graded between the lips. The rims' transition triangles (outer and folding) and the outer skin, where the streaks are, are outside it.
6. **"The known meshes are held to what they measure."** Only at the test's views. Elsewhere the same slivers measure:
   - skunk authoring 17.75 (KNOWN 1.13);
   - cow game 13.38 (KNOWN 8.63);
   - pig foreman authoring 8.81 (KNOWN 2.69).

   Sheep game (12.5, during the fade) and hen game (3.06) are not in KNOWN but exceed the bar (S4).
7. **"(round 3's holes) worse on one side than the other because the tetrahedra's diagonals run one way".** Only partly shown: the flips do lean right, but round 3's back-face-first areas were nearly symmetric (see above).
8. **`build-speaking-heads.mjs` `prepare`: "Normals: the sculpt's own (… the approved surface as its tool had it)".** Near the lips they are the expanded field's at a sharp edge: 10-105 vertices per mesh more than 45° off the approved normal.
9. **S7, "Met".** True, but the skunk's lower incisors were lengthened 3.7 → 4.6 mm to meet the bar, which the doc doesn't say.

## Verified true

- **Tests:** 30 tests, 22 pass, 0 fail, 8 todo, 188 s, exit 0. Each todo fails as its text says.
- **KNOWN:** every entry matches my re-measurement (`logs/known-check-known-sides-fade.log`), and no other mesh fails a bar:
  - outer crossings 1-2 on the seven game meshes and the hen;
  - the donkey authoring mesh's 2 self-crossing pairs at 24°;
  - the skunk game mesh's 9.6% stripes.
- **Both doc tables reproduce exactly.** Budgets: speaking characters 10,664-11,728 of 12,000. Game heads are 78-872 triangles lighter than round 3's; the goat is +4 and the hen's beak is 1,304 → 894.
- **Falsifiers:**
  - punched cheek 150.4 mm²;
  - three flipped floor triangles 79.4 mm²;
  - wall 92% → 0%;
  - the dog's crease-corner tooth 6.88 mm²;
  - unframed head throws (code).
- **No back-face-first pixel shows the background** in the renderer, 24 meshes × 194 views (0 pixels; `bp-all/backprobe-all-4000-all-author_10k.json`).
- **Closed, whole crease, renderer, 171 views:** mammals ≤0.12 mm² of tooth and ≤0.03 mm² of background. The approved hen beak shows 33.4 mm² through its own gape, so her speaking beak's 2.45 / 2.90 is not a regression.
- **The mesher copy** differs only in winding and yields consistently oriented surfaces. The shared mesher breaks orientation 137-834 times per head, 99-100% within 12 mm of the cut.
- **The source hash** includes `surface.mjs` and `view.mjs`. The hen's tongue stays below her gape (rise −0.5 mm). No lining anywhere. The viewer served on :4499 is this worktree's.
- **At gameplay scale** nothing reads broken (`shots/native-all-10k.png`).
