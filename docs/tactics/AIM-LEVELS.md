# Three firearm aim levels

The battle Aim selector offers Hip shot (normal AP), Aimed shot (1.5 times normal AP, rounded up), and Full aim (twice normal AP). Aimed and Full aim add 10 and 20 percentage points to hit chance before the existing 10–95% clamp. The target preview and attack use the same selection. Changing the selection is free; firing spends the displayed cost once.

Precision aim applies to bullet weapons, including shotguns. Melee, thrown explosives, launchers and flamethrowers retain their existing attack rules. Burst costs include the existing burst surcharge before the aim multiplier. AI, retaliation and overwatch default to Hip shot. This adds an aim-effort choice independently of body-part targeting; the current 3D Fire control still targets the torso.

`aim-levels.js` defines the tiers. The recorded core adapter adds optional trailing aim-level arguments to `previewAttack` and `attack`, preserving existing callers. Regression tests cover preview/charge agreement, insufficient AP, ammunition, accuracy caps and weapon eligibility. `tools/aim-levels-review.mjs` checks the browser selector and actual Fire button charge.

## Facing and manual targeting in 3D

Detection uses the character's current facing. Manual targeting evaluates the view after a free turn toward a character currently identified by the squad. The shooter still needs their own clear sightline and recognition; an ally cannot grant a shot through a wall, a hidden body part, or an unidentified concealed target. Selecting or hovering a target changes no heading, awareness, AP, time, or random state. Firing commits the turn and charges only the selected shot's normal AP cost.

Right-click a tile and choose **Face this direction** to turn the primary selected merc without moving or spending AP. This uses the existing turn action, immediately refreshing detection and cancelling reserved overwatch without refunding it. The menu names the merc who will turn and disables the action while moving, busy, unable to act, or already facing that direction.

The crosshair, shot estimates and attack validation share `canAimAt`. Direct flame targeting uses the same rule; revealed barrels also allow a free turn while preserving their physical obstruction checks. Guards and reserved overwatch retain their actual facing and detection rules. This change applies only to the generated 3D core, leaving the original 2D fork intact.

`tests/targeting-sight.test.mjs` covers rear-facing guide targeting, execution cost, pure previews, unknown contacts, walls, doors, window sills, concealment, overwatch and revealed barrels.
