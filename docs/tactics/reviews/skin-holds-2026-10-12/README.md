# Skin holds: the review record (2026-10-12)

PR #9 makes the ladder motion and the look-around idle put a worker's skin back in the right order whichever is disposed first (`dist/tactics/skin-holds.js`).

| round | commit | score | must-fix | what changed after it |
|---|---|---|---|---|
| [1 of 5](round-1.md) | 7fc6afe | 8/10 | the docs and header promised order-free disposal for every skin writer | 6647d2b: the two holders named, one live ladder per worker, live-only refusal lists, the idle refusing to pose under a later holder and leaving it the pose when disposed |
| [2 of 5](round-2.md) | 6647d2b | 9/10 | none (and no should-fix): the loop stopped here | the mirror nit: a ladder disposed under a live idle leaves its pose and root alone; dispose releases the hold in a `finally` |

Round 2 reached the 9/10 target with nothing to fix, so no round 3 ran; the nits it left were taken after it, unreviewed by a third round, each with a test and a mutation check (see the PR).

## Canonical integration review

Reviewed `aafccfd` against canonical `74a8a6b` on October 12, 2026. The merge is clean. The disposal stack fixes the reported ladder/idle overlap, and the final changes preserve the later controller's pose and release the hold even when glove cleanup throws. No additional code blocker was found.

The guarantee applies to the ladder motion and the look-around idle. Other animation controllers still require their existing disposal order; this release does not claim a general animation ownership system or wire the unarmed idle into gameplay. The new module is in the base Pages manifest, retaining the deployment checks for missing imports.

Independent local validation: the skin-hold, idle-motion and ladder-motion suites pass **62/62**. Ladder gameplay/actions, equipment journeys, iron/wooden/pig journeys, the production build and missing-module checks pass **64/64**, for **126/126** tests overall. The asset audit also passes. These include ascent, descent, cancellation and restoration across the supported character/equipment routes. Local logs are under `artifacts/oct12-skin-review.log` and `artifacts/oct12-skin-gameplay.log` (not shipped).

## Related introduction studies reviewed in this pass

Sources: [sprite proof PR #8](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/8), `ad34686`, and the 3D study/handoff through `155d033`. These remain on their development branches and are not part of this release.

- The sprite proof's plateau, drop and landing clearing are much easier to read than the 3D study's distant closing view. Keep that composition. The upright cabin, restrained final smoke and open doorway communicate a survivable crash.
- The cliff faces still read as repeated upright panels. Vary the widths and directions of the rock masses, interrupt the continuous horizontal seams, and break the repeated bright front/dark side pattern. Preserve the two-tier shape and geography while improving the rock treatment.
- The earlier 3D sequence remains useful motion and storyboard reference. Its passing mechanics checks do not override the user's recorded rejection of its composition.
- The sprite proof covers the hit through the settled wreck, not the complete introduction. Approach, overseas briefing, radar/SAM cutaways in that treatment, sound and the gameplay handoff remain separate work. Depth bands are needed if future foreground scenery overlaps the moving aircraft.

The committed sprite and 3D intro tests pass **24/24** in an isolated snapshot of `ad34686`. The available local previews were inspected at the descent, impact, final wreck, overseas handler and SAM shots; sprite playback/restart and A/B/C scrubbing worked, with no browser warnings or errors observed. Temporary review tabs were closed; the builders' retained previews were left under their existing ownership and expiry.
