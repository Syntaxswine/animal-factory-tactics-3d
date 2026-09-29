# Weighted mannequin: window dive to kneel

2026-09-28 | work/window-shatter

Viewer: `tactics/weighted-window-study.html`. This extends the approved weighted
roll study into a complete window crossing, without fitting an animal yet.

## Status: animation held; collision diagnostics added

The independent physics review supersedes the earlier 9/10 motion assessments.
The motion has impossible joint folds, self-intersections, unsupported weight
transfer and an abrupt impact. Passing the earlier geometric tests did not
establish plausible dynamics. No animation or gameplay integration is approved
by this diagnostic update.

The viewer now checks full segment capsules against nonadjacent capsules, the
actual solid window/frame boxes, and the ground. Red highlights overlap deeper
than 0.001 tile; amber highlights contact/clearance under 0.020 tile. The pair list
reports penetration or clearance in tiles; the diameter table is twice the exact
radius used for both detection and rendering. Warnings remain inspectable when
body envelopes or the wall are hidden. The highlight toggle hides colors only,
not the report. Baseline capsule overlaps can exist even in a neutral pose;
these are conservative proxy warnings, not confirmed mesh penetration.

The Thickness selector includes the original mannequin and 11 mammal profiles
measured from source meshes and actual rest-pose skin weights. Hen is explicitly
unsupported because its bird chain needs a separate envelope. The generator
`tools/build-body-envelope-profiles.mjs` records source hashes, axes, vertex
counts, maximum-distance witnesses and exclusions in
`dist/tactics/body-envelope-profiles.json`. Measurements round upward; no animal
or opening is shrunk. Regenerate when source meshes or rig construction change.

Species selection replaces only radii: bones, authored pose and 81 kg mass stay
unchanged. Maximum-radius capsules overestimate especially around muzzles, ears,
horns and caps. Tails, utility parts, equipment and red-hat variants are excluded.
Skin-weight partitions and these transferred radii do not certify containment of
a posed animal. Shared joints, structural bridges and pairs connected through one
bridge are excluded from self checks; adjacent foldbacks require joint limits or
more detailed geometry. This is a warning tool, not a response/physics solver.

At 1.8 seconds the original mannequin reports head/chest overlap of 0.215 tile
and head/pelvis overlap of approximately 0.182 tile. The current motion must be
corrected; the detector does not suppress these known failures.

Validation for collision diagnostics: **9/10 hostile review**, applying only to
this warning feature. The reviewer independently compared 10,000 randomized
segment/segment and segment/box cases against separate numerical minimization.
All 55 focused tests pass (8 new diagnostic tests plus 47 existing geometric
regressions); build passes. Browser checks cover 12 thickness choices, exact
rendered/detected radius equality, warning toggles, the known head/pelvis overlap,
12 entry/view/envelope combinations, 1,212 samples and playback/reset with no
browser or asset errors. None of these results approves the held animation.

## Joint and load-path diagnostics

The viewer now reports mannequin knee flexion, spine flexion/extension and
combined neck/head flexion. These are illustrative sagittal ranges from the
independent review, not species-specific anatomy. Lateral spine/neck articulation
and missing knee hinge planes warn rather than projecting a bad bend to zero.
Hips, shoulders, wrists and ankles still need their own calibrated constraints.
The old backwards-knee tuck is explicitly detected; it has not been silently
reused as an approved movement primitive.

`motion-force-audit.js` computes the external force and torque required by the
sampled movement and fits what declared contacts can supply. Contact points
must reach the named capsule and surface. Floor and sill patches have finite
extent; a declaration alone cannot create support. Unlabelled legacy contacts
are accepted as ground only when explicitly declared at Y=0 and geometrically
valid. The force fit uses uniform rods and deliberately generous friction,
not muscle simulation or calibrated species/equipment masses.

Pink arrows show missing force, purple arrows its missing torque axis. Read the
numbers for magnitude; arrow lengths are capped for visibility. Peak buttons
seek the worst preview samples. The 40 ms browser scan includes probes around
phase boundaries. It is a preview, not a certification gate. Exact scrubbed
samples are evaluated directly. Species thickness does not alter the 81 kg
mass model. The sampler cache is bounded across replay/scrubbing.

Contact material velocity includes segment translation and transverse rotation.
Unobserved axial spin is assumed zero. A sliding contact may receive friction
only opposite its tangent motion; unexpected slip warns. `contact.sliding=true`
records an intentional slide but does not exempt it from force checks. This
closes a false negative where a floor could propel an already sliding body.

Warning thresholds follow the review: 10% body weight of missing force, 40 N·m
missing torque normally, and 10 N·m in declared ballistic flight. Invalid contact,
undeclared slip and unconverged fitting also warn. Abrupt impacts remain visible;
there is no exemption hiding their derivative spikes. Passing this check cannot
establish muscle strength, joint safety, collision clearance or impact safety.

For a dense independent report, run:

- `node tools/weighted-motion-gate.mjs --entry=braced`
- Add `--strict` to return a failing exit status when a sampled gate is held.

The report samples at 5 ms, includes event-adjacent force probes, joint warnings,
full capsule clearance and peak joint speed. It writes a report under
`artifacts/weighted-motion-gate/`. The original braced motion remains **HELD**;
report generation succeeding does not mean the motion passes.

## Faster sneak timing trial

The user's requested faster pace is `entry=sneak`: 8 seconds instead of the
13.3-second `entry=supported` comparison. This is a uniform retiming of the exact
same poses, contacts, dimensions and adjacent-tile finish. It is a presentation
trial for a potential sneak traversal, not implemented stealth mechanics.
The existing glass break remains in the study; this does not make breaking glass
silent or add an already-open-window gameplay action.

`sampleSneakWindow`, `SNEAK_PHASES`, `SNEAK_IMPACT` and `SNEAK_DURATION` expose
the actual faster clock. The physics audit samples that clock afresh. Glass
elapsed time uses real elapsed time after impact instead of speeding the glass
simulation with the character. This also corrects the slow comparison's glass
clock after its internal timing remap.

The 5 ms sneak report remains **HELD**: approximately 80.1% body-weight peak
missing force, 593.9 N·m peak missing torque and 10.54 units/s peak joint speed.
There are no checked joint-limit or frame/floor-overlap warnings. The baseline
head/chest capsule overlap remains visible. Faster timing does not fix support.

Four new tests verify exact matched poses and contacts, phase/impact clocks,
retimed velocity and acceleration, endpoint handling and deterministic seeking;
the eight slow-crawl regression checks also pass. The build passes. This local
timing experiment is not pushed while the animation's physics gate remains held.

## Local crawl experiment: held, not a motion replacement

The new `entry=supported` option uses a belly-supported crawl because the
seated leg swing could not clear the unchanged lower frame with valid knees.
`weighted-window-supported.js` exports `sampleSupportedWindow`, duration 13.3 s,
phase definitions and glass timing. It keeps the original 81 kg, bone lengths,
radii and 0.95 × 0.65 aperture; final whole-body footprint fits the adjacent tile.

The experiment transfers a palm from sill to floor before releasing the other,
uses a modest outward leg fold with explicit hinge axes, and shifts the pelvis
back over fixed knees before the palms unload during the rise. Reach is bounded
without stretching bones. Support contacts come from measured capsule/surface
proximity, not a time-window assertion. Proximity does not prove load-bearing.

Eight sampler checks pass for fixed dimensions, frame/floor clearance, the
checked knee/spine/neck ranges, phase continuity, deterministic scrubbing,
actual contact geometry, sequential palm contact and final tile containment.
The new-deep-overlap regression excludes only the pre-existing straight-neck
head/chest capsule overlap; the viewer and dense physics gate do NOT waive it.

The 5 ms physics report remains **HELD**. Current peak missing force is about
43.3% body weight at 6.84 s; peak missing torque is 260.6 N·m at 6.025 s. The body tips
head-down while both legs trail outside, then folds them through from floor
palms. Contact existence and passing static poses do not validate that transfer.
The next correction is to bring one knee through sooner while maintaining
sill support, reducing the lever arm before the sill unloads. Do not bake,
retarget, merge or present this as an approved animation.

Independent hostile review: **9/10 for diagnostics and study integration only**;
no motion approval. The strict physics gate still fails. This work remains local
and unpushed while that relevant gate is held, per the repository delivery rule.

## Original braced comparison: finish in the adjacent tile

The user requested a shorter finish: occupy the tile directly beyond the window,
not travel three tiles. The default sill-braced entry now brings the hips inside
before a low-speed drop, makes a short tucked rocking landing, braces on the
palms, gathers the legs, and raises the torso into a kneel. This deliberately
replaces the long forward roll with a compact finish; it is not a full somersault.
The sequence lasts approximately 5.27 seconds. The original forward-dive option
remains available as a labeled comparison and still has its longer travel.

The actual world places windows on tile edges. With the study's wall at local
X=0, the adjacent destination tile is X=[0,1], Z=[-.5,.5]. The viewer now uses
one-unit grid squares with the correct offset and outlines that destination.
The entire final capsule footprint lies in X=[.0961,.9939], so the hands/feet
fit as well as the root. No body scaling, window resizing, or final-position snap
is used. Tests derive this convention independently from the canonical world.

The sill hand remains fixed through the supported crossing. The wrist lifts
over the sill before retracting. Release velocity matches the ballistic drop;
most lateral travel now happens while braced. The compact gather establishes
palm support, sweeps the legs outward using fixed-length IK, plants the feet and
rear knee, then raises the torso with those lower-body contacts fixed. This fixes
an earlier gather that moved its loaded foot across the floor. Knee clearance
constraints and an earlier rear-foot withdrawal avoid clipping the wall.

Earlier hostile review: **9/10**, withdrawn as motion approval after the independent physics audit.

Fourteen independent tests cover the complete endpoint footprint, exact capsule
clearance, fixed dimensions/mass, sill grip, glass contact, continuous release,
ballistic drop, planted finishing feet, true final support polygon, deterministic
scrubbing and dense pose continuity. The four focused suites pass 47 tests.
Packaged browser review covers both entries in 12 view/envelope configurations
and 1,212 scrub samples, plus playback/reset and glass cleanup. Build passes.

API: `sampleBracedWindow(time)` in `weighted-window-braced.js`, with
`DESTINATION_TILE`, `BRACED_PHASES`, `BRACED_RELEASE`, `BRACED_LANDING`, and
`BRACED_DURATION`. This remains authored support/impact motion with ballistic
free flight, not a force, anatomical-joint-limit or self-collision solver.
Animal fitting and gameplay integration remain pending.

## Original forward-dive comparison: sequence and constraints

The approximately 4.26-second sequence loads a planted-foot jump, pushes off,
extends through the window, tucks after clearing the frame, lands into a back
roll, gathers the legs, and holds a supported kneel. It is a forward dive from
a stationary preparation, not a sideways vault or a running approach.

The existing window stays unchanged: wall height 2, sill .85, frame thickness
.025, clear opening .95 wide by .65 high (Y .875 to 1.525). The frame extends
.09 either side of the wall plane. The mannequin retains the original 81 kg,
fixed segment lengths and capsule radii; it is not scaled to fit the opening.

The mass center follows a ballistic arc during flight: forward speed 6 units/s,
gravity 9.81 units/s squared. Pose changes are recentered on that computed mass
center. The planted push builds into the release velocity using a pelvis path
whose terminal speed is derived from the mass-center Jacobian. Feet remain fixed
until release. A review caught and corrected an earlier stop-then-launch jump.

At touchdown, the authored impact reduces forward speed into the roll rather
than stopping the root. The existing rolling-distance constraint then carries
it across the back, into the planted knee/feet rise and a stationary kneel.
The glass breaks on first leading-hand envelope contact; the approved shatter,
CC0 sound and disappearing shards are reused. Seeking is silent and repeatable.

## Scope and remaining limits

This is a motion/clearance prototype, not a solved body dynamics engine. The
6-unit/s jump is deliberately aggressive. Ground impact damping, articulation,
and ground rolling are authored; forces, friction, angular momentum, joint
limits and self-collision are not solved. Passing capsule clearance does not
prove the required muscular forces or clearance for any animal's mesh, horns,
ears, clothing, tail or stowed equipment. Animal fitting and gameplay integration
remain separate work. No other animation or gameplay behavior was replaced.

## Inspection

Three camera views, slow motion, phase buttons, time scrubber, wall cutaway,
body envelope, weight path and optional glass sound are available. Gold marks
the computed mass center; blue balls scale with segment mass, coral identifies
the head, and green rings show actual floor contacts.

Pure API: `sampleWeightedWindow(time)` in `weighted-window.js`. Returns fixed
segments, points, mass properties, contacts, phase/mode, ballistic velocity when
in flight, and glass time. Nonfinite times fail; finite times clamp. Browser API:
`window.weightedWindowStudy.seek(time)` and `diagnostics()`.

## Original forward-dive validation

Earlier geometric review scored **9/10**; it did not validate anatomical or dynamic plausibility.
Ten independent tests cover exact whole-segment capsule/frame distance (with
negative controls), floor clearance, preserved mass/length, ballistic mass-center
acceleration, continuous release velocity, fixed push-off feet, contact-timed
glass, continued travel at landing, head/neck clearance and supported final kneel.

The combined weighted window, weighted roll and glass suites pass 33 tests.
The packaged viewer passes 6 view/envelope combinations and 522 scrub states,
plus playback/reset, without browser or asset errors. The 3D package build passes.

Commands:

- `node --test tests/body-collisions.test.mjs tests/weighted-window-braced.test.mjs tests/weighted-window.test.mjs tests/weighted-roll.test.mjs tests/window-shatter.test.mjs`
- `npm run build:tactics-3d`
- `node tools/weighted-window-review.mjs` (configured Playwright runtime required)
# Hen glass contact timing (local)

The hen's glass break now starts at 3.053 seconds, when her native beak reaches
the pane during the folded passage, instead of the mannequin's earlier impact.
The animal viewport uses its own sampled glass clock; the reference viewport
retains the mannequin clock. Rewinding before contact restores intact glass.
An independent geometry regression checks the beak immediately before, at and
after the event. No character pose, dimensions or clearance path changed.
All 107 focused hen/roster tests and packaging pass. The scoped hostile review
rated this timing fix 9/10 after checking actual pane/shard visibility and rewind
in both outfits (10 browser cases, no errors).

# Director inchworm effort — 2026-09-29

The director gathers and drives twice while his belly crosses the sill. His
pelvis curls 25 degrees against the spine while the braced shoulder stays fixed;
the hips gather forward about 0.036 tile and upward 0.116 tile. He then uncurls
and advances, rather than translating an unchanged horizontal pose. The body
waits outside until it straightens enough to clear the opening. Native bone
lengths, mesh dimensions and the final adjacent-tile kneel are preserved.

Two gather peaks occur at 2.18 and 2.70 seconds. Phase buttons expose the bracing,
gathering and pushing poses. The trailing legs keep kicking on the real clock
while the body pauses; the kicks remain non-supporting. The existing handoffs
and actual sill/floor plants follow the retimed pose, and the full clip remains
eight seconds. This is an authored visual effort, not calibrated species physics.

Both outfits clear 1,601 indexed-triangle samples at 5 ms spacing without frame
or floor intersections. Tests measure actual hip-to-shoulder shortening and
extension, stationary shoulders during gathering, visible pelvis arching,
boundary continuity, fixed native dimensions and existing contact residuals.
All 114 focused fitting/roster/compatibility tests and the production build pass.
Independent hostile visual review: 9/10 for the requested inchworm effort, with
both outfits reviewed from side and three-quarter views. Existing force and
physical-support holds are unchanged.

# Director belly-over-sill swimming legs (local)

Both legs extend backward outside during the belly-over-sill effort, with an
opposing 2.2 Hz kick and ankle wiggle from roughly 1.7–2.9 seconds. The legs draw
through between 2.6 and 3.2 seconds before the original sill plants; the earlier
late-descent flutter is removed. This follows the user's clarified screenshot.
Native dimensions, hand choreography and adjacent-tile kneel are unchanged.
Free feet are explicitly non-supporting; actual sill and floor plants stay fixed.

Both outfits pass 1,601 posed-triangle samples at 5 ms spacing with zero
frame/floor intersections. The regression checks actual feet trailing more than
0.6 tile behind the hips, remaining outside the window, alternating visibly, and
stopping for the planted phases. Seven focused fitter checks pass, including
native dimensions, continuous joints, support markers and actual plant surfaces.
Roster and compatibility regressions pass; packaging passes. The independent
hostile review rates the clarified trailing-leg kick 9/10 after fresh captures
of both outfits and live playback without errors. This is visual
polish, not resolution of the existing species dynamics hold. The study remains
local and unarmed.

# Hen and director fitting revision (local)

This pass addresses the architect's two concrete fitting holds without resizing
the window or character meshes. Other species retain the previous motion.

- **Hen:** a forward bird crouch, short flutter, folded passage and feet-down
  landing replace the inverted mannequin transfer. Native wing and leg bones
  are retained. Three temporary rigid controls fold the tail fan, apron and
  waist tie; they preserve source vertex positions and restore the original
  skeleton and skin-index references when the study releases the model. The
  exposed collar follows the neck, with reversible garment paint coordinates
  replacing the baked sleeve colors that falsely read as an opening. A smaller
  apron fold keeps the cream cloth continuous. Neutral paint and source mesh
  positions remain unchanged; all original attribute references restore exactly.
- **Director:** the arms and legs tuck to clear the opening; palms transfer
  across the sill, hooves use the sill, and palms lower to the inside floor
  before the character settles into a kneel. The curled tail pivots rigidly at
  its base. The original tail binding restores exactly.

Independent checks test every indexed, posed triangle against the finite window
solids, inset by 0.001 tile to allow contact, plus actual floor depth. Both normal
and Red Hat versions of each character pass **801 samples per clip with zero
wall/floor intersections**. The old retarget remains available to the audit via
`--baseline` as a failing control. This is sampled geometric clearance, not proof
of continuous-time clearance, self-collision freedom or dynamic feasibility.

The hen remains head-up, with native feet below her body; its 5 ms continuity scan
peaks at 2.907 tiles/s without discontinuous jumps. The director's fastest free
arm motion peaks at 9.53 tiles/s; at least one authored support marker remains
within 0.007 tile throughout the sampled route. Separate surface checks confirm
actual sole/sill and palm/floor tangency. Other requested support targets can
remain unreachable and their residuals are displayed rather than suppressed.

Both finish entirely inside the adjacent destination tile: hen X 0.092–1.000,
director X 0.123–0.903. The hen's four markers are explicitly comparisons to the
old mannequin, not bird support targets. The UI never reports an empty/free-only
target set as a successful zero-error contact solution.

Independent hostile review: **9/10 for each species fitting correction**. This
accepts the visible posture, cloth and frame-clearance corrections only. The
hen's folded passage has no demonstrated physical lift/support, and secondary
director plant residuals remain. Neither score approves species dynamics.

**128 focused tests pass**, including the new fitting/continuity/triangle tests
and roster, disposal and timing regressions. Packaging passes. Fresh browser
captures cover both outfits and both corrected species; the hen also has a
recorded full playback in `artifacts/hen-fit/playback.webm`. Independent reports
are under `artifacts/window-fit/`. These remain unarmed local studies: species
forces, self-collision, weapon stowing and gameplay integration are still held.

# Full roster sneak study (previous local baseline)

The user accepted the pig director sneak direction and requested the remaining
variants. `animal-window-study.html` exposes all 12 current species/roles with
normal and Red Hat outfits, plus the donkey's blue Hawaiian guide outfit: **25
selectable combinations**. Foreman's original cap is retained rather than adding
a duplicate. Guide hats and fitted Red Hat caps follow the head and participate
in the visible mesh vertex diagnostics. The original pig page remains available
through a compatibility wrapper around the shared retargeter.

The eight-second sequence, original aperture and native character dimensions
are preserved. The comparison is unarmed; equipment variants, weapon stowing and
gameplay integration are not covered by this study. Normal and Red Hat garments
use the existing painted materials. The hen has a separate adapter for her native
pelvis/breast, wing/tip and shank/foot bones: no mammal elbow/knee joints are added.
Her wing reach and floor support remain experimental, with errors exposed.

The selectable roster is horse, goat, bull, cow, donkey, sheep, skunk, pig foreman,
pig director, rabbit, dog and hen. Change animal/outfit to reload that combination;
view direction is retained. Side, three-quarter and front views, grey shading,
cutaway, phase stops and synchronized reference playback remain available.

This expands presentation coverage, **not collision or physical approval**.
The original load-path holds remain, and native mesh thickness can clip the frame
or floor even where the mannequin clears. The 81 kg reference audit is not a
species mass model. Retarget marker residuals are not measured palm/sole contact.
Visible indexed vertex checks include accessories but cannot establish triangle
intersection, self-collision, balance or realistic joint limits for each species.

Verification: **118 focused tests pass** (102 roster/accessory tests plus pig,
supported-crawl and eight-second timing regressions). The browser matrix covers
all 25 combinations in three cameras at five times: **375 samples**, with no
browser errors, plus selector reloads and complete playback. Packaging passes.
Hostile subagent review is **9/10 for experiment integrity**, not physical motion.
The hen has the largest retarget mismatch and remains explicitly flagged in the
viewer. The implementation remains local and unpushed while fit/physics holds
remain. Scratch evidence is in `artifacts/animal-window-viewer/` and sampled
per-variant fit statistics in `artifacts/animal-window/fit-report.json`.

# Pig director retargeting experiment (local)

`pig-window-study.html` plays the eight-second sneak beside the reference mannequin,
using the approved 10k pig director mesh, paint, native bone lengths and original
0.95 × 0.65 window opening. This is an unarmed fitting experiment. The character
and window are not scaled to force a fit. Side, three-quarter and front cameras,
grey paint, wall cutaway, phase buttons and synchronized scrubbing are available.

The controller rotates the native skeleton with fixed-length limb IK. Unreachable
targets report their residual instead of stretching bones. Retarget marker errors
are distances between calibrated bone-offset markers and reference targets; they
are not measured palm/sole mesh contacts. Deformed mesh vertices inside the finite
wall boxes or below the floor are reported separately. This check can miss triangle
crossings and does not certify self-collision or physical support.

The direct transfer **does not yet fit**. A 10 ms scan finds a maximum marker miss
of 0.1983 tile (left foot, 4.25 s), up to 367 vertices inside wall/frame solids
(3.74 s), and up to 0.0459 tile of floor penetration (1.18 s). The pig needs its own
clearance and contact adaptation. The mannequin's 81 kg force audit is not a pig
mass model. Both the prior load-path hold and this native-mesh fitting hold remain.

Four retarget regression tests cover fixed native offsets/scale/geometry,
visible failure reporting, deterministic arbitrary seeking, and caller-state
restoration. These checks establish experiment integrity, not motion approval.
The study stays local and unpushed while the relevant fit/physics gates fail.

Verification: 16 focused retarget/supported/sneak tests and the Pages packaging
build pass. Browser inspection covers 30 samples, three cameras, native scale,
synchronized scrubbing, full playback and mobile stacking with no browser errors.
Hostile subagent review: **9/10 for experiment integrity only**; native pig motion
remains held for clearance, contact and dynamics correction.
