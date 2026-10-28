# Animal integration review — 28 October 2026

Canonical base: `d3b0ccc8`. Reviewed artist source: `3c14cd09`, including
`240c274e`, `466aae47` and `4f5f5391` on `work/bear-character`.

Decision: approved for canonical integration with the reproducibility correction
below. The live-browser limitation is recorded separately from the passing
native and package checks.

## Appearance and scope

The bear's broad muzzle, round ears, heavier shoulders and broad paws give it a
distinct identity within the existing painted cast. Both outfits retain that
identity. The raised tail reads above the trousers, and the turnaround keeps the
bear at the cast's established height rather than enlarging the whole model.
The supplied painted, turnaround and equipment boards support keeping this sculpt
as the working baseline. No wholesale art revision is requested.

The bull, rabbit and dog are existing accepted sculpts receiving a completion
pass. Their body geometry and normal paint sources are unchanged. Both outfits,
native portraits and equipment fits preserve their existing silhouettes.

| Character | Game body triangles | Integration in this delivery |
| --- | ---: | --- |
| Bear | 10,050 | New native model and both paintings; placement, recruitment, portraits, speaking and shared equipment/motion support |
| Bull | 9,998 | Placement, recruitment, native portraits and completed equipment/traversal fitting |
| Rabbit | 10,156 | Same, with corrected seated palm reach |
| Dog | 10,446 | Same, with reversible native trouser fitting for the chair study |

The separate service cap adds 700 triangles. These bodies remain in the existing
mesh budget; this is not a full-sector memory or frame-time certification.

## Gameplay and study boundaries

The four appearances have map/recruitment support and native regular/Red Hat
portraits. Their live roof/cliff descent and iron/wooden tower ladder gates accept
the fitted equipment set, including stow and draw in both ladder directions.
Shared handoff uses the weapon's own palm offsets, including the HMG support
handle. The recorded adapters preserve the pinned shared simulation and add no
new species combat perks or save version.

The new crawl clip remains a study: live battle movement does not invoke it yet.
Chair playback is also an unarmed study, without a new world sitting interaction.
The separate weighted-window work is not integrated by this branch. The delivery
documents now state these boundaries explicitly.

All 24 existing author/reduced speaking-head JSONs were compared with canonical:
only `sourceHash` changed. Their mesh payloads and other fields are unchanged.
The bear supplies the new speaking head.

## Review correction

The independent grenade preparation check initially failed. The committed bear
entry followed the hen, while the generator emits the catalog's bear-before-hen
order. Regeneration restores the required serialization order. A leaf-by-leaf
comparison confirms **zero numeric or other data-value changes** across all 13
animals, including all balance rows and release positions. The regenerated files
pass `node tools/prepare-grenade-motion.mjs --check`.

## Independent verification

- **1,010 tests passed across 54 affected files**, zero failures, cancellations
  or skips. Six existing speaking-head TODOs remain. This is an affected-suite
  run, not a new complete repository run.
- The production Pages build and module/worker closure checks pass. All **92
  changed runtime files and assets** match the packaged output byte for byte,
  including the native portraits, bear bodies, paintings and speaking meshes.
- All 76 changed JavaScript modules parse. The asset audit passes; all 20 pinned
  core modules and eleven deterministic real-attack fixture cases reproduce.
- Grenade preparation reproduces for all 13 animals after the ordering correction.
  Existing speaking-head payloads retain the lineage described above.

Local evidence is under `artifacts/oct28-animal-review/`: regression plan, logs
and result; package comparison; speaking-head lineage; grenade preparation
comparison; and the browser limitation record. Unrelated existing artifacts were
not included in the integration commit.

The supplied review images were inspected directly. Independent live playback
could not run in this session: the in-app browser failed to create WebGL both for
the candidate and the already deployed armed-idle baseline. Both report disabled
GL vendor/renderer and `BindToCurrentSequence failed`, before rendering. A reload
did not help. This does not establish an animal regression; it also does not
substitute for a successful fresh live check. The artist's browser recordings and
execution records remain their evidence, separate from this independent review.

The diagnostic tabs were closed. No shared browser reset or app-runtime process
termination was attempted. The artist's preview on port 4478 retains its existing
29 October 2026, 12:32 AM Eastern expiry; this review does not extend it.
