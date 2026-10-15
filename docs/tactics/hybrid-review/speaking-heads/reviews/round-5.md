# Speaking heads, grey sculpt: independent review, round 5 of 5

Reviewed: worktree `animal-factory-tactics-3d-heads`, branch `art/speaking-heads`, commit 18f963e (pushed). Read-only: no repo file changed, no build run, `git status` clean before and after (HEAD 18f963e). All evidence is in
`C:/Users/baals/AppData/Local/Temp/claude/C--Users-baals-Local-Storage-AI/50314748-b796-400a-ae0b-6e785e35a369/scratchpad/review-heads-5/`; paths below are relative to it.

Conventions:
- Viewer azimuth: 0 = from the character's left (+z), 90 = front, 180 = its right. Elevation + = from above.
- `holesThrough` uses the opposite sign: its -90 is the front.
- Scales: "portrait" = 620 px/unit, "close" = 1150 (the viewer's close-up), plus my 1500 sheets and zooms of 3000-8000.
- R4 = commit 8bc3b73's heads (`heads-r4/`, taken with `git show`). R5 = 18f963e's heads.
- "Lit paint" = `createAnimalPaint(renderer, ..., sceneLighting=true)` built with the viewer's own renderer, as `battle-renderer.js` builds it with its own.

## Score: 9/10. Passes the gate: painting can start.

**Verdict.**
- **Round 4's blocker is fixed where it was found.** The pig director's whiskers, the cow's glint line and the donkey game mesh's fangs are gone, closed and open:
  - on all 24 meshes;
  - at portrait scale, in grey and in the game's lit paint (`shots/ab/*-{grey,lit}-{620,1500}.png`, `shots/montage/closed-*`, `shots/montage/open-*`).
- **The A/B tests nothing but the fix.** R4 and R5 have identical geometry on 23 of 24 meshes; only normals changed, on 197-749 skin vertices a mesh (`logs/geom-diff.log`). The hen's game beak is the exception, rebuilt.
- **The runtime path works.** Remove `closedNormal` from the cow and the white glint arc comes back: 930 px over 24 levels in one view at 3000 px/unit (`shots/zoom/cow-author-morphnormal-AB.png`). So `morphAttributes.normal` is applied.
- **The tests are stronger and honest:**
  - The new normals test fails round 4's heads on 24 of 24 meshes (outer up to 167.4°, closed faces up to 177°; `logs/normals-test-on-r4.log`).
  - No background shows through any head in 24 × 216 = 5,184 views. Every KNOWN sliver reproduces to 0.01 mm² (`logs/bg-scan.log`).
  - The 70% bar catches round 3's half-length flap: 51-62% (`logs/flap-mutant5.log`).
- **The open mouth is the user's sketch on all twelve.** At speech, 12° and 24° the sides are void and the roof and floor crimson; there is no wall, flap, panel or curtain (`shots/montage/open-{author,10k}-{grey,lit}-620.png`).
- **The hen's fin is gone** (`shots/zoom/hen-10k-root-r4r5.png`).
- **Suite and tables.** 32 tests: 24 pass, 0 fail, 8 todo. Both doc tables reproduce byte for byte.

**What keeps it from 10.** None of these blocks painting:
- **S2, the rim sawtooth, unchanged.** The lips' edges are saw blades at close-up on the pig director's authoring mesh and along the bull's lower lip. At portrait it is a 1-2 px dashed edge.
- **Faint whiskers left on the pig director's game mesh at close-up.** About a tenth of what round 4 had: 82 px over 7 views at 1150, against 730 px removed. Cause: `closedNormals` weights the lips' faces by their rest depth, not by where the closed shape lays them. The test checks the same selection, so it cannot see this.
- **Two defects at the paint stage, in the real lit paint:**
  - The pig foreman's game mesh shows cream reused-paint crescents at the closed crease. They read as teeth at close-up, and R4 has them too.
  - A fan of streaks on the pig director's game chin (known).

  Neither appears in the builder's lit-paint evidence: that tool built the paint on a second WebGL renderer and drew flat fallback colours. So did round 4's review's.
- **The doc overstates some mechanisms and evidence** (listed below).

## Method

- **Read:**
  - `SPEAKING-HEADS.md` in full, and round 4's review;
  - the round-5 diff (8bc3b73..18f963e): `build-speaking-heads.mjs`, `speaking-head.js`, `measure.mjs`, `view.mjs`, the review tool and the test file, all in full.
- **Server:** :4499 served this worktree; 8 files matched by md5.
- **Suite:** `node --test tests/speaking-heads.test.mjs` gave 32 tests: 24 pass, 0 fail, 8 todo, 366 s, exit 0 (`test-run.txt`).
- **Tables:** the builder's round-5 script, copied as `tools/tables6.mjs`. `r4/tables5.mjs` writes round 4's columns, not round 5's. Its output diffs empty against both doc tables (`logs/repro-*.md` against `logs/doc-*.md`).
- **The real renderer** (Playwright and Edge), in my tools:

  | Tool | What it does |
  |---|---|
  | `tools/ab.mjs` | Serves R4 and R5 heads to the same page, and mutant heads with `R4_DIR`. Modes: grey, unlit paint, lit paint on the viewer's renderer (`lit`), lit paint on a second renderer (`litsep`), coverage. Per-column hide and green teeth. Pixel diffs |
  | `tools/montage.mjs`, `tools/diffmap.mjs` | Cross-character montages. Difference maps |
  | `tools/sliver-views.mjs` | The largest KNOWN slivers with back faces painted red, beside the grey and lit renders at 4 px/mm and at portrait scale |
  | `tools/r3-closed-full.mjs` (copied) | Closed, whole crease, 171 views at 10 px/mm |
  | `tools/shoot.mjs` (the builder's, copied) | Debug columns: class, light, shading normal, wire |

  - 96 A/B sheets: 24 meshes × grey/lit × 620/1500, columns approved, R4 and R5 at closed, speech, 12° and 24°, 7 views each (`shots/ab/`).
  - Closed sheets at 1150: approved, R5 and a mutant, grey and lit (`shots/close1150/`).
  - Corners (`shots/corner/`), sawtooth zooms (`shots/zoom/*-sawtooth-*`), slivers (`shots/slivers/`).
- **Instruments outside the tests** (read-only imports):

  | Script | What it measures |
  |---|---|
  | `normal-audit.mjs` | Written normals against the approved normal: at rest (A), at the closed positions of the outer vertices the closed shape moves (B), for the lips' faces it lays at the surface (C), and the approved skulls' own normals (D) |
  | `crease-normals.mjs` | The closed rim band's shading normals, sampled 16 per triangle |
  | `bg-scan.mjs` | All 216 views a mesh |
  | `normals-test-on.mjs` | The test's normals check, run on R4 |
  | `flap-mutant5.mjs` | Walls over the back 20-50% of the lip line |
  | `cov-window.mjs` | Reused and fallback paint round the closed mouth |

- **Mutants** (copies only):
  - `heads-mutC/`: closed normals weighted by |approved field| at the closed position.
  - `heads-mutBC/`: the same, plus the moved outer vertices.
  - `heads-mutPP/`: the skin's paint projected from the closed shape.
  - `heads-nomorphn/`: `closedNormal` removed.
- **Not done:** a native-scale (58 px/unit) re-shoot. The :4499 server stopped listening at about 16:19 (connection refused, no listener). I did not start or stop it and did not touch :4476. Geometry is unchanged from round 4, which found nothing at native scale.
- I opened every image cited.

## Round 4's findings, graded

| Round 4 | Round 5's answer | Grade | Evidence |
|---|---|---|---|
| **MUST-FIX 1**, the lips' outer skin shaded with streaks | Approved normals on the outer skin within 20 mm. Closed, a normals morph on the lips' faces. Normals test | **Fixed at portrait and gameplay scale, grey and lit, closed and open, all 24 meshes. Partly at close-up on game meshes** | R4→R5 at 1150, closed, px over 24 levels (7 views): pig director game 730, donkey game 984, sheep game 628, cow game 522, pig director authoring 565, cow authoring 479 (`logs/r4r5-diff-summary.txt`). Left at close-up: hairline whiskers on the pig director's game mesh, 82 px (worst view 20), and specks of 6-13 px on the rabbit's, pig foreman's and bull's game meshes. All vanish with `heads-mutC` (`logs/glint-diff-summary.txt`, `shots/montage/diff-pd10k-closed-r5-vs-fixed-1150.png`) |
| S1, the box and the card tongue from the front | Not changed (the user) | **Not fixed (held by the user's guidance)** | 24° front column of `shots/montage/open-*-620.png` |
| S2, rim sawtooth (authoring) | Not changed (Not done) | **Not fixed.** The streak fans over it are gone | `shots/corner/horse-author-corner-dbg.png` against `-dbg-r4.png`: the same teeth, no fan above them. `shots/zoom/pig-director-author-sawtooth-{620,1150}.png`, `bull-author-sawtooth-1150.png` |
| S3, the hen's game beak | `BEAK_ROOT` | **Partly fixed** | The fin is gone (`shots/zoom/hen-10k-root-r4r5.png`). Closed in the renderer: 6.62 mm² of tongue (az 30, 6 of 171 views over 0.5). Round 4 had 9.21, round 3 2.31 (`logs/closed-full-grey.log`). +70 triangles |
| S4, the open bar's views | 216 views; a background gate; slivers held | **Fixed** | `logs/bg-scan.log`: 0.00 mm² of background in all 5,184 views. Every KNOWN value reproduces |
| S5, the open-sides bar | 70% | **Partly fixed** | A flap over the back half fails everywhere (51-62%). A flap over the back 40% reads 63-72%, and 9 of 22 mammal meshes read 70% or more. The rabbit reads 78/81% whatever the flap (`logs/flap-mutant5.log`) |
| S6, the closed-teeth guard | Readings in both rigs | **Fixed (the doc)** | Matches `r5/build-all-1.log`: 1.08, 2.04, 1.48 and 8.56 mm² |
| S7, teeth against the lips' inner faces; the skunk's game tongue | Held | **Not fixed (held)** | Todo tests |
| N1, evidence sheets | Speech and below added | **Partly** | The grey sheets still show the authoring mesh only |
| N2 | Both rigs | **Fixed** | |
| N3, dead `known('closed')` | Removed | **Fixed** | Absent from the test |
| N4, headings | Viewer terms in the prose | **Partly** | Test and instrument messages still print `holesThrough`'s opposite-sign azimuth ("-90° round" is the front) |
| N5, side nostrils | The user's | **Open (stated)** | |
| False claim 1, S2 "each fixed" | Sawtooth listed in Not done | **Fixed** | |
| False claim 2, "under a pixel" | Removed | **Fixed** | |
| False claim 3, "is the approved head" | "True in shading now too, by test" | **Replaced by a new overstatement** | False or overstated claims, 4 |
| False claims 4-9 | Each corrected | **Fixed** | Test comment, bars, KNOWN views, step 2, the `prepare` comment, the skunk's 4.6 mm |

**Round 3's findings, as graded in round 4: nothing has regressed.**
- The open sides read 76-92%.
- Closed, no mammal shows over 0.12 mm² of tooth or 0.03 mm² of background (renderer, 171 views).
- Game crowns are at least 4.1 mm.
- The stripe test still holds 23 of 24 meshes.
- The horse game mesh's nostril (round 3's N6) is unchanged.

## MUST-FIX (blocks painting)

None.

## SHOULD-FIX

**1. Finish the closed normals. Make the test see the vertices the closed shape moves.**

Seen:
- Closed, the pig director's game mesh still shows hairline whiskers at close-up, 10-20 px long on the crease at 1150 (`shots/close1150/pig-director-10k-closed-1150.png`, 3/4 and below rows).
- Smaller specks show on the rabbit's, pig foreman's, bull's and sheep's game meshes. At portrait they come to 25 px over 7 views on the pig director's game mesh (worst view 8), and 9 or fewer on the others.

Cause:
- `closedNormals` weights a lip face's vertex by `m.depth`, the sculpt's depth at rest: full within 1 mm, none past 3 mm.
- On the game meshes the rims that `closeCrease` snaps onto the crease are mostly deeper vertices, since the reduction collapsed the edge rows. Closed, they lie at the surface with their open facings.
- Of the lips' faces the closed shape lays within 0.5 mm of the surface, 8-165 per mammal mesh are over 20° off the approved normal, up to 177° (goat game mesh). All of them are deeper than 1 mm at rest (`logs/normal-audit.log`, C).
- The rim band (triangles at the closed crease with both outer and face vertices, facing out) shades over 20° off on (`logs/crease-normals.log`):

  | Game mesh | Round 5, mm² | Round 4, mm² |
  |---|---:|---:|
  | Pig director | 166 | 207 |
  | Bull | 153 | 181 |
  | Pig foreman | 130 | 274 |
  | Dog | 52 | 176 |
  | Goat | 45 | 98 |
  | Sheep | 36 | 125 |
  | Horse | 33 | 82 |

  The authoring meshes are 0.05-1.5 mm².
- The outer vertices the closed shape moves (up to 7.9 mm) keep the normal of their rest position. At their closed positions they are up to 57° off (goat, 71 vertices over 20°), 47° (dog game, 11) and 40° (pig foreman game, 4) (`logs/normal-audit.log`, B).

Why the test misses it:
- `normalsOff` checks lip faces with rest depth ≤ 1 mm, exactly the build's full-weight set.
- It checks outer vertices at rest, not at their closed positions.

Fix:
- Weight by |approved field| at the closed position, or by "moved onto C". `heads-mutC/` does this in 15 lines (`tools/mut-closednormals.mjs`). The rim band then reads 0-1 mm² over 20° on every mammal, and the hairlines go (`shots/montage/diff-pd10k-closed-r5-vs-fixed-1150.png`).
- Optionally give the moved outer vertices their closed-position normal in the same morph.
- Then select by the closed position in the test.

**2. S2, the rim sawtooth (round 4's S2, unchanged).**
- With the streaks gone, it is the most visible defect left on the outside of an open authoring mesh: the upper lip's edge on the pig director, the lower lip's front edge on the bull.
- At 1150 it is clearly toothed, in grey and lit (`shots/zoom/pig-director-author-sawtooth-1150.png`, `bull-author-sawtooth-1150.png`). At portrait it is a 1-2 px dashed dark edge (`pig-director-author-sawtooth-620.png`). The horse is clean (`horse-author-sawtooth-1150.png`).
- The mouth paint's boundary follows the same interleaved triangles, so paint cannot hide it.
- Fix as round 4 proposed: relax the rim rows along the lip line after the closed shape, or reduce each face's edge row as one strip. The paint is projected, not UV-mapped, so this can follow the paint pass.

**3. Before painting the crease: project the skin's paint from the closed shape.**
- Closed, the pig foreman's game mesh shows cream crescents at the crease in lit and in unlit paint.
  - At 1500 they read as teeth through a shut mouth (`shots/montage/closed-10k-lit-1500-1.png`, row 2; `shots/zoom/pig-foreman-10k-closed-specks.png`).
  - At portrait they are faint (`shots/montage/closed-10k-lit-620.png`, row 8, below).
- They are not teeth: with the teeth painted green nothing green shows.
- They are reused paint (blue in coverage; `shots/zoom/pig-foreman-10k-closed-coverage.png`). Reused and fallback paint round the closed mouth (`logs/coverage-window.txt`):

  | Mesh | Approved | Round 5 | Round 4 |
  |---|---:|---:|---:|
  | Pig foreman, game | 107 mm² | 288 mm² | 276 mm² |
  | Pig foreman, authoring | 353 mm² | 458 mm² | 471 mm² |
  | Pig director, authoring | 92 mm² | 141 mm² | – |

- Cause: `paintPosition` is the rest pose. There the rims lie inside the crease, so the projection's visibility atlas sees them as hidden.
- With `paintPosition`/`paintNormal` taken from rest plus the closed offsets (`heads-mutPP/`, `tools/mut-paintpos.mjs`), the crescents go, and the open mouth still paints correctly (`shots/zoom/pig-foreman-10k-closed-mutPP.png`).
- The pig director's game chin carries a radial fan of streaks below the closed lips in lit and unlit paint (`shots/zoom/pig-director-10k-closed-fan.png`). It is round 3's known "chin", fainter than round 4's.

**4. The cow's, donkey's and pig director's approved heads are not shaded with the analytic normal.**
- Their tools gave them the approved mesh's own normals. Near the mouth these differ from the field's gradient (`logs/normal-audit.log`, D):

  | Head | Median | 95th percentile | Most, within 15 mm | Most, 15-35 mm |
  |---|---:|---:|---:|---:|
  | Cow | 1.7-2.9° | 14.5° | 25° | 31° |
  | Donkey | 3.9-6.8° | 13-16° | 18° | 17° |
  | Pig director | 1.9-2.1° | 8-12° | 12° | 20° |

  The other nine heads differ by 1.2° at most within 15 mm (2.3° beyond).
- Round 5 gives those three heads the analytic normal within 20 mm of the lips. In grey their closed mouths moved further from the approved head:
  - the cow from its right at 1500: 412 → 636 px over 24 levels;
  - the donkey's game mesh: 12,423 → 12,930 px over 7 views.

  `shots/montage/diff-cow-sideR-appr-vs-r5.png` shows the band below the crease. It is faint and is not visible in lit paint.
- Fix: for those three, sample the approved skull's own normals (nearest point) instead of the gradient. Or say in the doc that they shade as the approved surface, not as the approved head.

**5. Re-photograph the "game's lit paint" evidence with the viewer's renderer.**
- `r5/litpaint.mjs` (and round 4's copy) calls `createAnimalPaint` on a `new THREE.WebGLRenderer`. Its visibility atlas is a render target in that other GL context, so the viewer samples nothing and the paint falls back to flat part colours.
- See `shots/paintcheck-pig-director-10k.png`, columns "LIT sep" against "LIT own", and the builder's `r5/shots/lit-after-pig-director-10k-620.png`, which is flat pink with no painted nostrils, eyes or mouth line.
- My `tools/ab.mjs` takes the viewer's renderer from `scene.onBeforeRender`.

**6. Tighten the open-sides bar.**
- 70% passes a flap over the back 40% of the lip line on 9 of 22 mammal meshes.
- The rabbit's mouth is across her face, so no back flap can fail it.
- Fix: measure per column along the lip line (no covered run over about 10 mm outside the teeth), and give the rabbit a wall it can fail (one across the front corners).

**7. The hen's closed game beak** (known).
- 6.62 mm² of tongue in the renderer, 2.9× round 3's. Invisible at the cut-scene scale.
- Lower the tongue's front or lock the gape's front vertices.

**8. S1, the box and the card tongue** (held by the user). From the front at 12-24° the cavity reads as a box round a white slab on every mammal (`shots/montage/open-author-grey-620.png`, last column).

## NITS

- **N1.** The grey evidence sheets still show the authoring mesh only.
- **N4.** Test and instrument messages print `holesThrough`'s azimuth, the viewer's negated. "cow-10k at 24.0°, -90° round" is the front, where the viewer's -90 is the rear.
- **The donkey's closed crease** reads as a double-line ledge in grey at 1500, on both meshes. The geometry is unchanged since round 4 (`shots/montage/closed-10k-grey-1500-0.png` row 5, `closed-author-grey-1500-0.png` row 5).
- **"216 views a mesh (6 groups)"**: the doc lists four groups.
- **`r4/tables5.mjs`**, named in the brief, writes round 4's columns. `r5/tables6.mjs` writes round 5's.
- **The 1 mm² sliver bar** is met by 3 of 24 meshes. For the other 21, KNOWN is a ratchet at the measured value, not a bar. That is honest, as the doc says, but say "ratchet".

## Per character

Columns:
- **Open sides** (authoring / game) and **sliver** (largest, mm²) are as the doc tables, reproduced.
- **Closed** is my renderer check: tooth / background, mm², authoring; game.
- **Left at close-up**: R5 against the closed-normals mutant, px over 24 levels at 1150 (authoring / game).

| Character | Open sides | Sliver | Closed | Left at close-up | Notes |
|---|---|---|---|---|---|
| horse | 92 / 88% | 4.69 / 5.63 | 0 / 0.01; 0 / 0 | 7 / 0 | Clean at portrait. Corner sawtooth at 5 px/mm, the fan above it gone |
| goat | 84 / 87% | 0.44 / 3.75 | 0 / 0; 0 / 0 | 0 / 3 | Side nostrils filled (N5). Closed outer vertices up to 57° off at their closed positions; not seen in renders |
| bull | 91 / 86% | 7.38 / 3.13 | 0 / 0; 0.01 / 0 | 2 / 6 | Lower lip's front edge toothed at close-up (S2). Faint specks at the game crease in lit paint at 1500 |
| cow | 90 / 88% | 3.32 / 13.38 | 0 / 0.01; 0 / 0.01 | 3 / 1 | Glint line gone (grey and lit, both meshes). Closed, from the right at 1500, a darker band below the crease than the approved cow (SHOULD-FIX 4) |
| donkey | 89 / 86% | 1.75 / 2.88 | 0 / 0; 0.02 / 0 | 4 / 4 | Fangs gone (grey and lit). Double-line ledge at the crease at close-up. Outer skin crosses itself at 24° (known) |
| sheep | 91 / 83% | 2.94 / 6.57 | 0 / 0; 0.12 / 0 | 0 / 3 | The 6.57 mm² is in the 0.5° fade, a thread along the front crease, invisible at portrait (`shots/slivers/sheep-10k-0.5-az-90-el30.png`) |
| skunk | 88 / 90% | 17.75 / 3.44 | 0 / 0; 0.05 / 0.03 | 5 / 5 | The 17.75 mm² is from 30° below at speech, the crimson inside showing (`shots/slivers/skunk-author-7.1-az-90-el-30.png`). Game stripes and tongue known. A 1 mm dark paint speck closed, also in R4 |
| pig foreman | 91 / 89% | 8.82 / 3.44 | 0 / 0; 0.01 / 0 | 9 / 11 | Cream reused-paint crescents at the closed game crease (SHOULD-FIX 3) |
| pig director | 92 / 91% | 3.19 / 3.13 | 0 / 0; 0.03 / 0.01 | 3 / 82 | Whiskers gone at portrait. Hairlines left on the game mesh at close-up (SHOULD-FIX 1). Worst sawtooth (S2). Game chin fan in paint (known) |
| rabbit | 76 / 80% | 0.31 / 1.69 | 0 / 0; 0 / 0 | 5 / 13 | Cleanest closed. The open-sides falsifier cannot fail her |
| dog | 91 / 84% | 1.63 / 10.07 | 0 / 0; 0.01 / 0.01 | 1 / 6 | The 10.07 is at 24°, invisible at portrait (`shots/slivers/dog-10k-24.0-az-15-el0.png`) |
| hen | – | 0.75 / 1.13 | 0.17 / 2.40; 6.62 / 2.91 | 0 / 0 | Fin gone. Closed slit (her approved beak shows 33.4 mm²). Game tongue 6.62 (SHOULD-FIX 7) |

## The open mouth against the user's words

Speech (4.5-8.6°), 12° and 24°, all 12 characters, both meshes, grey and lit (`shots/montage/open-*-620.png`, `shots/ab/*`):

| View | What it shows |
|---|---|
| Exact profile, both sides | Seen through between the lips, as the hen's beak is. The lips' faces show as thin edges, and teeth hang in the gap. No wall, flap or panel |
| Three-quarter | The far side's lip faces and the floor in crimson, with teeth and tongue. Nothing stands on the near side |
| Front | A crimson U with the tongue. At 12-24° it reads as a box (S1, held) |
| Below (the viewer's preset) | The crimson roof and the upper teeth. A thin slit of background along the lips at shallow angles, by the open-sides design |
| Game's camera, both sides | A crimson crescent with teeth |
| Corners | The wedge's apex is clean. The upper lip's edge is toothed at 5 px/mm (S2). Round 4's streak fans are gone |
| Portrait scale | Nothing reads as broken |

The largest KNOWN slivers in the renderer (back faces red; renderer against instrument, mm²):

| Mesh and view | Renderer | Instrument |
|---|---:|---:|
| Cow game, 24° front | 12.63 | 13.38 |
| Skunk authoring, speech, 30° below | 15.69 | 17.75 |
| Pig foreman authoring | 7.88 | 8.81 |
| Dog game | 6.38 | 10.06 |
| Sheep game, fade | 4.69 | 6.56 |
| Bull authoring | 4.13 | 7.38 |
| Horse game | 4.81 | 5.63 |

Each shows the crimson inside where a lip face's sliver is turned. None is visible at portrait in grey or lit (`shots/slivers/*.png`). Holding them as KNOWN is honest.

## False or overstated claims

1. **"Photographed before and after, in grey at portrait and close scale and in the game's lit paint at 620 and 1,500 px a unit"** (Round 4 → round 5, MUST-FIX 1; and the commit message).
   - The lit images are lit flat fallback colour, not the game's paint (SHOULD-FIX 5).
   - The conclusion about lighting holds; my real lit paint agrees.
   - The paint defects at the crease (pig foreman) were invisible to that evidence.
   - Round 4's review's "lit paint" had the same flaw.
2. **Step 3, "Closed, the lips' faces where the closed shape lays them at the surface (within 3 mm of it) take the approved surface's normal too".** False as worded. The code weights by the sculpt's depth at rest (`m.depth`), not by where the closed shape lays them, so rims that the closed shape snaps onto the crease from deeper keep their open facings (SHOULD-FIX 1).
3. **"Closed, the lips' faces at the crease take them too ...: at most 0.1° off".** True only for faces with rest depth ≤ 1 mm, the test's selection, which is the build's own full-weight set. Of the faces the closed shape lays within 0.5 mm of the surface, 8-165 per mammal mesh are over 20° off, up to 177°.
4. **"Closed, a speaking head is the approved head ... and shades as it ... (by test)" (Status, step 3) and "True in shading now too, by test" (false claim 3).** Overstated:
   - The test compares against the analytic gradient, at rest, on the build's selection.
   - The cow's, donkey's and pig director's approved heads shade with mesh normals that differ by up to 12-31°. The donkey in grey moved further from its approved head than in round 4.
   - The game meshes keep close-up whiskers the test cannot see.
5. **"Within 15 mm of the crease no outer vertex is now more than 0.1° off ... on any mesh."** True at rest. The outer vertices the closed shape moves (up to 7.9 mm) are drawn closed at positions where they are up to 57° off; nothing measures that.
6. **S3, "Closed, it shows 5.7 mm² of tongue (round 4: 8.3 by the test's instrument, 9.21 in round 4's review's renderer ...)".** The comparison mixes instruments. In the renderer it is 6.62 mm², 2.9× round 3's 2.31.
7. **S5, "A wall over the back half of the lip line ... fails it".** True. But a wall over the back 40% passes on 9 of 22 mammal meshes, and the rabbit cannot fail. The bar is tighter, not tight.
8. **N4, "Headings are named in the viewer's terms".** True of the prose, not of the test's and instruments' messages.

## Verified true

- **Suite.** 32 tests: 24 pass, 0 fail, 8 todo, 366 s. Each todo fails as its text says: hen beak 3.2 mm², skunk game tongue 23%, hen tongue 0%, the horse's teeth through 4 lip faces at 6°, the seven game meshes' outer crossings, the donkey at 24°, the slivers, skunk stripes.
- **Tables.** Both reproduce exactly. Budgets: speaking characters 10,734-11,728 of 12,000. The hen's game beak +70 triangles (966 → 1,036).
- **Outer normals.** Within 15 mm of the crease, at rest, every outer vertex is within 0.1° of the approved normal on every mesh (`logs/normal-audit.log`, A).
- **The normals test can fail:**
  - its own falsifier passes;
  - round 4's heads fail it on 24 of 24 meshes (`logs/normals-test-on-r4.log`).
- **The runtime applies the closed normals morph** (`shots/zoom/cow-author-morphnormal-AB.png`, `cow-10k-morphnormal-AB.png`).
- **No background through any head.** 0.00 mm² in 5,184 views (instrument). Every KNOWN sliver reproduces. `holesThrough` reports background only where a back face is first and the culled render is empty, as coded.
- **Closed, whole crease, renderer, 171 views at 10 px/mm.** Mammals show at most 0.12 mm² of tooth (sheep game, az 120) and 0.03 mm² of background (skunk game).
- **Open sides** 76-92% on both meshes. The doc's falsifier numbers reproduce: the horse's half-flap 54%, the others 57-62%.
- **The open mouth matches the user's sketch** on all twelve. No wall, flap, panel or curtain anywhere.
- **Hen.** The fin at the game beak's root is gone (my capture at 8 px/mm). Her authoring beak shades as her approved beak (`shots/montage/diff-hen-author-appr-vs-r5.png`).
- **Geometry.** R4 and R5 skins are vertex-for-vertex identical on 23 of 24 meshes. Round 5 changed normals only (and the hen's game beak).
- **The repo** is clean at 18f963e.
