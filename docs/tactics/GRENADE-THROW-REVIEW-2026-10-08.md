# Revised grenade throw review

Approved Claude's `db9cd0e` for canonical integration on October 8, 2026. This replaces `44b956b` as the horse's working throwing baseline. No corrective implementation changes were required in this review.

## Visual assessment

This is a clear improvement. The body turns into the wind-up, the free arm points along the throw, and the release comes over the shoulder. The hips and chest lead the throwing arm instead of the motion reading as a push from in front of the face. The rear hoof pivot and subsequent recovery steps give the follow-through somewhere to go. The arms finish relaxed, resolving the previous boxing-guard appearance.

The pin pull, falling ring and detached lever make the preparation and release more legible. The casing settles on its side. Keep this motion as the baseline; another wholesale rebuild is not warranted. The builder's documented brief glove/fuse-collar contact remains close-up polish.

Independent browser checks used the freshly built Pages output: side and three-quarter keyframes, quarter-speed playback, close-up preparation and load, rear-foot pivot, later follow-through, settled landing, reverse seeking back to the pin pull, and release at the viewer's gameplay scale. The timeline and pose buttons behaved correctly. No browser errors or warnings occurred.

## Validation and limits

All 16 focused tests passed: 12 grenade animation tests and four deployment/module-closure tests. These check release position/velocity/spin continuity, gravity and settling, limb lengths, actual sole contacts, the fixed lead hoof and pivoting rear contact, approximate balance from independent segment masses, loose-part timing, hip/chest/hand sequencing, deterministic seeking and return to neutral. The asset audit, packaged build and Git whitespace check passed. The existing Pages file-list correction remains intact.

The separate `phantom-wrench` audit and mutation results in the builder's handoff were not rerun here. Passing this study's balance checks is evidence within its model assumptions, not a general physics guarantee for other rigs, terrain or throw ranges.

This remains horse-only, in local space, on flat ground, with a fixed five-tile target. Combat wiring, other animals, world transforms, range/facing, terrain/obstacle handling, inventory/AP timing and detonation remain separate integration work. Use `GRENADE_THROW.release` (now 1.92 s) for release timing; the old module-level palm function has been replaced by `motion.palmAt(t)`. No remaining repository consumer imports the removed function.

The temporary review tab and preview server were closed, and process exit and port release were verified.
