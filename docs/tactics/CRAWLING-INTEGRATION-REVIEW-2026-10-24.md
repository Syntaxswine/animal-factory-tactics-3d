# Crawling study integration review

24 October 2026 · Artist source `9f82e5b5` · Canonical base `2300fd72`

Approved as an animation study. The low body, planted forearm and opposite foot,
then body pull read clearly at 55 pixels per tile. Backward-facing feet improve
the silhouette. Pig belly support and the hen's breast shuffle preserve their
different builds. Small support-handover refinement can remain polish.

The release selects only `9fdc6810`, `2ab15745` and `9f82e5b5` from the artist
branch. It does not approve or publish the unrelated coder work beneath them.
No live battle movement, simulation rules or campaign saves change.

## Correction made during review

The study's time slider read its value after `play(false)` had redrawn the old
time. Scrubbing therefore reset to the previous time. Capture the requested time
before pausing. This was reproduced with the actual control and verified in the
packaged Pages preview: choosing 3 seconds retains 3.00 seconds and the matching
pose. Playback, pause, roster changes and paired carries also work there without
browser errors.

## Independent validation

- 49 focused tests pass across crawl motion, crawl loadouts, existing battle
  motion/posture and deployment module closure. The crawl tests exercise native
  limb lengths, floor/prop clearance, support locking, translated/rotated fixed
  headings, reverse scrubbing, restoration and buffer reuse.
- Syntax check, Pages build, asset audit and the check for reproducible shared
  core modules pass. This was a crawl-focused review, not a full-project test run.
- Inspected the sequence, roster and weapon boards, plus packaged playback and
  poses for the horse, pig director, hen and skunk. Checked backward travel,
  flamethrower carry and a Red Hat pistol/grenade pair at close-up and gameplay
  scale. These checks establish study quality, not sustained battle performance.

## Work for the gameplay coder

1. Drive the support cycle from accepted prone travel. `BattleMotion.distance`
   is an unsigned, accumulated path length; it is not this driver's signed crawl
   distance. Start an appropriate crawl epoch, preserve backward travel and avoid
   adding root translation twice. Rejected movement must not advance the cycle.
2. Handle heading changes, slopes/ramps and floor-height changes. Current planted
   contact guarantees apply to a flat floor at a fixed heading. Verify route
   corners and stopped movement visually rather than assuming those tests cover
   changing headings.
3. Blend entry/exit and firing readiness. The driver's `blend` controls recovery
   lift and sway; it does not interpolate standing into prone. Give one controller
   ownership of the bones and each carried prop at a time, including offhands.
4. Fit once and reuse the controller. Construction scans native surfaces; avoid
   doing that on a movement frame. Recheck actual battle batching, culling,
   visibility and frame time, especially the hen's temporary skeleton and the
   skunk's tail updates.
5. Regress cleanup through repeated move/stop, weapon/outfit changes, firing,
   death and sector unload. Confirm original skeletons, attributes, loadouts and
   hose ownership restore correctly in the real renderer. Include blocked
   movement, backward movement and a route with a turn in the integration test.

The study is ready for that wiring pass. Gameplay still uses its existing prone
presentation until the coder connects the driver.
