# Weighted mannequin: window dive to kneel

2026-09-28 | work/window-shatter

Viewer: `tactics/weighted-window-study.html`. This extends the approved weighted
roll study into a complete window crossing, without fitting an animal yet.

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

Independent hostile review: **9/10** for the compact mannequin study.

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

Independent hostile review: **9/10** for this bounded weighted-dive prototype.
Ten independent tests cover exact whole-segment capsule/frame distance (with
negative controls), floor clearance, preserved mass/length, ballistic mass-center
acceleration, continuous release velocity, fixed push-off feet, contact-timed
glass, continued travel at landing, head/neck clearance and supported final kneel.

The combined weighted window, weighted roll and glass suites pass 33 tests.
The packaged viewer passes 6 view/envelope combinations and 522 scrub states,
plus playback/reset, without browser or asset errors. The 3D package build passes.

Commands:

- `node --test tests/weighted-window-braced.test.mjs tests/weighted-window.test.mjs tests/weighted-roll.test.mjs tests/window-shatter.test.mjs`
- `npm run build:tactics-3d`
- `node tools/weighted-window-review.mjs` (configured Playwright runtime required)
