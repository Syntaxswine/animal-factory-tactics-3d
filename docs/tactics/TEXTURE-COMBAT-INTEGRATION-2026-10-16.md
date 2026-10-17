# Texture correctness and combat responsiveness

Implementation of the [October 16 proposal](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/2107054/docs/tactics/TEXTURE-AND-COMBAT-PERFORMANCE-PROPOSAL.md).
Graphics correction: `720b661`. Combat optimization: `ac4e89a`.
Reference implementation: `6c04793`.

## Two independent graphics faults

The first failed upload was the **Connected ground overview**, while drawing
the saved tutorial terrain with an Environment ground material. The worker
returned an open, valid **480 × 480 ImageBitmap**, but the texture still owned
immutable **120 × 120** storage from its initial preview. `texSubImage2D` therefore
raised `GL_INVALID_VALUE` / 1281. It was not an image-lifetime or sampler-limit
failure. The loader now disposes the preview's GPU allocation before replacing
and closing its image. It keeps the Three.js Texture object because existing
material uniforms refer to that object, and marks it for a correctly sized upload.

The first texture-unit warning belonged to a **Red Hat hen**. Its linked shader
used twelve fragment paint/overlay samplers, three point-shadow samplers and one
sun-shadow sampler: **16 fragment samplers**. Its bone texture used **one vertex
sampler**. The device supports **16 fragment, 16 vertex and 32 combined units**.
That allocation is valid. The old allocator compared the next zero-based global
unit index against the fragment limit, incorrectly warning at index 16. The
vendor change checks the actual combined limit and reports an allocation count,
without increasing either per-stage capability or suppressing shader errors.

A fourth shadowed local light would genuinely exceed the hen's fragment budget
when the sun is present. `LightRenderer` now reserves twelve material fragment
samplers and one vertex sampler, accepts larger declared material budgets,
accounts for the base shadow and local shadow/cookie costs, and splits the
remaining lights into passes. On this device, daytime local-light counts
3 / 4 / 5 / 8 produce **[3] / [3,1] / [3,2] / [3,4,1]**. Without the sun's
shadow, eight locals fit **[4,4]**. Every enabled light is retained.

Ambient/sun, emissive, environment and light-map contributions occur in the base
pass. Extra passes resolve normal depth, alpha tests and transparency into a
separate scratch target before adding their color. This avoids double additions
at coincident opaque surfaces. Nonlit materials retain depth and alpha coverage
but contribute no repeated color; smoke therefore still attenuates lights behind
it. Fog attenuates extra light without adding its color again. All temporary
state is restored even when rendering throws.

Both single-pass and multi-pass scenes now blend in a linear floating-point
target, then convert to display color once. Previously, the direct path blended
transparency in display space while split passes blended in linear space. That
made overlays change color at the pass boundary. The consistent pipeline costs
one additional fullscreen draw and one target in ordinary single-pass scenes;
the separate graphics comparison measures this cost.
The final compositor unpremultiplies the linear target before color conversion,
then premultiplies the converted color for the canvas. It does not blend a
second time or force an opaque alpha channel. Encoding premultiplied linear
color directly would brighten translucent edges even when alpha was preserved.
Four transparent-background browser probes verify every RGBA channel, including
empty pixels, faint coverage, white and saturated colors. This preserves
cutaways and the canvas's composition over the game's 2D backdrop.

The browser matrix covers twelve species, 23 ordinary/supported Red Hat models,
equipment, daytime/dusk/night, mixed point/searchlights, counts 0/2/3/4/5/8,
a moving caster, moving searchlight, removed light and camera changes. It also
repeats real worker-upload/disposal cycles. All five connected-ground sheets
were independently repainted; their decoded pixels match the committed PNGs.
Only their source provenance was refreshed.

For the single-versus-split comparison, every channel of the 1200 × 700 image
differs by at most one 8-bit level, including the transparent BasicMaterial and
custom-shader overlays. Mean channel difference is 0.0073. Artificially lowering the pass budget
tests routing, not another driver's actual capabilities. Hardware coverage is
limited to the recorded RTX 3080 / Chromium / ANGLE device.

Visual evidence: the populated sector [before](images/texture-combat-2026-10-16/baseline.png)
and [after](images/texture-combat-2026-10-16/graphics.png), the
[23-model material study](images/texture-combat-2026-10-16/painted-models.png), and
closer views of the [horse](images/texture-combat-2026-10-16/closeup-horse-normal.png)
and [Red Hat hen](images/texture-combat-2026-10-16/closeup-hen-red-hats.png).
The named upload repair is the Connected ground overview's allocation, verified
at the failing call and through reload cycles; the wider gameplay images are
checks of retained scene appearance, not independent proof of a valid upload.

A separate 23-model lighting study, with diagnostic hooks disabled, measured
median rendering CPU of **10.9 / 16.3 / 26.2 ms** at 3 / 4 / 8 local lights
(30 frames after 12 warm-up frames per case). Draw submissions were
4,962 / 5,985 / 10,526. Those are this lighting study's costs, not the populated
sector benchmark. They make the extra-pass tradeoff explicit; no light was
removed to obtain the measurements.

## Combat dependencies and measured cause

The original first-shot diagnostic traced 3,833 collision rays, including 2,289
body-zone query calls and 1,544 lighting rays. With the same action and outcome,
the candidate traced 873 collision rays and 280 lighting rays. The body-zone
queries and awareness decisions still execute; repeated geometric answers are
reused. Profiling instrumentation is excluded from the timing comparisons.
The reference and candidate visit exactly the same 5,563 reachable-search nodes
and 2,267 path-search nodes over the diagnostic run. The first shot visits 143
reachable nodes and 63 path nodes in both. Pathfinding and its tie-breaking were
not changed.

`combat-queries.js` provides a synchronous action scope. Body-ray keys contain
the computed origin and target endpoints, including posture/support heights.
Lighting keys contain the sampled position/height and the gameplay clock time.
The existing map revision and geometry-array identities invalidate answers after
destruction, door changes or replacement scenery. Untracked mutable maps take
the uncached path. The scope is discarded in `finally`, including after errors.
No detection, awareness state, RNG, damage, path, occupancy or tactical decision
is cached. A reference bypass supports exact differential tests.

Guard-cone presentation uses the established map-geometry cache and observer
pose keys instead of serializing the whole map every 250 ms. The ordinary
visibility filter still decides which guards may have a cone displayed. Cones
remain on by default.

The remaining first-shot cache reconciliation is recorded separately: the
foliage cache sees the renderer's filtered prop view and then the authoritative
prop list. Its first transition still compares a large map signature. This
tranche does not hide that work in warm-up or replace the pathfinding algorithm.

## Repeated timing and outcome checks

Medians below are medians of three run statistics; worst is the largest step
across those runs. Times are milliseconds. Every individual pair is recorded
in the linked data.

| Comparison | Surface | p95 before → after | p95 reduction | Total simulation CPU before → after | Worst step before → after |
| --- | --- | ---: | ---: | ---: | ---: |
| Original → complete candidate | Normal | 108.0 → 49.6 | 54.1% | 3446.4 → 1497.7 | 139.7 → 84.3 |
| Original → complete candidate | Large | 114.2 → 49.9 | 56.3% | 3550.1 → 1566.5 | 174.6 → 90.5 |
| Graphics fix → combat optimization | Normal | 108.0 → 48.5 | 55.1% | 3455.0 → 1478.1 | 141.0 → 79.9 |
| Graphics fix → combat optimization | Large | 113.0 → 51.7 | 54.2% | 3554.6 → 1563.1 | 143.4 → 84.9 |

The 30% improvement gate passes at both sizes, in every combat pair. Against the
original, median action CPU falls from 88.2 → 35.9 ms normally and 90.4 → 37.8 ms
at the larger size. Median run p99 falls from 139.4 → 82.1 and 145.0 → 85.9 ms.
Actions over 50 ms fall from a median of 36 to 2 per turn at both sizes. Against
the graphics fix alone, that count falls from 36 to 1 normally and 36 to 3 at the
larger size. Every recorded complete save is identical.

The median run p95 is near the 50 ms target, but individual optimized runs span
47.5–52.7 ms and the graphics-corrected large comparison reaches 51.7 ms. Single
actions still reach 80–91 ms across the optimized series. The first shot, action
6 by Guard 1 at (128,115), is consistently the largest remaining action in the
graphics-corrected comparisons. **This is a measured partial
responsiveness improvement, not a claim that combat stalls or the 60 FPS goal
are resolved.** No cooperative yielding or worker was introduced.

The separate graphics comparison changes median frame CPU from **21.2 → 20.9 ms**
at normal size and **25.6 → 26.0 ms** at the larger size (about −1.4% and +1.6%).
Simulation p95 in that series changes **106.7 → 106.5 ms** and **109.1 → 107.6 ms**,
with total simulation work changing by −0.1% and −0.9%. The graphics fix is a
correctness change, with its rendering cost exposed separately from the combat
savings. These repeated results do not support claiming a graphics speedup.
Steady resident counts increase by one texture and one quad geometry at either
size. The added RGBA16F color target accounts for approximately 3.9 MB at the
normal drawing size or 16.6 MB at 1920 × 1080, plus its depth storage. Multiple
passes also retain a similarly sized scratch target. These are storage estimates,
not measurements of the driver's total VRAM allocation. No actors, lights, sight
ranges or foliage details were removed.

All 36 runs finish player round 2 after 53 actions and share full-save hash
`7b8c926048dc9eaa3ddd87e4843be8605495cea9840b3fa520fd6dc501cb8fdd`.
There are no candidate GL errors, texture warnings or hidden-tab frames.

See [every run and action](images/texture-combat-2026-10-16/measurements.json) and
the [reproduction instructions](../../tools/populated-performance/README.md).
Each comparison uses three ABBAAB pairs at each drawing size, complete frozen
packages and a 240 × 240 populated sector with four mercenaries, twelve guards,
eight civilians and about 31,000 foliage cells. This task ran no builds or test
suites during timing. Profiler wrappers, GL interception, GPU queries and
per-action save capture were disabled. Complete-save/image verification ran
after the measured interval.

The normal drawing surface is 1236 × 394.4 CSS pixels inside a 1280 × 720 viewport,
DPR 1. The larger surface is explicitly forced to 1920 × 1080 inside that same
viewport. These are frame CPU measurements, **not displayed FPS or full-size
browser layout measurements**. The scripted workload freezes the clock and
schedules one action every 500 ms; normal animation pacing is tested separately.
Its first 40 actions reproduce the earlier workload, and the complete turn ends
at the same 53rd action in player round 2.

## Regression and ordinary gameplay verification

The ordinary packaged page completed an enemy turn with its normal clock and
animation pacing, guard cones enabled, camera rotation/panning, Inventory and
pause/resume. Inventory opened during the guard turn and correctly disabled
equipment changes. Automatic saves and F6/F9 manual save/load used an isolated
test database. Three restores reached the same paused round-2 state and the same
live counts: **825 geometries, 231 textures and 80 programs**, with no GL errors,
context loss or page errors. Retired renderers reported zero geometries; their
remaining counters were 21 textures and 22/15/15 programs, so these counters are
not evidence of every driver allocation returning to zero.

Camera/input checks were functional, but they do not establish hitch-free UI.
Observed camera-key dispatch-to-next-frame times were 20–90 ms; the Inventory
opening was 32 ms. One resume click waited **180 ms** for the next frame near an
automatic save. Autosave capture alone consumed **156–171 ms** synchronously;
complete saves took 299–355 ms elapsed. The manual save captured in 181 ms and
completed in 718 ms elapsed. Elapsed storage time is distinct from main-thread
CPU. Save serialization and the first-shot geometry reconciliation remain
specific follow-up work. The recorded samples do not establish a GC cause.

See the [ordinary play record](images/texture-combat-2026-10-16/ordinary-play.json),
[graphics diagnostics](images/texture-combat-2026-10-16/graphics.json) and
[action-by-action diagnostic comparison](images/texture-combat-2026-10-16/combat-diagnostics.json).

`npm run check` passes all **2,557 tests** and the asset verification. The generated
core consistency check passes for all 20 modules. Both pinned packages build
successfully with the committed sector library and missing-module validation.
Focused regressions cover scope nesting/failure, false results, map replacement,
terrain aliases, posture/support, clock changes, doors and destruction. Complete
saved outcomes match after every action and through restoration on seeds 1947
and 829, including overwatch and a second turn after destruction. The populated
browser fixture also matches the reference after all 53 actions.

Temporary diagnostic data, including full shader sources, profiler samples and
PNG captures, remains in `artifacts/texture-combat-2026-10-16`. The committed
evidence contains compact resource budgets, original failure details, raw action
timings, build/source hashes and representative images. Diagnostics and browser
instrumentation are never loaded by the deployed game.
