# Saved tree cover and vegetation cutaways

Implementation of [Tree mixes in the editor](TREE-MIX-EDITOR-PROPOSAL.md), on
`work/editor-3d`, based on canonical `6a58a48`.

## Authoring and persistence

In **Foliage**, choose Dense thicket or Dense wetland thicket, then **Tree cover**:
Brush-led, Mixed canopy or Tree-led. Brush-led remains the default. Species
follow the ground habitat. Undergrowth density controls decorative growth; the
dense preset retains its movement and sight screen at every percentage. Open
woodland retains its original Woodland density behavior.

**Change tree cover only** preserves ground, habitat, density and passability.
It skips bare ground, objects and access points. Rectangle, round and square
brushes work; each completed stroke is one undo step. Copy selected settings
reads the saved mix. Mixed selections show Multiple values until a specific
choice is made. Trees only / Brush only remain editor-local inspection views
with “Visual inspection only; obstruction is unchanged.”

The preview marks actual retained trees in gold, additions in green, removals in
red and protected cells in orange. A disposable worker caches the potential
population and coalesces pointer updates to at most eight per second. It never
rebuilds the live scene during dragging. Cancellation, tool changes, document
changes and page retirement clear or replace the preview. Escape leaves the
document unchanged.

![Tree-cover controls and saved cell](images/tree-cover-integration-2026-10-16/editor-controls.png)

The optional fourth foliage tuple field is `mixed-v1` or `trees-v1`; explicit
`brush-v1` is accepted, while painting Brush-led omits the field. Legacy tuples
retain their interpretation. Unknown versions and incompatible preset/version
combinations fail validation. Only dense thicket/wetland presets accept mixes.

Renderer and gameplay use the same deterministic tree descriptions. A complete
candidate population is reserved before filtering by each cell's mix, so editing
a neighboring composition does not move existing trees. Existing trees, the
three-tile clear-ground margin, 2.6-tile added-trunk spacing, supporting height,
headroom and protected-access checks remain. Finite sight screens and deadfall
are unchanged; substantial trunks and branches still stop projectiles.
Composition participates in the geometry/cache signature.

Browser saves, JSON, reusable blocks, sector-library maps, Playtest and encounter
records retain the field through existing map serialization. Block placement
carries authored values and regenerates detail at the destination, as before.
This does not add a block-rotation feature. The study's editor link now opens
the selected saved composition.

## Readability

The selected living merc, known hovered ground and nearby valid route markers
create bounded, feathered/dithered openings in foreground vegetation on their
selected floor. The opening follows the displayed moving merc. Bark retains a
faint boundary indication. Editor brushes and selections provide corresponding
focuses. Color and shadow passes share aperture uniforms; vegetation restores
smoothly when a focus moves away. Ground, cliffs and buildings retain their rules.

Ground picking and movement use the authoritative map. Revealed blocked foliage
is outlined and labelled Impassable. Cutaways never change exploration, occupant
visibility, LOS, bullets, loot or collision. Hidden opponents do not supply
focuses. Unselected mercs remain subject to ordinary foliage occlusion.

Before, at the normal low camera:

![Selected horse concealed by foliage](images/tree-cover-integration-2026-10-16/corridor-before.png)

After, at the same camera:

![Selected horse readable through foreground foliage](images/tree-cover-integration-2026-10-16/corridor-after.png)

[Eight-second moving-camera recording](images/tree-cover-integration-2026-10-16/cutaway-motion.webm).
The horse also successfully walked four tiles along this one-tile corridor with
the grid off.

The reverse-camera [before](images/tree-cover-integration-2026-10-16/corridor-reverse-before.png)
and [after](images/tree-cover-integration-2026-10-16/corridor-reverse-after.png)
captures confirm the same behavior from the opposite side. Switching interaction
levels 1 → 2 → 3 → 1 restored the selected merc's aperture and produced no
application/shader errors.

## Verification

- The uniform 96 × 96 fixture retains 8,463 occupied cells and exactly **73 / 201 /
  393 trees** across all five habitats. Tests cover shared art/physical identity,
  mixed boundaries, all three outdoor levels, protected ground, cached previews
  and retained tree identities.
- Persistence tests cover undo/redo, JSON parsing, block extraction/placement,
  encounter capture/restore and malformed data. Existing foliage LOS, projectile
  and movement tests are retained.
- The broad `npm run check` completed 2,507 tests: 2,503 passed; four renderer
  visibility fixtures lacked animation dependencies now used to follow a
  displayed merc. Their stubs were corrected without weakening assertions,
  and an animated-friendly/hidden-guard case was added. All eight visibility and
  cutaway cases then passed. Final focused results are recorded below; this is
  not a claim of a second complete-suite run.
- Packaged browser checks: painted Tree-led, saved a named design, exported JSON,
  reloaded the named design, sampled its saved mix, repainted canopy only to
  Mixed canopy, and repeated Undo/Redo three times. JSON retained the fourth
  field and density. The actual Playtest button opened the edited sector in the
  packaged game. No game, module-loading or shader errors were observed.
- Worker lifecycle coverage checks coalescing, stale-result rejection, revision
  refresh and termination on cancellation. Inspection modes do not enter saves.
- Final relevant suite: **207 tests pass**, covering foliage, biome, editor,
  visibility and both deployment module lists. The added Open woodland case
  checks that a stale hidden Multiple values selection cannot block its brush.
  The regenerated asset manifest audit, all **20 core synchronization checks**,
  and **`npm run build:tactics-3d`** pass. The manifest records the new placement
  version and cutaway sources; deployment missing-module checks remain intact.

![Actual editor Playtest handoff](images/tree-cover-integration-2026-10-16/editor-playtest.png)

## Performance and limits

**This is not a 60 FPS approval.** The integration preserves the saved population
and approved art. Rendering skips wholly offscreen chunks outside the nearby
shadow region, retaining instancing, tree detail switching and bounded shadows.
Cutaway discard improves readability; it does not avoid submitting all affected
geometry.

The [30-scenario report](images/tree-cover-integration-2026-10-16/performance-30-scenarios.json)
covers a study fill and a 240 × 240 sector, five habitats and three mixes. Both
fixtures include four modeled mercs, a furnished room, upper floor, local lights,
interior fog and fire. Six phases cover close/reverse/wide views by day/night,
continuous hover, movement orders and firearm effects when idle. Each run waits
for ground paint, warms five seconds, then measures 60 seconds. These are
deterministic review fixtures, not campaign benchmarks.

Conditions: Windows, Chromium 155 in the Codex in-app browser, ANGLE/D3D11 on an
RTX 3080, battlefield CSS size 1236 × 394.40625, DPR 1, Easy, initial gameplay seed
1947, normal fixed camera elevation. Raw `seed` is the **final mutable RNG state**,
not the input seed. Source hashes are recorded. All 30 runs have zero hidden
frames and empty renderer diagnostics. CPU draw, GPU timers and display cadence
are separate measurements.

Reproduce from a packaged build by opening
`tactics/battle-3d.html?study=tree-cover&family=jungle&mix=brush-v1&layout=fill`.
The developer-only panel offers a single 60-second run or all 30. The fixture
does not autosave over an encounter. `layout=corridor&mix=trees-v1` places the
squad on the narrow route and offers a cutaway comparison toggle and recording.
Keep the same browser viewport and avoid concurrent builds during timing.

Median display cadence, milliseconds (lower is better):

| Fixture / habitat | Brush-led | Mixed canopy | Tree-led |
| --- | ---: | ---: | ---: |
| Fill / jungle | 24.5 | 24.9 | 25.8 |
| Fill / temperate | 24.2 | 26.4 | 24.4 |
| Fill / snow | 22.1 | 22.2 | 22.2 |
| Fill / dry grassland | 22.4 | 26.1 | 25.9 |
| Fill / wetlands | 23.4 | 25.0 | 25.6 |
| Sector / jungle | 31.7 | 34.9 | 34.8 |
| Sector / temperate | 34.1 | 35.5 | 35.5 |
| Sector / snow | 30.1 | 32.2 | 32.5 |
| Sector / dry grassland | 31.6 | 35.4 | 34.2 |
| Sector / wetlands | 35.4 | 36.3 | 39.2 |

Controlled Brush-led comparisons substituted the three previous renderer modules
(`hybrid-renderer.js`, `biome-scene.js`, `biome-terrain.js`) from `6a58a48` into
the same packaged gameplay/measurement harness. These are renderer comparisons,
not a separate historical deployment. Sources and conditions are in the linked
records; population and gameplay rules are the same.

| Sector | Previous cadence median / p95 / p99 | Current repeat |
| --- | ---: | ---: |
| Jungle | 32.0 / 38.3 / 65.2 ms | 33.1 / 38.1 / 52.2 ms |
| Wetlands | 33.5 / 46.3 / 82.3 ms | 32.6 / 38.2 / 47.7 ms |

[Previous jungle](images/tree-cover-integration-2026-10-16/baseline-jungle-brush.json),
[current jungle](images/tree-cover-integration-2026-10-16/current-jungle-brush-repeat.json),
[previous wetlands](images/tree-cover-integration-2026-10-16/baseline-wetlands-brush.json),
[current wetlands](images/tree-cover-integration-2026-10-16/current-wetlands-brush-repeat.json).
The small median differences fit the observed repeat-run variation; p95 does
not regress in these two comparisons. This limited sample is not statistical
proof of identical performance on every map or machine.

Tree-led wetland sector display cadence: **39.2 / 44.3 / 115 ms** at median / p95 /
p99. CPU draw: 37.6 / 42.0 / 49.5 ms. GPU: 19.1 / 24.2 / 25.8 ms. Median submitted
geometry: 5,052,571 triangles and 2,641 calls, including shadow/light passes and
modeled characters. Raw data includes each scenario's quantiles, query costs
and final detailed/shadowed chunk counts. Gameplay totals are not comparable to
foliage-only art-study triangle counts.

Gameplay has a fixed camera elevation; these runs do **not** establish a separate
high-angle performance distribution. Floor-aware focus behavior is tested
independently. Raw `coldLoadMs` measures document navigation, not readiness for
play. Editor metrics recorded a 3,336 ms load and 956–1,047 ms scenery rebuilds
for repeated canopy edits. Those stalls are separate from warmed frame timing.

The 30-run report used an earlier texture estimator: it includes ground paint,
but omits finite-screen mask bytes and does not separate shadow targets/CPU paint
copies. It is not total GPU memory. The corrected
[jungle corridor snapshot](images/tree-cover-integration-2026-10-16/jungle-memory.json)
records 168.2 MB estimated textures, including 24.4 MB ground paint and 0.92 MB
finite masks; 27.8 MB geometry buffers, 41.9 MB shadow color targets and 21.3 MB
CPU paint buffers are separate. Driver allocations, depth buffers and temporary
uploads are excluded. This full scene includes characters and room assets,
unlike the earlier 91.7 MB foliage-only clearing.

Repeated editor undo/redo stabilized at **168 geometries / 38 textures**; the
[six-step allocation record](images/tree-cover-integration-2026-10-16/editor-allocation-check.json)
shows no growth across completed rebuilds. Further presentation/performance tuning
is needed for a 60 FPS release claim. Repetitive undergrowth remains a separate
art-polish item; approved shapes and snow paint are preserved.
