# Ladder playback integration

Live gameplay now includes the approved pig and unarmed hen routes, plus rifle-equipped wooden climbs. See [LADDER-GAMEPLAY-INTEGRATION.md](LADDER-GAMEPLAY-INTEGRATION.md) for the current support matrix, asynchronous preparation, and checks. Historical limits below describe the original iron-only integration.

The iron searchlight ladder tower now consumes the existing `towerTraversal` event for non-pig mammals with any of the thirteen supported loadouts. The approved six-second body controller is imported from `work/ladder-animation` at `2c2f458`; its art handoff remains in `LADDER-MOTION-HANDOFF.md`.

`BattleTraversal` remembers consumed event IDs, locks other battle actions during playback, and drives only the ladder controller while it is active. The ordinary walking, posture and firing controllers resume after disposal. AP and the traversal's 30 exploration seconds are charged by `climbTower` once. Exploration clock updates pause during playback; the presentation clock continues unless the user pauses or opens the character screen. Reduced motion skips the clip. Death, removal or equipment changes cancel presentation and retain authoritative state.

Weapon placement now uses the shared carried/stowed controller documented in `EQUIPMENT-STOW.md`.

The frame maps the source ladder's X=1.49, Z=-0.8 rung plane (relative to the tower center) onto the controller's X=0.35 plane, facing inward. Both tower rotations and base-floor elevations are handled. Gameplay occupancy remains committed to the destination throughout this presentation, matching the existing event contract.

The full iron-tower journey now includes walking to the ladder, stowing, the six-second climb, passing through the doorway, recovering equipment and walking to the assigned post. Its variable presentation duration does not charge additional AP or time. It uses the shared equipment stow controller for all thirteen loadouts; completion does not request a duplicate draw animation.

Current limits: Pigs need a visibly widened exit, hens need wing contacts, the wooden tower's hatch ladder needs a separate geometry review. Those cases retain their existing immediate traversal. Stairs do not play ladder motion.

## Shared-equipment integration review

Adapted the committed iron-tower journey from `2a2e382`; newer uncommitted wooden-tower work in the ladder worktree was not imported. Included its reversible tail tuck and compatible casualty posture dependency. The journey owns body contacts; `equipment-stow.js` owns weapon placement and sling/holster/pouch/pack assets. No rifle-only equipment controller is reintroduced.

Regression coverage exercises every loadout in both directions, each phase boundary, and cancellation, casualty, weapon change and normal completion at each phase. It checks accessory disposal, retained weapon identity, finite subsequent casualty/carry poses and unchanged authoritative encounter state. Existing nine-species route/contact/surface tests remain in place. Browser review covers all thirteen loadouts and return to carried equipment.

This is an integration candidate for architect review, not a renewed independent clearance approval for every large weapon through the doorway. Wooden hatches, pigs and hens remain outside this change.


Wooden presentation checkpoint: see `LADDER-COMPLETION-HANDOFF.md`. Its reviewed nine-mammal rifle study remains separate from production activation, both pigs and hen.
