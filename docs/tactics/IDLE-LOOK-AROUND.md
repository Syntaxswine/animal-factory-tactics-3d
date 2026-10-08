# Idle: standing and looking around

**Direction (the boss, 2026-10-08):** "great job on this. the next step will be idle animations.
just standing and looking around."

"This" is the naturalistic horse grenade throw (#1, approved as the baseline at `fc1573e`).

## Plan

A seeded, looping idle for the horse worker, built the way the throw was built: authored where a
person would author it, computed where physics decides it.

Authored (seeded, never two loops alike):
- **Looks.** Fixations held for 0.7–4 s, with varied amplitudes. Small scans, looks to either side,
  glances at the ground, returns ahead.
- **Gaze shifts.** The head leads with a minimum-jerk turn whose duration grows with the angle.
  The chest follows later and the hips later still, but only for looks too wide for the neck alone.
  The head turn from the chest stays under the 40° the skinned neck seam allows.
- **Breathing.** About 14 breaths a minute, inhale shorter than exhale, with an occasional deeper
  breath.
- **Weight shifts.** Every so often the weight settles onto one hoof. The free hip drops a little,
  the free knee softens, and the shoulders counter-tilt (contrapposto).

Computed:
- **Centre of mass.** A linear inverted pendulum runs over a centre-of-pressure plan (weight
  shifts plus small postural sway), solved periodically so the loop has no seam. The pelvis is then
  iterated until the real segment centre of mass follows it, as in the throw.
- **Hanging arms.** The arms lag the trunk's turns and settle like pendulums.

Kept fixed:
- Both hooves stay planted. No sole vertex moves.

Checks, before review:
- the throw's physical tests carried over: bone lengths and IK; soles on the floor that never slide;
  required centre of pressure under the soles; head within the neck limit; arms out of the torso;
- loop seam and determinism;
- gaze on target during fixations; head leading the trunk;
- variety: fixation times and directions that do not repeat;
- a `phantom-wrench` audit rig;
- a browser checker that writes review images.
