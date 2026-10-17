# Clothing and skinning: review round 1 of 5

The independent hostile reviewer's report, whole, as it was returned (2026-10-09). Its evidence paths (`R1\...`) are
the reviewer's scratch folder on the author's machine, not committed. What was done about each finding is in
[CLOTHING-SKINNING.md](../../../CLOTHING-SKINNING.md) and the commits after it.

```text
REVIEW ROUND 1 OF 5 - clothing and skinning on the game's characters
Single hostile reviewer, round 1 of 5. Branch anim/skinning-corrections @ ffda21f against main b546dfb (draft PR #6).
Evidence (scripts, logs, JSON, renders) is in
C:\Users\baals\AppData\Local\Temp\claude\C--Users-baals-Local-Storage-AI\e33eb111-2660-4364-95e9-ecb92a301f0b\scratchpad\review-skin-1\
written below as R1\. Renders are main | branch | difference (red = pixels changed by more than 24/255). They were made
with the author's _skin-review page on both servers (4488 main, 4487 branch) by R1\photo-review.mjs, which copies
nothing into either tree.

SCORE: 5/10

The neck fit itself is real and correctly coded. Collars, neckerchiefs, bib tops and hair now ride the neck in the throw,
ladder, mantle and descent, and every vertex outside the fit keeps main's weights. But two of the doc's central claims
are false: "the idle study is unchanged" (every loop of every character changed) and "nothing else moves" (the horse's
casualty pose and the burning flame cards moved). The before/after comparison reports a net figure that hides 1,221 new
pair-frames of crossings and a visible new fold, and no test can see any of it.

WHAT I CHECKED AND FOUND TRUE
- Rest geometry and bones are identical to main on all 11 (max diff 0). After create() and after the battle posture,
  every vertex outside userData.layerFit has main's weights exactly. No skin, forearm, hoof, boot, tail or cap weight
  changes, and 9.7-21.4% of each shirt changes (R1\wdiff.mjs, wdiff.json). The hem tuck's new branch matches an
  independent restatement to 3e-8 on all 11 (R1\tuckcheck.mjs).
- I ran main and the branch side by side, all 11 mammals, through stance, walk, aim, throw, flamethrower, burn, mantle,
  descent, ladder, draw and every weapon's carry, including the HMG grip-mesh swap (R1\mdiff.mjs, mdiff-*.log,
  mdiff-hmg.mjs). Bones, root, weapon and every non-fitted vertex are identical, and the hand-contact errors equal
  main's (all below 5e-16). The one exception is the horse's casualty pose (MUST-FIX 2).
- Clipping outside the neck barely moves. My full-body census of all 11 through every swept motion (R1\full\, 22 runs;
  R1\fullcmp.mjs) gives torso 57,722 -> 57,699, arm 24,846 -> 24,859 and legs 21,378 -> 21,353 pair-frames: 24 more,
  59 fewer. At the neck it gives 13,331 -> 9,667. For 10 of the 11 this matches the author's neck-focused runs exactly;
  the bull differs before the change only (926 against 915) (R1\crosscheck.mjs). The doc's table reproduces exactly
  from the author's data (R1\summarize-author.cjs on skin\neckall).
- The new test file passes 4/4. The 75 tests in idle-fits, idle-motion, idle-clothing, battle-posture, ladder-motion,
  horse-light and weapon-grips pass on the branch (R1\test-idle-etc.log). The author's 8 mutants are all killed when
  re-run (R1\mutate-author.log). The idle's fitted limits equal main's for all 11. On a worker built the way the game
  builds one they also match, and dispose restores every weight, for the five I checked (horse, cow, sheep, dog,
  foreman; R1\idlelife.mjs).
- create() costs 16-52 ms more per character on an idle machine (doc: 16-60 ms); see SHOULD-FIX 4. No leak: heap
  after 44 build/dispose cycles equals main's, at 1.37 MB per live character on both (R1\heap.mjs). The red hat and the
  straw hat are rigid meshes on the head bone, and the Hawaiian shirt is paint.
- The doc's test numbers are confirmed: 39 points / 5.7 mm (test 3), 0.3-3.6 mm (test 4), the director 68.5 against
  75.0 mm, the sheep 40.2 against 63.2 mm, and main's 19-66 mm (test 1) (R1\testmetrics.mjs, testmetrics-*.log).

MUST-FIX

1. The idle study's loops changed for every character and every seed, though the doc says "The idle study is
   unchanged".
   Evidence: idle-motion.js:449 seeds each loop with seed ^ rigKey, and rigKey (idle-motion.js:153-158) hashes the skin
   weights, which create() now changes. All 11 keys changed (horse k496929a7 -> k742d7dda, goat k7844e6e4 ->
   kb8010023, ...), and none of the 88 look plans (11 mammals x seeds 1-8) matches main's (R1\idleloops.mjs). With the
   same seed and the same limits, and deterministic within each tree, the bones still end up as much as 13.5 cm apart
   between main and the branch (horse, seed 3, thigh1; R1\idledet.mjs). IDLE-LOOK-AROUND.md's new paragraph claims only
   that the limits are unchanged. Its verification table (phantom-wrench on seed 1 of all eleven; head turn, gaze and
   hips over seeds 1-8; the centre-of-pressure margins) now describes loops that no longer play. Every idle test passes
   because none pins a loop.
   Fix: hash the plain weights. Have rigKey's fingerprint read userData.layerFit's recorded weights for the fitted
   vertices, or take the key after the idle restores them. The keys then return to main's, idle-fits.js needs no
   re-keying, and every seed replays its approved loop. Add a test that pins seed 1's look plan (labels and times) for
   each rig to a committed table.

2. The horse's casualty pose changed: its right hand now lies on its muzzle, and the forearm sinks into its head.
   Evidence: in battle-posture's 'down' (stable), upperArm1 turns 28.2 degrees from main, the hand moves 137 mm and the
   body sits 4 mm lower. The unstable 'down' moves 5.0 degrees / 25 mm and 'down 0.5' 2.6 degrees / 14 mm. The other ten
   mammals are unchanged (R1\casualty.mjs).
   Renders:
   - R1\shots-i\horse-down-head-three.png: on main the bare forearm lies beside the head; on the branch the glove is on
     the muzzle.
   - R1\shots-c\horse-down-arm-top.png.
   - R1\shots-i\horse-down-gameplay-front.png: 408 px changed at 130 px a metre.
   My full-body census finds "forearm and hand 1 into unified skull jaw neck and ears" at 'down' on the branch only,
   deeper than 23 mm (R1\full\horse-main.json and horse-branch.json, via R1\fullcmp.mjs).
   Cause: casualty-pose.js:50-59 picks its contact sets by weight > 0.8 when the posture first goes down. The fit took
   arm weight off 58 horse shirt vertices on the shoulders (SHOULD-FIX 1) and head weight off the mane (head set
   1,062 -> 991 vertices, body set 1,339 -> 1,303), so settle() finds a different arm turn. Nothing caught it: the sweep
   counts crossings, not poses, and battle-posture.test passes.
   Fix: remove the root cause by keeping each vertex's arm weights out of the mix. I tried this on a scratch copy
   (R1\fixcheck.mjs), letting the skin's weights replace only the torso share. The horse's casualty pose returns to
   main's within 0.04 mm and the new test file still passes 4/4. Also take casualty-pose's sample sets from the plain
   weights (layerFit), and add a test that the casualty bone poses of all 11 equal main's.

3. The comparison reports a net figure, and "What got worse" leaves out most of what got worse, including a visible
   fold.
   Evidence: the author's own neck-focused data (skin\neckall) go from 13,320 to 9,667 pair-frames at the neck. That is
   4,874 fewer and 1,221 MORE, over 80 part pairs that got worse; my full-body runs give the same 1,221. The doc names 6
   of the 80. Left out, for example:
   - the goat's beard into its overalls 5 -> 25 frames (14.5 -> 15.7 mm), and the overalls into the beard 5 -> 25
     (9.3 -> 12.8 mm), in the throw;
   - the horse's mane through itself 0 -> 20 frames (5.8 mm) in the throw and 0 -> 10 (12.8 mm) in the prone aim;
   - the horse's skull into its shirt 0 -> 19 (8.3 mm) in the mantle;
   - the horse's shirt into its overalls 0 -> 25 (10.6 mm), and the overalls into the shirt 0 -> 20 (7.5 mm), in the
     throw;
   - the foreman's braces into his shirt 10 -> 50 (15.3 mm) in the aim and 0 -> 32 (10.3 mm) on the ladder;
   - the sheep's waistcoat into its shirt 3 -> 16 frames, deeper than 23 mm, in the mantle;
   - the sheep's neckerchief into its shirt 0 -> 10 (14.6 mm) in the prone aim;
   - the rabbit's neckerchief into its shirt 0 -> 46 in the mantle;
   - the cow's, rabbit's and dog's neckerchiefs through themselves, 0 -> 23 each, in the throw.
   Outside the neck, which the neck census never sampled, three crossings got deeper: the goat's rifle forearm into its
   beard 10.0 -> 18.6 mm (35 frames, kneeling aim at a high target), the dog's forearm into its neckerchief knot
   7.1 -> 13.1 mm (mantle), and the horse's sleeve fold 45.8 -> 53.3 mm (throw).
   "None of it shows in the renders" rests on renders of none of these frames, and one does show. In the prone aim
   (bearing -60, recoil), the horse's mane tip folds out beside the collar as a loose flap on the branch and is clean
   on main: R1\shots-l\horse-prone-aim-m60-throat-zoom.png and -grey.png (geometry, not paint), and at 900 px a metre
   R1\shots-k\horse-prone-aim-m60-mane-reartop.png.
   Fix: report gross gains and losses per motion and per character, list every pair that got worse (10+ frames, or
   deeper), and render the worst. Fix or own the mane fold: hair takes the skin's weights in full however far it stands
   off the skin, so the prone aim's 87-degree bend of the two-bone neck collapses it.

SHOULD-FIX

1. The fit reaches the horse's (and the bull's) shoulders, so "those round the neck" is false, and the neck census
   could not see it. The field eases to zero R + 13 cm from the neck axis, where R is the skull's median radius:
   12.8 cm for the horse, 9.1 the bull, 11.1 the foreman, 10.4 the director and 5.6-7.3 the rest (R1\radius.mjs). For
   the horse the field therefore ends 25.8 cm out, past the shoulder joints at 20.5 cm.
   - 58 horse shirt vertices lose more than 2% of their arm weight, up to 25 points (0.536 -> 0.285 at
     [-0.05, 1.269, 0.21]).
   - 57 changed vertices lie outside the sweep's neck focus, and 80 are filed outside '@neck'. The bull loses up to 5
     points on 5 vertices (R1\shoulder.mjs).
   - It shows in motions that hardly turn the head: the horse's draw differs only at the raised shoulder's seam
     (R1\shots-sheet\horse-draw-0.5.png).
   - In my full-body census the horse's '@arm' goes 1,735 -> 1,753 pair-frames, with none fewer.
   - It drives MUST-FIX 2.
   Fix: as in MUST-FIX 2 (keep arm weights out of the mix), or fade the field out before the shoulder. Also say in the
   doc which vertices change.

2. The burning flame cards changed for six mammals, and nothing mentions it. painted-fire-zones.js:11, which the game
   uses (battle-fire.js -> painted-fire-effects.js), makes one card from the box of the vertices whose largest weight
   is on each bone. The fit moves manes and collars between bones:
   - the horse's head card 67.0 -> 59.4 cm tall (its centre 3.3 cm away) and its spine card 58.9 -> 61.9 cm;
   - the donkey's head card 68.2 -> 58.9 cm (centre 3.9 cm away);
   - the horse's upper-arm cards 0.5-1.1 cm smaller;
   - the cow's, rabbit's and dog's spine cards 1.1-1.2 cm shorter;
   - the director's head card 0.7 cm taller (R1\firezones.mjs).
   Fix: build the zones from the plain weights (layerFit), or re-approve the burn with renders.

3. The tests are meaningful at the neck and blind everywhere else.
   Of my 13 mutants (R1\mutate-r1.mjs, mutate-r1.log; each run on a scratch copy outside the repository, deleted
   afterwards), 6 are killed by the new file, 2 only by idle-fits.test's refit, and 5 SURVIVE:
   - #1 no fade-in at the neck base (the field runs down the chest);
   - #5 the 3 cm reach the doc rejects;
   - #10 the hem tuck moves a collar vertex's arm weight to the spine;
   - #11 the hem tuck swaps hips and spine on collar vertices;
   - #12 the ladder corridor gives a collar vertex no arm weight.
   Why they survive:
   - Test 2 skips every vertex with head weight (clothing-layers.test.mjs:58,
     "if(!p.proneAim?.tuckHem||h>0)continue;") and on the ladder checks only the head weight, so the new branches
     (battle-posture.js:37-38, ladder-motion.js:37-38) are tested on one number.
   - No test moves an arm, plays a game motion, or compares anything with main.
   - Test 4 reads 0.0 mm on main for every mammal: it tells layer-on-layer from layer-on-skin and nothing more.
   - Test 3's cloth-into-cloth half is also 0 on main.
   - Test 1 rests on 6-16 vertex pairs for six mammals: the skunk 6 (exactly its >=6 floor), the director 7, bull 12,
     cow 14, donkey 16, foreman 16.
   - Test 4's margin on the cow is 0.4 mm (3.6 against 4).
   The casualty pose, the flame cards and the idle loops all pass every suite.
   Fix: restate the new branches in full (R1\tuckcheck.mjs does it in 20 lines). Assert that every vertex beyond the
   field, and every arm weight, keeps main's weights. Pin the casualty poses and the idle loops, and run the throw
   through the census at the shoulders.

4. Performance. On an idle machine, the median of 9 interleaved runs (R1\perf.mjs, perf-idle.log) is 17-24 ms for
   create() on main and 38-72 ms on the branch: 16-52 ms more, or 1.7-3.6 times (the rabbit 20 -> 72 ms, the cow
   21 -> 67 ms). Under load it was 34-91 ms more. The doc's 16-60 ms holds, but the ratio matters:
   - In the game, characters are made lazily on the main thread as units come near the viewport or are first detected
     (hybrid-renderer.js:95-97 -> battle-renderer.js:62), so each creation is a frame hitch, now 2.3-4.3 frames long
     at 60 fps instead of 1.0-1.4.
   - The ladder-preparation worker pays the cost per species and tower, off the main thread.
   - The fit is identical for every unit of a species and is recomputed every time.
   Fix: compute it once per mesh file (cache the fitted skinIndex, skinWeight and layerFit by profile.file, or bake them
   into the data).

5. "Tried and dropped" is partly wrong.
   - The forearm strip is said to change "nothing in the aim, the flamethrower or the ladder". The author's own horse
     runs (skin\armx) show it changed the aim (the sleeve's fold at the arm 18.7 -> 31.6 mm), the ladder (six pairs;
     the fold at the torso 30.6 -> 36.3 mm) and the flamethrower (20.1 -> 18.6 mm). No-strip baselines for those
     motions exist only for the horse.
   - The 3 cm reach was measured on the throw and stance of five mammals. The doc gives its costs but not its gains:
     the horse's shirt into overalls 25 -> 0 frames, overalls into shirt 20 -> 0, overalls into skull 26 -> 1, and the
     sheep's neckerchief into its waistcoat 22 -> 0. Those horse strap crossings are ones the shipped 1.5 cm reach
     introduces (0 -> 25, 0 -> 20) without listing them.
   Fix: correct the text, or measure both variants on all 11 and every motion before choosing.

6. Handoff scope and evidence.
   - The foreman's hem and waistband against his forearms is in the handoff's table and in step 3 of this branch's own
     plan, but it is neither done nor mentioned in the doc.
   - Only three close-up sheets are committed. There are no paired views at gameplay size; none of the ladder, mantle,
     descent, aim, walk or draw; none of the Hawaiian outfit; and none of turns, glances, breath, leans or arm movement
     from four sides.
   - The doc's table cannot be regenerated from the repository: the summarizer and the 22-run driver are in the
     author's scratch folder.
   Fix: commit a summary mode (gross and net, every region) and the run recipe, add the paired sheets the handoff asks
   for, and list what was not attempted.

7. The sweep leaves out game motions that pose the neck: the burning victim (battle-fire.js:126, where fitted vertices
   move up to 5.8 cm differently from main; R1\mdiff-*.log), the tank blast, the fall itself (down 0.5, the unstable
   down), the wooden ladders and the hatch. Add at least the burn and the fall.

NITS
- The field has no upper bound: 223 of the foreman's 352 cap vertices are written into layerFit although they are
  unchanged. Bound the field at the head, or skip vertices whose weights do not change.
- "2-10 mm measured" (test 1) is actually 3.8-9.6 mm. In "on the name rules' weights hundreds, 11-16 mm", the donkey
  has 0 points on main and the cow 10.6 mm.
- "Its head roll (49 degrees on the horse, to lay the cheek on the stock)": in the horse's aim frames the head's turn
  on the chest is a yaw of at most 28 degrees and a nod of up to 72 degrees standing and 87 prone, with no roll about x
  (R1\headroll.mjs). I could not reproduce 49; say how it was measured.
- "The donkey's mane off its neck in the throw (109 to none)": the census pair is the mane sinking into the skull.
- Pair-frames add up motions sampled at different rates (the throw at 30 a second, the mantle and the ladder at 101
  per motion) into each character's percentage.
- Disposal order: a ladder motion made before the idle and disposed first leaves 211-1,102 vertices with the wrong
  weights, on main as on the branch (R1\idlelife.mjs); disposing the idle first restores them all. This is
  pre-existing and worth a guard, but not in this change.
- The author's first refit (skin\fit-idle.log) shows that with the character's fit left in, the idle's own fitter found
  less clean range (cow nod 25 -> 20, dog nod 20 -> 10, sheep turn 40/10 -> 30/25). That is the reason the restore
  exists, and the doc should say so.
- Housekeeping: the scratch page dist/tactics/_skin-review.* is hidden by a line added to the shared
  .git/info/exclude.

ROUND CHECKS
- Repository untouched: HEAD is still ffda21f; git status --porcelain is empty; the full status including ignored
  files (1,661 lines) matches the snapshot I took before starting (R1\git-status-before.txt and git-status-now.txt).
  I committed and pushed nothing.
- No scratch mutation copies remain: R1\mut-0 .. mut-12, R1\mut-author and R1\fixcopy were each deleted in a finally
  block, and none exists now.
- None of my processes is still running: no node process with review-skin-1 in its command line, and no headless
  Playwright browser. All 22 sweep runs finished by themselves. To find out whether TaskStop kills a task's child
  processes, I started a 10-minute dummy node process of my own and stopped it. TaskStop left the node process running
  until it exited on its own, which is why I let the sweeps finish rather than stopping them. I stopped nothing of
  anyone else's, and the preview servers on 4487 and 4488 were left running.

```
