# Spotlight aiming with patrol-style flags

Right-click a spotlight or any of the three searchlight towers and choose **Set aim points**. The existing selection-panel button opens the same editor. Clicking the sculpted light or tower also works, rather than requiring a click at its base.

- Click tiles to add up to three red flags, retaining the existing spotlight limit.
- Click a flag or its tile again to add 15 seconds of waiting. The flag displays the wait in seconds.
- The side panel provides +15s, −15s, removal, Clear path and Done pathing.
- Each click updates the design and supports Undo/Redo. Done or Escape finishes editing without discarding changes. Reopening a light edits its existing flags.
- Use the level buttons to aim at other elevations. Aim points can be over water, walls or otherwise unwalkable ground; guard patrols still require walkable tiles.

Guard patrols and spotlights share the flag overlay, picking, wait controls and editing lifecycle. Their placement rules and runtime behavior remain distinct. Only one path editor is active at a time.

## Runtime and persistence

Each light holds at a point for its `waitSeconds`, sweeps to the next point over one game minute, and loops. One aim point holds steady. Clearing points restores the fixture's default forward beam. Physical light orientation and tactical illumination use the same sampling function and game clock, including pause and encounter save/load.

`lightTargets` remain offsets relative to the fixture, with optional `waitSeconds` (zero when absent). Map export/import and block capture/placement preserve those offsets and waits. Blocks may aim beyond their own boundary; placement validates the resulting destination against the full map. Existing precise, non-integer beam targets are preserved when editing their waits.

Map, block and encounter loading reject malformed aim lists, duplicate points and invalid waits. Core validation changes are recorded in `tools/core-spotlight-adapter.mjs` and the regenerated core manifest. Both deployment lists include the new runtime dependency; the 3D build includes the shared editor modules.

## Verification

Focused checks cover flag increments and limits, Undo/Redo, clearing, map and block roundtrips, all three towers, rotation, old precise targets, wait/sweep boundaries, illumination, save/load, guard patrol behavior and deployment module closure. The Pages build passes.

The live editor was also checked for right-click model picking, repeated flag clicks, wait controls, Undo/Redo, upper-level aiming, Escape, switching between guard and spotlight paths, and browser save/reload. A small browser-saved demonstration is named **Spotlight flag workflow demo**.

Delivered on `work/editor-3d`; canonical integration and the main-branch Pages deployment remain with the architect.
