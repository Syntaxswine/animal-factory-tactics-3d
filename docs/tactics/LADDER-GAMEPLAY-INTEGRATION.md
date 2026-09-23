# Live ladder integration — 2026-09-23

The approved studies from `ec13c4a` are connected to `BattleTraversal` on the 3D implementation branch. No model geometry or authored trajectories are changed by this wiring.

## Enabled combinations

| Actor | Iron searchlight ladder | Wooden spotlight ladder |
| --- | --- | --- |
| Nine existing mammals | All thirteen existing loadouts | Rifle |
| Pig foreman and pig director | Rifle | Rifle |
| Hen | Unarmed (`hands`) | Unarmed (`hands`) |

The hen uses the approved wing-and-toe journey, including its borrowed leg rig, rather than the mammal controller. Other loadouts retain immediate tactical traversal because their clearance/weapon handling was not approved. Stairs retain their existing behavior.

## Preparation and performance

`ladder-preparation-worker.js` compiles the expensive mammal bend routes and wooden hand timing in a module worker. Squad model loading requests preparation for the ladder types present on the map. Numerical routes are transferred into the page's bounded cache; live journey creation explicitly requires a matching prepared route and cannot silently run the expensive solver on the UI thread. Hen preparation is lightweight and has no mammal route solver.

If a player climbs before preparation completes, the actor waits at the entry in its normal pose and the battle status shows “Preparing ladder motion…”. Rendering, camera input, pause, and save/load remain available. Tactical time and subsequent actions wait just as they do during ordinary ladder presentation. Each cold species/fixture combination is prepared once per page session; slower wooden/pig routes may take tens of seconds in the worker. Subsequent journeys reuse the prepared data. This removes the freeze, not the underlying preparation cost.

Worker failures or timeouts release presentation through the existing renderer error path and retain the committed tactical destination. Cancellation, casualties, removal, equipment changes and renderer disposal cannot resurrect a late preparation result. The cached route may still finish for future use.

## Validation

`tests/ladder-gameplay.test.mjs` checks runtime controller dispatch, transferred-cache playback, both directions and rotations, assigned endpoints, subsequent carry/casualty poses, resource preservation, cancellation during preparation and preparation failures. The approved study/contact/surface tests remain in place.

`tools/ladder-gameplay-review.mjs` drives actual battle climb actions for horse, both pigs and hen on both fixtures, verifies continued page callbacks during preparation, samples climbing in the renderer, completes ascent/descent, and checks state preservation and diagnostics. It produces local screenshots under `artifacts/ladder-gameplay/`.

Build output includes all hen and worker modules. This work is for architect integration; pushing the work branch does not deploy main.

Validation record: the broad run exercised 829 tests (828 passed; one renderer test exposed a missing optional traversal guard). After fixing that guard, all 13 tests in `battle-aim-reach.test.mjs` passed. The additional preparation-failure regression also passed. All eight live browser scenarios completed ascent/descent with zero errors. Asset verification, shared-core synchronization, the Pages build, and checks for 133 packaged JavaScript dependencies passed.
