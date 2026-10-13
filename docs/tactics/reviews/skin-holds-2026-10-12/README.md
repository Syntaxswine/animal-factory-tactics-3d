# Skin holds: the review record (2026-10-12)

PR #9 makes the ladder motion and the look-around idle put a worker's skin back in the right order whichever is disposed first (`dist/tactics/skin-holds.js`).

| round | commit | score | must-fix | what changed after it |
|---|---|---|---|---|
| [1 of 5](round-1.md) | 7fc6afe | 8/10 | the docs and header promised order-free disposal for every skin writer | 6647d2b: the two holders named, one live ladder per worker, live-only refusal lists, the idle refusing to pose under a later holder and leaving it the pose when disposed |
| [2 of 5](round-2.md) | 6647d2b | 9/10 | none (and no should-fix): the loop stopped here | the mirror nit: a ladder disposed under a live idle leaves its pose and root alone; dispose releases the hold in a `finally` |

Round 2 reached the 9/10 target with nothing to fix, so no round 3 ran; the nits it left were taken after it, unreviewed by a third round, each with a test and a mutation check (see the PR).
