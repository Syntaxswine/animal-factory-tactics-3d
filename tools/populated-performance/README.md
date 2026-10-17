# Populated-sector verification

The earlier `server.mjs` is retained for reproducing the October 16 batching
investigation. Use `server-next.mjs` for texture and combat verification. It serves
complete frozen packages, rather than substituting individual baseline modules.

## Freeze the three implementations

From the repository root, with Node 22 or newer and Git available:

```powershell
node tools/populated-performance/snapshot.mjs baseline 6c04793
node tools/populated-performance/snapshot.mjs graphics-rgba 720b661
node tools/populated-performance/snapshot.mjs combat-rgba ac4e89a
```

Snapshots are immutable: choose a different label if one already exists. Each
contains the source, complete deployed package and a per-file SHA-256 manifest.
The build uses the committed sector library, never another workspace's map root.
The optional no-revision form snapshots a dirty working tree for diagnosis;
release comparisons should use the explicit commit form above.

Start `node tools/populated-performance/server-next.mjs <UTC-expiry>` on loopback
port 4371, with an actual expiry no more than 24 hours away. The default workflow
uses a three-hour deadline. On Windows launch it hidden, retain its process handle,
and register its exact PID, creation time, source files, purpose, port, expiry and
restart command with the workspace helper-lifecycle utility. The private
`artifacts/texture-combat-2026-10-16/STOP` file stops it gracefully. Remove an old
STOP marker only after verifying the preceding server has exited. Close the
temporary browser tab and verify the port is released when finished.

## Separate diagnostics, timing and ordinary play

- `/diagnose-baseline/tactics/battle-3d.html?study=tree-cover&run=graphics-baseline-cold-traced&seconds=5&gpu=0`
  intercepts GL uploads and records shader stages, samplers, materials and lights.
  A cold browser navigation is required to observe the first allocation.
- `/diagnose-graphics-rgba/tactics/graphics-audit.html?run=graphics-rgba-matrix`
  loads all twelve animal species and supported Red Hat variants, equipment,
  three lighting times, mixed point/searchlights and counts around pass boundaries.
  It checks fractional-alpha RGBA against direct rendering at four colors and
  opacities, compares direct/split lighting, repeats ground-worker disposal/re-entry and
  independently repaints the five connected-ground exports. Pass-budget overrides
  test routing only; they do not emulate another GPU.
  Add `alpha-only=1` for the short RGBA regression alone.
- `/graphics-rgba/tactics/graphics-audit.html?run=graphics-closeups&closeups=1`
  captures ordinary and Red Hat horse/hen materials at a closer camera scale.
  This short visual check runs separately from the timing series.
- `/graphics-rgba/tactics/graphics-audit.html?run=graphics-light-cost&quick=1&perf=1`
  measures 3 / 4 / 8 local lights on the 23-model scene without GL interception,
  after twelve warm-up frames and for thirty measured frames per case. Keep
  builds and tests stopped during this separate lighting-cost measurement.
- `/profile-combat-rgba/tactics/battle-3d.html?study=tree-cover&run=combat-rgba-counted&fullTurn=1&seconds=120&gpu=0&verifyActions=1&verify=1&cacheAudit=1`
  records call counts and JS samples. Run the same URL under `profile-baseline`.
  `cones=0` is a diagnostic ablation only. `verifyActions=1` hashes a complete save
  after every action and is deliberately excluded from the timing runs.
- `/baseline/tactics/battle-3d.html?study=tree-cover&suite=paired&matrix=1&tag=gfx&a=baseline&b=graphics-rgba&size=normal&run=gfx-normal-a1&fullTurn=1&seconds=120&gpu=0&verify=1`
  runs three pairs in ABBAAB order at both sizes for all three comparisons:
  baseline/graphics, baseline/combat, graphics/combat. Stop test suites and builds
  first. No GL interception, query counters, JS sampler, GPU query or per-action
  save capture is enabled. The final save/image check occurs after measurement.
  Omit `matrix=1` for one pair set. Omit `fullTurn=1` and use `seconds=20` for the
  earlier 40-step workload.
- `/play-combat-rgba/tactics/battle-3d.html?study=tree-cover`
  uses the same populated fixture with ordinary clock/animation pacing and
  automatic saves enabled. Saves use a private diagnostic IndexedDB name.
  Camera, Inventory, pause, end turn, manual saves and restores are exercised
  through the normal UI. **Record play check** only captures passive diagnostics;
  it never advances simulation or issues a game command.

The normal drawing surface depends on the browser viewport; recorded runs use
1280 × 720 at DPR 1. `size=large` explicitly forces a 1920 × 1080 drawing surface
inside that viewport. It is not a full-size responsive-layout or displayed-FPS
benchmark. The script freezes time and schedules one simulation action each
500 ms, bypassing animation pacing. That workload cannot replace ordinary play.

Results are written only to the private artifact folder. `report.mjs` produces a
compact evidence set with every action timing, build/source hashes, all pairs,
save hashes, graphics limits, frame costs and resource counts. It requires all
36 full-turn runs and refuses missing, incomplete, hidden-tab or invalid-save
runs. Full diagnostic traces remain local; do not commit multi-megabyte repeated
shader strings merely to preserve an error message.

Run the cold-load URL under `diagnose-graphics-rgba` with
`run=graphics-rgba-cold` too. Use `run=combat-baseline-nodes` for the baseline
profile. After recording all required runs and the ordinary-play checkpoints:

```powershell
node tools/populated-performance/report.mjs
node tools/populated-performance/diagnostic-report.mjs
```

The diagnostic report rejects changed per-action save hashes, invalid linked
shader budgets, graphics errors and a failed cold upload. Its instrumented
durations are diagnostic evidence, not the low-overhead performance comparison.
