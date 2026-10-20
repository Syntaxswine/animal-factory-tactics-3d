# Texture and combat integration review

Approved for integration: `d3b3189`, containing the graphics correction
`720b661` and combat optimization `ac4e89a`, against canonical `2107054`.
The changes fix the identified texture faults and substantially reduce combat
computation while preserving the tested outcomes. First-shot and save pauses
remain follow-up work.

## Independent verification

The integrated tree passes all **2,557 tests**, asset verification, the generated
core consistency check for 20 modules, and the packaged Pages build with its
missing-module checks. Integration with the proposal commit is conflict-free.

A fresh package built from the submitted commit matches every file hash in the
measured combat package. The 36 raw benchmark runs match the committed evidence;
their action and frame statistics recompute correctly, all finish the same
53-action turn, and all complete saves agree. The separate diagnostic comparison
also agrees after every recorded action. Source checks account for Windows
checkout line endings.

Those audited measurements show a **54–56% reduction in p95 enemy-step CPU**
against `6c04793`. The graphics-only comparison is approximately neutral in
ordinary frame CPU; it does not support claiming a graphics speedup. The timing
series was audited, not independently repeated during this review.

The fresh browser graphics matrix passes all **18 lighting cases**, covering
day, dusk and night with up to eight local lights, plus three ground-worker
reload cycles. It reports no texture warnings, GL errors, shader-link failures
or context loss. Four fractional-alpha probes match their reference RGBA values;
single-versus-split light passes differ by at most one 8-bit channel level.
All 800 captured linked shader budgets fit the reported stage and combined
limits. This is the recorded RTX 3080 / Chromium / ANGLE configuration, not
evidence for every device.

The heavily instrumented graphics study temporarily stopped responding to
browser inspection, then completed with a valid result. Its elapsed time is not
a gameplay benchmark. Ordinary packaged play completed an enemy turn, supported
camera rotation and inventory inspection during that turn, and kept equipment
changes disabled until the player's turn. Startup and round-two checkpoints
had no GL errors or context loss. A manual save to an empty diagnostic slot
restored round two, time, squad health, AP, equipment and selection correctly,
with the encounter paused. The restored checkpoint was also free of GL errors.

## Why the fixes are acceptable

The ground repair releases the preview's GPU allocation before uploading the
larger worker image while preserving the texture object referenced by materials.
The sampler allocator now checks the combined allocation limit; the linker still
checks each shader stage. Material budgets additionally limit shadowed local
lights per pass, so a genuinely over-budget configuration is split instead of
merely having its warning hidden. No authored light is discarded.

Combat caching is confined to a synchronous action. Its answers describe body-ray
geometry and illumination, keyed by endpoints, time and geometry dependencies.
Detection, random rolls, damage and tactical decisions still execute normally;
pathfinding and its tie-breaking are unchanged. Guard-cone drawing also avoids
serializing the entire map on a timer.

## Remaining priorities

1. **Save serialization.** The coder's ordinary-play record contains synchronous
   captures of about 156–181 ms. Separate snapshot capture, encoding, validation
   and storage costs before choosing a fix. Preserve a coherent authoritative
   snapshot; moving only the storage write off-thread will not remove a main-thread
   capture pause.
2. **First-shot geometry reconciliation.** Optimized actions still reach roughly
   80–91 ms. Profile the transition between the renderer's filtered prop view and
   the authoritative prop list, then remove redundant signature work without
   making destruction or temporary scenery stale.
3. **Broader graphics coverage.** Verify the new floating-point composition path
   and material budgets on additional GPU/driver combinations. Keep the explicit
   extra-pass and render-target costs visible in future performance reports.

The responsiveness improvement is approved; hitch-free combat and 60 FPS are
not complete. Detailed measurements and reproduction commands remain in the
[coder's integration report](TEXTURE-COMBAT-INTEGRATION-2026-10-16.md).
