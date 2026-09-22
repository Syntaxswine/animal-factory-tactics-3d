# Horse prone proof — completion handoff section 1

22 September 2026. Bounded horse/rifle presentation proof on `animal-motion-study`.
This does not complete section 1 or establish gameplay readiness. Independent hostile
review: **9/10**, bounded horse/rifle proof in both outfits. Implementation commit
is recorded in the completion handoff execution record.

## Implemented

The existing reduced horse now kneels, lowers to a supported prone rest, shoulders
the rifle, aims, fires with immediate recoil and slower recovery, then returns
through kneeling to standing. The 12-second sequence is deterministic and can be
paused, interrupted and scrubbed in either direction. The resting prone weapon
remains shouldered at a shallow angle; lowering the aim is distinct from standing
carry. No new mesh or character scale was introduced.

The support knee stays near the floor throughout lowering and rising. Both knees
and hooves support the settled pose. Hand IK retains the existing hand shapes and
bone lengths. The rifle is a separate attachment, with physical bore, muzzle and
an authored eye landmark aligned throughout the tested aiming range. The muzzle
flash follows the recoiling barrel; the emitted trace keeps its discharge origin.

Two defects found during review were corrected: interpolation of ankle targets
lifted both knees during descent, and the forward arm pose pulled the lower shirt
through the bib while exposing a dotted paint boundary. Authored knee trajectories,
localized shirt weights and a shirt-only paint footprint address these defects.
The paint repair also applies to the existing horse motion study. Other species'
paint and all static character meshes remain unchanged.

## Coverage and evidence

Viewer: `tactics/horse-prone.html?paused`. Use Original outfit / Red Hats and
Close view / Gameplay view. Native scale remains **58 CSS px per world unit**;
the diagnostic close view uses 300.

| Combination | Coverage |
| --- | --- |
| Horse, original outfit, rifle | Complete proof sequence; continuous heading and pitch −15° to +20° |
| Horse, Red Hat outfit, rifle | Same sequence, cap attachment and clearance checked |
| Horse, other weapons | Not implemented by this proof |
| Other eleven characters / outfits | Prone transfer pending; hen remains unarmed |
| Tactical commands, prone crawling, damage, save/load | Not connected to this viewer |

Evidence is in [hybrid-review/prone-proof](hybrid-review/prone-proof/):

- `normal-{front,side,back,three,game}.png` and equivalent `red-hats-*` six-frame sheets.
- `normal-{close,native}.webm` and `red-hats-{close,native}.webm`: complete sequences.
- `grey-{side,three,game}-{2.7,5.5}.png`: deformation and support inspection.
- `browser-checks.json`: individual checked combinations, resource counts and legacy regression samples.

`node --test tests/animal-prone.test.mjs` checks actual skinned surface clearance
at 50 Hz across three pitches, fixed bone lengths, continuity, supporting knee
regions through both transitions, settled hoof contact, hand-surface proximity,
physical muzzle and sight alignment at intermediate headings/pitches, recoil
timing, reverse scrubbing and restoration of the original rig/weights. Numerical
contact checks do not substitute for visual grip review.

`node tools/prone-motion-review.mjs` (with `PLAYWRIGHT_PATH` set when needed)
records both outfits at 648 poses each: six headings, three pitches, eighteen
times and two scales. It checks flash/trace registration, cap attachment/ground
clearance and the retained GPU resources after eight outfit swaps. Counts remain
stable at 21 geometries / 6 textures for the original outfit and 39 / 13 for Red
Hats. These are viewer resource counts, not a battlefield performance benchmark.
All twelve existing animal viewers also load and scrub at four sampled phases.
Evidence captured in headless Edge 153.0.4234.48.

Validation: **510 tests passed**, asset validation passed, and
`npm run build:tactics-3d` succeeded. The build includes the new page/controller.

The reviewer inspected refreshed front/side/rear/three-quarter/gameplay temporal
stills, source, tests and browser results. The review resolved both blockers and
approved transfer to other animals. It did **not** include uninterrupted video
playback; full sequence recordings are supplied for further review. Shared hand
anatomy and compressed clothing remain prototype quality.

## Canonical reconciliation and remaining work

Read-only integration inspection saw the separate 3D project at `4ff0ab1` and
the newer movement-core worktree at `ee61884`. Neither worktree was edited.
Those projects contain newer gameplay integration and movement rules; this branch's
older experimental hybrid path must not replace them.

Canonical occupancy still resolves units by one `(x,y,z)` tile. At neutral prone
aim, the horse's body spans approximately **1.644 × 0.860 world units** horizontally
and reaches 0.576 units above the floor, before the separate rifle. Its authored
origin and visual footprint therefore do not establish collision, occlusion or
picking parity. Before integration, reconcile render placement and visible
selection against canonical stance rules and obstacles; preserve simulation
occupancy, hit volumes, AP and outcomes. Recompute deformed skinned bounds before
any mesh-raycast diagnostics: bind-pose bounds can give misleading part hits.

Next: transfer this bounded proof to the other characters, author their anatomy,
tail/cap and clothing adjustments, retain the unarmed hen limitation, and build
the full species/outfit coverage record. Section 1 stays open until that transfer
and the section's canonical placement/review requirements are satisfied. Casualty
poses and later handoff sections have not begun.

Architect approval, merging and publication are separate from this review branch.
