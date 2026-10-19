# Climbing skill integration

Climbing is a saved, trainable character stat from 1 to 100. Gameplay buttons,
right-click actions, walking previews, queued movement and guard routing use the
same eligibility and AP calculation. The editor exposes Climbing in Character
properties and supports undo, export and reusable blocks.

## Accepted rules

| Route | Skill benchmark | Chance at benchmark | Double-skill result |
| --- | ---: | ---: | --- |
| Ordinary ladder | 2.5 | 60% | 100% at 5, without condition penalties |
| Rusty ladder | 2.5 | 60% | 99% at 5 |
| Window | 20 | 60% | 99% at 40; failure never causes a fall |
| One-story roof | 40 | 60% | 99% at 80 |
| Exposed wall | 90 | 60% | Unreachable with the 100-point stat cap; 64% at 100 |

Climbing 1 cannot use a ladder. Climbing 2 can attempt ladders only outside
combat, with 38% success when unpenalized. Climbing 3 can attempt them in combat,
with 68%. Alerted exploration counts as combat for this restriction and AP.
Windows, roofs and walls allow difficult attempts below their benchmark,
including below half the benchmark. Standing is required.

A single D100 check occurs when the attempt commits. Previewing or changing a
route never consumes randomness. Ordinary ladders have no critical failure;
rusty ladders and other checked routes fail critically on 100. All failed window
attempts return safely, including that critical face. A normal failure up to 25
points above the success threshold returns safely; a greater miss causes a fall.
The attempt spends its AP and stamina once on either outcome. A changed or
occupied landing rejects the action before spending either resource or rolling.

Ordinary flat and sloped roofs now provide physical climb routes without a
special climbable model. Existing climbable variants remain compatible.
Parapets, blocked landings, closed doors and ceilings still obstruct traversal;
skill does not make them disappear. Walls require clear space above both sides.
Rusty ladder placement is in the editor's Access tool.

## Initial balance choices

These tunable values fill the unspecified parts of the design:

- Below the benchmark, chance is `floor(60 × ratio²)`, where ratio is effective
  skill divided by the benchmark. At or above it, chance is
  `floor(60 + 40 × (ratio − 1))`. Positive effective skill has at least 1% success;
  risky routes cap at 99%, ordinary ladders at 100%.
- Effective skill subtracts a rounded penalty: up to 20 points from the greater
  of stamina deficit and campaign fatigue; up to 10 from missing HP; and up to 30
  from load above carrying capacity. These can remove automatic success.
- Per-story combat AP interpolates from the benchmark to skill 100, rounded up:
  ladders 6 → 2, windows 4 → 2, roofs 8 → 4, walls 12 → 8. Lower skills use the
  benchmark AP. Leg injuries retain their movement multiplier. Skill 100 can run
  up a ladder for 1 AP per story, matching running one ordinary tile.
- Ladder towers are three stories and charge three times the ladder AP/stamina,
  with one check for the journey. Stair towers retain their established rules.
- Authored cliff ledges retain 8 AP and use a skill benchmark of 50. This does not
  make unmarked, sealed tutorial cliffs climbable.
- Old saves and characters without an authored Climbing value gain 50. Migration
  does not refill HP, AP or stamina. Legacy simulations without character stats
  keep their existing traversal costs and do not gain window/wall climbs.

## Falls and presentation

Fall damage at 100 kg total body/equipment mass is 20 / 50 / 90 HP for one / two /
three stories: `5 × height² + 15 × height`. Multiply by `sqrt(totalMass / 100)`,
bounded to 0.75–1.5, then round. This is a game balance curve, not a physics
simulation. It shares the upright cast's existing body-mass values. Armour does
not absorb the impact. Impacts of at least 20 damage injure surviving legs using
the existing movement/AP penalties.

An ascent slip uses half the climb height; a descent uses the full height. A wall
slip uses one story. Landings stop at the first supporting floor and avoid living
or incapacitated occupants. They never pass through an occupied solid floor to
one below. A fall with no valid landing is fatal. Floor destruction now uses the
same height/mass damage rule and casualty handling.

Reviewed roof, cliff and tower journeys remain in use. Ordinary tile ladders,
windows, wall climbs and slips have basic procedural presentation so the actions
are visible; those motions remain candidates for an artist pass. Equipment and
pose restoration are covered for all twelve animals. A fatal or interrupted
journey yields to casualty presentation. This work does not add bespoke fall
animations or change the existing traversal asset loadout limits.

The independent `climbSeed` persists in encounter and campaign saves. Transient
animation events and attempt messages do not replay after loading. Roof route
and parapet caches respect geometry revisions after edits and destruction.

## Review

Use `tactics/battle-3d.html?study=climbing` or
`tactics/editor-3d.html?editing=1&study=climbing`. The isolated fixture has a
skill-100 ladder user, skill-20 window user, skill-40 roof user and skill-90 wall
user, plus a rusty ladder. It does not overwrite the Quick Fight autosave.

Regression coverage includes every D100 face, exact preview/charged AP,
exploration-to-combat changes, occupied/removed landings, safe window failures,
falls, group events, guard routes, save migration, authoring history, block
copies, physical wall collision and both deployment module lists.

Packaged UI review exercised ladder ascent/descent, window and wall attempts,
context-menu odds, the ordinary roof option, the rusty ladder palette, and the
character skill field with undo/redo. No browser warnings or errors were
reported. The temporary review server and tabs were closed after review.

Verification commands:

Verified on 2026-10-19: all 2,595 tests passed, asset validation passed, generated
core verification passed, and both packaged builds completed successfully.

```text
npm run check
node tools/sync-tactics-core.mjs --check
npm run build:tactics-3d
```

The 3D build also runs the base Pages build. Publishing this branch does not
deploy GitHub Pages; deployment is triggered by `main`.
