# Ladder integration review — 2026-09-23

Approved builder commit `2fd1237`, cherry-picked onto canonical `336775d` as `82e60cf`. The separate save/load commit was not part of this review. Resolved the posture conflict by retaining casualty handling and adding tower tail reset/tuck; retained existing deployment entries and added the journey and tail modules.

The journey now uses shared equipment stowing for all thirteen loadouts. Its full duration covers approach, stow, climb, doorway passage, recovery and final placement without a duplicate draw. Phase interruption coverage includes reduced motion, casualty, weapon change and completion in both directions. Authoritative state, AP and clock remain untouched by the animation.

Validation: all 791 tests and asset checks pass; core synchronization, Pages build and diff checks pass. Browser checks pass all thirteen loadouts, complete ascent/descent, and bleeding-casualty interruption/recovery without diagnostics. Additional doorway midpoint captures for HMG, RPG and flamethrower run without errors and restore equipment. The production camera occludes much of the doorway, so those snapshots are not exhaustive clearance certification across every species and weapon.

The previous shared-equipment integration hold is resolved. Animated traversal remains limited to the iron searchlight ladder tower and supported non-pig mammals. Hens, pigs and wooden hatch ladders retain the documented fallback.
