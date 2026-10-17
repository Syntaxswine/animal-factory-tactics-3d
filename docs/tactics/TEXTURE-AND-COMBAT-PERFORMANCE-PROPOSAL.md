# Texture correctness and combat responsiveness

Coder handoff · 16 October 2026 · Implementation baseline `6c04793`

Resolve the recurring texture warning and the separate texture-upload error,
then reduce the pauses during combat. Keep the approved character artwork,
foliage, lighting, shadows and tactical rules. The player should get the same
battle results and readable scene, with reliable textures and more responsive
camera and interface controls while enemies act.

Deliver the graphics correction and combat optimization as separately reviewable
changes. This proposal specifies the work; it does not implement either change.

## Current evidence

The [integration report](TREE-MIX-INTEGRATION-2026-10-16.md#populated-battle-follow-up-character-submissions-and-sight-caching)
and [measurements](images/populated-rendering-2026-10-16/measurements.json) record
the approved character batching and geometry-cache improvements. The fixture is
a 240 × 240 wetland sector with about 31,000 foliage cells and 24 people: four
mercenaries, twelve guards and eight civilians, with 23 actors visible.

| Metric at the approved baseline | Normal drawing surface | 1920 × 1080 drawing surface |
| --- | ---: | ---: |
| Median CPU work per frame | 32.6 ms | 40.5 ms |
| Median enemy simulation step | 94.4 ms | 125.9 ms |
| Largest enemy step across the three runs | 204 ms | 231.1 ms |
| Typical draw submissions | 3,191 | 3,591 |

The medians are medians of three run medians. Measurements used an RTX 3080,
DPR 1, a fixed camera, and a frozen gameplay clock. The normal surface was
1236 × 394.4 CSS pixels; the larger test explicitly sized the rendering surface
and did not establish full-browser layout or display performance. Frame CPU
work is not displayed FPS. Complete-turn comparisons reached player round 2
after the same 53 simulation steps with identical saved state.

Two graphics faults need individual diagnoses:

- The recurring Three.js warning says it is trying to use **16 texture units
  while the GPU supports only 16**. In the bundled allocator, 16 is a zero-based
  unit index: it is warning on the seventeenth allocation. The recorded limits
  were 16 fragment units, 16 vertex units and 32 combined units. The allocator
  compares its allocation counter against the fragment limit, so the message
  alone does not establish which shader-stage limit is actually exceeded.
- An earlier diagnostic at `a42004f` caught `GL_INVALID_VALUE` / 1281 during
  `texSubImage2D` with an `ImageBitmap`. Its steady-state capture found no failed
  GL call after draining earlier errors. The approved newer runs still report
  a latched 1281, but do not identify its first failing call. Reproduce and trace
  it at the new baseline; do not assume the sampler warning caused it.

The original captures are in the coder checkout under
`artifacts/performance-investigation/gl-startup-capture.json` and
`gl-error-capture.json`. Matching old screenshots preserves any old defects too;
it cannot establish that either fault is harmless.

## Establish a trustworthy comparison

Use `6c04793` as the reference for this tranche. The existing
[populated performance server](../../tools/populated-performance/server.mjs)
still reads selected baseline modules from `034c0b7`. Update the harness before
claiming a further improvement. Prefer two complete packaged builds, each pinned
to a commit, so a newly changed dependency cannot silently enter both sides.
Record build and source hashes, fixture, seed, viewport, DPR and graphics limits.

Reuse the fixture and preserve the earlier evidence in a separate output
directory. Separate three kinds of run:

1. Detailed diagnostics for shader resources, the first failed upload, call
   counts and expensive combat actions.
2. Low-overhead paired timing with those diagnostic wrappers disabled. Use at
   least three pairs per size in the existing ABBAAB order, identical workloads,
   and no concurrent builds or test suites.
3. Ordinary gameplay through the packaged page, with normal animation pacing,
   clock behavior, default overlays and saves. Include camera movement and
   inventory access during a complete enemy turn. The scripted replay bypasses
   animation pacing and cannot replace this check.

Keep test saves separate from user campaigns. Use a temporary loopback server,
record its process identity and expiry, and close the server and disposable tab
after verification under the workspace helper policy.

## Correct texture allocation and upload

### Identify the failing material and resource budget

Capture the first offending draw with its actor or scenery asset, material,
shader variant, active sampler uniforms and array lengths, assigned units,
shader stages, active lights and shadow maps. Include character bone textures,
paint atlases, paint validity/depth maps, species overlays and foliage masks.
Query the actual device limits and check the linked program as well as the
renderer allocator. Total scene texture count is a different measurement.

The current [light renderer](../../dist/tactics/light-renderer.js) limits batches
to four local lights. It does not budget those lights against the material's
paint samplers, the sun's shadow, or vertex-stage resources. The failing fixture
has only three point lights plus the sun, so reducing the number of authored
lights or handling only the fifth local light will not establish a fix.

Prefer a resource-aware limit per pass, using a conservative budget for the
materials that pass can draw. Preserve every enabled light's contribution.
Account separately for the sun, ambient and emissive contribution in the base
pass, and local-light contributions in subsequent passes. Verify that additive
passes do not double light the scene, lose contact shadows, repeat transparent
effects, or change alpha-tested foliage and character paint.

If a material's own resources are the constraint, consolidate compatible paint
resources or remove genuinely unused shader inputs before changing the art.
Packing must preserve color-space handling, filtering, alpha, mask and depth
semantics. Lower texture resolution saves memory but does not remove a sampler.
Do not treat a larger combined-unit limit as permission to exceed either stage's
limit. If diagnostics establish only an overly conservative vendor warning,
document the valid stage allocation and make any accounting correction narrow
and tested; do not simply silence warnings or inflate the reported capability.

### Repair the invalid upload separately

Instrument cold loading before the first texture upload. Record the source asset,
texture identity, ImageBitmap dimensions and lifetime, allocated storage size,
mip level, format/type, upload bounds and relevant pixel-store settings at the
first failure. Investigate mismatched dimensions or allocation, incompatible
upload parameters, and reuse after disposal or bitmap closure. These are
investigation candidates, not established causes.

Fix the owning loader or resource-lifecycle code and add a small reproduction
that exercises the real browser upload. Cover cold load, cached reload, encounter
restore and disposal followed by re-entry. Heavy GL interception belongs in the
diagnostic harness, not the normal frame loop or performance timing runs.

### Graphics acceptance

Verify all twelve animal models with ordinary and Red Hat materials where
supported, plus painted terrain, foliage masks and equipment. Exercise daytime,
dusk and night, mixed point/searchlights, and light counts below, at and above
the computed pass boundary. Include moving searchlights, lights being switched
off or destroyed, camera changes and a character casting a moving shadow.

Require valid shader/resource budgets, no unexplained texture warnings, no
failed GL uploads, no context loss and no shader errors. Report the tested device
limits. Use a real lower-capability device when available; otherwise explicitly
limit the hardware claim. An artificially restricted pass budget tests routing,
not another driver's actual shader or upload behavior.

Compare gameplay-size and close-up images, including alpha edges and shadows.
Intentional pixels corrected by the upload fix should have named before/after
examples; do not require byte identity with a broken reference. Record any
extra passes, frame cost and texture/geometry memory change. The fix must not
hide lights, actors or details to meet a performance target.

## Trace combat pauses before changing behavior

Record an event-indexed trace through complete enemy turns. Associate each slow
event with its unit, action, simulation inputs and elapsed work, so the same
action can be compared in both builds. Include individual first-shot and
post-destruction events rather than averaging them away after warm-up.

Measure the following separately:

- Enemy decision work, movement/path searches, visited nodes and repeated
  candidate queries.
- `cascade`, `refreshNow`, awareness updates, illumination queries, terrain
  visibility and per-target body-zone sight rays.
- Geometry/foliage cache hits, misses, rebuild reasons and repeated serialization.
- Work after the action returns: combat capture, model posing, bounds and batch
  updates, shadow rendering, HUD synchronization and automatic saving.
- Default guard-cone and movement-preview overlays, allocation/GC pauses, and
  synchronous resource loading or shader preparation.

Earlier profiles implicated `stepEnemy → cascade → refreshNow`, awareness and
sight work. They do not prove pathfinding is the remaining dominant cost. One
specific current candidate is `showGuardSight` in
[battle-3d.js](../../dist/tactics/battle-3d.js): it still serializes map geometry
every 250 ms while the overlay is on. Profile it with cones on and off, then use
the established invalidation contract if it is material. Turning the default
overlay off is a diagnostic, not the performance fix.

Report median, p95, p99, maximum, total turn time and count of tasks over 50 ms.
Keep simulation CPU, rendering CPU, intentional animation delay and input
response separate. A lower median or a higher callback count can still hide an
unchanged combat hitch.

## Reduce repeated work with explicit dependencies

Choose changes from the new trace, starting with the largest repeated pure
queries. Useful candidates are sharing geometric body-zone results within an
unchanged action state, avoiding repeated terrain/foliage reconstruction,
reusing navigation topology, and maintaining occupancy/spatial indexes instead
of rebuilding them for each candidate. Preserve path costs and tie-breaking.

Cache geometric facts separately from mutable awareness, detection, random
rolls and combat consequences. A refresh can change state while it is running;
its existence does not make every query inside it safe to memoize. Define the
dependencies and mutation boundary for each cached result. At minimum, account
for:

| Cached result | Changes that must make it fresh |
| --- | --- |
| Terrain and foliage geometry | Doors/locks, cut fences, damaged walls or floors, moved/removed props, foliage edits, map replacement and restoration |
| Path or reachable cells | Geometry plus occupancy, actor level/support, stance, movement mode and relevant AP/stamina costs; occupied ladder/cliff exits must still deny travel |
| Geometric sight/body zones | Geometry plus observer/target position, level/support, posture, heading and sight profile |
| Detection and illumination | Applicable geometry and actor changes plus light state/aim, gameplay time, fire, movement/stealth and awareness dependencies |
| Guard-cone presentation | Relevant geometry and observer changes, without revealing an undetected guard |

Prefer a bounded action-local cache where a persistent dependency contract would
be uncertain. Reuse the existing map-geometry tracking where applicable; avoid
another whole-map fingerprint in the normal live path. Keep mutable editor maps,
temporary explosion scenery and freshly loaded encounters correct.

Lighting and shadows cannot be assumed constant until dusk. Moving characters,
searchlight aim, camera-dependent sun coverage, fire and destruction can change
their results. Cache invariant data, and invalidate only the dependent work
whose inputs actually changed. Do not reuse renderer camera visibility as
authoritative gameplay sight or stop simulating guards merely because they are
offscreen.

## Bound remaining long work if profiling requires it

If an essential search still monopolizes the main thread after removing redundant
work, prototype resumable search or a worker for that measured operation. Keep
the synchronous deterministic headless path available and compare both results.
Set a starting cooperative work budget of approximately **4–8 ms per slice**;
measure actual uninterrupted task duration as well as the complete action cost.

Yield only at safe boundaries. Rendering and saves must not observe half-applied
damage, movement or detection. A background result needs an encounter identity
and the relevant geometry, occupancy and actor-state versions. Discard stale
results after loading, restarting, cancellation or a conflicting action. Preserve
RNG order, event order, AP, ammunition, damage, noise, overwatch and the shared
gameplay clock. Camera and permitted UI operations should remain responsive
without letting a second authoritative action race the first.

Moving work behind a timer does not reduce its cost. Do not gain speed by
skipping guards, shortening sight or weapon ranges, simplifying AI decisions,
delaying discovery, or advancing the clock differently. Broad renderer or
language rewrites are outside this tranche.

## Verification and delivery gates

Use the populated fixture for both the existing 40-step replay and a complete
turn. Add focused cases for blocked/unreachable paths, occupied layer exits,
doors/windows, overwatch, simultaneous alerts, visible and hidden enemies,
civilians, fire, explosions and terrain destruction. Test ordinary combat with
guard cones on, camera rotation, inventory, pause/resume, automatic saves and
manual save/load. Include a second seed or layout to expose fixture-specific
assumptions.

Require the same authoritative result **after each committed action**, including
RNG state, detection, movement, AP, ammunition, damage and relevant event order;
compare complete saves as well as selected fields. Repeat the reference actions
after saving/loading and after geometry invalidation. Presentation scheduling
may differ; combat outcomes and observable tactical information must not.

The first combat performance gate is **at least a 30% reduction in p95 enemy-step
CPU time** against `6c04793` in repeated matched runs at both drawing sizes, with
no systematic regression in p99, longest matching actions or total computation
per turn. Report every pair, not only the best result. Treat differences within
run-to-run noise as inconclusive. If cooperative scheduling is used, also report
the unsliced equivalent cost and longest main-thread task so yielding cannot
masquerade as less computation.

The responsiveness target is **p95 action computation at or below 50 ms**, with
larger unavoidable jobs split so they do not cause an individual 200 ms main-thread
freeze. This is a proposed engineering target, not a promise that the current
renderer can reach 60 FPS. If the first gate passes but the target remains out of
reach, deliver the measured partial improvement with the remaining worst actions
identified; do not mark the stalls resolved.

Run relevant regressions, `npm run check`, the generated-core consistency check
and the packaged Pages build after implementation. Keep headless play and 2D
logic parity: generated `dist/tactics/core` changes must come through the
maintained source/adapters rather than diverging generated files. Preserve the
deployment missing-module checks, including any new worker dependency. Repeat
load/play/restore/dispose cycles and verify resource counts stabilize; warm-up
allocation is different from continued retention.

Deliver one graphics correction and one combat optimization, each with its
diagnosis, tests and before/after evidence. Include reproducible commands,
reference/candidate hashes, raw action timings, exact outcome comparisons,
representative images, resource budgets, and unresolved limitations. If a
texture is now correct but performance regresses materially, show that tradeoff
explicitly instead of folding it into the next optimization's percentage.
Compare the combat change against the graphics-corrected baseline as well as
`6c04793`, so the cost of correct rendering and the savings from combat work
remain separately measurable.
