# Hand grenades: gameplay and roster integration

2026-10-08 · `work/editor-3d`

The rough standing throws from animation commit **f8eb82a** are connected to
ordinary gameplay for all twelve animals, including both pigs and the hen's
wing-and-toe rig. The painted grenade prop and texture are adopted from the
same study. There is no dependency on a study page or another checkout.

## Using the planner

Equip a fragmentation grenade and choose **Lob grenade**. Move the pointer to
preview the arc, click to lock the aim point, then confirm or reposition.
Clicking a visible character, barrel or strategic structure also opens this
planner. Cancel or Escape spends no AP, ammunition or random draws.

The selected interaction level determines the target floor. The cyan line is
the nominal lob; orange shows the path after contact and the predicted blast.
A blocked destination has a red reticle but remains a legal throw. This allows
wall rebounds without a separate bank-shot mode. The dashed aim ring shows
miss uncertainty; the large orange ring is the five-tile blast radius.
Friendly characters near the predicted blast are listed. Hidden characters do
not alter the preview, but can intercept the actual thrown grenade.

Review fixture: `tactics/battle-3d.html?study=grenades`. It uses ordinary gameplay
with a horse, goat, pig director and hen, a building, ladder, roof and short wall.

## Rules and tuning

- One throw costs **5 AP in combat** and one grenade from the existing loaded
  inventory. Exploration retains the normal action/clock rules.
- At Strength 50 / Agility 50, maximum ranges are **10 / 15 / 19 / 22 tiles** for
  the same elevation / one / two / three levels below. Intermediate elevations
  interpolate; larger drops cap at 22. Uphill range is reduced.
- The stat multiplier weights Strength 70% and Agility 30%, reaching **0.7× at
  both stats 1**, **1× at 50**, and **1.3× at 100**. Explosives provides the main
  accuracy contribution, with Dexterity contributing through shared stats.
- Accuracy is rolled once against the **original aim point**. A failed roll
  produces a horizontal offset from its miss margin and a random direction.
  The offset lob is then simulated against scenery. Bounces never reroll.
- The fuse lasts **four presentation seconds from release**, including flight,
  rebounds and rolling. It can expire in midair. A successful accuracy roll
  reaches the intended first landing point, not a guaranteed final blast point.
- The five-tile fragmentation blast has raw damage anchors of **120 / 100 / 60 /
  25 / 8 / 6** at distances zero through five, interpolated between anchors.
  Existing Endurance resistance applies afterward. Solid cover shields victims.
  Fragmentation itself does not ignite people; an exposed explosive barrel can
  chain into the existing fuel blast and fire system.

The range envelope is RPG tuning. The lob is an endpoint-constrained ballistic
arc, not a claim of physically calibrated human throwing performance. Collisions
use swept grenade volume against native scene geometry: floors and ceilings,
wall edges, crates, cliff faces, ramps, tower shells and strategic-site triangles.
Rebounds lose energy and a grenade can fall off a ledge. Native floor spacing is
2.12, so neither origin nor blast heights inherit the legacy three-unit spacing.

## Presentation, saves and interruption

The approved rig owns the pin pull, throw and recovery. Its release point is
baked per species and matches the starting point of the live projectile under
all four cardinal headings. The live trajectory replaces the study's fixed
demonstration flight. The authored arm motion is retained; it is not retimed for
each range or slope. Crouched/prone throws retain the basic presentation rather
than forcing a standing animation through the floor.

Balance preparation is baked offline; the first throw does not execute the
study's iterative solver. Temporary skin weights, the hen's additional bones,
equipment and the pig director's trouser paint adjustment are restored when
recovery ends or playback is cancelled/interrupted. Reduced motion uses a short
presentation without replaying the full throw. A new fire/traversal controller
cannot take ownership of a still-bound throw rig.

Damage, ammunition and AP commit once in the tactical engine, as with other
attacks. The immutable event carries the trajectory and presentation receipts.
Visible casualties, destroyed scenery and chained fuel blasts wait for the fuse
before appearing. Saving stores the committed result; loading never repeats the
throw, spends resources again or resurrects destroyed scenery.

## Source and verification

`tools/core-grenade-adapter.mjs` adapts the pinned tactical core; regenerate with
`node tools/sync-tactics-core.mjs`. Do not edit generated core files directly.
After changing the reviewed rig or motion, regenerate the prepared balance and
release points with `node tools/prepare-grenade-motion.mjs` and verify `--check`.

Focused checks cover range/stat boundaries, ceilings and wall bounces, miss-roll
ordering, steep blast falloff, cover, barrel chaining, native elevation, save
determinism, resource charges, hidden-unit previews, fuse timing and scenery.
Every animal's release position and rig restoration are exercised under four
headings, with cancellation, casualty, reduced-motion and recovery transitions.
The imported motion/roster tests retain the reviewed outfit and clearance checks.

`tools/check-grenade-gameplay.mjs` verifies actual planner clicks and throws in
Edge, including cancellation and a blocked destination. Set `PLAYWRIGHT_PATH`
to the installed Playwright module and optionally `GRENADE_REVIEW_URL` to a
different local server. Screenshots and the report go to
`artifacts/grenade-integration/`; the browser closes in `finally`.

The Pages build includes the new modules and painted texture and retains its
missing-module checks. This builder branch does not itself deploy GitHub Pages;
canonical publication remains with the architect.

## Independent review, October 8

Reviewed through `bd58196`. The live horse/hen throw sample and all-animal integration tests passed, but the coding branch remains held for the campaign arrival failure, base Pages dependency omission and canonical reconciliation. The preparation check also needs CRLF-safe comparison; the normalized generated data matches. See [the detailed follow-up](INTEGRATION-REVIEW-2026-10-06.md#october-8-follow-up-gameplay-branch-bd58196) for reproduction, checks and integration requirements.
