# Shot planning and combat pressure

The 3D encounter now has a selectable body-part/aim matrix and a burst toggle.
Selecting a cell plans the shot; Fire commits it. The existing Weapon target
remains available alongside Head, Torso and Legs.

## Agreed rules and initial tuning

- Hip costs the weapon's base AP. Aimed costs ceil(1.5 × base). Full costs
  exactly 2 × base. For bursts, the existing +2 AP surcharge is included in
  base before multiplication, and the total is charged once.
- Full uses the current calm accuracy baseline (weapon skill/weapon/range
  calculation plus 20). Aimed is 10 percentage points below it; hip is 20
  below it, before the existing 10–95% first-round clamp. These are game
  tuning values, not a fitted empirical shooting dataset.
- Fatigue and lost health each deduct up to 10 percentage points at all aim
  levels. Subsequent burst rounds lose 8 points each, down to 1%. Aiming
  therefore benefits every round. Preview and execution share this sequence.
- Existing damage multipliers remain: head ×1.5, torso ×1, legs ×0.85,
  weapon ×0.75, followed by existing resistance rules.
- A damaging leg hit creates one nonstacking wound: movement AP doubles,
  including ladders, towers and cliffs, and available/next-turn AP loses 3.
  The healthy cliff cost remains 8 AP. Full healing clears the provisional
  wound; detailed wound severity and treatment are a later design step.
- Five distinct hostile shooters in one round trigger one personal Leadership
  check. A burst counts as one shooter. A clear aimed ray to the target or an
  actual hit qualifies; a ray intercepted by solid cover or another unit does
  not. This is an initial suppression test, not a general near-miss volume.
- Failed checks pin the target. Hip fire and movement remain available; aimed
  and full shots are rejected without spending resources. Next own turn tests
  Leadership again. End of contact clears pinning and its attacker ledger.
- Optional combat fields survive encounter saves. Loading validates their
  types and referenced unit identities; older saves need no migration.

## Geometry and probability scope

The matrix shows estimated chance to hit the selected part; the detail below
shows both selected-part and anywhere-on-target chances. Burst values are in
round order. Shotgun values mean at least one pellet. These are conditional on
the round firing and the scene remaining unchanged; jams or casualties can
stop later rounds.

The forecast weights the existing accurate-shot branch and deterministically
samples 96 outcomes from its existing miss branch, using a separate local RNG.
It traces actual tactical obstacles and actor collision shapes. It neither
consumes encounter RNG nor replaces the miss distribution. Probabilities are
approximate, not the old accuracy-roll percentage relabeled as a physical hit
chance. Direct aim still uses the existing zone-center aiming and synthetic
weapon hit classification. Actor colliders are the existing stance-scaled
cylinders, not animal-specific meshes or measured exposed surface areas.
Sampling partially exposed body surfaces and the custom miss system are
future work; do not describe this tranche as exact silhouette-based accuracy.

Distance display uses **1.2 metres per tile**. The approved grey horse's skull
top (centerline vertices excluding ears) is 1.5693 renderer units above its
feet. Assuming six feet gives 1.16535 metres per tile, rounded to 1.2 for a
practical constant. This does not resize art or change existing weapon ranges.
Renderer and tactical vertical scales remain distinct existing systems.

## Verification

- `node --test tests/combat-planner.test.mjs tests/aim-levels.test.mjs tests/encounter-save.test.mjs`
- Related movement, field treatment, tower, ladder, cliff, stat and jam suites.
- `node tools/sync-tactics-core.mjs --check`
- `node tools/check-shot-planner.mjs` with Playwright and the existing preview.
- `npm run build:tactics-3d`, including deployment module-closure validation.

The combat adapter records the changes to generated core code. Regenerate
using `tools/sync-tactics-core.mjs`; never edit `core/engine.js` directly.
