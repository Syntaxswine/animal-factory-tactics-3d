# Roof-height hostile review

Reviewed October 4, 2026 in work/animation-grounding, based on 8dc3604. This review is read-only; only review artifacts were created.

**Score: 9/10 for the roof-height subtask only. No blocking finding in the scoped change. Stage 1 remains OPEN.**

The delivered scope separates the actual lower floor from the upper lip in roof ascent/descent. The native two-unit animation is translated by the height difference only during its unsupported jump/drop phase. The character is not scaled; authored bone lengths, support poses and two-unit cliff behavior remain intact. The physical endpoint sampler also accounts for a two-unit cliff foothold below an upper-storey roof.

Evidence independently checked:

- 92 tests passed across ledge-grounding, roof-gameplay-animation and ledge-descent-gameplay. Saved output: roof-scoped-tests.txt. These cover the roster, actual sole geometry during grounded intervals, native bones/scale, rewind, opposite travel directions, cardinal orientations, elevated floors, committed events, interruption/restoration and endpoint placement.
- Code inspection confirmed the selected ascent phase 2 and descent phase 5 have no simultaneous planted lower-floor/upper-lip support, for mammals and hen. Moving the complete frame therefore does not translate a planted lower foot upward.
- Fresh production-actor renders inspected: horse roof ascent (render-7), pig director red-hat roof descent (render-8), and hen roof ascent (render-10). Start/middle/end surface placement is consistent with the numerical support checks. Browser capture reports no errors. This review does not claim that I watched the recorded WebM playback.
- The first zoomed director landing render cropped his feet; the uncropped end frame is usable. This is an evidence framing limitation, not a demonstrated grounding defect.

Explicit holds:

- Ramp terrain fitting is NOT approved. Legal crest movement while changing heading still produced large foot-target/knee discontinuities. It was removed from runtime delivery and preserved as local experiment artifacts. See seventh-legal-turn-crest.json and seventh-legal-turn-detail.json; do not mark the ramp or Stage 1 gate complete.
- Stage 2 approach/exit sliding and translated contact diagnostics remain open. No global animation-physics approval is implied by this roof correction.
- Existing later-stage limb continuity and landing momentum issues remain open.
- Full-check.txt reported legacy packaging failures (bridge-trellis/combat-state dependency omissions). The builder must resolve or establish their exact baseline status before delivery; the 92-test scoped result does not supersede that delivery check.

Reviewed source SHA-256:

- roof-journey.js: 55732BF7435517D1EAA171C55EB438951ED4A6759F5DA57B62D427E92212F31C
- ledge-descent-journey.js: BA3384321DAA1108F9E177946E7E102C38059CEA29E1C0E774CCBDFC4405DD91
- ledge-height-frame.js: 0A560CCFDA7085D4670B7A8E7481B0070EA0E81308F20CB28063DF31DFAD16A4
- movement-ground.js: D3744F91B84CB964E4BAFD22F6E6E153DFE174AB35C8F340F435E88B799E456C

Reviewer-owned helper processes: none remain; all probes were short-lived Node commands. The preview/capture helper belongs to the parent task.

## Delivery-check resolution (October 4 follow-up)

Reviewed the three packaging/check changes; no accidental weakening found. The earlier delivery-check hold is resolved for these reported failures:

- The base Pages manifest explicitly includes bridge-trellis.js and combat-state.js. The dependency-closure test itself is unchanged, so missing local references still fail rather than being ignored.
- The catalog test recognizes the existing timber deck/brace renderer. It requires multiple finite box parts, matching collider/visual counts and trellis collision metadata. The earth-ramp counts and nonblocking checks remain enforced for the other ramp types; all catalog finiteness/positive-size checks remain.
- The asset validator adds only the three known procedural IDs to its non-raster set, then positively checks their registry membership and real geometry/material output. The complete manifest equality and PNG checks for every raster entry remain enforced. This repairs the representation mismatch rather than broadly exempting missing assets.

Builder evidence inspected: build-regressions.txt records all four previously failing-file tests passing; final-assets.txt records a successful asset check; final-build.txt records a successful 3D package build with 266 base app files. No unnecessary repeat of roof tests was performed.

The corrected render-8-landing-close.png now includes both soles and the lower floor. Its framing issue is resolved. The roof-only 9/10 verdict remains unchanged. Stage 1 ramp fitting, sliding transitions and later physics holds remain OPEN.

Delivery-check source SHA-256:

- build-tactics-pages.mjs: 049B81B4D6654F77B0DD3E7F866BB5CEE17DBA060CC30BBFCA02B3BAB8991B5B
- hybrid-catalog.test.mjs: 7D925745371C7FC88F5BD9053E26D79AE39AEBEE394AD3642957EADA5B6879AB
- check-assets.mjs: 45D968C8037AF065D3B0160AB8208812A179B9B01ECC8F5D74BCECB1E4BC054C
