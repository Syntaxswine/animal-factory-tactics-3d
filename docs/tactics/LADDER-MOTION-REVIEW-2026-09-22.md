# Ladder presentation review — 2026-09-22

## Decision

Independent hostile subagent review: **9/10**, approved as an isolated presentation study. This is not approval to merge or wire gameplay.

The reviewer inspected all eleven mammals, both outfits, four views and native gameplay scale, then checked fresh browser close-ups of the dog, rabbit and both pigs. The fitted glove joins, sleeve ownership, dog jacket paint and foreman seat weighting resolved the blocking visual defects. The approved source model and texture files are unchanged.

## Validation

- **619 tests passed**, including fourteen ladder-specific tests. Tactical asset validation passed.
- The 3D Pages build passed.
- Browser coverage: eleven mammals × two outfits × two fixtures; both ascent and descent sampled through every phase. Exact counts and per-fixture durations are in the evidence summary.
- The clearance probe samples **321 poses for each of 22 animal/fixture combinations**, using the actual posed vertices, visible square rail segments, rungs and landing volume. It includes the slung rifle and temporary glove/cuff meshes. Named finger/palm grip regions are exempted locally; entire arms are not exempted.
- No sampled deck or rung penetration exceeded the probe's 1 mm reporting threshold. Twenty combinations also had no reported rail penetration. The compact foreman fixture retained eight vertex samples, maximum **6.86 mm**, at the forearm/cuff boundary during the exit. The compact director fixture retained three, maximum **4.79 mm**, at the trousers near the flare's start. Targeted close-up review found these acceptable for this study. These counts are vertex observations, not distinct collisions.

This is finite posed-vertex sampling, not continuous triangle collision certification. A passing numerical test does not replace visual review.

## Integration conditions and holds

- The compact fixture visibly adds upper handholds to the old short connector.
- Both pigs require the visibly modeled **0.94-wide flared upper exit**. Their bodies are not resized or compressed to pass through the original straight opening.
- Only the already-slung worker rifle is supported. Stow/unsling transitions and other equipment remain unauthored.
- Hen wing contacts remain held.
- The surrounding platform is an isolated clearance fixture. Actual tower walls, roofs, neighboring props and gameplay transitions require integration review by the wiring owner.

Use [the controller handoff](LADDER-MOTION-HANDOFF.md) for the coordinate frame, lifecycle and integration contract. Archived evidence is in [reviews/ladder-motion-2026-09-22](reviews/ladder-motion-2026-09-22/validation.json).
