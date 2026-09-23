# Ladder integration review — 2026-09-23

Approved builder commit `2fd1237`, cherry-picked onto canonical `336775d` as `82e60cf`. The separate save/load commit was not part of this review. Resolved the posture conflict by retaining casualty handling and adding tower tail reset/tuck; retained existing deployment entries and added the journey and tail modules.

The journey now uses shared equipment stowing for all thirteen loadouts. Its full duration covers approach, stow, climb, doorway passage, recovery and final placement without a duplicate draw. Phase interruption coverage includes reduced motion, casualty, weapon change and completion in both directions. Authoritative state, AP and clock remain untouched by the animation.

Validation: all 791 tests and asset checks pass; core synchronization, Pages build and diff checks pass. Browser checks pass all thirteen loadouts, complete ascent/descent, and bleeding-casualty interruption/recovery without diagnostics. Additional doorway midpoint captures for HMG, RPG and flamethrower run without errors and restore equipment. The production camera occludes much of the doorway, so those snapshots are not exhaustive clearance certification across every species and weapon.

The previous shared-equipment integration hold is resolved. Animated traversal remains limited to the iron searchlight ladder tower and supported non-pig mammals. Hens, pigs and wooden hatch ladders retain the documented fallback.

## Twelve-animal studies and widened fixture — later review

Reviewed `56be754` and its wooden-route/shared-equipment predecessors against `47b861a`. Before review, neither the 3D canonical branch nor the 2D canonical/deployed repositories had advanced. The 3D branch fast-forwarded cleanly in the review worktree.

All 814 tests and asset checks pass; core synchronization, Pages build and diff checks pass. New tower regression tests confirm that visible widened doorway parts and tactical blockers share the opening. Fresh browser sampling covered hen, foreman and director on both fixtures, Red Hat outfit, ascending at mid-route, upper-entry and endpoint poses, with no page errors. Captures of the hen/foreman iron landing and director wooden hatch were inspected. This is a bounded independent visual check, not repetition of the builder's claimed exhaustive matrix. Production all-thirteen-loadout and bleeding-casualty interruption/recovery browser checks also pass.

Approved the presentation studies and shared fixture changes. Production still gates pigs, hen and wooden routes. Wooden preparation remains expensive and must be preloaded or baked before activation. No broad gameplay activation, flying mechanic or continuous collision certification is implied. The handoff's sampled skunk plume graze remains disclosed.
