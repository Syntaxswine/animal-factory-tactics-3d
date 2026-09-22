# Three firearm aim levels

The battle Aim selector offers Hip shot (normal AP), Aimed shot (1.5 times normal AP, rounded up), and Full aim (twice normal AP). Aimed and Full aim add 10 and 20 percentage points to hit chance before the existing 10–95% clamp. The target preview and attack use the same selection. Changing the selection is free; firing spends the displayed cost once.

Precision aim applies to bullet weapons, including shotguns. Melee, thrown explosives, launchers and flamethrowers retain their existing attack rules. Burst costs include the existing burst surcharge before the aim multiplier. AI, retaliation and overwatch default to Hip shot. This adds an aim-effort choice independently of body-part targeting; the current 3D Fire control still targets the torso.

`aim-levels.js` defines the tiers. The recorded core adapter adds optional trailing aim-level arguments to `previewAttack` and `attack`, preserving existing callers. Regression tests cover preview/charge agreement, insufficient AP, ammunition, accuracy caps and weapon eligibility. `tools/aim-levels-review.mjs` checks the browser selector and actual Fire button charge.
