# September 22 integration review

Approved `b17828d` for the separate 3D canonical project: group selection, standing/kneeling/prone and casualty presentation, and shared walk/run/sneak controls. Validation: 578 tests and assets, Pages build, byte-for-byte verification of 20 modules at source commit `ee61884`, 30 source movement/reaction/travel tests, and browser posture/selection, movement cadence, reduced-motion and rifle firing checks. Movement rules are pinned to the published `work/movement-modes-core` source branch; this review does not merge that branch into the 2D canonical branch.

## Deferred: mature trees (`2d0cb7a`)

Builder follow-up: [shared catalog fix and 3D workflow evidence](MATURE-TREE-INTEGRATION.md)
is ready on `work/mature-tree-3d`, with a 9/10 hostile review. The original finding
below is retained as the review history; canonical merge/publication is pending.

The two new prop names are registered in `dist/tactics/environment.js`, but not the pinned `dist/tactics/core/environment.js` used by the 3D editor and map loader. Both `tree-broadleaf-large` and `tree-pine-large` reproduce `Invalid environment props.` through the current core `parseMap`. The supplied editor test targets `editor.html`, not `editor-3d.html`. Register the variants in the shared source, reconcile with the movement source revision, regenerate the core dependency, and test 3D editor placement, export/import and actual playtest handoff. Do not patch generated core files independently.

## Deferred: finished environment (`bfc677e`)

The rigid square forms are a useful improvement. Integration must retain the approved foliage module, three-tier pine, broadleaf crown, grass tufts and foliage atlas. This branch has its own tree geometry and replaces the shared renderer's material path; it does not integrate the new catalog paint into `editor-3d-scene.js`. Rebase/reconcile those overlaps before merging, then verify matching materials in `editor-3d.html` and `battle-3d.html`, lower-floor dimming, fog, rebuild/disposal and deployed assets. The supplied workshop image review does not establish this integration.

The completion handoff in `d87e072` is a useful backlog, but its stance/casualty status must be reconciled with the now-approved movement work before implementation.

## Follow-up integration approval

Reviewed `dd68645` and `d83cc20` together. The mature-tree blocker is resolved through shared source `e529f4b`; all 20 pinned modules verify byte-for-byte. Actual 3D editor placement, rotation, undo/redo, save/reload, export/import, playtest, fog and floor dimming pass. Foliage painting/clearing, protected cells, cancellation, undo and playtest pass, with stable GPU resource counts over repeated 64-by-64 repainting. Dense undergrowth repeats visibly and remains an art-polish item.

The horse/rifle prone study from `db9e1ee` is approved as a separate preview. Browser checks passed 648 poses per outfit, resource replacement and all twelve existing study viewers. It does not replace the integrated gameplay posture implementation. The updated completion handoff is included as a backlog, not a claim of completed catalog transfer.

Combined validation: 586 tests and assets, Pages build, and shared-core verification pass. The broader finished-environment branch remains deferred for the previously recorded foliage/editor reconciliation.

## Furniture and published stance follow-up

Reviewed the published stance branch through `820e657` and furniture gallery `a533394`. Approved gameplay refinements cover horse, goat, bull, cow and donkey. Local-only sheep/skunk commits were not included. The rifle fallback preserves resolved outcomes and finishes playback when a target is outside the authored pose range. Updated its browser fixture because the refined horse now reaches the former unavailable endpoint; the replacement endpoint independently reproduces unsupported presentation on the visible floor. Both outfits and reduced-motion playback pass, followed by recovery to a supported shot.

The ten furniture/fixture models pass the gallery review and stable-resource checks. They remain gallery assets, without editor placement or active lighting. Refrigerator distress remains optional art polish. Added the missing stance-review viewer files to the Pages build and preserved prior study entries while resolving the build-list overlap.

Validation: 607 tests and assets pass; all five published stance profiles pass 12 browser configurations each; the 3D build and all 20 pinned source-module checks pass.

## Daylight, remaining animals and fire models

Reviewed canonical `efde73b` together with the remaining stance refinements through `b56ba05` and furniture/fire studies through `d337d70`. Combined validation passed 626 tests, assets, Pages build and reproducible core verification. The core now has two explicitly recorded clock adapters; it is not wholly byte-identical to the earlier upstream pin. Moving these clock rules back into the shared source remains desirable for long-term 2D/3D parity.

Daylight browser checks passed five preview times without blueprint mutation, authored nighttime playtests, and paused sun interpolation. Clock browser checks passed one-minute combat rounds, midnight rollover, pause/resume, hidden-tab no-catch-up and legacy dialog pausing. Lighting is presentation-only: no illumination-based detection or local lamp lighting is claimed. Night readability needs further art tuning alongside local lights.

The remaining seven animals each passed 12 stance-browser configurations; hen coverage remains unarmed. Actual rifle playback fallback/recovery passed in both outfits and reduced motion after clock/lighting integration. All 15 gallery furniture/fire forms passed browser and stable-resource checks. Flames animate, but these models remain gallery-only and do not cast local illumination. The cooking-pot tripod reads well beside the character.

## Guard tower gallery review

Approved building models through `54b614b` against canonical `f5b9da6`. Seven new tower variants cover ladder access, side switchback stairs, and 3-by-3 / 5-by-5 guardhouses with perimeter stairs. They are gallery assets, not registered playable buildings. Elevated occupancy, pathfinding, collision, cover and supported floor range need a separate integration pass; geometry headroom tests do not establish gameplay traversal.

The timber silhouettes fit the character scale and wraparound access reads clearly. Saturated red metal and repetitive roof texture are optional art polish. Validation passed 641 tests and assets, the Pages build, reproducible core verification, all 22 gallery forms and stable resource counts. Existing canonical artificial-light placement/schedules/playtests and awareness contact/pause browser checks also passed with the merged model library. Resolved only the deployment file-list overlap, preserving both branches' files.

## Sweeping spotlights and factory machines

Approved spotlight work through `50b7945` (feature `7b358f4`) and machine gallery `1845562`. Spotlights support one to three editor aim points, clock-driven sweeps, paused playtests, and cone-based illumination in detection. Browser checks passed route picking/cancellation, sweeping, mixed point/spot shadows and pause behavior without errors.

The painted lathe, milling machine and power press read clearly beside the character at gameplay scale. These are 2-by-3 gallery assets, not editor props or production systems. Heavy edge wear remains optional close-up polish. All 48 paint-coverage views passed with no fallback pixels or browser errors; geometry checks preserve the press throat and milling clearance.

Combined validation: 646 tests and assets, Pages build, and verification of 20 core modules with recorded adapters at `e529f4b` passed. Preserved both branches' deployment file lists when resolving their overlap. Both browser review scripts now accept REVIEW_ORIGIN for portable local review.

## Connecting conveyors and ladder/searchlight towers

Approved builder branch through `feb619a`: automatically connecting conveyor studies, timber and iron tower searchlights, and seven ladder alternatives to the stair guardhouses. The conveyor corner cross-sections align with straight segments; tile painting, erasing, undo, fast strokes, all sixteen variants, mobile layout and browser errors passed. Ladder variants passed all seven browser views and geometry checks for climb/landing/door clearance. Both tower searchlight studies passed visual/mobile checks. Existing gameplay spotlight picking, cancellation, sweep, mixed shadows and paused playtests passed unchanged.

These additions remain gallery studies: conveyor transport, main-editor placement, climbable/elevated towers and active tower-mounted lights are not implemented. Silhouettes read well; vivid red paint and repeated timber roof texture remain optional polish. Full validation passed 653 tests and assets, Pages build and reproducible core verification. Resolved catalog/test/build overlaps by preserving both branches; renamed the tower review script so it cannot replace the existing gameplay spotlight regression. Browser scripts accept REVIEW_ORIGIN. Corrected the combined gallery count and its lighting description.

## Tower fixes, aim levels and ladder study

Reviewed editor branch through `d16e504` and ladder study through `2c2f458`. The previously blocking railing-shadow and elevated-explosives cases are corrected: visible timber rails and tactical blockers share dimensions; explosive launch/target/blast heights and fuel-pack explosions account for tower elevation. Open-window geometry is retained. Tower editor/playtest, lookout placement, climb/descend, rendered elevation and three aim-level browser checks pass. Full suite: 687 tests and assets pass; Pages build and reproducible core verification pass.

The ladder animation remains a separate six-second presentation study. Gameplay traversal currently commits endpoint changes and emits a handoff event. Integration still requires actual ladder-frame alignment, widened upper exits for pigs, weapon-stow support and hen contacts. Added missing ladder study deployment entries and gallery navigation. The aim-level browser check now accepts REVIEW_URL.

Fresh 321-pose clearance sampling over 22 animal/fixture combinations found no deck or rung penetration above its 1 mm threshold. Rail observations remain in compact foreman (8 samples, maximum 6.42 mm), compact director (1, 3.40 mm) and tower director (6, 8.56 mm). These are finite vertex samples, not continuous collision certification; the new tower-director observation supplements the builder's older archived evidence. Treat these small clothing intersections as study polish and recheck the actual tower during animation integration.

Ladder browser review passed all 44 animal/outfit/fixture configurations, 88 directions and 18,280 sampled poses, with no browser errors. Fresh horse, bull and director contact sheets were visually reviewed at close and gameplay scale; the disclosed pig clipping remains a polish item for the bounded study.
