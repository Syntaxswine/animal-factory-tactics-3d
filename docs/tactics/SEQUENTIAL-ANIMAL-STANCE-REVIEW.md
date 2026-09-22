# Sequential animal stance refinement

22 September 2026. Continuation of [the aiming repair](PRONE-AIM-REPAIR.md), at
the user's request to work through every animal sequentially. Implementation
remains on `work/prone-gameplay-refinement` in the separate 3D project.

Each animal is inspected before moving to the next. The bounded pass addresses
production stance transitions, shoulder/hand contact, waist deformation and
continuous aiming. It preserves approved meshes, paint, dimensions and simulation
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
| Cow | Queued | Not yet inspected in this pass |
| Donkey | Queued | Not yet inspected in this pass |
| Sheep | Queued | Not yet inspected in this pass |
| Skunk | Queued | Not yet inspected in this pass |
| Pig foreman | Queued | Not yet inspected in this pass |
| Pig director | Queued | Not yet inspected in this pass |
| Rabbit | Queued | Not yet inspected in this pass |
| Dog | Queued | Not yet inspected in this pass |
| Hen | Queued | Unarmed posture only; wing/weapon authoring remains separate |

## Reproduction

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
