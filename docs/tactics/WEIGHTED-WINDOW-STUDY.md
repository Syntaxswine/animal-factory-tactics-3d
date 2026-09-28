# Weighted mannequin: window dive to kneel

2026-09-28 | work/window-shatter

Viewer: `tactics/weighted-window-study.html`. This extends the approved weighted
roll study into a complete window crossing, without fitting an animal yet.

## Sequence and constraints

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

## Validation

Independent hostile review: **9/10** for this bounded weighted-dive prototype.
Ten independent tests cover exact whole-segment capsule/frame distance (with
negative controls), floor clearance, preserved mass/length, ballistic mass-center
acceleration, continuous release velocity, fixed push-off feet, contact-timed
glass, continued travel at landing, head/neck clearance and supported final kneel.

The combined weighted window, weighted roll and glass suites pass 33 tests.
The packaged viewer passes 6 view/envelope combinations and 522 scrub states,
plus playback/reset, without browser or asset errors. The 3D package build passes.

Commands:

- `node --test tests/weighted-window.test.mjs tests/weighted-roll.test.mjs tests/window-shatter.test.mjs`
- `npm run build:tactics-3d`
- `node tools/weighted-window-review.mjs` (configured Playwright runtime required)
