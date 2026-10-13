# Initial independent terrain review

**8/10; the 9/10 gate is held for visual repairs.** This is an art-study review, not user approval or gameplay acceptance.

Inspected fresh whole-map and corridor captures of all five biomes, grey geometry, bog margins, cliff elevation changes, a clearing, overlay correspondence and mobile layout. Current large regions read continuously and clear routes remain visually separate. Bog water is recognizably distinct from firm grass. Source terrain stays unchanged; foliage is explicitly a screenshot-inspired proposal.

Two visual blockers:

1. Whole-map ground and foliage show pronounced fine texture moire. The paint samplers cap explicit LOD at 4, inadequate at approximately 2–3 pixels per world unit across 240 cells. Use far filtering that retains each panel's color without atlas bleed. Evidence: `jungle-map.png`, `snow-map.png`, `snow-top.png`, `dry-top.png`.
2. The close snow view exposes a sharp rectangular detail window made of repeated identical two-log crosses. It reads like rows of manufactured barriers. Vary the primary logs within the blocked footprint and taper the detailed layer's boundary so it preserves the surrounding ground identity. Evidence: `snow-corridor.png`; `jungle-grey.png` also exposes the abrupt detail transition.

Mask follow-up: clear cardinal components include three isolated one-cell pinholes at (118,143), (117,144), and (116,145). The mask also blocks the saved placeholder starts and exit around (30,30). Resolve unintended pinholes; either preserve mission reservations or clearly state that this art proposal has not been checked as a playable mission layout. Do not imply that the existing rough map already contains this foliage mask.

Independent verification: 22 fresh captures plus an orbit capture; 15 focused obstacle tests pass. Browser load ~1.4 seconds on this host, no console errors or failed requests. Warm memory is stable at 34 geometries/10 textures; overview detail-factory live roots return to zero. All 117 watched resources release exactly once. Near detail remains bounded. Whole-map main renders range ~0.84–3.08 million triangles in 8–11 draw calls; these measurements are not a low-end device performance guarantee.

Review browser PID 17456, creation FILETIME 134363731329174310, closed in finally with exit code 0 and was absent in the subsequent process query. Receipt: `artifacts/biome-obstacles-review/helpers/independent-terrain-1791899532908-closed.json`. Reused the existing retained preview without restart or expiry extension. Product source was not edited or committed.

Source hashes, map diagnostics and resource counters: `review.json`. Capturing/audit script: `review.mjs`.
