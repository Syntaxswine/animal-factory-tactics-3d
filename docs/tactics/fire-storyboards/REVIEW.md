# Independent hostile storyboard review

October 4, 2026. Reviewer: independent `fire_storyboard_hostile` agent.

**Firing sheet: 9/10. Engulfment/ash sheet: 9/10. No blocking issue for this bounded concept-art delivery.** These scores approve the illustrated direction only. They do not approve an implemented animation, combat rules, equipment changes, or catalog-wide coverage.

## Evidence inspected

- `flamethrower-storyboard-v1.png`
- `engulfed-to-ash-storyboard-v3.png`
- `README.md` and `PROMPTS.md`
- Existing equipment references `../hybrid-review/weapon-models/flamethrower-close.png` and `../hybrid-review/weapon-models/flamethrower-asset.png`
- Relevant current constraints in `dist/tactics/core/engine.js`, `dist/tactics/battle-combat.js`, and `art/flamethrower-animation.md` at the supplied source baseline `3d4a3a4`

## Findings

The firing sheet clearly separates carry, brace, ignition, sustain, cutoff, and recovery. Both hands keep their grips, the hose stays connected and clear of the hooves, and the tank mass stays attached to the torso. Visible support under both hooves makes the braced pose credible. The jet begins at the nozzle, and cutoff leaves a visible air gap while the last plume continues forward. There is no illustrated rifle-style kick. The drawing uses the detailed painted weapon as its visual reference; the README correctly prevents that from becoming an unrequested equipment-model redesign.

The revised hit sheet reads as full-body engulfment rather than a small clothing fire. The body and separate limbs remain legible through the fire. Tile 1 has a trailing airborne leg; tile 2 has an advancing knee and hoof with the supporting hoof beneath the hips. These are distinct gait keys, not duplicated running poses. The tile labels establish source 0 and three successive destinations. At tile 3 the body lowers toward knee/hand support before resolving into a grounded ash heap on the same tile. The rifle stays held through travel, releases during collapse, and lands beside the ash; this is a coherent visual proposal.

The documentation accurately separates that proposed terminal three-tile journey from the existing three-turn burning state, which can produce up to three legal panic steps per applicable event. It also identifies the illustrated rifle drop as a proposal with inventory behavior still undecided. No runtime success is claimed, and no runtime checks were run for this art review.

## Remaining implementation gates

- Define the authoritative terminal event and which hit/casualty outcomes invoke it. Resolve blocked or shortened routes, interruption, and the separate tank-explosion case.
- Decide equipment and loot behavior explicitly; preserve item conservation and keep final unit, ash, and loot positions consistent.
- Retain and animate actual legal path steps. The numbered poses must not become shortcuts through obstacles or one oversized stride per tile.
- Prove continuous hoof contact, weight transfer, hand grips, hose clearance, nozzle alignment, and the collapse in a deterministic scrub-able study. The static keys do not establish those transitions.
- Inspect close and gameplay views, both profiles and rear, reduced motion, low/high aim, other firing stances, and each supported species/outfit/weapon combination before claiming coverage.
- Obtain a separate independent hostile review of at least 9/10 on the actual animation and integration.
