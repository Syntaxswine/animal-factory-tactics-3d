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

## Current default: finish in the adjacent tile

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
