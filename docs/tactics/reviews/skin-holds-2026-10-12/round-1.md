> Independent hostile review of PR #9 (fix/skin-restore-order), one reviewer per round under the standing five-round rule. Round 1. The probe scripts and logs it names (scratchpad/review-1/...) lived in the review session's scratch space and are not in the tree; the commands and numbers are as the reviewer ran them.

# Hostile review, round 1 of 5: skin holds (7fc6afe, fix/skin-restore-order)

**Score: 8/10.** The code fix is correct and well tested for the pair it targets, and it changes nothing on the
normal paths. One must-fix: the docs and the `skin-holds.js` header promise more than the mechanism gives. Two
controllers outside that promise still break: a controller that takes no hold, and a second ladder.

## How I worked

- I made my own detached worktrees from the main clone under
  `scratchpad/review-1/`: `branch` (7fc6afe), `main` (74a8a6b), `mut`, `mut2`, `mut3`, `mut4` (7fc6afe, one per
  mutation runner) and `merge7` (7fc6afe plus `git merge --no-commit --no-ff 89e9917`). I removed every one with
  `git worktree remove --force` at the end (the merge was aborted first). I did not touch the author's worktree or
  the main clone. At the end the author's worktree was clean at 7fc6afe, and the main clone was clean on
  `anim/idle-look-around` b8f6a53, as it was at the start.
- Before the first mutant, every mutation sandbox was clean (`git status --porcelain`), and the unmutated control
  (M0) passed in it: 14/14. After the last mutant every sandbox was clean again, and `git hash-object` of each
  mutated file matched `git rev-parse 7fc6afe:<file>`. My fresh checkouts differ from the author's working copy
  by CRLF only (autocrlf). The blob hashes are identical.
- The probes are in `scratchpad/review-1/probes/`, the logs in `scratchpad/review-1/logs/`. Every probe loads all
  modules from the tree passed on the command line, so the same probe runs on main, the branch and the PR #7
  merge. Each worker is built the way the game builds one: `profile.create`, `createBattlePosture`,
  `createWorkerLocomotion`, the rifle, `pose('neutral')`.

## 1. The defect on main, and the fix on the branch (`probes/repro.mjs`)

`node repro.mjs <tree>`: a floor ladder at 0.3, then an idle (seed 3) at 2 s, all 11 mammals, both disposal
orders.

| mammal | main: ladder first, final wrong verts | main: idle first | main: verts lost under live idle | branch: final wrong (both orders) | branch: lost under live idle (all parts / off the arms) |
|---|---:|---:|---:|---:|---|
| horse | 284 | 0 | 2,498 | 0 | 198 / 0 |
| goat | 313 | 0 | 2,339 | 0 | 217 / 0 |
| bull | 321 | 0 | 2,347 | 0 | 217 / 0 |
| cow | 296 | 0 | 2,539 | 0 | 200 / 0 |
| donkey | 281 | 0 | 2,323 | 0 | 184 / 0 |
| sheep | 211 | 0 | 2,432 | 0 | 184 / 0 |
| skunk | 299 | 0 | 2,111 | 0 | 207 / 0 |
| pig foreman | 263 | 0 | 2,048 | 0 | 206 / 0 |
| pig director | 519 | 0 | 2,166 | 0 | 206 / 0 |
| rabbit | 931 | 0 | 2,671 | 0 | 200 / 0 |
| dog | 974 | 0 | 2,877 | 0 | 200 / 0 |

My numbers match the author's: 211-974 and 2,048-2,877. On main the rig key is also wrong after the
ladder-first order. On the branch every part ends on its own skeleton with its own bind matrix, there is no neck
bone in the rig, the rig key is the worker's own, and no holds are left. The only change under the live idle
after the ladder's dispose is `forearm and hand 1` (`probes/armparts.mjs`), which goes back to its own weights.

## 2. Probes beyond the author's test

**Stacking and disposal permutations** (`probes/perms.mjs`). Six stackings (LI, IL, LL, LIL, ILL, LLI) times every
disposal order makes 24 runs on the horse. After each dispose the probe checks two things: whether any skin index
with weight points outside its part's skeleton, and whether a controller disposed *under* a live one changed the
skin outside the arms. At the end it checks the worker's own weights, skeleton, bind matrix, neck bone, key and
holds, the hands' triangle index and positions, and the weights again after `pose('carry')` and
`pose('neutral')`.

| | main 74a8a6b | branch 7fc6afe |
|---|---|---|
| orders ending with wrong weights | 15 / 24 (284 to 2,498 verts) | **0 / 24** |
| orders that put out-of-range bone indices on the geometry while a ladder plays on | 8 / 24 (up to 1,011 slots) | **0 / 24** |
| orders that pull skin from under a live controller (off the arms) | 18 / 24 (up to 2,300 verts) | **0 / 24** |
| orders leaving `forearm and hand 1` with a cut triangle index and moved positions (and the wrong rig key) | 10 / 24 | **10 / 24** (the same rows) |

The 8 out-of-range orders on main come from the reverse variant: the idle is disposed first under a ladder made
after it, the idle rebinds the original skeleton, and the ladder plays on with weights that name the vanished
neck bone. The branch fixes this case as well (test 3 covers it), but the commit message does not mention it.

The 10 rows the branch does not fix are exactly the ones where two ladders are made and the older one is
disposed first. See SHOULD-FIX 1.

**Progress values, preset, species:**
- Ladder at 0, 0.5 and 1 (`perms.mjs <all 11> LI,IL <p>`): 44 / 44 rows clean at each value.
- Tower preset (horse, pig director, dog; LI, IL, LIL): LI and IL are clean. LIL shows only the two-ladder hand
  rows.
- Pigs: all 11 mammals run everywhere above.

**transition()/restore() between creations** (`probes/extras.mjs`, horse, pig director, dog, rabbit, pig
foreman). Each species ran `transition(.5)`, `transition(0)`, `restore('carry')` and "made, never applied", each
in both disposal orders. All 40 runs end clean. In the 20 ladder-first runs, 0 vertices off the arms are lost
under the live idle.

**Construction failures while holds exist** (all 5 species above):
- A `preparedOnly` ladder over a live idle, with the route cache cleared, throws "Prepared ladder route does not
  match this rig". A ladder with `plane: 1.5` throws "... outside reach" during the bake. In both cases the idle's
  skin is unchanged (0 verts), the holds are `[idle]`, the neck stays bound, and the idle then disposes clean.
- An idle with a bad eye over a live ladder throws. The holds are `[ladder motion]`, the ladder still applies and
  disposes clean.
- One side effect, unchanged from main: after the failed ladder, 0 of 8 parts are still on the idle's attribute
  objects. The ladder's catch swaps in its own clones, which hold the same values, so it is harmless.

**The neck while waiting, the rig key and IDLE_FITS** (case 2, all species):
- The neck bent 0.116 rad under the ladder. After the idle's dispose it is at 0, and it stays at 0 after
  `ladder.apply(.6)`. It stays parented to the spine.
- `rigKey` while the idle waits equals the own key.
- A second idle is refused with the waiting message.
- After the ladder's dispose, a new idle is made in 208-385 ms (a FITS cache hit on the own key) and disposes
  clean.
- When the ladder waits under a live idle, `rigKey` is the key read on the climbing rig, which is not own and
  not in IDLE_FITS. That is consistent with what LIVE means, and the docs make no other claim.
- Side note: the game-built worker's own key (with posture and rifle) is not in IDLE_FITS on the branch or on
  the merge (`k23739109`, `k37b2a7ab`), so a game-built worker always fits on its first idle. That is a fixture
  fact, not this change.

**Attribute identity and reads while a restore waits:**
- Out-of-order runs end with the same weights and skeleton as LIFO runs. One part differs: the support arm ends
  on the worker's own stored object instead of a ladder clone. One `pose()` call makes them identical
  (`probes/identity.mjs`).
- While a restore waits, the ladder's constructor reads skin indices against `worker.bones`. The neck index then
  maps to `undefined` and is kept as "other". `ladder-paint.js` uses `?.name`. Both are safe.

**The rejected vertex-wise rule** (`probes/vertexwise.mjs`, value snapshots on main). I simulated "put back only
what you changed, only if it still holds what you wrote", with the ladder disposed first. It leaves the ladder's
weights on exactly the vertices both controllers rewrite: 27 (sheep), 51, 86, 92, 96, 96, 97, 104, 192, 727,
768 (dog). **The author's reasoning and the 27-768 count are confirmed.**

## 3. Normal paths: no behaviour change

Tests, each file run alone with `node --test`. The control column is main 74a8a6b; `-` means not run there.

| file | branch | main | PR #7 merge |
|---|---|---|---|
| skin-holds | 14/14 (42 s) | - | 14/14 |
| ladder-motion | 14/14 | 14/14 | 14/14 |
| idle-motion | 30/30 (207 s) | 30/30 | 30/30 |
| idle-fits | 3/3 | 3/3 | 3/3 |
| idle-clothing | 2/2 | 2/2 | 2/2 |
| equipment-stow | 2/2 | 2/2 | - |
| tactics-pages-files | 2/2 | 2/2 | 2/2 |
| ladder-journey | 16/16 | - | - |
| pig-ladder-journey | 4/4 | - | - |
| wooden-ladder-journey | 13/13 | - | - |
| hen-ladder-journey | 3/3 | - | - |
| ladder-equipment-journey | 13/13 | - | - |
| ladder-actions | 3/3 | - | - |
| ladder-gameplay | 11/11 | - | - |
| clothing-layers | 4/4 | - | 10/10 |
| clothing-motion-adapters | - | - | 3/3 |

**A/B** (`probes/ab.mjs`): 11 mammals × 4 lifecycles, printing a signature after every step. The lifecycles:

- S1, ladder alone: apply, transition .5/0/1, restore carry, apply .7 down, dispose twice.
- S2, idle alone: at, poseHead, at, dispose twice, then a second idle.
- S3 and S4: the two LIFO pairs.

Each signature holds:

- per part: a hash of the skin index and weight values, the attribute objects numbered by first appearance (so
  the identity pattern compares across trees), the index and position objects, skeleton identity and bone
  count, and the bind matrix;
- every bone's local transform;
- the root transform and its matrixWorld, and the hand bones' matrixWorld;
- `rigKey`.

**main and branch outputs are byte-identical (308 lines, `cmp`).** The signature discriminates: on the horse,
S1 takes 7 distinct states over its 10 steps.

## 4. Mutation test of `tests/skin-holds.test.mjs`

Harness: `probes/mutate.mjs`. Each mutant does an exact-string replacement that must match once. The tests run
with a plain `node --test` in a private TEMP, and the file is restored in a `finally`. The "Pass" column is
tests passed out of tests run under the mutant, so a low number means many tests failed.

| id | mutant | result | pass | killed by |
|---|---|---|---|---|
| M0 | control (×3 sandboxes) | passes | 14/14 | - |
| H1 | `release`: no early return if already released | survived, **equivalent** | 14/14 | ab + perms byte-identical; both controllers guard with `disposed` |
| H2 | release pops only itself (no cascade) | killed | 1/14 | order test: "released abc" |
| H3 | release restores at once (main's order) | killed | 1/14 | "a put back while a later hold was live" |
| H4 | restores run oldest first | killed | 0/14 | same |
| H5 | `top` = oldest hold | killed | 0/14 | top/above asserts |
| H6 | `above()` not reversed | killed | 13/14 | deepEqual `['c','b']` |
| H7 | first error -> last error | survived | 14/14 | untested: needs two throwing restores (unreachable today) |
| H8 | failing restore swallowed | killed | 13/14 | "Missing expected exception" |
| H9 | a throwing restore stops the cascade | killed | 13/14 | `seen` deepEqual |
| H10 | empty stack left in the WeakMap | survived, **equivalent** | 14/14 | ab + perms byte-identical (memory only) |
| H11 | no restore-is-a-function check | killed | 13/14 | "needs a function" |
| H12 | `skinHolds` reports all live | killed | 1/14 | holds deepEqual |
| L1 / L2 / L3 | `held()` removed from apply / transition / restore | killed | 13/14 each | "made after it holds the skin (idle)" |
| L4 | restore after dispose allowed (main) | killed | 3/14 | `/disposed/` |
| L5 | `held()` tests `released` not `top` | killed | 13/14 | refusal test |
| L6 | dispose always puts back at once (main) | killed | 3/14 | "shirt ... lost 852 vertices of the idle's weights under it" |
| L7 | dispose never swaps itself (`reset(...,false)`) | survived, **equivalent** | 14/14 | ab + perms byte-identical: release() swaps right after when top |
| L8 | dispose does not release | killed | 1/14 | holds left |
| L9 | ladder's hold restores nothing | killed | 3/14 | "keeps vertices with weights that are not its own" |
| L10 | `reset` ignores the skin flag | killed | 3/14 | "lost 852 vertices" |
| L11 | `restore()` stops putting the weights back | survived in skin-holds, ladder-motion, wooden journey and gameplay | 14/14, 14/14, 24/24 | **killed by ladder-journey.test** (9 fails, "horse surface popped at Approach") |
| L12 | catch path: the second `putBack()` removed | survived, **equivalent** | 14/14 | `reset('neutral',true)` already swaps (same on main) |
| L13 | `held()` after the skin write in applyPose | killed | 13/14 | "a refused call changed the skin" |
| I1 | idle dispose without `neutral()` | killed | 2/14 | rig key |
| I2 | `neutral()` before `release()` | survived, **equivalent** | 14/14 | ab + perms byte-identical |
| I3 | idle dispose does not release | killed | 1/14 | own weights |
| I4 | LIVE kept after the skin is back | killed | 1/14 | rig key / later idle |
| I5 | HOLD kept after the skin is back | survived, **equivalent** | 14/14 | ab + perms byte-identical (HOLD read only while LIVE has the worker) |
| I6 | LIVE cleared at dispose | killed | 13/14 | "the rig key while the idle waits" |
| I7 | waiting message never chosen | killed | 13/14 | message regex |
| I8 | idle restores at dispose like main | killed | 13/14 | "the neck bone left before the ladder" |
| I9 | dispose resets pose but not the neck | killed | 13/14 | "the waiting neck bone stays bent" |
| P1 | `skin-holds.js` dropped from the Pages list | killed | 0/2 (tactics-pages-files) | both scopes |

Every mutant with a reachable behavioural effect is killed by the new file. L11 is killed elsewhere in the
suite. The falsifiers fail for the right reason: H3, L6 and I8 put main's semantics back and fail 11-13 of the
14 tests.

## 5. Merge with PR #7 (`origin/anim/skinning-corrections`, 89e9917)

- `git merge-tree --write-tree 7fc6afe 89e9917` exits 0, so there are no conflicts. `idle-motion.js` and
  `IDLE-LOOK-AROUND.md` auto-merge.
- The merged `skinSum` reads `namedWeights`, and the hold code sits beside it untouched.
- On the merge, the tests in the table above pass. `repro.mjs` gives 22/22 runs ending own (final 0, key own,
  0 off-arm loss). `perms.mjs` (horse and dog; LI, IL, LIL) matches the branch exactly, two-ladder rows
  included. `extras.mjs` on the horse is clean in every case.

## 6. Docs, comments and messages

These are accurate:

- the IDLE-LOOK-AROUND.md statements about the waiting idle: neck bound at rest, `rigKey` keeps the own key,
  a new idle refused;
- the ladder and idle code comments;
- the API notes ("restore after dispose throws, like apply"; apply, transition and restore refuse).

These overclaim (MUST-FIX 1):

- `LADDER-MOTION-HANDOFF.md`: "If a controller made after the ladder that also rewrites the skin (the idle
  study) is still live when the ladder is disposed, it keeps the skin it built on ... the two may be disposed in
  either order."
- `skin-holds.js` header: "Skin holds: a worker's skin put back in the order it was taken, whatever order its
  controllers are disposed in" and "Each controller takes one when it is made".
- `IDLE-LOOK-AROUND.md`: "If a controller made after the idle that also rewrites the skin (a ladder) is still
  live ...".

As written, these cover every skin writer. Only the ladder and the idle take holds, and the ladder's gloves are
outside the hold. Evidence:

- **A controller without a hold** (`probes/nonholder.mjs`). I made the painted fire motion (the game's firing
  pose, from `battle-fire.js`) over a live ladder, both on the flamethrower, and disposed the ladder first. The
  fire lost every vertex it had written: the horse's two hooves (177 + 177) and the dog's feet (22 + 19). It also
  lost the ladder cloth it stood on (86 and 774 vertices): 440 and 815 off-arm vertices in all. Main gives the
  same numbers.
- **A second ladder** (`probes/twoladders.mjs`). It takes a hold. With the older ladder disposed first, the
  weights are now right (main: 284 wrong), but `forearm and hand 1` keeps only some of its triangles, for good,
  even after `pose('carry')` and `pose('neutral')`. The index and position objects are not the originals, and the
  rig key is wrong.

  | mammal | triangles kept |
  |---|---|
  | horse | 695 of 1,260 |
  | dog | 485 of 1,000 |
  | pig director | 457 of 950 |

  Main does the same with the triangles.
- **"It keeps the skin it built on"**, even for the idle, is not quite true. The ladder's dispose returns the
  gripping arm's weights (184-217 vertices), triangles and positions to its own at once. The test and the commit
  message say so, but the handoff does not.

Messages:

- The two new refusals read clearly in the simple case: "Ladder motion cannot put its weights on while a
  controller made after it holds the skin (idle): dispose it first", and "This worker's last idle was disposed
  under a controller made after it (ladder motion) and keeps its skin until that is disposed: dispose it
  first".
- With three controllers they list *already-disposed* controllers among those to dispose, and say "it" for a
  list (`probes/messages.mjs`). After `L1, idle, L2` with the idle disposed, L1's apply says
  "(ladder motion, idle): dispose it first", but the idle cannot be disposed again. A second idle under `L2` with
  `idle, L1` waiting says "(ladder motion, ladder motion)", and one of those ladders is already disposed.

The commit message is mostly right, with three slips:

- "198-217 vertices" should be **184-217**: sheep and donkey are 184.
- "the gripping arm" is right only for `forearm and hand 1`. The support arm was already reset by the idle's own
  `pose('neutral')`.
- "swap whole arm meshes of a different vertex count" is wrong. The vertex count is unchanged (623/632, 502,
  477). The grip swaps the triangle index (horse right arm 1,260 to 695 triangles), the positions and the skin
  objects.

## 7. Is the class live anywhere else today?

No skin writers are disposed out of order anywhere in the game or the studies. Evidence:

- `BattleTraversal` holds one motion at a time (`this.active`).
- `battle-renderer.actor()` (lines 77-82) finishes the unit's grenade session, removes its fire actor and
  disposes its equipment draw before it poses a traversal. A unit in a traversal is never posed by fire or
  grenades.
- `battle-fire.js` (lines 87-91: "never stack their skin bindings") and `battle-grenades.js` (line 32) retire the
  hen's walking controller before installing theirs, and recreate it afterwards.
- The renderer's own dispose runs `grenades.dispose()`, `traversal.clear()` and `fire.dispose()` before each
  model's `locomotion.dispose()` (lines 199-201).

One stacked pair is live in the game, but always LIFO. The hen's persistent locomotion is a `createHenMotion`,
which saves skin and binds a leg skeleton. Every hen journey sits on it: `hen-ladder-motion.js` line 13 reuses its
thigh bones when present. The journey is always finished first.

Studies:

- `idle-study.js` makes only idles, and a second live idle is refused.
- `ladder-study.js` and `ladder-journey-study.js` make one ladder each and dispose it.
- `ladder-preparation-worker.js`, `tools/ladder-clearance-review.mjs` and `tools/clothing-sweep.mjs` dispose in a
  `finally`.
- No caller calls `restore()` after `dispose()`, so the new throw breaks nothing.

The ladder and the idle meet only in `tests/skin-holds.test.mjs`. The class is latent. The change is a guard for
future use, as the brief says, and that is why the scope of the docs matters (MUST-FIX 1).

---

## MUST-FIX

1. **The docs and the module header overclaim the guarantee.** The overclaiming passages are
   `LADDER-MOTION-HANDOFF.md` (dispose bullet), the `skin-holds.js` header, and `IDLE-LOOK-AROUND.md` (the
   paragraph above "Still open"). As worded, any later skin-rewriting controller may be disposed in either
   order. In fact only the ladder motion and the idle take holds. A non-holder still has its skin pulled out:
   the painted fire motion over a ladder loses 440 (horse) and 815 (dog) off-arm vertices, including every
   vertex it wrote. A second ladder still leaves the right hand cut to 695 of 1,260 triangles for good when the
   older ladder is disposed first. Even under the idle, the gripping arm goes back at once (184-217 vertices,
   plus triangles and positions), contrary to "it keeps the skin it built on".
   **Fix:**
   - Name the participants: "controllers that take a skin hold — today the ladder motion and the idle study".
   - Say every other skin writer still composes last in, first out only.
   - Say the ladder's gloves (the gripping arm's weights, triangles and positions) are reset at dispose,
     outside the hold. Two ladders on one worker therefore still compose LIFO only, unless SHOULD-FIX 1 is done.
   - Replace "Each controller takes one" in the header.

## SHOULD-FIX

1. **Two ladders on one worker** (including ladder, idle, ladder) disposed oldest first leave
   `forearm and hand 1` with the older ladder's cut triangle index and moved positions. The rig key changes and
   the hand is missing. This happens in 10 of 24 orders on the branch, the same 10 rows as main, and on the
   tower preset too. It is not a regression and the game cannot reach it, but the ladder now advertises the hold
   it takes. Pick one:
   - put the grips' index/position/attribute swap under the hold;
   - make `createLadderMotion` refuse while another ladder's hold is on the worker (one test);
   - at minimum, document it per MUST-FIX 1.
2. **The refusal messages name disposed (waiting) controllers** as ones to "dispose first", and say "it" for a
   list: "(ladder motion, idle): dispose it first" after the idle was disposed. List only the live holds above
   (`above()` could skip released ones, or mark them "(disposed, waiting)"), and say "them" when there are
   several.

## NITS

1. Commit message: "198-217" should be 184-217. "Different vertex count" is wrong: same count, a cut triangle
   index. The commit could also mention the reverse defect it fixes. On main, the idle disposed first under a
   later ladder puts up to 1,011 out-of-range bone-index slots on the geometry and ends 2,300 vertices wrong
   (horse).
2. In the ladder's `dispose()`, the `hold.top` argument to `reset` is redundant (L7 is equivalent): when on top,
   `release()` swaps right after, so the top case swaps twice. Either always `reset('neutral',false)` and let the
   hold swap, or say why both are kept.
3. `skin-holds.js` says "A controller that would rewrite the skin while a later one holds it ... refuses
   instead". Only the ladder enforces this. The idle's `at()` and `poseHead()` under a later ladder go through
   `worker.pose('neutral')` and swap the ladder's support-arm grip out (horse: 193 vertices, triangles 689 to
   1,242). The ladder's next `apply` restores it, and the ending is clean (`probes/idleunder.mjs`). Either refuse
   there too, or narrow the sentence.
4. The out-of-order path leaves the worker's own, now detached, `forearm and hand 1` attribute objects holding
   the grip's weights: 198 horse, 200 dog, 184 sheep (`probes/origobj.mjs`). The cause is that the idle copies
   into whatever the glove swapped back, and the ladder's later swap then detaches them. This is harmless
   today: nothing re-attaches them (only the support arm's objects are stored, by `horse-light-model.js`), but a
   line in the idle's `restoreSkin` comment would help.
5. Untested contract details:
   - which error `release()` rethrows when two restores throw (H7);
   - the waiting idle is tested on the horse only, so add a pig and the dog or rabbit, whose ladder corrections
     are built on the idle's weights (they pass in my probes);
   - no test for a ladder construction failing over a live idle, and none on the tower preset (both pass in my
     probes).
6. `idle-motion.js`, neck section: "dispose() removes it, rebinds the rig's own skeleton and restores the rig's
   weights" is now conditional. Point it at the dispose comment.

**Score: 8/10. MUST-FIX: (1) the handoff, the idle doc and the `skin-holds.js` header promise any-order disposal
for any later skin writer. Only the ladder and the idle take holds, and the ladder's gloves sit outside the hold:
a non-holder (painted fire) still loses 440/815 vertices, and a second ladder still cuts the hand to 695/1,260
triangles. Narrow the wording, and name the gripping arm's immediate reset.**
