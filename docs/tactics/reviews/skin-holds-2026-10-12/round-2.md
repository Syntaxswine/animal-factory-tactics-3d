> Independent hostile review of PR #9 (fix/skin-restore-order), one reviewer per round under the standing five-round rule. Round 2. The probe scripts and logs it names (scratchpad/review-2/...) lived in the review session's scratch space and are not in the tree; the commands and numbers are as the reviewer ran them.

# Hostile review, round 2 of 5: skin holds after round 1 (6647d2b, fix/skin-restore-order)

**Score: 9/10. No must-fix and no should-fix.** Every round-1 finding is fixed, and the fixes hold under a much
wider search than the new tests use: 1,215 make/dispose interleavings, all clean. Nothing changes on the normal
paths: 451 lifecycle snapshots are byte-identical against main. The new test file kills every mutant that changes
behaviour. Three nits remain, and none is reachable in the game or the studies today.

## How I worked

- **Sandboxes.** My own detached worktrees under `scratchpad/review-2/`:
  - `branch` (6647d2b): probes and the full suite;
  - `main` (74a8a6b) and `r1` (7fc6afe): controls;
  - `mut1`, `mut2`, `mut3`, `mut4` (6647d2b): mutants and equivalence checks;
  - `merge7`: 6647d2b plus `git merge --no-commit --no-ff 89e9917`.

  I did not touch the author's worktree, the main clone, or `af3d-mut*`. Every worktree was removed at the end.
- **Mutant hygiene.** Before the first mutant each sandbox was clean (`git status --porcelain`), and its unmutated
  control passed 17/17. After the last mutant each was clean again, and `git hash-object` of every mutated file
  equalled `6647d2b:<file>`.
- **One slip, no harm.** Two background launches resolved a probe path against the session's working directory,
  which is the author's worktree. Node stopped with MODULE_NOT_FOUND before running anything, and that worktree
  stayed clean at 6647d2b (checked at the end). I reran those launches with absolute paths.
- **Where things are.** Probes are in `scratchpad/review-2/probes/`, logs in `scratchpad/review-2/logs/`. Every
  probe loads its modules from the tree passed in, and every worker is built the way the game builds one.

## 1. The round-1 findings

| round-1 finding | 6647d2b | evidence |
|---|---|---|
| **MUST-FIX 1**: docs and header promised any-order disposal for every skin writer | **fixed** | The header, the handoff and the idle doc name the two holders. They say every other skin writer is still last-in-first-out, and that the gloves come off at the ladder's own dispose. `nonholder.mjs` on 6647d2b still loses 440 (horse) / 815 (dog) vertices under a live painted-fire motion, which is now exactly what the docs say. |
| **SHOULD-FIX 1**: two ladders cut the hand | **fixed by refusal** | `twoladders2.mjs`: on the horse, dog and pig director, floor and tower, the second ladder throws "This worker already has a live ladder motion, whose gloves hold its hands: dispose it first". Nothing is touched (weights, attribute objects, triangles, positions, bones, root, holds, scene children). The first ladder then disposes clean, with all triangles kept (1,260 / 1,000 / 950). |
| **SHOULD-FIX 2**: messages named disposed controllers and said "it" for a list | **fixed** | `above()` filters out released holds. With `[ladder(disposed), idle(disposed), ladder]`, the second idle now reads "... keeps its skin under a controller made after it (ladder motion): dispose it first". The plural form is tested on plain holds. With today's holders it cannot occur: one live ladder at most, one idle at most. |
| nit 2: redundant `hold.top` | fixed | dispose always does `reset('neutral',false)`. The old form (mutant L8) is equivalent: probe output byte-identical. |
| nit 3: idle poses under a later ladder | fixed | `idleunder2.mjs`: `at()` and `poseHead()` refuse ("Idle cannot pose the rig while the skin is held by a controller made after it (ladder motion): dispose it first"). `gaze()`, `balance.cop()`, `balance.centre()` and `diagnostics()` still answer and leave the rig untouched. They are pure kinematics, so leaving them unguarded is consistent (on 7fc6afe the same calls moved the rig). |
| nits 1, 4, 5, 6 | fixed | Commit-message corrections: 184-217, same vertex count, and the reverse defect (1,011 slots, 2,300 vertices). The new comments are accurate. Tests were added for two throwing restores (the newest error wins), the tower preset, three species for the waiting idle, a failed build, one live ladder, and ladder-idle-ladder. |

The round-1 probes, rerun on 6647d2b:

- **`repro.mjs`, 11 mammals × 2 orders:** final wrong 0, own key, skeleton, bind and neck clean, no holds. Under
  the idle only `forearm and hand 1` changes, 184-217 vertices, 0 off the arms.
- **`extras.mjs`, horse, pig director, dog, rabbit, pig foreman:**
  - all 15 end states per species clean;
  - 20/20 ladder-first runs lose 0 vertices off the arms under the idle;
  - failed builds over a live idle leave its skin and hold;
  - the waiting neck is at rest and stays there through `ladder.apply(.6)`;
  - the key while waiting is own.
- **`origobj.mjs`, `identity.mjs`:** unchanged from round 1. The detached original objects are now explained in
  the `restoreSkin` comment.

## 2. Stackings: refused ones untouched, allowed ones clean (`probes/seq.mjs`)

`seq.mjs` runs every interleaving of make/dispose events. Each controller is made once and disposed once, L1
before L2 and I1 before I2. The probe keeps its own model of the hold stack and checks `skinHolds()` against it
after every event. Also after every event it checks:

- no skin index with weight points past its part's skeleton;
- a controller disposed under a live one leaves the skin off the arms alone; an idle disposed so also leaves the
  attribute objects, triangles, positions, bones and root alone;
- every live holder not on top refuses all its writes (ladder `apply`/`transition`/`restore`, idle `at`/`poseHead`)
  with the disposeAbove wording, and the refusals change nothing;
- while a ladder is live, a second ladder is refused untouched;
- while an idle is live or waiting, a second idle is refused untouched;
- the top live controller still drives.

At the end it checks own weights, triangles, positions, skeleton, bind, neck, key and holds. Then a fresh ladder
and a fresh idle are each made, driven and disposed (so no stale CLIMBING or LIVE is left), and `pose('carry')` and
`pose('neutral')` run.

| controllers | species | interleavings | problems |
|---|---|---:|---:|
| L1, I1, L2 | all 11 mammals | 495 | **0** |
| L1, I1, I2 | horse, pig director | 90 | **0** |
| L1, I1, L2, I2 | horse | 630 | **0** |

On the horse with L1, I1, L2, a second ladder was refused untouched 30 times, a non-top holder was refusal-checked
52 times, and 11 ladders and 9 idles were disposed under a live holder.

The probe can fail. On 7fc6afe the same horse run flags all 45 interleavings:

- second ladders made;
- the idle not refusing to pose;
- an idle disposed under the ladder changing 193 support-arm vertices, the triangles, bones and root;
- 15 end states with the cut hand.

The stack shapes the allowed sequences reach, as in `seq-shapes-horse.txt` (horse, L1, I1, L2):

- L
- I
- L < I
- I < L
- L(disposed) < I
- I(disposed) < L
- L(disposed) < I < L
- L(disposed) < I(disposed) < L

The last two only happen when the first ladder is disposed under the idle before the second is made, which is the
allowed case.

## 3. Defects the fixes might have introduced

- **Can the CLIMBING refusal block a real path? No.**
  - `BattleTraversal` runs one motion at a time, and `finish()` disposes it.
  - `createLadderJourney` makes one ladder and disposes it in its catch.
  - `ladder-preparation-worker.js` makes a fresh worker per request and disposes in a `finally`.
  - `tools/ladder-clearance-review.mjs` makes a fresh worker per call, with `finally{motion.dispose();w.dispose();}`.
  - `tools/clothing-sweep.mjs` (`run`) builds a fresh worker per entry and disposes in a `finally`.
  - `ladder-study.js` and `ladder-journey-study.js` call `dispose()` before every `load()`, then make a fresh
    worker.
  - Hens never reach the check.
  - All 15 ladder, idle and clothing test files pass on 6647d2b, and so does the full suite (§3a).
- **Does anything rely on a waiting idle standing the rig neutral? No.** Only `tests/skin-holds.test.mjs` stacks an
  idle under a ladder, and it now asserts the opposite. `idle-study.js` disposes, then makes, with nothing above
  (on top, it still goes neutral). `tools/fit-idle-rigs.mjs` makes no ladders.
- **Other readers of `above()`?** Only `disposeAbove` and the tests. When a refusal fires, `above()` cannot be
  empty: a released hold on top is always popped, so a not-on-top hold always has a live hold above it.
- **Can a ladder be disposed while CLIMBING still holds the worker, or the reverse?**
  - `CLIMBING.add` is the last statement of a successful build. `CLIMBING.delete` comes right after
    `disposed=true`. If `reset` threw, both stay unset, which is consistent.
  - Builds that throw after the check never add the worker: the failed-build test, mutant L5, and a
    `preparedOnly` / `plane:2` build over a live idle.
  - `disposeorder.mjs`: a ladder disposed after `worker.dispose()` does not throw. The holds end consistent and a
    new ladder is allowed.
- **Normal paths, A/B against main** (`probes/ab.mjs`, 11 mammals × 6 lifecycles, a snapshot after every step):
  **451 lines, byte-identical (`cmp`).** Each snapshot holds the skin hashes, attribute, index and position object
  identity, skeleton, bind matrix, every bone's local transform, the root, its matrixWorld and the hands' world
  matrices, and the rig key. The six lifecycles:
  - S1: a ladder alone, through apply, transition .5/0/1, restore carry, apply .7 down, and dispose twice;
  - S2: an idle alone, through at, poseHead, at, dispose twice, and a second idle;
  - S3 and S4: the LIFO pairs;
  - S5: an idle with `gaze`/`cop`/`centre` values, `at(19.9)`, `poseHead`, `at(-3)` and dispose;
  - S6: a tower ladder, through apply 1, restore neutral, transition .25, apply 0 down and dispose.

  The snapshots discriminate: the dog's S1 has 7 distinct states over 10 steps.
- **PR #7:** `git merge-tree --write-tree 6647d2b 89e9917` exits 0. On the merge, the hold, idle, clothing, ladder
  and Pages test files all pass (counts in §3a).

### 3a. Test runs on 6647d2b, each file alone

| file | result | file | result |
|---|---|---|---|
| skin-holds | **17/17** | idle-clothing | 2/2 |
| ladder-motion | 14/14 | equipment-stow | 2/2 |
| idle-motion | 30/30 | clothing-layers | 4/4 |
| ladder-journey | 16/16 | ladder-actions | 3/3 |
| pig-ladder-journey | 4/4 | hen-ladder-journey | 3/3 |
| wooden-ladder-journey | 13/13 | idle-fits | 3/3 |
| ladder-equipment-journey | 13/13 | tactics-pages-files | 2/2 |
| ladder-gameplay | 11/11 | | |

PR #7 merge: skin-holds 17/17, idle-motion 30/30, idle-fits 3/3, idle-clothing 2/2, clothing-layers 10/10,
clothing-motion-adapters 3/3, ladder-motion 14/14, tactics-pages-files 2/2.

`npm run check` on 6647d2b: **2,271/2,271 pass, 0 fail**; the asset check passes; NPM_EXIT=0 (written into the log,
not read through a pipe); 575 s. This confirms the author's figure.

## 4. Mutation test of `tests/skin-holds.test.mjs` (6647d2b)

Harness: `probes/mutate2.mjs`. Each mutant is an exact replacement matching once; the tests run under plain
`node --test` with a private TEMP, and the file is restored in a `finally`. Every survivor was rerun through the
interleaving probe (45 orders, horse) and the A/B probe (82 snapshots, horse and dog) with the mutant applied; its
output was byte-identical to the unmutated tree, so all five survivors are equivalent.

| id | mutant | result | pass | killed by |
|---|---|---|---|---|
| M0 ×3 | control | passes | 17/17 | - |
| H1 | `above()` lists released holds (round 1) | killed | 16/17 | `a.above()` deepEqual `['c']` |
| H2 | `disposeAbove` always plural | killed | 14/17 | message equal |
| H3 | pronoun swapped | killed | 14/17 | message equal |
| H4 | first error -> last | killed | 16/17 | `/^Error: x2 broke$/` |
| H5 | a throwing restore stops the cascade | killed | 16/17 | `ran` deepEqual |
| H6 | no early return on a second release | survived, **equivalent** | 17/17 | both controllers guard with `disposed`; probes identical |
| H7 | empty stack left in the WeakMap | survived, **equivalent** | 17/17 | memory only; probes identical |
| H8 | `top` = oldest | killed | 1/17 | top asserts |
| H9 | release restores at once (main) | killed | 2/17 | "a put back while a later hold was live" |
| H10 | `above()` oldest first | killed | 16/17 | deepEqual |
| L1 | no CLIMBING check | killed | 16/17 | one-live-ladder test: missing exception |
| L2 | CLIMBING never added | killed | 16/17 | same |
| L3 | CLIMBING never deleted | killed | 16/17 | the second ladder after the first's dispose throws |
| L4 | CLIMBING checked after the pose/root reset | killed | 16/17 | "a refused ladder changed the skin" |
| L5 | CLIMBING added before the build can fail | killed | 16/17 | failed-build test: "the worker can climb afterwards" |
| L6 | CLIMBING cleared only when the weights come back | killed | 16/17 | ladder-idle-ladder: second ladder refused |
| L7 | dispose puts back at once (main) | killed | 4/17 | "shirt lost 852 vertices of the idle's weights under it" |
| L8 | dispose swaps itself when on top (7fc6afe) | survived, **equivalent** | 17/17 | probes identical (it was round 1's L7 the other way) |
| L9 / L10 / L11 | apply / transition / restore not refused | killed | 16/17 each | `LADDER_REFUSES` missing exception |
| I1 / I2 | `at` / `poseHead` without `mayPose` | killed | 16/17 each | `IDLE_REFUSES` missing exception |
| I3 | `mayPose` tests `released` | killed | 16/17 | same |
| I4 | `time` set before the refusal | survived, **equivalent** | 17/17 | `time` is read only inside `at()`; probes identical |
| I5 | dispose always neutral (7fc6afe) | killed | 16/17 | "the waiting idle changed the skin under the ladder" |
| I6 | dispose never neutral | killed | 2/17 | rig key |
| I7 | waiting dispose leaves the neck bent | killed | 16/17 | "the waiting neck bone stays bent" |
| I8 | `top` read after release | killed | 2/17 | rig key |
| I9 | waiting dispose without the matrix update | survived, **equivalent** | 17/17 | world matrices are recomputed by the next `updateMatrixWorld`; probes identical |
| I10 | waiting message never chosen | killed | 16/17 | message regex |
| I11 | idle restores at dispose (main) | killed | 16/17 | "the waiting idle changed the skin under the ladder" |
| I12 | LIVE cleared at dispose | killed | 16/17 | "the rig key while the idle waits" |

That is 28 killed and 5 equivalent survivors, with no gaps.

## 5. Docs and header: overclaim, underclaim

These are accurate against the code and the probes:

- `skin-holds.js` header: the two holders are named, `top`/`above` are described correctly, and "the first error
  is thrown afterwards" matches H4.
- `LADDER-MOTION-HANDOFF.md`: the holders, the either-order rule for the ladder and idle pair, the gloves outside
  the hold, every other writer newest first, the refusals, and the second ladder refused when made.
- `IDLE-LOOK-AROUND.md`: the waiting state (neck bound at rest, the skin and pose the ladder's, own `rigKey`, a new
  idle refused) and the `at`/`poseHead` refusal.
- The ladder and idle code comments, including the new `restoreSkin` note.

One underclaim, about the pose rather than the skin (NIT 1).

---

## MUST-FIX

None.

## SHOULD-FIX

None.

## NITS

1. **A ladder disposed under a live idle still drives the idle's rig** (`probes/ladderunder.mjs`). The idle's own
   dispose under a ladder is now careful: it leaves the ladder's pose alone. The mirror case is not.
   - **What happens:** the ladder's `reset` stands all 17 bones neutral and moves the root from the idle's (0,0,0)
     to the ladder's entry (1,0,2). The idle's next `at()` puts it right.
   - **Scope:** main and 7fc6afe do the same, so this is not a regression. No game or study path stacks the two.
   - **Docs:** the handoff's "the idle keeps the skin it built on" is true of the skin, but reads as if the idle
     were left alone.
   - **Fix:** when the ladder is not on top, skip `worker.pose(mode)` and the root move in `reset` (the gloves,
     sling and paint must still go), or add one sentence to both docs.
2. **CLIMBING makes a leaked ladder fatal for later climbs.** A ladder never disposed now makes every later ladder
   on that worker throw "already has a live ladder motion". Before, a new ladder would have stacked. Every caller
   disposes, and a dispose after `worker.dispose()` does not throw, so this is theoretical. A related point:
   `dispose()` runs `hold.release()` last. If an earlier cleanup step ever threw, the hold would stay live, and an
   idle under it would refuse to pose forever. A `try{...}finally{hold.release()}` would close that.
3. **Equivalent survivors:** H6, H7, L8, I4 and I9 survive, and are equivalent by probe output. Nothing to do
   unless you want H6 and H7 pinned as contract (double release is a no-op; an empty stack leaves no entry).

**Score: 9/10. MUST-FIX: none.**
