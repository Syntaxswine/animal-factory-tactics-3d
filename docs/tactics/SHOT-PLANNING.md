# Shot planning and combat pressure

Clicking a visible opponent opens a graphical shot-planning popup. Click a
body region or its labeled button, then choose one of three aim controls. A
burst toggle shows per-round estimates. Planning pauses simulation; Fire
commits the shot. Escape or × cancels without spending AP. The existing Weapon target
remains available alongside Head, Torso and Legs.

## Agreed rules and initial tuning

- Hip costs the weapon's base AP. Aimed costs ceil(1.5 × base). Full costs
  exactly 2 × base. For bursts, the existing +2 AP surcharge is included in
  base before multiplication, and the total is charged once.
- Full uses the current calm accuracy baseline (weapon skill/weapon/range
  calculation plus 20). Aimed is 10 percentage points below it; hip is 20
  below it, before the 5–95% firearm clamp. These are game
  tuning values, not a fitted empirical shooting dataset.
- Fatigue and lost health each deduct up to 10 percentage points at all aim
  levels. Subsequent burst rounds lose 8 points each, down to 5%. Aiming
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

Live firearms roll the final hit probability once. Natural 20 succeeds and
natural 1 fails; ordinary checks are normalized so the total remains the stated
chance. A success aims directly at the selected region, subject to interception.
Only failures use the approved roll-margin helicoid scatter. Failed selected-part
rolls may hit another body part or another person, including allies. Existing
critical exceptions are included in the probability, never applied a second time.

The forecast weights successes and deterministically samples 96 failures using
the same scatter and conditional D20 distribution as execution, on a separate
local RNG. At 95% chance all failures are natural 1s. Actor and obstacle tracing
is shared; displaying the menu consumes no encounter randomness. Selected-part
and anywhere-on-target percentages still differ because misses can cause
incidental hits and obstacles can intercept successes. Shotguns roll once per
shell, preserve a centered pellet on success, and spread their other pellets.

Direct aim retains zone-center aiming and synthetic weapon hit classification.
Actor colliders remain stance-scaled cylinders, not animal-specific meshes or
measured exposed surface areas. Partial-surface aiming and mesh colliders remain
future work. See `HELICOID-SHOT-STUDY.md` for the integration and current limits.

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

The combat and ballistics adapters record changes to generated core code. Regenerate
using `tools/sync-tactics-core.mjs`; never edit `core/engine.js` directly.

Close daylight contact: within three tiles, a geometrically identifiable target
with at least one visible body region and illumination >= 0.25 is identified
immediately, including normal daylight shade. Solid occlusion and the sight
field still apply. Awareness-enabled encounters cannot enter turn mode merely
because an alerted guard can reach the squad: that threatening guard must have
visual contact with a merc in either direction, or an attack must occur. Ongoing
combat, fires and casualty handling retain their existing turn progression.

Recognized targets use a lower retention threshold (25 rather than the initial
100). This prevents an already identified guard becoming unknown at a score
of 89 despite clear current geometry. Current identification geometry is still
required; walls, leaving the sight field, or evidence below 25 prevent targeting.
Regression coverage uses the reported factory positions: Yakov (10,16), Boris
(16,18), 08:15, Round 1, score 89.4919 with an existing last-known identity.

Ordinary visibility: non-sneaking characters with a visible head, torso or leg
region at illumination >= 0.25 are immediately identified anywhere within the
observer cone and overall species sight range (60 tiles before species scaling).
This includes daylight shade and ordinary lamps, bypassing peripheral acuity,
woodland recognition penalties and accumulated awareness. Solid body-ray
occlusion still applies. Sneaking or darker targets retain awareness checks,
close-contact recognition and the recognition retention threshold described above.

## Flamethrower area targeting

The 3D flamethrower now uses an ice-cream-cone template anchored at the shooter,
10 tiles long and 6 tiles across at its widest. Its outline joins the nozzle
to a circular mouth with a rounded cap. Select **Aim flame cone**,
move the pointer to orient it, click to place, then **Fire spray**. Reposition
and Escape/Cancel spend nothing. Clicking an identified opponent with the
flamethrower equipped places the fan toward that person instead of opening the
body-part shot planner. Ground clicks still move normally outside aiming mode.

Planning pauses encounter time and movement while leaving camera controls
available. Selecting another merc, changing the held weapon or viewed floor,
restarting, and loading an encounter cancel the transient plan. A placed cone
must still pass the normal action checks when fired. The preview shows AP/fuel
costs, known affected people, and friendly-fire warnings, without exposing
undetected characters. It clips at discovered scenery and cannot be placed in
undiscovered terrain; aiming farther away only changes direction, never range.

Each spray costs the existing 6 AP in combat and 1 fuel, once for the whole
area. Every exposed body in the fan is hit, including allies and incapacitated
characters; there is no firearm probability, helicoid miss, body-part choice,
or aim-level bonus. Existing distance damage (180 within 3 tiles, tapering to
45 at 10), endurance resistance, fatal burns, tank reactions, and survivor
ignition/panic remain in the normal damage pipeline. No new persistent ground
fire or scenery destruction is added by the spray.

The shared tactical tracer blocks walls, closed doors, floors, cliffs and
props. Bodies do not shield other bodies. Standing people may be exposed over
low cover while prone people are protected; head, torso and leg exposure rays
decide inclusion, with the same result in the preview and damage pass. Sprays
stay along the shooter's surface (base elevations within one tactical height
unit); there is no free vertical aiming at another floor. Guards, retaliation
and overwatch use the same area calculation.

The ground template is a horizontal projection clipped at nozzle height;
highlighted people also account for stance and body exposure. The visible
plume starts at the equipped model muzzle and follows the recorded fan, clipped
to current visibility. It does not perform a second damage pass. Reduced motion
omits the animated plume. The original 2D fork and saved encounter format are
unchanged; `tools/core-flame-adapter.mjs` regenerates the pinned core override.

Checks: `tests/flame-cone.test.mjs` and `tools/check-flame-cone.mjs`, alongside
the firearm, shot-planner, reaction, casualty and save regression suites.
