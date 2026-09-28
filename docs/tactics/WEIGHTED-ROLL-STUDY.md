# Weighted mannequin: forward roll to kneel

2026-09-28 · `work/window-shatter`

The user requested a roll that ends in a kneel while discussing a weighted
wireframe foundation for animation. This first test isolates the **ground roll**
from the existing window vault. Viewer: `tactics/weighted-roll-study.html`.

## What the prototype establishes

An 81 kg abstract mannequin uses fixed-length body segments with explicit masses,
rounded collision envelopes, and a center of mass computed from the weighted
segment midpoints. The viewer shows the weights, a contrasting head and face
direction, the center-of-mass projection, floor contacts, and an optional mass path.

The 4.1-second study starts already braced and tucked, rolls across the upper and
lower back, unfolds the legs, plants the rear knee and feet, raises the pelvis,
and holds a kneel. It does not include a standing run-up or a window launch.
The neck/head do not bear floor contact. The finishing torso leans forward enough
for the mass center to lie inside the **actual convex contact polygon**, not just
its rectangular bounds. Knee and feet remain fixed through the supported rise.

The demonstration is an **authored motion with contact constraints and mass
diagnostics**, not a force-driven physics engine. Rolling travel is integrated
from the mass-center height and turn angle as an idealized rolling constraint.
Floor placement prevents capsule penetration; the gather uses fixed-length leg
IK. Forces, impulses, friction, angular-momentum conservation, self-collision,
and anatomical joint limits are not yet solved. A moving mass center outside
the static support polygon is not labeled a balance failure during the roll.

These limits matter: the tests establish geometry, contact, continuity, and the
static finishing balance. They do not establish that a real body can produce
all the forces needed for this timing or that the previous window vault has
become physically correct.

## Controls and API

Play/pause, reset, time scrubber, phase buttons, three camera views, slow motion,
body-envelope toggle, and center-of-mass path toggle. Scrubbing is deterministic.

`sampleWeightedRoll(timeSeconds)` returns joint positions, segments and their
masses/radii, total mass, center of mass, inertia about the rolling axis, floor
contacts, support containment, and phase information. Times clamp to 0–4.1 seconds;
nonfinite values are rejected. No character, gameplay state, or existing animation
is mutated. This mannequin uses illustrative proportions and masses; transferring
it to horse, pig, or hen rigs still requires species-specific calibration.

## Verification

**9/10 hostile review passed** for this bounded contact-and-weight study.
Eight independent tests pass and cover segment lengths/masses, midpoint-weighted COM,
rolling-axis inertia, complete capsule floor clearance, no head/neck support,
the true support polygon at the held kneel, fixed knee/feet during the rise,
phase and dense temporal continuity, and deterministic seeking.

The packaged browser check covers **6 view/envelope configurations and 498
sampled states**, plus live playback and reset, with no browser errors.
`npm run build:tactics-3d` includes the module and viewer with module-closure checks.

Reproduce with `node --test tests/weighted-roll.test.mjs`, then
`npm run build:tactics-3d` and `node tools/weighted-roll-review.mjs` with
`PLAYWRIGHT_PATH` set to an installed Playwright package. Screenshots/reports
remain under uncommitted `artifacts/weighted-roll/`.

## Follow-on work

Review the roll's feel before connecting it to a window exit. The next physics
increment should establish a ballistic flight and landing impulse, then constrain
the roll's contact forces and energy. Character retargeting, weapon clearance,
and per-species mass/shape profiles follow that test; this change does not claim
those are complete.
