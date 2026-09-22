# Gameplay aiming: bounded crash and alignment repair

22 September 2026. Branch `work/prone-gameplay-refinement`, based on 3D
canonical `dd68645`. Independent hostile subagent review: **9/10**; no remaining
blocking findings within this repair. Architect integration/publication pending.

Nearby or elevated resolved endpoints could send a prone rifle wrist outside
the authored arm reach. The resulting exception stopped the encounter's render
loop. The previous four-step aiming iteration also oscillated for some nearby
endpoints, leaving the physical barrel pointed away from the resolved trajectory.

The firing controller now uses a bounded, damped endpoint solve. It catches only
the explicitly identified grip-range failure; unexpected errors still surface.
After every search it restores a complete feasible pose in the same frame,
without clamping wrists or stretching bones. Successful full-aim poses align the
actual bore within 0.0005 radians of the endpoint.

When no aligned pose is found, a valid holding pose remains visible. That shot's
flash/tracer are suppressed, its impact remains visible under existing visibility
rules, and the UI reports unavailable firing animation until playback ends. Core
damage, ammunition, AP, event order and casualty progression are unchanged. The
next supported shot recovers normally without a stale muzzle origin or warning.
`endpoint-not-aligned` means the bounded search did not find an aligned solution;
it is not proof that no anatomically valid pose could ever reach that endpoint.

## Evidence and coverage

- **593 tests pass**, assets verified, Pages build passed. All 20 shared core
  modules remain byte-identical to source `e529f4b`; no simulation edits.
- `tests/battle-aim-reach.test.mjs`: 1,375 endpoint fixtures across 11 mammals,
  five long guns and five prone blend weights, each followed by a valid recovery
  and reverse replay. Hand contacts, rigid bone lengths/scales and finite matrices
  are checked. An additional 5,940 forward/reverse shot-phase samples cover recoil,
  lowering and the full-aim threshold. A renderer regression checks suppression
  latching, preserved impact, subsequent recovery and unchanged state.
- `tools/battle-aim-coverage.mjs`: full machine-readable
  [coverage matrix](hybrid-review/prone-gameplay/coverage.json).
  Worst supported error: **0.000476887 radians** (about 0.0273 degrees).
- `tools/battle-aim-reach-review.mjs`: **12 live browser sequences**: supported →
  unavailable → supported, original and Red Hat horse, ordinary and reduced motion.
  [Results](hybrid-review/prone-gameplay/results.json) confirm preserved impact,
  unchanged authoritative state, warning lifetime, effect suppression and continued
  frames. These are controlled resolved-event fixtures, not assertions that every
  injected trajectory is a legal core attack. No browser errors.
- The separate existing `tools/battle-firing-review.mjs` exercised a real core
  rifle attack in prone through the UI: 114 sampled frames, flash/trace/recoil,
  frozen discharge origin, ammunition debit and unchanged state during playback;
  reduced-motion check also passed.
- Gameplay captures: [original outfit](hybrid-review/prone-gameplay/unavailable-normal.png),
  [Red Hat](hybrid-review/prone-gameplay/unavailable-red-hats.png). These show the
  holding fallback at gameplay scale. The warning is in the existing message area;
  its visibility state is checked by the browser harness. No new sculpt/art approval.

| Model-local target (x, y, z) | Aligned | Unavailable |
| --- | ---: | ---: |
| (12, 0.48, 0) | 275 | 0 |
| (3, 0.4, 2) | 275 | 0 |
| (1, 1.4, 0) | 192 | 83 |
| (2, 3, 0) | 167 | 108 |
| (3, 0.05, -2) | 275 | 0 |
| Total | **1,184** | **191** |

The five-gun matrix tests the shared controller used by prone resting poses.
It does not claim all five have integrated firing playback: gameplay still uses
this firing sequence for rifles. Browser outfit coverage is horse-only; the
numeric skeleton matrix has no cap/paint collision assertions. Sample frame
counts establish continued rendering, not a many-character performance benchmark.

## Handoff still open

- Author close/steep aiming support for the 191 unavailable sampled endpoints;
  inspect actual anatomy, support contact and weapon clearance, not just IK reach.
- Reconcile horse proof support/cloth work with canonical posture, especially
  kneel-to-prone blending. Grounding the lowest vertex alone does not establish
  a convincing knee/elbow support pose.
- Complete species × outfit × legal equipment × stance/action visual coverage,
  armed hen, crawling and casualty/loot gaps under the existing handoff gates.
- Benchmark visible squads and repeated equipment/outfit changes separately.

This closes a gameplay crash/alignment bug within handoff sections 1 and 6.
It does **not** close either full section or approve the graphics branch for merge.
