# Cross-floor navigation

Built on the pending cliff integration `1eed00e` in `work/cross-floor-navigation`.

The encounter now starts in **Automatic · all floors** view. Known scenery and visible characters on all floors are rendered together. The camera's reference floor is independent of the floor cutaway, so following a merc upstairs does not hide people below. Enemy detection rules still apply. Floor geometry naturally occludes people behind it.

Destination clicks intersect the nearest known, authored floor surface. This uses the actual cliff-cap height for full ledges and ordinary floor heights elsewhere. The resulting x/y/floor is passed to the existing individual or group pathfinder. Routes use existing stairs and authored climb links, with the existing costs and interruption rules. No route is invented where a connection is missing.

Manual floor choices remain available: they hide higher floors to expose difficult targets. Climb and descend buttons remain available. Selecting a higher cutaway keeps lower-floor characters visible and available to rectangle selection. Selection rings use the same physical elevation as the model, including cliff support.

Regression coverage exercises picking, fog, cap heights, ordinary stair routes, single-click routes across cliffs in both directions, missing routes, AP limits, actor visibility and rectangle selection. Related movement, posture, cliff animation, core and world tests pass, as do asset checks, core synchronization and the Pages build.

Browser verification used the production encounter page with a local fixture map: clicked an upper ledge from the ground, observed arrival while lower-floor squad members remained visible, clicked ground to return through the climb link, and checked manual cutaway hiding/restoring the upper actor.

This branch does not resolve the separately reported crag-face climb-link validation gap in its parent integration. It should not be deployed to canonical until that integration is approved.
