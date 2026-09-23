# Ladder completion work

Review branch: `work/ladder-completion`, based on 3D canonical `aef82f5`.

## Remaining work, in order

- [x] Approach and landing transitions. Passed independent hostile review at **9/10**, scoped to nine rifle-equipped mammals on the iron tower.
- [x] Wooden hatch climbing for the nine nonpig mammals. Independent hostile review **9/10**, scoped to the modified wooden fixture and rifle presentation below. Pigs, hen and production integration remain separate holds.
- [x] Widened pig exits. Independent hostile review **9/10** on both fixtures. Adapt the visible tower and its shared structural geometry, including doorway and landing clearance, before enabling either pig. The existing isolated 0.94-wide flared-rail study is not sufficient.
- [x] Hen climbing. Independent hostile review **9/10** for the separate unarmed avian controller, both fixtures and directions. Wing support, foot contacts and explicit airborne phases use the actual hen rig; no rifle support is claimed.

Each section must score at least 9/10 in independent hostile review before proceeding to the next. Other equipment still needs separate stow and clearance work.

## Approach and landing implementation

`tactics/ladder-journey-study.html` uses the actual iron searchlight ladder tower. It offers the nine currently supported mammals, original/Red Hat outfits, ascent/descent, both tower rotations, all four posts, multiple views, and close or native 58px/unit display. Cutaway hides the guardhouse shell for interior inspection; it does not change the route or authorize intersections.

`createLadderJourney` wraps the approved six-second `createLadderMotion` clip. Its final released-hand targets are higher and narrower for the actual landing rails; the timing stays six seconds. Walking, short planted turns, settling the feet, and rifle handoffs add presentation time. The complete journey duration varies by destination and initial heading (about 13.4 seconds for the default horse route); it is not a new AP or simulation-time cost.

Ascent walks from the committed entry, stows the rifle, climbs, settles on the landing, passes through the doorway with the rifle slung, recovers it inside the guardhouse, and steps to the exact assigned post. Descent reverses those presentation stages. The last orientation change happens in the aisle, before stepping into a wall-adjacent post. The entry and exit heading remain the unit's committed heading.

Feet follow fixed contact targets with unchanged limb lengths. Temporary climbing gloves, sleeve weights, paint correction and sling blend at handoffs and restore on disposal. Rifle guiding is a short authored handoff; it is not a cloth or weapon-physics simulation. Body and gun surfaces, not only joint centers, are checked at phase boundaries. Invalid routes are rejected, construction failure rolls back owned resources, and repeated disposal is safe.

Skunk and dog tails use a reversible root bend inside the guardhouse, shared with ordinary standing tower posture. This prevents a tail/wall intersection or a geometry jump when the journey ends. The tuck blends into existing kneeling/prone tails and resets on ground standing; position and normal arrays restore exactly. Immutable paint coordinates are preserved. The skunk rifle also uses a clearance-specific slung angle through the doorway.

`BattleTraversal` consumes the existing event once and remains busy for the full wrapper duration. Reduced motion still skips presentation. Cancellation restores temporary art state and leaves the authoritative destination, AP and clock untouched. No core rules, occupancy, collision dimensions or character proportions change in this section.

## Checks and review

- Focused regression suite: `tests/ladder-journey.test.mjs`, `tests/ladder-motion.test.mjs`, `tests/battle-traversal.test.mjs`.
- Browser evidence and independent numerical/clearance probes are local under `artifacts/`; generated captures are not source assets.
- Independent hostile review: **9/10**. Previous hand/rail, rifle/doorway and tail/wall blockers resolved. The reviewer checked phase-boundary surfaces, reverse scrubbing, contact residuals, paint coordinates, restoration and actual tower meshes.
- Focused journey tests: **14 passed**. Full project check: **743 passed**, including tactical asset verification. 3D Pages build passed.
- Painted browser matrix: **36 combinations** (nine species × two outfits × both directions), all seven phases sampled, zero browser errors. Both rotations and all four posts also receive numerical route tests.
- Additional tail clearance: skunk/dog, all four upper posts × eight headings, plus rotated-post ascent/descent trajectories. Clearance evidence is sampled vertex/mesh testing, not continuous collision proof.
- Wooden hatches, both pigs, hen and other equipment remain outside this approval. This review branch does not publish or merge those unfinished cases.

## Wooden hatch presentation checkpoint

Independent hostile review: **9/10** for horse, goat, bull, skunk, sheep, donkey, cow, rabbit and dog, ascending and descending. The six-second climb now opens the fingers, withdraws from the stile, braces on the forward hatch posts and steps through the real opening. Upper hand transfers use a strictly monotonic weighted arc-length timing map; peak sampled wrist speed is about 5.7–5.8 m/s. Source poses, limb lengths, character dimensions and paint coordinates are preserved.

The approved fixture is explicitly modified: the wooden ladder moves from local Z=1.77 to 1.55, avoiding existing support ties, and its 0.76-wide lower stiles flare to 0.94 above the deck. Stile cross-section remains 0.085×0.10. The 1×1 hatch, 5×5 footprint and 6.36 deck height remain unchanged. Approval does not apply to the old ladder placement.

Checks include 44 focused ladder/journey/traversal tests, 14 furniture/tower tests and the 3D Pages build. The final hand-path correction additionally passed the horse fixed-limb/restoration and all-post/orientation route checks. Independent review covered all nine painted models, both outfits, close/native views, both directions, all visible mesh surfaces, rotated skunk/dog routes and dense late-phase samples. Horse/skunk visible-surface reverse/history checks were exactly deterministic. These are sampled checks, not continuous collision proof.

One nonblocking residual is disclosed: a dense sample found a **5.16 mm skunk plume graze** against the rear rail. The reviewer found no meaningful visible silhouette break; this is not a zero-collision claim.

Production wooden traversal remains disabled. Before activation, reconcile shared equipment state with canonical, preload or bake the expensive initial route preparation, and match ordinary wooden-post tail posture to the journey endpoint. The weapon remains visibly slung with hands free while climbing and returns to carry after landing. Both pigs still require body/exit clearance work; hen still requires authored avian contacts. No gameplay timing or occupancy changes are authorized by this art checkpoint.
## Shared equipment reconciliation

Merged approved canonical `47b861a` into this review branch. Both ladder paths now use `equipment-stow.js` for equipment state, visibility, sling/accessory ownership and restoration. The wooden study has an explicit rifle placement preserving its approved back position and axis; other wooden loadouts remain guarded. Iron retains canonical support for all thirteen loadouts. The weapon is visibly stowed with hands free during climbing and carried again at the journey endpoints.

Compared all nine wooden body and rifle trajectories with `fa2d007` at 301 samples each: maximum position difference 3.1e-15 m and quaternion difference 6e-8 radians. The adapter preserves the reviewed trajectory. Fixed a merge regression by updating the flamethrower hose after handoff interpolation; actual hose end-ring centers now track the pack and lance anchors. All 13 loadout/cancellation tests pass, with extra intermediate hose checks. All four skunk/dog iron/wood tail endpoint tests and the three focused wooden equipment-state/route tests pass. Baseline ladder/equipment regression: 33 passing tests.

Ordinary wooden-post standing now matches the approved skunk/dog tail tuck. Production wooden activation still needs route preloading/baking; this reconciliation does not activate it or approve pigs/hen.
Independent hostile reconciliation review: **9/10**, excluding the separate pig-fixture work.

## Shared widened iron fixture

The iron searchlight ladder tower now has 0.94-wide upper stiles, a 1.30-wide landing, rails at a 1.24 span, and a 1.155-clear doorway with 1.90 height. Visible door parts and tactical door geometry use the same source. Other tower variants, the 6×5 footprint and deck height remain unchanged. Exterior ladder/landing rails retain their previous tactical blocking policy.

The nine previously approved mammals passed an independent **9/10** regression review on this wider fixture. Actual visible surfaces, including temporary cuffs/fingers and Red Hat caps, were checked. Opening hands now stay clear of the stiles before crossing, and the skunk rifle uses an upright placement closer to the back. The sling is regenerated from the actual stock anchor after each handoff, fixing an end segment that previously lagged behind the weapon. Sampled sling endpoint error was below 4.6e-8 m. This review excludes the separate pig and hen gates.

## Pig presentation checkpoint

Both foreman and director passed independent hostile review at **9/10** on the widened iron tower and the modified wooden hatch, in both directions, with rifle stow preserved. The foreman retains his shorter reach sequence; the director takes earlier upper handholds. Their upper body paths clear the belly in front and the back of the hatch in sequence. Temporary belly/waistcoat weighting, curled-tail tucking and finger release restore exactly. Neither character is scaled to fit.

Actual indexed body, glove, cuff, rifle and sling surfaces were checked through complete ascent/descent, including dense upper-entry probes. Painted Original/Red Hat close/native views and timed samples were reviewed. Four pig tests cover fixed anatomy, state/restoration, route endpoints, reverse scrubbing and the previously failing torso/rung/rail points. These are sampled presentation checks above a 5 mm reporting threshold, not a continuous collision guarantee. Production pig activation remains an integration hold.

## Hen presentation implementation

The hen uses a separate unarmed controller and her existing wing/leg rig. Actual feather tips brace against the ladder; articulated toes support the rung steps. The last part is a deliberate wing-assisted hop, with a visible windup/downstroke, continuous rising/falling trajectory, recovery/braking sweep and fixed-foot landing compression. The public diagnostics distinguish airborne frames from planted contacts. The entire clip remains six seconds, with approach/landing outside that clock.

Wing, apron, waist-tie and tail corrections are temporary deformations; source paint coordinates and body dimensions are unchanged. The fan folds into a narrower feather bundle through the opening, retaining angular separation. Existing HenMotion leg rigs are borrowed without duplicate thighs or ownership transfer. Failed construction restores original transforms, parents, attributes and skeletons. The study does not grant flight as a gameplay action or add hen weapon grips.

Focused tests check actual feather/toe contact, all visible surfaces against the fixture, fixed bone lengths, phase-boundary continuity, deterministic scrubbing, exact endpoints, explicit flight state, disposal and failed setup for fresh/borrowed rigs. The full project check passed **814 tests** and tactical asset verification; subsequent hen art adjustments are covered by the focused tests and fresh dense surface scans. Production hen/wooden activation and route preloading remain with integration.

Final independent hostile review: **9/10** for the bounded unarmed six-second hen presentation. Fresh close/native temporal sheets include Original and Red Hat outfits. Independent full-route visible-surface scans passed on iron and wood, ascending and descending, including rotated slot 3 with Red Hat, at a 5 mm reporting threshold. Boundary surface differences stayed below 9 micrometres across samples one microsecond either side. Failed-constructor rollback passed with fresh and borrowed rigs. This approves authored bird traversal, not realistic flight physics, weapon handling or production wiring.

The final hen browser matrix completed **64 configurations with zero errors**: both fixtures, both outfits, both directions, both rotations and all four posts. The 3D Pages build passed. All four presentation checklist sections are now reviewed at 9/10; integration holds and the previously disclosed sampled skunk plume graze remain. This branch does not deploy automatically.
