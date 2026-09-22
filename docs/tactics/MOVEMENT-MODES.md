# Walk, Run and Sneak

The movement buttons affect all selected mercs and are mutually exclusive. Mode changes are free; queued movement, unavailable units and shot playback prevent changing mode. Buttons highlight only a shared group mode. Failed members are identified in the action message.

| Mode | Movement AP | Presentation speed | Effective stealth |
| --- | --- | --- | --- |
| Walk | Normal | Normal (500 ms per step) | Trained stat |
| Run | 50% of normal | Double (250 ms per step) | Trained stat |
| Sneak | 150% of normal | Half (1,000 ms per step) | Trained stat +20, capped at 100 |

The user approved +20 stealth and half-speed Sneak. Double-speed Run is a presentation choice accompanying its requested AP discount. No stamina or additional running noise penalty was introduced. Sneak retains the existing quiet footsteps and detection modifiers, now using the boosted effective skill in sight-range and detection-chance calculations. Trained stealth is never mutated or permanently awarded.

Costs multiply the current stance's normal movement cost: a straight standing step is Walk 2 / Run 1 / Sneak 3 AP. Diagonals retain exact fractional AP; floor transitions and border crossings use the same multiplier. Exploration retains the core's free tile movement behavior. Pathfinding, threat estimates, route execution and group movement use the same rule. The cost label reports a straight tile, not stairs or diagonals. Running combines with existing stances as a faster pace; it does not automatically stand a merc or charge a stance change.

Mixed groups wait for the slowest member's step before accepting the next group step. Each displayed actor interpolates at its own mode speed; a runner may finish early and wait. The scheduler derives timing from the queued actors, not the selected primary merc. Reduced motion retains the action cadence while displaying accepted positions immediately.

## Shared source and validation

These deliberate shared rule changes were authored on the separate source branch `work/movement-modes-core` in `Syntaxswine/animal-factory`, commit `ee61884`, based on the prior pinned `6e2782a`. The 3D sync tool imports all twenty modules byte-for-byte from that commit; the generated core is not independently edited. Neither project's mainline is changed by this delivery.

Source validation: 487 tests and assets passed, including five dedicated tests of stance/cardinal/diagonal/floor/border costs, stealth, blocked mode changes and mixed-group AP spending. 3D coverage adds timing, group controls and unchanged simulation outcomes under animation queries. `tools/battle-movement-modes-review.mjs` exercises actual controls and records step duration, mixed-group pacing and reduced motion. Evidence is under `artifacts/battle-movement-modes/`. The independent review scored this change 9/10 with no blocking findings.
