# Probability first, helicoid misses

`tactics/helicoid-shot-study.html` compares three ways to place **misses**.
A shared probability roll decides whether the selected body part is hit.
The helicoid no longer determines whether a successful roll is accurate enough.
This replaces the earlier central-cluster experiment.

Live 3D firearms now use the same roll-margin calculation. The tester remains
a comparison using ellipsoid body proxies; gameplay uses its existing tactical
actor and obstacle collision volumes. Save formats are unchanged.

Following user review, **Roll-margin misses** is the preferred pattern for
gameplay and the tester's initial selection. The other patterns
remain available for comparison. This selection does not change hit probability
or retune the miss spread.

## Hit probability

The tester accepts a base hit chance. Aim adds 0 / 10 / 20 percentage points;
the injury/fatigue control subtracts points. The result is limited to 5–95%,
preserving the requested D20 critical success/failure rules:

- Natural 20 succeeds; natural 1 fails the intended-part roll.
- For rolls 2–19, the probability is `(finalChance / 100 - 0.05) / 0.90`.
  Thus the configured chance already includes both critical exceptions. A
  displayed 65% remains 65%, rather than applying a second D20 penalty.
- A success sends the ray directly from the muzzle to the selected aim point,
  with zero scatter. The actual nearest collision still wins, so cover can
  intercept even a natural 20. Criticals do not add bonus damage.
- A failed roll is passed to the selected miss pattern. It cannot become a
  hit on the intended part, but may strike a different body part.

All patterns reuse exactly the same hit-roll outcomes. The tester holds the
supplied chance fixed when distance, weapon precision or target part changes.
Those controls cannot silently reduce successful rolls through a second
geometry test. Live gameplay's existing chance calculation accounts for range,
shooter stats, target part, cover, aim, injury and fatigue **before** resolving
the hit roll. That calculation remains outside this study's manual controls.

Aim uses shared `aim-levels.js` settings: AP multipliers 1 / 1.5 / 2. The sample
gun's hip shot costs 4 AP, so the three costs are 4 / 6 / 8 AP.

## Mapping misses

The muzzle and aim point define an orthonormal frame. Random rotation chooses
a bearing around that axis. An angular error `e` gives radius `tan(e)` on a
helicoid section one metre along the axis. The straight ray through that point
has a target-plane offset of `distance * tan(e)`. There is no additional range
penalty in the geometry.

If a sampled miss ray would first strike the selected part, a bounded 16-step
search moves it just beyond that part's silhouette along the same bearing.
The search consumes no further randomness. Other body parts remain collision
candidates, including both legs when aiming for the torso. When aiming for
legs, both leg proxies count as the intended region. Rays that already miss
the selected region keep their original error and rotation. This preserves
the existing spread while ensuring a failed roll really misses its aim region.
Cover and ground are still traced for the final result.

The three candidates differ only in miss placement:

1. **Angular misses:** Regular angular scatter for every failed roll, including
   a natural 1. Shooter spread is `0.001 + (1 - effective / 100) * 0.025`
   radians, where `effective = clamp(baseChance + aimBonus - penalty, 1, 100)`.
   Weapon spread is `0.0005 + (1 - precision / 100) * 0.008`. The quadrature
   sum is multiplied by `sqrt(-2 * log(1 - radialRoll))`, capped at 60 degrees.
2. **Helicoid misses:** The same regular scatter, with the existing 28–48-degree
   error for a natural 1.
3. **Roll-margin misses:** The same wide natural 1. On ordinary failed rolls,
   `modifier = floor((effective - 50) / 10)` and `margin = die + modifier - 11`.
   Shooter spread is `0.0105 * clamp(1.2 - margin * 0.12, 0.2, 2.4)`. Weapon
   spread and radial sampling work as above. This margin affects only where
   an already-failed roll goes, never the hit probability.

These spread coefficients are unchanged game-balance candidates, not empirical
calibration. Precision affects misses, not the supplied hit chance.

The helicoid construction was inspired by Vugg's `js/99j-helix-overlay.ts`;
there is no runtime dependency on Vugg. With uniform random rotation, twist
does not change the aggregate distribution. It constructs a straight ray,
not a curved projectile. The earlier `helicoidShot` export remains for legacy
regression tests and is not used by the comparison.

## Collision and damage

The nearest ellipsoid, cover plane or ground intersection determines impact.
The waist-high and head-exposed barriers stay in front of the body even at
one metre. Leg aim uses a leg's center, not the gap between both legs.

Smoke is a finite curtain halfway to the target. A body hit crossing it deals
6–8 damage, even on a natural 20. The bypass checkbox represents a future
skill/tool: it restores normal damage without changing trajectory, hit
probability or visibility. The study permits smoke targeting to test that hook.

Sample normal damage is 45–55, with head ×1.5 and legs ×0.85. Armor and
resistance are omitted. Mean damage per AP includes misses and blocked shots.
These sample damage values have not been adopted in live combat.

## Display and reproducibility

Each batch has 1,000 seeded samples. Each sample reserves D20, radial, rotation,
normal-damage and graze rolls, plus a probability roll from a separate seeded
stream. Existing seeds retain their original D20 and scatter inputs. Every
pattern and every distance-chart point shares these rolls; editing conditions
never rerolls them. New rolls changes the seed; Reset restores defaults.

The cards distinguish successful hit rolls, selected-part impacts, accidental
body hits from misses, and cover/ground impacts. Sample percentages can differ
from the configured chance. The distance chart's dashed line is the shared
successful-roll rate. Colored lines include accidental body hits and exclude
intercepted shots, while keeping the configured chance fixed.

All target panels share a scale. Successful rays coincide at the aim point;
large misses are counted outside the view. Marks are target-plane projections,
not claims that bullets passed through cover. The inspector shows the roll
separately from its impact, and explains when a miss was moved beyond the
selected part. Its diagram is schematic, with exaggerated offsets and no
physical flight-time simulation. A successful roll bypasses that construction.

## Validation and remaining integration

- `node --test tests/shot-models.test.mjs tests/helicoid-shot.test.mjs tests/aim-levels.test.mjs`
- `node tools/check-shot-models.mjs` with `PLAYWRIGHT_PATH` and optionally
  `EDITOR_ORIGIN`. It closes its temporary browser on success or failure.
- `npm run build:tactics-3d`, including the study's module closure check.

Tests cover exact probability accounting including criticals; consistency
across distance, precision, body part and miss pattern; incidental head/leg
hits; preservation of original miss spread; cover; smoke; reproducibility;
aim/AP; and desktop/mobile UI behavior.

## Live integration

`ballistic-shot.js` connects this math to the pinned 3D core through
`tools/core-ballistics-adapter.mjs`. Regenerate with `tools/sync-tactics-core.mjs`;
do not edit the generated core files directly. The original sprite branch is
unchanged. Every fired round uses a shared probability result and sends only
failed rolls through roll-margin scatter. Natural 1 and 20 are included in the
5–95% final chance. Bursts use their existing per-round recoil penalties, AP
charge and ammunition accounting. Guard fire, overwatch and retaliation follow
the same path; melee, flames and explosives keep their prior resolution.

The shot planner weights successes directly and samples misses using the
conditional D20 distribution. At 95% hit chance, all failed rolls are natural
1s; they must not be sampled as ordinary misses. Forecasts use a private seeded
stream and never consume encounter RNG. Live shots retain their probability
roll, angular error, direction and actual first collision in the event.

Shotguns roll once per shell. A centered pellet follows that result and the
remaining pellets spread around it. A failed shell's pellets can hit other
parts or other people, but cannot become hits on the selected body region.
All pellets retain their actual collision-based damage regions. The centered
successful pellet preserves the existing selected-region aiming behavior.

Physical tracing still handles floors, walls, windows, trellises, props, cliffs,
ramps, towers, casualties and bystanders. Tactical actors remain stance-scaled
cylinders with height-based regions, including the existing synthetic weapon
target on an accurate shot. This does not replace those volumes with animal
mesh colliders. Tactical launch points remain stance-based and include tower
and cliff support heights. Rendering uses the model's muzzle when available
and the resolved endpoints; it never changes damage based on animation or
model loading. Tracers now cover other firearms and shotgun pellet paths,
with existing visibility clipping and reduced-motion behavior.

Weapon precision defaults to the reviewed study value of 80 and can be supplied
per weapon; this pass does not introduce new per-weapon balance coefficients.
Smoke curtains and their graze/bypass controls remain study-only because there
is no tactical smoke-volume system yet. They are not inferred from decorative
flamethrower smoke. Visible mesh-based body exposure, animated launch transforms
as simulation inputs, and travel-time simulation remain separate work.

Integration checks additionally cover `tests/ballistic-shot.test.mjs`, the combat,
jam, loot, tower and save suites, `tools/check-shot-planner.mjs`, core generation
verification and the deployment build's missing-module checks.
