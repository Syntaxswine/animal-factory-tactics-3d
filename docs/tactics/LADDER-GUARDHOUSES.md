# Ladder-access guardhouses

Seven new variants preserve every stair tower's guardhouse and material while replacing the stair assembly with an exterior ladder and guarded doorway landing. Existing stair variants remain unchanged.

| Stair source | Ladder variant |
| --- | --- |
| wood-stair-tower | wood-ladder-tower |
| iron-stair-tower | iron-ladder-tower |
| wood-wrap-tower | wood-rear-ladder-tower |
| iron-wrap-tower | iron-rear-ladder-tower |
| wood-large-wrap-tower | wood-large-ladder-tower |
| iron-large-wrap-tower | iron-large-ladder-tower |
| iron-searchlight-stair-tower | iron-searchlight-ladder-tower |

Side-entry and rear-entry configurations retain their source doorway. The 5×5 houses keep a standard-width ladder rather than scaling it with the house. Each ladder has 22 rungs, upper handholds, standoffs, landing side rails, and supporting columns. The clear central landing opening lets the climb continue toward the door. Declared placement footprints remain those of the source towers; stairs no longer occupy the surrounding space. The iron searchlight remains mounted beneath the front window with lighting deferred.

Geometry tests cover all seven source mappings, no leftover stair meshes, rung counts, handhold height, clear outside climbs, landing headroom, doorway approaches and retained searchlight. Existing footprint/material/disposal tests include all new forms. tools/ladder-towers-review.mjs checks each variant, iron finish controls, browser errors and mobile overflow. Art only: ladders are not wired to character climbing or navigation.

Independent hostile review: 9/10. Additional reviewer checks found all 63 sampled landing-to-door rays clear across the seven variants.

## Gameplay lighting integration

The wooden spotlight tower and both iron searchlight guardhouses are now available in the 3D editor with active scheduled lighting, one-to-three-point sweep routes and instant spotlight detection. See [Artificial lighting](ARTIFICIAL-LIGHTING.md). The gallery remains a passive art preview; climbing/navigation is still deferred.
