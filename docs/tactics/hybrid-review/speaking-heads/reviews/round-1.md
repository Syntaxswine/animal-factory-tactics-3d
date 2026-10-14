# Speaking heads, grey sculpt: independent review, round 1 of 5

Reviewed: worktree `animal-factory-tactics-3d-heads`, branch `art/speaking-heads`, commit 2d0dd46. The review was read-only: no repo file was changed, the build was not run, and `git status` stayed clean. All evidence is in
`C:/Users/baals/AppData/Local/Temp/claude/C--Users-baals-Local-Storage-AI/50314748-b796-400a-ae0b-6e785e35a369/scratchpad/review-heads-1/`. Paths below are relative to that folder.

## Score: 3/10. This does not pass the 9/10 gate. Do not start painting.

**Verdict.** Some things hold up:
- The lip lines sit on the painted mouth lines (checked with the builder's registration overlay).
- Away from the mouth, the closed heads match the approved surfaces.
- The copied sculpts are exact. The rig math, the budgets and the tooling (viewer, preview, reproducible build) are solid.
- The hen's beak is close to acceptable.

But the heads do not read as sculpted to speak:
- On 11 of 12 characters, the open mouth is a hole straight through the head in profile and rear three-quarter, already at 6 degrees.
- The lower jaw opens as a thin flap, blade or spike. Its weights bend it halfway along the jaw line instead of at the joint. The bull has no jaw at all, only an added "sausage" lip.
- The rest-pose seal is baked into the bind pose. It collapses the front of the mouth, so the open mouth is a flat tray at lip level. Most of the tongue is buried under the floor (none of the pig-director's or hen's tongue shows). The lower incisors are buried or show as dots.
- Closed mouths do not close. Teeth show through the seam on 8 characters. On the skunk, teeth and tongue stand outside the closed skin, and its tongue shows through the chin even in paint.
- The dog's upper teeth float with no root once the mouth opens.
- The pig-director has a jagged frill along the lower lip, closed and open.
- Inside the mouth, the walls tear into vertical "pillars" that read as fangs (sheep, goat, cow, skunk). At 24 degrees the cheeks and throat fold into themselves.

None of this is caught by the tests. The two tests that should catch it are tautological: they measure the same field the geometry was clipped or left untouched against. The review sheets in `docs/.../grey/` already show the spikes and the see-through, but the doc does not mention them.

## Method
- Read `SPEAKING-HEADS.md` and every module it names. Ran `node --test tests/speaking-heads.test.mjs`: 9 pass, 1.06 s.
- **Real renderer.** Drove `speaking-heads.html` on :4499 with Playwright/Edge (`capture.mjs` plus `sheets-*.mjs`). I tilted the character root to see under the chin and added a magenta backdrop plane to show see-through.
- **Offline measurements** on the built `dist/tactics/speaking-heads/<id>-author.json` and `<id>-10k.json`. Jaw posed exactly as the runtime does it (linear blend about the hinge). Each script is in the folder:

  | Script | What it measures |
  |---|---|
  | `closed-visibility.mjs` | Closed mouth seen from 120 directions, 0.25 mm pixels |
  | `seethrough.mjs` | Profile see-through, by flood fill with the mouth front walled off |
  | `teeth-check.mjs` | Teeth and tongue against the actual skin mesh (ray parity plus nearest-triangle class) |
  | `exposure.mjs` | Exposed tooth crown |
  | `tongue-vis.mjs` | How much tongue shows |
  | `intersect.mjs` | Triangle-triangle intersections |
  | `section.mjs` | Cross-sections |
  | `floor.mjs` | Floor and roof height at rest |
  | `jawheight.mjs` | Lower-jaw height near its tip |
  | `underside.mjs` | Jaw weight along the profile jaw line |
  | `closed-surface.mjs` | Closed outer skin compared with the approved field |
  | `closed-diff.mjs` | Closed-difference metric in a mouth-only crop |
  | `tautology.mjs` | The margin the "teeth inside" test can never lose |
  | `gap.mjs` | Lip separation at speech amplitudes |
- **Builder's own tools:** `registration.mjs` for all 12 (`out/reg-*.png`), and `preview.mjs` raw-sculpt clay renders for the pig-director, skunk and bull (`out/preview-*.png`).

## MUST-FIX (blocks painting)

### M1. The open mouth is a see-through hole (11 of 12; the hen is fine)
- **Where.** The slit runs the full muzzle width in front of the corners (`corner.z = .2` on 10 heads, `.075` on the pig-director). Nothing fills the space between the two side openings: no cheek teeth, no gum ridge, no inner cheek wall, and the tongue is buried (M4).
- **Measured.** Background area seen through the head in exact profile (authoring mesh):

  | Character | 6° | 12° | 24° |
  |---|---:|---:|---:|
  | horse | 21 cm² | 43 cm² | 84 cm² |
  | pig-director | 17 | 37 | — |
  | bull | 16 | 31 | — |
  | goat | 15 | 29 | — |
  | donkey | 14 | 28 | — |
  | cow | 13 | 26 | — |
  | pig-foreman | 13 | 26 | — |
  | dog | 12 | 26 | — |
  | sheep | 10 | 19 | — |
  | skunk | 9 | 18 | — |
  | rabbit | 2 | 4 | — |
  | hen | 0 | 0 | 0 |

  - **Toward the rear** (camera behind the side of the head), at 12°: 30° off profile gives horse 13.7 cm², goat 19.6, dog 12.0; 45° gives up to 12.5 cm² (goat); the goat still shows 4.4 cm² at 60° (`out/seethrough-rear-author.json`, `out/rear-check.png`).
  - **Toward the front**, 15° off profile still sees through (`out/render-horse-author-j12-az-15-el0.png`). At 30° the floor blocks the view in the real renderer. My oblique-front flood-fill numbers overcount, so they are set aside (`out/seethrough-front-oblique-author-OVERCOUNTED.json`).
- **Images.**
  - `shots/backdrop-author.png` (real renderer, magenta backdrop; rows horse, cow, goat, dog, pig-foreman, sheep). Columns 1–2 are profile at 6° and 12°; column 4 is rear three-quarter at 30°. The whole mouth wedge is magenta.
  - `out/seethrough-horse-author-12.png`: the hole is the whole mouth wedge from the corner to the lips, not "a gap above the tongue".
  - `out/render-horse-author-j12-az-15-el0.png` (15° toward the front).
  - `shots/context-cutscene-painted.png`, column 2: the background shows through the painted mouths at cutscene scale.
- **Fix.** Close the mouth's sides behind the lips:
  - Gum ridges and simple cheek teeth along both sides from the corner forward, and/or a mouth bag (inner cheek walls joining the upper and lower gums, weighted top-to-bottom so they stretch).
  - Do not let the slit open both cheeks into the same empty slab.
  - Re-check: 0 mm² see-through at 6/12/24°, from profile out to 45° on both sides, including the rear three-quarter.

### M2. The lower jaw opens as a flap, blade or spike, not a jaw
- **Weights.** Along the profile jaw line, the jaw weight only reaches 0.5 part of the way from the hinge to the jaw tip (`underside.mjs`):

  | Character | Weight reaches 0.5 at |
  |---|---:|
  | donkey | 29% |
  | cow | 36% |
  | dog | 38% |
  | horse | 42% |
  | goat | 45% |
  | bull | 45% |
  | skunk | 50% |
  | sheep | 53% |
  | rabbit | 59% |
  | pig-foreman | 68% |
  | pig-director | 92% |

  The "throat ray" in the weights (`throat.angle` from the hinge) cuts through the jaw itself. The back of the visible jaw line stays with the head, and the jaw bends at mid-cheek instead of at the joint.
- **Sculpt.** The lower jaw is a thin wedge. Its height at the midline 1 cm behind the tip (`jawheight.mjs`):

  | Character | Height |
  |---|---:|
  | cow | 8 mm |
  | skunk | 8 mm |
  | pig-director | 11 mm |
  | horse | 12 mm |
  | rabbit | 12 mm |
  | dog | 15 mm |
  | donkey | 17 mm |
  | sheep | 18 mm |
  | bull | 18 mm (constant 18–21 mm: a sausage) |
  | goat | 19 mm |
  | pig-foreman | 20 mm |

  It ends in a sharp edge where the raised floor (M4) meets the chin.
- **Images.**
  - `shots/close-<id>-author.png`, row 1, columns 3–5: spikes, blades and hooks on the horse, cow, sheep, skunk, donkey, pig-foreman, pig-director and rabbit; the goat's jaw is a "stick" with an L-kink.
  - `shots/weights-a.png` and `shots/weights-b.png`: only a crescent below the lip is red.
  - `out/section-cow-author-z0.0039-0_6_12_24.png` and `out/section-skunk-author-z0.0024-0_6_12_24.png`: wedge jaws.
  - The raw 2.5 mm sculpt does the same (`out/preview-pig-director.png`, `out/preview-skunk.png`), so this is not a reduction artifact.
- **Fix.** Weight the whole mandible rigidly from the chin back to the jaw's angle below the hinge. Let the throat and intermandibular skin under it, and the cheek above the corner, carry the blend. Bound the jaw with a sculpted jaw volume or jaw-line curve, not a ray from the hinge. Sculpt a lower lip and chin with real height (about 2 cm and up) and a rounded front on the thin jaws. If the closed silhouette below the lip has to change, change it deliberately and register it to the paint.

### M3. The bull has no jaw, and closed it is not the approved head
- **Open.** The whole moving "jaw" is the added `lowerLip` ellipsoid: a 1.8–2.1 cm sausage that swings down like a stick or tongue (`shots/close-bull-author.png`, row 1).
- **Closed.** The sausage protrudes under the muzzle. The slit has sliced the muzzle's underside off on both sides of it, leaving two large dark pockets visible from below:
  - up to 29.6 cm² of mouth interior from below (`out/closed-interior-bull-author.png`, `shots/closed-from-below.png` row 1);
  - closed difference against the approved head in a mouth crop: 9.4% of pixels (front) and 7.3% (three-quarter).
- **When open.** The tongue pushes out through the outer skin: 1.1 mm at 6°, 5.8 mm at 12°, 10.1 mm at 24° (114–147 intersecting triangle pairs). The corners tear into jagged shards at 24°.
- **Fix.** Sculpt a real mandible, chin and lower lip consistent with the painted chin, then re-register.

### M4. The rest-pose seal is baked into the bind pose and collapses the mouth
- **Cause.** `sealOffset` moves every skin vertex within `seal` (1.8 cm) of the slit, not just the lip faces, and the rest positions become the mesh the jaw rotates. So the cavity in front of the corners is flattened permanently.
- **Floor and roof at rest** (`floor.mjs`, sculpt space, relative to the lip line):

  | | Designed | Built |
  |---|---|---|
  | Floor | −5 to −6 mm | −0.0 to −1.4 mm |
  | Roof | +8 to +10 mm | +1.3 to +5.8 mm |

  These are medians over the few interior vertices in front of the corners (1–24 per head). The section images agree: `out/section-horse-author-z0.0042-0_6_12_24.png`, panel 1, shows the floor and roof nearly meeting at the front. The tongue's top was designed at −1 mm, so it lies under or flush with the floor.
- **The thin chin lifts.** On the skunk, about 3 mm of the chin underside within 1.2 cm of the lip line moves up.
- **Consequences:**
  - **The tongue is buried.** Visible share at 12° in the viewer's front / three-quarter / below views (`tongue-vis.mjs`):

    | Character | Front | Three-quarter | Below |
    |---|---:|---:|---:|
    | pig-director | 0% | 0% | 0% |
    | hen | 0% | 0% | 0% |
    | rabbit | 4% | 0% | 0% |
    | sheep | 5% | 1% | 0% |
    | the other 8 | 16–58% | 5–12% | 0–23% |

    What does show is an irregular white or pink splotch, not a tongue (`shots/teeth-zoom.png`, `shots/close-*`).
  - **The lower incisors are buried.** Median exposed crown at 12° (`exposure.mjs`):

    | Character | Authoring mesh | Game mesh |
    |---|---:|---:|
    | bull | 0–0.1 mm | 0 |
    | goat | 0.9 mm | 0 |
    | cow | 0.9 mm | 0 |
    | sheep | 1.0 mm | 0 |
    | rabbit | 2.2 mm | 0 |
    | horse | 2.6 mm | 0 |
    | dog | 2.6 mm | 0.8 mm |
    | donkey | 3.0 mm | 0 |

    They show as dots (`shots/teeth-zoom.png` row 3).
  - The open mouth is a flat tray at lip height with a knife-edge lower lip; there is no inner lip or gum line (sections and close sheets).
- **Fix.** Make the seal a corrective shape that is 1 at jaw 0 and 0 by about 3–4°, so the open mouth uses the unsealed sculpt. Or seal only the lip rim (the outer 3–4 mm of each slit face) and narrow the slit. Then re-seat the tongue and teeth against the surfaces they actually meet.

### M5. Closed mouths do not close: teeth and tongue show through, or stand outside the skin
- **Visible teeth when closed.** Worst view over a 120-direction hemisphere, jaw 0 (`out/closed-visibility-author.json`):

  | Character | Tooth area visible |
  |---|---:|
  | skunk | 312 mm² (88 of 120 views over 0.5 mm²) |
  | pig-foreman | 64 mm² |
  | donkey | 60 mm² |
  | dog | 24 mm² |
  | rabbit | 16 mm² |
  | pig-director | 15 mm² |
  | bull | 14 mm² |
  | horse | 9 mm² |

  Confirmed in the real renderer, grey and painted: `shots/closed-teeth-real.png`, with a closed red/dark lip line and teeth in it on the donkey, pig-foreman, dog, rabbit and skunk. Mouth interior visible through the closed seam from below: bull 29.6 cm², goat 10.3, pig-foreman 7.7, pig-director 7.5, cow 7.1, donkey 6.7 (`shots/closed-from-below.png`: the goat and pig-director seams read as open dark crescents).
- **Standing outside the actual closed skin mesh** (`teeth-check.mjs`):
  - skunk: 6 of 8 upper teeth by up to 2.4 mm (8 of 8 in the game mesh), and the tongue 1.5 mm through the chin. The painted skunk shows a pink disc and white blotches (tongue, tooth roots) under its chin (`shots/closed-teeth-real.png` row 5, `out/closed-teeth-skunk-author.png`).
  - When open, 3 of 8 skunk lower teeth stand through the outer face of the lower lip at every angle (`shots/teeth-zoom.png` row 2).
  - The cow has 1 lower tooth through the lower lip's front (6 triangle pairs, all angles).
  - The tongue goes through the outer skin at 24° on the rabbit (8.1 mm), skunk (5.8 mm), sheep (1.5 mm) and horse (46 pairs).
- **Closed outer skin against the approved field** (`closed-surface.mjs`). In the band the test skips, it departs by up to 4.4–7.9 mm (goat 7.9, pig-foreman 7.3, bull 7.3; hen 2.3), with 70–149 outer vertices per head more than 2 mm off (hen 25). The worst points are at the lip line: a deep V-groove left by the rounded slit.
- **Fix.** After M4, re-check on the real meshes (not the field):
  - zero tooth or tongue pixels from every outside direction at jaw 0;
  - no part vertex outside the skin solid next to outer skin, at 0/6/12/24°;
  - closed seam groove no more than about 1 mm.

### M6. The dog's upper teeth float when the mouth opens
- 7 of 8 upper teeth (authoring mesh) and 8 of 8 (game mesh) have no vertex inside the skin at 6–24°.
- Gap to the nearest skin per tooth at 12°: 0.3–5.1 mm (authoring), 2.1–6.6 mm (game).
- In the game mesh, one donkey upper tooth floats 14 mm from any skin and one pig-foreman upper tooth 32 mm (`gapteeth.mjs`).
- **Images.** `shots/teeth-zoom.png` row 1 (dog incisors and hexagonal "canines" hanging against a black roof, no gum); `shots/floating-teeth-10k.png` (white dice in a black void on the pig-foreman, donkey and dog).
- **Fix.** Roots into the gum at every angle: set the length from the roof as built (after the M4 fix), not from the lip line.

### M7. The pig-director has a jagged frill along its lower lip, closed and open
- The authoring reduction leaves a sawtooth frill along the lower lip and jowl front. It is visible closed: closed difference against the approved head in a mouth crop is 8.1% of pixels.
- It is not in the raw sculpt (`out/preview-pig-director.png`), so the reduction causes it. Long slivers cross the weight gradient; the streaky weights on both pigs in `shots/weights-b.png` show it.
- **Images.** `shots/close-pig-director-author.png` (all rows, columns 2–5), `out/section-pig-director-author-z0.006-0_6_12_24.png` (ragged jowl outline), `shots/game-mesh-b.png` rows 1–2 (also a dark notch at the closed mouth's corner in the game mesh).
- **Fix.** Lock or weight the lip-edge and jowl vertices in the simplifier; reject sliver triangles that cross the jaw weight.

### M8. The mouth interior tears into "pillars", and the skin folds at 24°
- **Pillars.** The cavity's side and back walls cross the lip plane, and the weights jump 0 to 1 across one triangle row there, so the walls stretch into vertical sheets.
  - They read as fangs or pillars on the sheep, goat, cow and skunk at 6–12° (`shots/teeth-zoom.png` row 3; `shots/close-sheep-author.png` row 3).
  - The goat reads as a letterbox slot.
  - The horse and cow show streaked curtains from below (`shots/close-horse-author.png` row 4).
- **Folds at 24°.** Outer-skin triangles intersecting other outer-skin triangles (`intersect.mjs`):

  | Character | Intersecting pairs | Where |
  |---|---:|---|
  | dog | 112 | cheek behind the corner, throat |
  | sheep | 87 | cheek behind the corner, throat |
  | pig-foreman | 62 | the jowl creases visible in `shots/close-pig-foreman-author.png` row 3, column 5 |
  | hen | 56 | inside the face |
  | horse | 43 | cheek |

  The rabbit's throat outline loops over itself (`out/section-rabbit-author-z0.0055-0_6_12_24.png`, panel 4). The pig-director gets a crescent crease at the jowl.
- **Fix.** The M2 weights, plus mouth-bag weights graded top to bottom on the interior walls.

## SHOULD-FIX

- **S1. Teeth design** (the per-species claims are in the false-claims list):
  - The teeth are rounded boxes (48 triangles) or plain 12-triangle cubes in the game mesh. They read as dice.
  - The dog's and skunk's "canines" are hexagonal blocks, not cones.
  - The pig-director has no canines or tusks. The pig-foreman's lower end teeth are 1.6 cm and barely different.
  - There is no dental pad for the cattle, goat and sheep.
  - The donkey's upper incisors read as a zigzag saw from the front (`shots/close-donkey-author.png` row 3, column 3).
  - The rabbit's signature incisors are a 7.6 mm crown (2.8 mm in the game mesh) and barely register.
- **S2. Speech amplitude.** `SPEECH_OPEN` of 10.3–12.6° on 17–32 cm hinge-to-lip levers gives 4.2–6.9 cm between the lip tips at full stress (0.5–1.6 cm apart closed; `gap.mjs`). It reads as chomping. Scale the amplitude per character by lever length, for example to about 2–3 cm.
- **S3. Interpenetration during speech.** Upper and lower teeth interpenetrate at rest: donkey 48, pig-foreman 140, pig-director 108 intersecting triangle pairs. That shows in the first degrees of every syllable. The tongue runs through the lower teeth on the pig-director (106), rabbit (64), dog (42) and pig-foreman (24).
- **S4. The game mesh makes it worse.** Lower teeth are fully buried on the horse, goat, bull, cow and sheep; upper teeth float on the donkey and pig-foreman (see M6); the interior is blocky (`shots/game-mesh-a.png`, `shots/game-mesh-b.png`). Re-run step 3 after the sculpt fixes and review the game mesh again.
- **S5. Hen** (otherwise the best head):
  - The tongue is never visible: 0% at 12° in all viewer angles, 6% from straight above (authoring), 0% (game).
  - From below, the lower mandible looks detached from the face at 12–24° (`shots/hen-beak.png` row 2).
  - The back of the lower mandible rotates up through the upper mandible: 35 and 56 outer-intersecting pairs at 12° and 24°, mostly inside the face.
- **S6. Pig-director registration.** In the side view, the lip line drifts about 6 mm above the painted crease toward the corner (`out/reg-pig-director.png`). The other 11 sit on their painted lines (`out/reg-all-1.png`, `out/reg-all-2.png`).
- **S7. The tests are blind to every defect above.** Add checks that can fail:
  - see-through area in profile and rear three-quarter;
  - tooth and tongue pixels visible at jaw 0 over a hemisphere;
  - part vertices outside the skin solid next to outer skin;
  - every tooth rooted in the gum at all angles, with a minimum crown exposure;
  - tongue visible share at 12°;
  - outer self-intersections at 6/12/24°;
  - jaw weight along the profile jaw line.

  My scripts already do these and can be lifted.
- **S8. `checks.json`'s closed-difference crop cannot discriminate.** At cutscene scale the 320 px crop is mostly torso, so it reports 0.03–0.4% of pixels. The same metric in a 200 px mouth crop at close scale gives 0.65–9.4%: bull 9.4%, pig-director 8.1%, donkey 4.7%, sheep 4.3% (`out/closed-diff.json`). Measure the mouth.

## NITS
- `docs/.../grey/<id>.png` already shows the spikes and see-through, but the doc's status line and "Not done" list do not mention them.
- The rabbit's slit ends show small jagged tears at the corners when closed (`shots/closed-teeth-real.png` row 4).
- The approved hen's beak has z-fighting streaks at the gape. That predates this work, and the speaking beak is actually cleaner closed (`shots/hen-closed-zoom.png`).
- The viewer has no elevation control. Looking under the chin, where most closed-seam problems show, needed a root tilt hack. Add an elevation slider.
- "About 40 seconds a head" is unverified. I did not run the build; the raw pig-director sculpt alone took 81 s in `preview.mjs` here.

## Per character

| Character | Grade (sculpt) | Main problems (authoring mesh unless noted) |
|---|---|---|
| horse | fail | Wedge jaw ending in a spike (12 mm high 1 cm behind the tip; weight reaches 0.5 at 42% of the jaw line); 43 cm² see-through at 12°; tray floor; tongue mostly buried (29/12/19%); lower incisor crown 2.6 mm (0 in game); streaked interior curtain; cheek folds at 24° (43 pairs); teeth 9 mm² visible closed |
| goat | fail | Lower jaw is a "stick" with an L-kink at 24°; 29 cm² see-through, still 4.4 cm² at 60° off profile; letterbox slot with pillars; incisors 0.9 mm (0 in game); closed seam open from below (10.3 cm² interior); beard follows the jaw (OK) |
| bull | fail (worst) | No jaw: the moving part is the added 18–21 mm lip sausage; closed silhouette changed (protruding lip, two cut pockets under the muzzle, 29.6 cm² interior from below, 9.4% mouth-crop difference); incisors 0–0.1 mm (buried); tongue through the skin when open (up to 10 mm); torn corners at 24° |
| cow | fail | Blade jaw (8 mm) with a spike in profile; 26 cm² see-through; 1 lower incisor through the lower lip's front at all angles; incisors 0.9 mm (0 in game); pillars; tray floor |
| donkey | fail | Lower-lip blade or spike at 12–24°; 28 cm² see-through; 60 mm² of teeth through the closed seam; upper and lower teeth interpenetrate at rest (48 pairs); zigzag upper incisors; 1 floating upper tooth in the game mesh |
| sheep | fail | Thin curved blade jaw; 19 cm² see-through; two pillars read as upper fangs (sheep have none); tongue barely visible (5/1/0%); incisors 1.0 mm (0 in game); folds at 24° (87 pairs); tongue through the skin at 24° |
| skunk | fail | Closed mouth shows teeth (312 mm²) and 6 of 8 upper teeth stand up to 2.4 mm outside the closed skin; tongue 1.5 mm through the chin (pink disc and white blotches in paint); 3 of 8 lower teeth through the lower lip at every angle; 8 mm blade jaw; 18 cm² see-through; pillars |
| pig-foreman | fail | Lower-lip spike in profile; jowl creases at 24° (62 pairs); 64 mm² of teeth through the closed seam; upper and lower teeth interpenetrate (140 pairs); tongue through the lower teeth; 26 cm² see-through; 1 floating upper tooth 32 mm from the skin in the game mesh |
| pig-director | fail | Jagged frill along the lower lip closed and open (reduction); tongue never visible (0/0/0%); no canines; 37 cm² see-through; huge U gape with a crescent jowl crease at 24°; jaw weight reaches 0.5 at only 92% of the jaw line; lip line about 6 mm above the paint near the corner; teeth interpenetrate (108 pairs) |
| rabbit | fail | Teeth visible through the closed seam (16 mm²) with torn slit ends; tongue barely visible (4/0/0%) and through the skin at 24° (8 mm); throat fold at 24°; signature incisors tiny; small see-through (4 cm²) |
| dog | fail | Upper teeth float with no root when open (7/8; 8/8 in game); canines are hexagonal blocks; 26 cm² see-through; folds at 24° (112 pairs); upper teeth stick out in front of the lip in profile |
| hen | near pass | Beak opens cleanly as two rigid mandibles, and is cleaner than the approved beak when closed; tongue never visible; lower mandible looks detached from the face from below at 12–24°; mandible root rotates through the upper mandible (inside the face) |

## False or overstated claims (doc and tests)

1. **"All are kept 2.2 mm inside the approved head, so a closed mouth hides them."** False on the shipped meshes: teeth are visible closed on 8 characters (up to 312 mm²), and skunk teeth and tongue stand up to 2.4 mm outside the closed skin (M5).
2. **The test "keeps its mouth inside" is tautological.** It evaluates `closedField`, the same field `mouthParts` clipped the parts against (with a 2.2 mm wall), not the sealed and reduced skin. It can only fail on meshing error. For the skunk the test reads −2.19 mm (pass) while 6 of 8 upper teeth stand 2.44 mm outside the real closed skin (`tautology.mjs`).
3. **"Closed, a speaking head is the approved head: the same surface away from the mouth (within 3 mm, by test)"**, and in sculpt.mjs, "everywhere but a narrow band along the lip line". The test's "away from the mouth" is `lip.y ± reach` (18 cm tall) for x > xmin, which is exactly the region where `speakingField` returns the approved field unchanged and the seal is zero. So it only measures reduction error. Inside that band the closed outer skin departs by up to 4.4–7.9 mm, and the bull's closed silhouette is visibly different.
4. **"Rest. The rest pose seals the slit … and the lips within 1.8 cm follow."** The seal also moves the cavity floor and roof by about 5 mm and lifts thin chins (M4), and it does not seal: up to 29.6 cm² of interior is visible below the closed seam, and teeth show through it.
5. **"The tongue lies on the floor of the mouth."** It lies under the floor at the front. The pig-director's and hen's tongues are never visible; the rabbit's and sheep's 0–5%.
6. **"Lower incisors against a dental pad for the cattle, sheep and goat."** No dental pad exists, and the incisors expose 0–1.0 mm of crown (bull 0–0.1 mm; all 0 in the game mesh).
7. **"Canines for the dog, skunk and pigs."** The pig-director has none (6 + 6 uniform teeth). The others are boxes barely longer than the incisors.
8. **"Not done: Profile see-through. Where a long muzzle's mouth opens along its sides (horse, donkey, dog) … in exact profile, a gap above the tongue."** Understated. It is 11 of 12 characters, the whole mouth wedge (the tongue is not even visible in profile), 21–43 cm² on the horse at 6–12°. It remains at 15° toward the front and 30–45° toward the rear (real renderer, `shots/backdrop-author.png`, column 4).
9. **"The cavity keeps its walls, so it opens only through the lips" / "the jaw keeps its walls."** In front of the corners the slit removes the side walls (the mouth opens through both cheeks), and the remaining walls tear into stretched pillars (M8).
10. **`checks.json`, "0.03–0.4 of 255 mean, 0.04–0.4% of pixels"** is offered as evidence that the closed head matches the approved one. The numbers are real, but the crop dilutes the mouth: a mouth crop shows 0.65–9.4% (S8).

## Verified true
- **The copies are exact.** Median distance of shipped skull vertices to the copied field is 0.007–0.019 mm (max 0.36–2.58 mm, meshing error).
- **The triangle table** in the doc matches the JSON exactly (10,794–11,362 per character; authoring/game ratio 2.03–3.03).
- **Every part is edge-manifold**, and the 9 tests pass.
- **The rig** turns about the hinge correctly; lip weights sit on their own sides of the slit; the goat's beard follows the jaw.
- **Lip-line registration** is on the painted mouth line for 11 of 12 (the pig-director drifts about 6 mm, S6).
- **The closed heads match the approved surface away from the mouth** to within 1.35 mm.

## Suggested round-2 acceptance numbers
All measured on the authoring mesh, and again on the game mesh after step 3:
- Profile and rear three-quarter see-through at 6/12/24°: 0 mm².
- Jaw 0: 0 tooth or tongue pixels over the hemisphere, and closed seam groove no more than about 1 mm.
- No tooth or tongue vertex outside the skin next to outer skin, at 0/6/12/24°.
- Every tooth rooted at every angle; incisor crowns at least 4 mm exposed when open.
- Tongue at least 30% visible from the front at 12°.
- 0 outer self-intersections at 12° or less, and no visible folds at 24°.
- Jaw weight at least 0.9 along the profile jaw line from the jaw angle forward.
