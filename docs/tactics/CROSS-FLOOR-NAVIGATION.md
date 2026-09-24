# Cross-floor navigation

Built on the pending cliff integration `1eed00e` in `work/cross-floor-navigation`.

The encounter now starts in **Automatic · all floors** view. Known scenery and visible characters on all floors are rendered together. The camera's reference floor is independent of the floor cutaway, so following a merc upstairs does not hide people below. Enemy detection rules still apply. Floor geometry naturally occludes people behind it.

Destination clicks intersect the nearest known floor surface. This uses the actual cliff-cap height for full ledges and ordinary floor heights elsewhere. The resulting x/y/floor is passed to the existing individual or group pathfinder. Routes use placed stairs/ladders, authored roof links, and automatically derived full-ledge cliff edges.

Manual floor choices remain available: they hide higher floors to expose difficult targets. Climb and descend buttons remain available. Selecting a higher cutaway keeps lower-floor characters visible and available to rectangle selection. Selection rings use the same physical elevation as the model, including cliff support.

Regression coverage exercises picking, fog, cap heights, ordinary stair routes, single-click routes across cliffs in both directions, missing routes, AP limits, actor visibility and rectangle selection. Related movement, posture, cliff animation, core and world tests pass, as do asset checks, core synchronization and the Pages build.

Browser verification used the production encounter page with a local fixture map: clicked an upper ledge from the ground, observed arrival while lower-floor squad members remained visible, clicked ground to return through the climb link, and checked manual cutaway hiding/restoring the upper actor.

Full `cliff-ledge` tiles (mask 15, including the default mask) supply their upper walking surface and cardinal climb edges without painting an upper floor or placing a climb marker. Partial contours and crags do not supply this flat landing. Tagged cliff links now require real full-ledge support, closing the crag-face validation gap. Existing valid explicit links remain compatible and are deduplicated against automatic edges.

Both cliff landings and both ladder endpoints must be passable. Cliff edges also require open headroom and clear boundaries at both heights. Other living or incapacitated units block either endpoint; the moving character is allowed to occupy its own starting point. Planning and execution recheck occupancy, so a newly occupied destination cancels the move without spending AP. Alternate clear edges may still provide a route. Placement, save/load, and gameplay share these rules; generated links are not saved in map data.

Additional verification uses a production encounter fixture with only cliff props, no upper-floor paint and no climb markers, plus automated tests for all four directions, blocked landings, moving occupants, ladders, and rejected crag links.

Automatic-route validation: the full 886-test run passed 884 tests. Its missing Pages `cliff-support.js` dependency was fixed and that test passed on rerun. The remaining hen/wooden-tower tail-to-spotlight collision also reproduces in the unchanged builder worktree. The 22 focused route tests, asset validation, core synchronization, and production build pass. Browser clicks successfully climbed onto the implicit cap and descended a different edge. This branch is ready for integration review; the unrelated hen animation remains a known issue.
