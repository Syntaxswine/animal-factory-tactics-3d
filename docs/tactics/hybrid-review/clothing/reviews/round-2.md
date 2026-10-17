# Clothing and skinning: review round 2 of 5

The independent hostile reviewer's report, whole, as it was returned (2026-10-09). Its evidence paths (`R2\...`) are
the reviewer's scratch folder on the author's machine, not committed. What was done about each finding is in
[CLOTHING-SKINNING.md](../../../CLOTHING-SKINNING.md) and the commits after it.

```text
REVIEW ROUND 2 OF 5 - clothing and skinning on the game's characters
Single hostile reviewer, round 2 of 5. Branch anim/skinning-corrections @ 35fe629 (draft PR #7) against main before the
fit, b546dfb (skin\base). Evidence (scripts, logs, JSON, renders) is in
C:\Users\baals\AppData\Local\Temp\claude\C--Users-baals-Local-Storage-AI\e33eb111-2660-4364-95e9-ecb92a301f0b\scratchpad\review-skin-2\
written below as R2\. Renders are main | branch | difference (red: a pixel changed by more than 24/255). They were made
with round 1's R2\photo-review.mjs, through the review page that is already in both trees; nothing was copied into
either tree. Point counts come from R2\tools\sweep-points.mjs: a copy of the committed sweep that counts each finding
(and requires --root).

SCORE: 8/10

All three of round 1's must-fixes are fixed, and each fix holds when I check it myself. Outside the vertices the fit
records, nothing moves in any game motion I drove: on all eleven, the bones, the root, the weapon and every other vertex
match main exactly. The doc's tables are produced by the committed sweeps, and two independent runs reproduce those
sweeps. Where the game turns the head hard, the manes and the neck cloth look better. I found nothing that must be fixed.
Four things hold the score below 9:
- the handoff's own check, that a downward glance must not pull the bib through the shirt, now fails on the horse, and
  the doc does not say so;
- the comparison's unit, the pair-frame, cannot tell a 3-point graze from a 6,000-point crossing. It misreports garments
  in both directions, and it lumps the one new kind of crossing the fit makes (cloth folding through itself) in with the
  rest;
- the cache that makes later units cheap is tested by a test that cannot see the one way it can break;
- several of the doc's figures do not match the data behind them.

ROUND 1, FINDING BY FINDING
- MUST 1 (the idle's loops): fixed.
  - All 11 rig keys and 88 of 88 look plans are main's (R2\idleloops.log).
  - On a worker built the way the game builds one (create, battle posture, locomotion, rifle), on all 11: while the idle
    runs, its weights are main's (0 vertices differ); its bones are main's at five times; its fitted limits are main's;
    dispose restores every weight, on both trees (R2\idlelife.log).
- MUST 2 (the horse's fall): fixed.
  - 66 poses (6 x 11) equal main's to 0 mm and 0 degrees (R2\casualty.log).
  - The motion diff agrees for the down, the unstable down, down 0.5 and the dead body.
  - Test 3's fixture rebuilds byte-for-byte from b546dfb (R2\fixture-from-base.json).
- MUST 3 (net only; the mane fold): largely fixed.
  - --summary reproduces the body of summary.md byte-for-byte. It gives gross and net, crossings apart, and every pair
    that got worse.
  - The prone-aim fold is the crest skin's own, as the doc says. On main the skull folds through itself there (25
    points, 13.0 mm, rest y 1.318); on the branch the mane folds with it (32 points, 12.8 mm) (R2\where.mjs).
  - What remains is SHOULD-FIX 2.
- SHOULD 1 (the shoulders): fixed.
  - No vertex of any mammal loses arm weight (R2\shoulder.log).
  - The field ends at the shoulder joints: the horse's R is 12.8 cm and the field ends at 20.5 (R2\radius-sh.mjs).
- SHOULD 2 (the flame cards): fixed at rest; no card changed (R2\firezones.log). Posed, see the NITS.
- SHOULD 3 (the tests): fixed, apart from the cache (SHOULD-FIX 3).
  - My 14 mutants (R2\mutate-r2.mjs, mutate-r2.log): 10 killed.
  - Two survivors change no weight on any of the eleven, so they are equivalent: A10, a fade twice as wide, and A14, the
    hem tuck without its arm keep for vertices with other weight (R2\equiv.mjs, equiv-post.mjs).
  - Two survivors are real (SHOULD-FIX 3).
  - The author's own two survivors check out. The hard step changes no weight (R2\equiv.mjs). The casualty one changes
    the contact sets but not the four falls.
- SHOULD 4 (performance): fixed.
  - On an idle machine (9 interleaved rounds, medians; R2\perf2.log), main takes 14-20 ms. The first character of a
    mesh file takes 32-63 ms (+16-47). Every later one takes 14-16 ms, main's to within -4.6 to +0.2 ms.
  - The battle renderer builds every unit of a species from one parsed file (battle-renderer.js:61-62).
  - No leak: the heap is within 0.3 MB of main's (R2\heap.mjs, heap-shared.mjs).
- SHOULD 5 (tried and dropped): corrected. The totals reproduce from the author's data; one label is off (NITS).
- SHOULD 6 (scope and evidence): done.
- SHOULD 7 (motions): done. The cliff mantle runs the roof mantle (cliff-mantle.js:1), so it is covered too.

WHAT I CHECKED AND FOUND TRUE
- No regression outside the fit (R2\mdiff.mjs, mdiff-*.log, all 11).
  - Motions: the stance (stand, kneel, prone, down, dead, unstable down, down 0.5, the kneel and prone at a quarter, a
    half and three quarters), walk, aim (standing, kneeling and prone, three heights, recoil), throw, flamethrower,
    burn, mantle, descent, ladder, draw, and every weapon's carry including the HMG grip swap.
  - Result: bones, root, weapon and every non-fitted vertex identical (0.00e+0 in every frame), and the hand contacts
    are equal (at most 4.6e-16).
  - The pigs' RPG carry throws "Carry grip outside arm reach" on main too (R2\pigcarry.mjs). I compared their other
    weapons separately, and they are identical (R2\mdiff-pig-*.hmg.json).
- The data behind the tables.
  - The committed before sweeps equal round 1's independent full-body runs of main, pair for pair (261-494 pairs a
    character, none differ).
  - My own neck-focused runs, at 35fe629 and on b546dfb (R2\pts\), reproduce the committed sweeps' neck pairs in the
    aim, throw, mantle and ladder: 387 of 388 equal after, and 397 of 398 before. The one exception is the same on both
    sides (the bull's mantle shirt-into-overalls, 34 against 23 frames: the edge of the focus).
- The doc's table of changed vertices is exact (279, 288, 180, 363, 270, 279, 175, 231, 133, 366, 337, and the splits by
  layer). No skin, forearm, hoof, boot, tail or cap vertex is recorded (R2\parts.log).
- The test numbers in the doc and the test comments reproduce exactly (R2\testmetrics-branch-now.log). Test 8's three
  horse strap vertices move 0.64 mm (R2\t8.mjs).
- The mane-rule table and the 3 cm totals (19,479 -> 19,876; 16,226 -> 16,450) reproduce. So do the eased mane's folds
  (throw 35 frames at 14.7 mm, mantle 46 at 10.8, descent 8 at 5.1, prone aim 10 at 8.7).
- The outfits are paint plus rigid hats on the head bone (red-hat-model.js:46, donkey-straw-hat.js:20).
- Visual.
  - Through the throw, the manes now lie on the neck. On main the donkey's tip stands off as a spike and the horse's mane
    hangs away from his neck (R2\shots-b\donkey-throw143-mane-rear.png, horse-throw143-mane-left.png).
  - In the dog's prone aim, the neckerchief is now a whole band round the throat. On main the throat cuts it in two
    (R2\shots-a\dog-prone-m60-kerchief-left.png).
  - The goat's beard no longer pokes out beside the rifle hand in the kneeling aim at a high target
    (shots-a\goat-kneel60high-beard-three.png).
  - At gameplay size, nothing reads as a fault: the prone aim changes 50-156 px a view (shots-a\horse-prone-m60-
    gameplay-*.png), and the foreman on the ladder 138-219 px (shots-c\foreman-ladder050-gameplay*.png).

MUST-FIX
None.

SHOULD-FIX

1. The handoff's acceptance check on the bib is not met, and the doc does not say it is not.
   The handoff, beside the collar, scarf, shirt and bib correction: "A downward glance should not drag the lower chest
   or pull the bib through the shirt."
   Evidence (summary.md, and my point counts):
   - The aim nods the head down 72 degrees.
   - In the aim, the horse's bib top sinks into his shirt at the neck in 50 of the 70 frames, up to 9.8 mm and 1,405
     points. On main there is none.
   - The bull's, the cow's and the rabbit's do the same in 10 aim frames each (9.6, 7.9 and 8.3 mm), but those are
     grazes: 270, 10 and 10 points.
   - The horse's also does it in the throw (19 frames, 7.1 mm), and the goat's (11 frames, 3.7 mm).
   - It is small in extent, and I could not see it at the deepest frame (R2\shots-a\horse-aim60m1-bib-*.png). The doc
     lists it under "What got worse" as cloth on cloth. It never says the handoff's check fails.
   Its own data show a remedy, and I measured it per part:
   - The 3 cm reach freed the bibs but folded the neckerchiefs. A 3 cm reach for overalls, trousers and braces only,
     1.5 cm for everything else, was run on a scratch copy (R2\run-bibreach.sh, ptsv\, ptcmp.log; neck focus, aim,
     throw, mantle, ladder, all 11).
   - What it fixes: the horse's aim pair falls to 10 frames, 40 points and 4.8 mm, and the horse's and the goat's throw
     pairs vanish. The bull's, cow's and rabbit's 10-frame grazes stay as they are.
   - What it costs: the cow's neckerchief folds in 30 aim frames instead of 10 (7.1 against 5.5 mm), and the horse's bib
     sinks about 10% more into his neck skin (56,335 -> 62,280 points).
   - Overall it is even: crossings at the neck go from 6,872 to 6,782 pair-frames and from 10.82 M to 10.84 M points.
   Fix: either adopt the per-part reach, which meets the check on the horse at that price, or say in the doc that the
   check fails on the horse (and grazes on the bull, the cow and the rabbit), and why. Parts of their bib tops lie more
   than 1.5 cm from the shirt, so those parts take the skin's weights while the rest take the shirt's.

2. The comparison's unit cannot weigh how much of a crossing there is, and the tables lump in the self-folds.
   A pair-frame counts a 3-point graze and a 6,000-point crossing alike. My counts are for all 11, in the aim, throw,
   mantle and ladder, at the neck (R2\ptsum.log).
   (a) The doc understates the gain. In these four motions, crossings go from 7,297 to 6,872 pair-frames (-6%), but
       from 13.45 M to 10.82 M points (-20%). The doc's "-8%" (all motions, pair-frames) understates it in the same way.
   (b) By garment, the unit reads backwards. The pair-frames make these worse, and the points make every one better:

         garment                    pair-frames     points
         horse's bib                147 -> 254      -19%
         rabbit's neckerchief       158 -> 245      -40%
         sheep's neckerchief        324 -> 402      -29%
         dog's neckerchief          170 -> 197      -49%

       Of all the garments, only the pig foreman's braces grow by more than half a percent in points (+1%). On the
       ladder his crossings at the neck grow 15% in points, because the braces sink into the shirt: that pair goes from
       0 to 32 frames and 13,947 points.
   (c) The unit cannot see a regression where a pair is already present.
       - 28 neck pairs (2,098 pair-frames) are past 23 mm in every frame on main, so they can register no regression.
       - Two examples of growth that is not on the list: the sheep's neckerchief into its forearm in the aim goes from
         23,445 to 29,870 points (30 frames, past 23 mm, both sides). The horse's bib into his forearm goes from 185 to
         775 points (10 to 15 frames, 10.4 mm both sides).
   (d) The self-folds are lumped in.
       - Across the committed sweeps, self-folds at the neck go from 426 to 791 pair-frames (2 went, 367 came).
       - By part: the neckerchief wraps 0 -> 279, the mane 0 -> 31, the sheep's waistcoat 0 -> 30.
       - In extent they are small: 5,848 -> 7,613 points, under 0.1% of the crossing points.
       - But they are the fit's own new kind of defect, and the tables fold them into "crossings alone", where the gains
         elsewhere hide them.
   The committed tool records less than the author's first one did. The committed before sweeps carry each pair's
   point count ("n": 295 of them for the horse); the after sweeps carry none, because tools/clothing-sweep.mjs dropped
   it.
   Fix:
   - Put the count back in the sweep (e.n++).
   - Give --summary a points column and a self-fold column.
   - List a pair as worse when its points grow by a quarter (above a floor), as well as by frames or depth.
   - Restate the headline in points.

3. The cache's isolation is untested in the new file; only an idle timing test elsewhere catches its failure, by
   accident.
   Two mutants pass all ten tests (mutate-r2.log): A1, where the cache keeps the first character's live arrays (the
   `.slice()` dropped), and A2, where later characters share the cache's arrays.
   - Run in the game's order, they do real damage (R2\alias-demo.mjs). The battle renderer makes unit 1, gives it the
     battle posture, then makes unit 2 from the same parsed file. Under A1, unit 2 gets unit 1's hem-tucked weights at
     748 (horse), 561 (sheep) and 727 (dog) vertices. Under A2, a unit on a ladder rewrites the weights of every later
     unit (548-748 vertices). The committed code is right in both orders (0).
   - Across the 52 test files that build characters (R2\suite-mutant.log), the control passes 943 of 943, and A1 fails
     one test, in tests/idle-motion.test.mjs. A2 fails the same file (R2\idle-mutant.mjs; I did not run A2 on the other
     51). The failing test asserts that the head leads the chest on a wide look ("seed 3 Look left: head 3.57, chest
     3.57, hips 3.58 s"). It fails only because its fixture builds every horse from one parsed file and runs an idle on
     each, so it does not point at the cache.
   - Test 7 builds two characters from one data object, but never poses or postures the first before making the
     second.
   Fix:
   - In test 7, give the first character the battle posture and a ladder at mid-climb before making the second, and
     assert the second equals a fresh fit.
   - Then change the first character's weights, and assert the second's are unchanged.
   - Freeze the shared layerFit record (horse-light-model.js:166 hands one object to every character of a mesh file).

NITS
- "Through every motion it was the worst of four rules" (the mane eased 1-4 cm) is false by the table it introduces.
  Main's rule has the most pair-frames (horse 623, donkey 555, against 378 and 51); the easing is worst only through
  itself (102). The 1-8 cm easing beats the shipped rule on the horse (227 against 232; 26 against 31 through itself).
  "Much the same" is fair; say that instead.
- The 3 cm paragraph: the figures for each character (horse -6%, goat -2%, sheep +12%, cow and rabbit +5%, dog +2%,
  bull +1%) are for all pair-frames, but they follow a sentence about the crossings alone. For the crossings alone they
  are: horse -7.3%, goat -1.0%, sheep +8.2%, cow +6.9%, rabbit +4.8%, dog +0.6%, bull +0.9%.
- "the kneeling aim at a low target (250 to 1,000 pixels change)": the sheet's counts are 243 to 1,029.
- "the throat and the jaw swept through the collar ... past 23 mm in 50 to 70 of the aim's 70 frames on main, 40 to 70
  here". The committed sweeps have that pair in 70 of 70 frames on main for all ten, and in 50 to 70 here, deepest
  past 23 mm. They do not record how many frames lie past 23 mm, so the figures cannot be checked from the repository.
- "several are hidden from every side (no pixel changes)": only three sides were rendered (three-quarter, front, its
  left). "At gameplay size none shows" has no committed render for the worst crossings. The author's worst-gameplay
  sheet is in scratch, made after the commit (skin\sheets-worstgame, 21:07).
- The fade at the neck's base changes nothing on these meshes: a hard step, or a fade twice as wide, leaves every weight
  as it is (R2\equiv.mjs). The skull there is wholly the spine's. Also, a layer on a layer takes the under-layer's
  weights in full wherever the field reaches: the field only gates that branch and does not scale it. The doc's "It
  takes them in full within 3 cm ..., easing ..." reads as applying to both branches. Say that a layer on a layer
  follows the layer under it in full, and the easing reaches it through the shirt.
- The fire's cards are main's at rest only.
  - The game makes them in the unit's current pose (battle-fire.js:101 -> fireBodyZones on s.model.worker, measured
    from skinned positions).
  - Posed, they differ (R2\firezones-posed.mjs): the horse's head card is 75.4 -> 67.3 cm wide in the throw (its centre
    3.8 cm away) and 60.1 -> 66.3 cm in a standing aim at a low target; the donkey's is 63.8 -> 70.8 cm; several spine
    cards change height by 1-3.4 cm (taller in that aim, shorter in the throw).
  - Likewise, the casualty's contact sets are the names', but their heights are skinned with the fitted weights. So
    "reading the names' weights keeps that so for any mesh" overclaims; "on these meshes" is what was shown.
- "The motion viewers and the horse chair study use the older adapters, which the integration review fixed": the horse
  prone study (animal-prone-motion.js:21-26, built on createMammalMotion) rewrites the shirt's weights assuming the slots
  hips, spine, upper arm, forearm. It erases the fit's head share outright (the shirt's head weight 20.69 -> 0.00), so
  that study plays main's collar, within 1 mm of main (R2\prone-viewer.mjs). It is harmless, but it is not fixed.
- At the throw's widest turn (t 1.40) the sheep's neckerchief turns under the wool ruff and all but vanishes, close up
  from the three-quarter left (R2\shots-a\sheep-throw140-kerchief-threeleft.png). At that frame the census has it
  sinking 20% further into the skull (1,799 -> 2,163 points). From the game's camera at 500 px a metre it still shows
  (shots-d\sheep-throw140-game500-*.png), and over the whole throw the sheep's crossings fall 62% by extent. It belongs
  in the doc's owned list beside the ruff.
- Test 10's threshold (1 cm) sits between the shipped worst (8.8 mm) and the 3 cm reach (15.6 mm). It pins a new defect
  as acceptable: main's neckerchiefs never fold through themselves. Its name, "keeps its shape", says more than it
  tests.
- Test 9's thresholds (none in the mantle and the descent, 8 mm in the throw) are the shipped rule's own results. Test
  8 has fitted vertices to check on the horse only; for the other ten it checks nothing.
- The field's easing, smooth(R+.03, min(R+.13, SH), r), inverts if a mesh's shoulder joint lies within 3 cm of the
  neck's radius: with b < a, the field is 1 beyond the shoulder. That is not so on these eleven (the horse's margin is
  4.7 cm, the others' 8.4-15.6: R2\radius-sh.mjs), but the cap was added for thick necks. Guard it.
- named() is copied into three files (idle-motion.js:153, casualty-pose.js:4, painted-fire-zones.js:5). One helper,
  beside preserveClothingHeadWeights, would keep them from drifting apart.
- The doc's create() times were measured under load. On an idle machine the first character costs +16-47 ms, and later
  ones cost what main's do (perf2.log).
- Process: main (d1928b6, origin/main) carries the first version. Its idle-fits.js is keyed by the changed keys (the
  horse's is k742d7dda), and its idle key, casualty and fire cards read the fitted weights. So round 1's MUST 1 and
  MUST 2 are live on main until PR #7 merges.

ROUND CHECKS
- Repository untouched: HEAD is still 35fe629; git status --porcelain is empty; the full status including ignored files
  matches the snapshot I took at the start (R2\git-status-ignored-before.txt, git-status-ignored-now.txt). I committed
  and pushed nothing.
- One slip, owned: early on, a shell line lost its cd, and three error logs of mine (casualty.log, firezones.log,
  shoulder.log, each holding only a "Cannot find module" error) were written into the worktree root. I deleted those
  three files within a minute, and the status was clean straight after.
- No scratch copy remains. mut-0..14, eq-copy-*, alias-*, suite-control, suite-A1, idlemut-* and v-bibreach were each
  deleted in a finally block (or a shell trap), and none exists now.
- None of my processes is still running: no process has review-skin-2 in its command line, and no headless or
  Playwright Edge is running. I stopped nothing of anyone else's. The preview servers on 4487 and 4488, the 4489
  server and the author's own processes were left alone.

```
