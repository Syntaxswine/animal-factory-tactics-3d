# Climbable roof tiles

In the 3D editor choose **Roof tiles**, select the upper floor, then choose one of:

- Climbable Corrugated flat roof
- Climbable Corrugated sloped roof
- Climbable Flat parapet roof

These match the ordinary roof modules visually. Each saved `roof-climbable-*` prop supplies automatic up/down routes along its exposed edges. The ordinary `roof-*` variants remain available. No separate climb markers are needed for the new variants; existing manual roof and cliff links remain supported.

Routes use the existing roof movement rules: one level of height, standing posture, clear lower foothold/headroom, a supported free upper landing and an open upper boundary. Ordinary roof climbs cost 6 AP in combat; cliff climbs retain their separate 8 AP rule. The Climb roof / Descend roof button uses the same queued movement and stamina checks as navigation. Marking a higher roof only permits a one-level climb from a suitable platform below, never a multi-story leap.

The default factory now uses climbable modules on the two main single-story roof areas and its ground-to-first-floor roof demonstration modules. The second-floor parapet remains the ordinary variant. Restart the test encounter to load the updated map; existing saves keep their saved map and roof choices.

The flag is encoded by the prop kind, so map export/import, undo/redo, reusable blocks and encounter persistence retain it without special migration. Rendering shares the original geometry and textures. Derived links are calculated from the current prop footprint and checked against current collision data; they aren't written as duplicate manual climb markers. Core changes are recorded in `tools/core-roof-adapter.mjs` and reproduced by the core sync script.

Checks: `tests/climbable-roofs.test.mjs`, `tests/ladder-actions.test.mjs`, `tests/cliff-map.test.mjs`, browser checks `tools/check-climbable-roofs.mjs` and `tools/check-roof-button.mjs`, core sync check and 3D build.
