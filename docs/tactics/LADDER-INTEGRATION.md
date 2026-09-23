# Ladder playback integration

The iron searchlight ladder tower now consumes the existing `towerTraversal` event for rifle-equipped, non-pig mammals. The approved six-second controller is imported from `work/ladder-animation` at `2c2f458`; its art handoff remains in `LADDER-MOTION-HANDOFF.md`.

`BattleTraversal` remembers consumed event IDs, locks other battle actions during playback, and drives only the ladder controller while it is active. The ordinary walking, posture and firing controllers resume after disposal. AP and the traversal's 30 exploration seconds are charged by `climbTower` once. Exploration clock updates pause during playback; the presentation clock continues unless the user pauses or opens the character screen. Reduced motion skips the clip. Death, removal or equipment changes cancel presentation and retain authoritative state.

The frame maps the source ladder's X=1.49, Z=-0.8 rung plane (relative to the tower center) onto the controller's X=0.35 plane, facing inward. Both tower rotations and base-floor elevations are handled. Gameplay occupancy remains committed to the destination throughout this presentation, matching the existing event contract.

Current limits: the clip begins with the rifle slung and ends at the ladder landing; placement then returns to the assigned tactical post. Pigs need a visibly widened exit, hens need wing contacts, other weapons need stow animations, and the wooden tower's hatch ladder needs a separate geometry review. Those cases retain their existing immediate traversal. Stairs do not play ladder motion.
