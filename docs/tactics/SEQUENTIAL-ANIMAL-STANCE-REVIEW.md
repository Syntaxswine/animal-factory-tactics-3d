# Sequential animal stance refinement

22 September 2026. Continuation of [the aiming repair](PRONE-AIM-REPAIR.md), at
the user's request to work through every animal sequentially. Implementation
remains on `work/prone-gameplay-refinement` in the separate 3D project.

Each animal is inspected before moving to the next. The bounded pass addresses
production stance transitions, shoulder/hand contact, waist deformation and
continuous aiming. It preserves approved source mesh assets, paint, dimensions and simulation
rules. Unsupported close/steep firing poses stay explicitly identified; an animal
passing this refinement gate does not close the full equipment/animation backlog.

Viewer: `tactics/animal-stance-review.html`. Front, side, rear and three-quarter
views use the production posture and firing controllers, original/Red Hat paint
and cap attachments. Rows show standing, halfway kneel-to-prone, and prone.
Close scale is 130 CSS px/world unit; gameplay scale is exactly 58 on a 1600px
canvas. On narrower windows the displayed canvas scales down; use the recorded
1600px screenshots for the exact-size comparison.

## Review order

| Animal | Refinement review | Remaining holds |
| --- | --- | --- |
| Horse | **9/10** | Close/steep prone endpoints; full support/contact art audit |
| Goat | **9/10** | Close/steep aim holds; full equipment coverage open |
| Bull | **9/10** | Tail clearance corrected; close/steep aim holds remain |
| Cow | **9/10** | Close/steep aim holds; full equipment coverage open |
| Donkey | **9/10** | Close/steep aim holds; full equipment coverage open |
| Sheep | **9/10** | Close/steep aim holds; full equipment coverage open |
| Skunk | **9/10** | Close/steep aim holds; full equipment coverage open |
| Pig foreman | **9/10** | Close/steep aim holds; full equipment coverage open |
| Pig director | **9/10** | All 125 sampled endpoints align; full equipment coverage open |
| Rabbit | **9/10** | Close/steep aim holds; full equipment coverage open |
| Dog | **9/10** | Close/steep aim holds; full equipment coverage open |
| Hen | **9/10** | Unarmed low stance only; wing/weapon and simulation-body alignment remain open |

## Reproduction

Species-specific corrections found during the sequential pass:

- Bull: the hanging tail was the lowest surface in kneeling, lifting knees and
  hooves about 0.125 world units above the floor. A gradual bend below a fixed
  attachment band clears the tail, and standing restores the original vertices.
  Cow and donkey were checked with the same long-tail treatment.
- Donkey: a prone-only head adjustment reduces the upward tilt from its standing
  calibration, preserving the previous neck/collar repair.
- Skunk: its upright plume previously swung over the head and cap in prone.
  A separate root-preserving plume rotation clears the face. This uses the
  forward tail attachment, not the hanging-tail pivot; stripe paint stays in its
  existing authored coordinates.
- Pig foreman: a modest prone hip lift restores boot support beneath the rounded
  belly, and a prone-only head correction brings his gaze toward the rifle.
  His settled support is belly plus both boots; an explicit 0.05 knee clearance
  is paired with tighter 0.03 belly/boot checks. His original torso aiming
  response is retained to preserve previously supported steep endpoints.
- Pig director: his distinct belly and shoe shapes need a 0.13 prone hip lift;
  actual settled belly, knees and shoes are all within 0.03 of the floor.
  The head adjustment is prone-only, retaining the approved standing expression,
  ear shape and waistcoat. All 125 sampled endpoints remain aligned.
- Dog: the sleeve height mask incorrectly held the low cuffs on the torso during
  aiming. The corrected mask separates outer cuffs from the low/central jacket
  hem. Dense posed surface checks require both cuffs to stay around the actual
  forearms; the previous motion, neutral-restoration and geometry checks remain.
  Review also caught exposed flat upper ankle ends. Transferring the approved
  dog study's shin/pastern blend keeps those ends inside the trouser cuffs while
  preserving rigid paw soles. A dense posed cap-connection check covers this.
- Hen: the generic prone rotation tipped the toes backward and exposed the
  rigid lower neck. Her production stance now uses her own leg IK to fold into
  an unarmed low pose with planted toes. The lower neck stays attached to the
  breast; a short IK-entry blend removes the initial knee pop. Dense tests cover
  reversible standing, crouching and stable-casualty transitions, floor clearance,
  actual toe support and neck connection. Wing weapon handling remains open.

Anatomical knee measurement bands derive from each animal's inverse bind matrices.
They are not hard-coded to the horse. Tail checks include exact fixed-root and
standing restoration; all support checks use the final grounded posed surfaces.

Horse evidence: [low-target views](hybrid-review/sequential-stance/horse/normal-level-130.png),
[gameplay Red Hat](hybrid-review/sequential-stance/horse/red-hats-level-58.png),
[fixed-floor transition](hybrid-review/sequential-stance/horse/normal-transition-130.png),
[Red Hat transition](hybrid-review/sequential-stance/horse/red-hats-transition-130.png),
[browser checks](hybrid-review/sequential-stance/horse/results.json).
The approved proof's knee/hoof support construction replaces the abrupt leg-IK
switch. Dense checks include the full firing controller and subsequent grounding,
actual knee/hoof surface heights, body and rifle floor clearance, normalized skin
weights, grip contacts, rigid bones and reverse evaluation. The horse settles at
0.012/0.0125 knee-surface height and 0.0201 hoof height. Its endpoint matrix improves
from 104/125 to 111/125 aligned fixtures; the remaining 14 are explicit holds.

Run `node --test tests/animal-stance-refinement.test.mjs` for opted-in profiles.
`REVIEW_ANIMAL` selects one animal for focused iteration. Run
`tools/animal-stance-review.mjs` with `PLAYWRIGHT_PATH` and `REVIEW_ANIMAL`; it
checks contacts and captures 12 configurations (two outfits, three targets, two
scales), each showing twelve pose/view combinations. `tools/battle-aim-coverage.mjs`
records the unchanged 1,375-case matrix for comparison with the prior repair.

The changes retain the previous repair's typed failure handling, complete-pose
fallback and authoritative outcomes. The hen's unarmed status is preserved until
its distinct wing/weapon problem is implemented and reviewed.

## Completed sequential pass

All twelve animals passed independent hostile review at **9/10**, in the order
above; each gate cleared before the next animal started. Hen approval covers her
unarmed low stance only. The implementation ends at `ead47a7`, following the
horse proof at `a3bdf17`; the review branch remains pending architect integration
and publication. No canonical merge or deployment was performed.

- **605 tests passed**, including the twelve new per-animal stance checks;
  tactical asset validation passed. `npm run build:tactics-3d` succeeded.
- All **20 shared-core modules** verified unchanged at `e529f4b`.
- **144 browser configurations** across twelve animals and two outfits, with
  close/gameplay sheets and four fixed-floor transition strips per animal.
  The hen's target selector does not imply aiming support. No browser errors.
- The unchanged **1,375-case five-gun endpoint matrix** now aligns **1,248**
  cases, up from 1,184: **64 additional endpoints, zero previously supported
  endpoints lost**. The remaining **127** close/steep cases use the explicit
  holding fallback. Worst supported error is 0.000494658 radians. This is
  geometric coverage, not approval of every weapon's firing animation.
- Actual core prone rifle attack passed through the UI: flash, trace, recoil,
  ammunition debit, immutable resolved state and reduced-motion behavior.
- **12 browser playback sequences** passed supported → unavailable → supported
  recovery across both outfits and motion settings, preserving impact and core
  state. The old near fixture became reachable, so the fallback check now uses
  model-local `(1,2,0)` on the visible floor. Height conversion respects floor
  spacing. Sampled frame counts are not a performance benchmark.

Final evidence: [coverage](hybrid-review/sequential-stance/validation/coverage.json),
[fallback playback](hybrid-review/sequential-stance/validation/fallback-results.json),
[core firing](hybrid-review/sequential-stance/validation/firing-results-prone.json),
[actual discharge](hybrid-review/sequential-stance/validation/rifle-discharge-prone.png).
Each animal's sibling evidence directory contains the reviewed sheets and browser
results. The earlier repair's archived baseline remains unchanged.

Remaining work: full species × outfit × legal equipment/action coverage,
unsupported endpoints, crawling, full support/contact art audit, hen wing weapon
authoring and simulation-body alignment, and squad performance/resource checks.
This pass advances handoff sections 1 and 6; it does not close either section.
