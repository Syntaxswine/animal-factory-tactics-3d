# Helicoid shot model comparison

The existing `tactics/helicoid-shot-study.html` is now a three-model comparison.
This is a tuning study; no live projectile, combat RNG, save format, or damage
rules were changed. The body shapes are ellipsoid proxies, not animal meshes.

## Shared geometry

The intended aim point and muzzle define an orthonormal frame. Random rotation
chooses a direction around that axis. Angular error `e` chooses radial offset
`tan(e)` on a helicoid section one metre along the axis. The straight ray from
the muzzle through that point gives a target-plane offset of `distance * tan(e)`.
There is no extra range multiplier, shrinking/expanding section, or close-range
placement floor in these new models. The earlier `helicoidShot` export remains
for the legacy study's regression tests but is not used by the comparison.

The radial/angular construction was inspired by Vugg's
`js/99j-helix-overlay.ts`; there is no runtime dependency on Vugg. Uniform
random rotation makes the extra twist irrelevant to the aggregate distribution.
It is a way to construct rays, not a curved bullet trajectory.

The selected body part's apparent width is `2 * atan(width / (2 * distance))`.
It is displayed for explanation, not used as another distance penalty. Leg aim
uses the left leg's center, rather than the empty space between both legs.

## Candidate rules

All spread constants below are game-balance proposals, not empirical calibration.

1. **Angular scatter:** A geometry reference with no critical exceptions.
   Effective skill is `clamp(skill + aim bonus - penalty, 1, 100)`. Shooter
   spread is `0.001 + (1 - effectiveSkill / 100) * 0.025` radians. Weapon spread
   is `0.0005 + (1 - precision / 100) * 0.008` radians. Their quadrature sum is
   multiplied by `sqrt(-2 * log(1 - radialRoll))` to sample an angular error.
   The error is capped at 60 degrees, safely short of a singular 90-degree ray.
2. **Angular + D20:** The same ordinary scatter. Natural 20 sets the error to
   zero; natural 1 sets a 28–48-degree error. Each has a 5% probability before
   collision. Neither awards a hit or a miss directly. A perfect shot can hit
   cover; a failed roll can still accidentally hit a body part.
3. **D20 roll + skill:** The same natural extremes. For rolls 2–19, the modifier
   is `floor((effectiveSkill - 50) / 10)`, margin is `die + modifier - 11`, and
   shooter spread is `0.0105 * clamp(1.2 - margin * 0.12, 0.2, 2.4)` radians.
   Weapon spread and radial sampling then work as above. Skill affects the
   margin, rather than also applying the first model's continuous skill spread.

All three models also make an ordinary accuracy check with a probability equal
to effective skill / 100. Passing selects a central cluster with one quarter of
the sampled angular error; failing leaves the sampled error unchanged. This is
a change to the frequency of well-placed shots, not a reduction in the spread
of failed checks. Natural 1 and 20 take precedence. A passed check is still a
ray subject to collision and can miss a small or distant target.

The original shooter and weapon spread coefficients above are preserved. For
skill 65, precision 50, hip aim, a clear torso and seed 42, a 10,000-shot sample
of Angular + D20 rises from 69.68% to 86.80% any-body hits at 20 metres.

Aim uses the shared `aim-levels.js` settings: 0 / 10 / 20 accuracy bonus and
1 / 1.5 / 2 AP multipliers. The illustrative gun costs 4 AP at hip aim, so the
three costs are 4 / 6 / 8. The penalty control represents the net injury/fatigue
modifier; it does not simulate a merc's individual stats.

## Collision and damage

The nearest ellipsoid, cover plane or ground intersection determines the result.
Waist-high cover and the head-exposed barrier remain in front of the target at
one metre, rather than overlapping the muzzle.

Smoke is represented by a finite curtain halfway to the target. A body hit
whose ray crosses that curtain before impact deals 6–8 damage, including a
natural 20. The bypass checkbox represents a future skill or tool: it restores
ordinary damage but does not change the ray, turn a miss into a hit, or grant
visibility. The study permits aiming through smoke to exercise this hook.

Sample normal damage is 45–55, with head ×1.5 and legs ×0.85. There is no critical
damage multiplier, armor or resistance. Mean damage per AP includes misses and
blocked shots; these values are for comparison and have not been adopted in combat.

## Reproducibility and display

Every batch uses 1,000 seeded samples. Each sample reserves D20, radial roll,
rotation, full-damage roll and graze-damage roll, plus an accuracy-check roll
from a separate seeded stream. That stream leaves all five earlier values
unchanged for existing seeds, including the D20 events and failed-shot rays.
All models and all distance-chart points reuse those inputs. Changing smoke,
aim, cover or selected model never rerolls them. New rolls changes only the seed;
Reset restores the reproducible default setup. Actual sampled critical counts
are displayed; they need not be exactly 50 each.

Every target panel uses the same scale. Large errors are counted outside the
view so a few critical failures cannot shrink the useful target area. Plotted
marks are target-plane projections, not claims that a bullet passed through
cover. The inspector reports the actual first collision separately. Its lower
diagram is explicitly schematic and does not depict physical flight time.

## Checks

- `node --test tests/shot-models.test.mjs tests/helicoid-shot.test.mjs tests/aim-levels.test.mjs`
- `node tools/check-shot-models.mjs` with `PLAYWRIGHT_PATH` and, optionally,
  `EDITOR_ORIGIN`. The test closes its temporary browser even after failures.
- `npm run build:tactics-3d`, including the study's module closure.

The browser check covers model selection, seeded reset, critical-roll inspection,
point-blank misses, cover, smoke bypass, aim/AP, invalid seeds and narrow screens.
The next decision is which distribution to tune; live combat integration still
needs real muzzle transforms, character collisions and the same sampler in the
shot-menu forecasts.
