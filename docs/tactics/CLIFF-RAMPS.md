# Cardinal cliff ramps

Sixteen ramp props: four uphill directions, each with grass, sand, asphalt
(road) or concrete finish. Each is one tile wide with a four-tile run and a
continuous two-metre rise. Adjacent parallel ramps can form wider approaches.

## Editor placement

1. Place the high landing as a full cliff-ledge tile on the lower level.
2. Paint its floor on the next logical level up.
3. Choose Prop and ramp-<finish>-<direction>, with Rotate unchecked. The anchor
   is the northwest tile of the four-cell footprint; the named direction points
   uphill. Leave one clear lower approach tile and the adjoining upper landing.

Placement validates the footprint and landing. Missing floors, blocked
approaches, a rotated prop or a ramp on the highest level are rejected. Undo,
JSON export/import and complete reusable blocks preserve ramps. Erasing the
ramp leaves the independently authored landing intact. A block containing a
ramp but omitting its required upper landing cannot be captured as valid.

## Gameplay and geometry

Ramp cells have continuously sampled support heights, including unit aim,
projectiles and explosions through the shared unit-height path. The ramp solid
has an analytic ray intersection used by projectile, sight and tactical light
occlusion. Rendered slopes have the same two-metre rise, with a thin surface
finish. Side entry/drop-offs are blocked; traversal follows the ramp axis.

Ascending and descending use ordinary stance-based walking AP, not the 8 AP
cliff climb action, and do not request a climbing animation. Ramps connect to
full ledges, not curved crags or arbitrary building floor heights. Units use
existing walking presentation; dedicated slope foot placement is not added.

Review: tactics/cliff-ramp-study.html. This is the cardinal ramp implementation;
diagonal river/cliff contour extensions remain separate work.

## Cliff-to-ramp bank set

Select a ramp, choose Dirt/Grass/Sand under Ramp bank surface, then click
Add banks to selected ramp. This atomically places four one-cell transition
pieces on each side. Existing props are never overwritten. The eight tiles
are solid and cannot be walked on; the centre ramp keeps its ordinary walking
route. Add full cliff ledges along the outer edge and at the high end to form
the surrounding plateau, as illustrated by the updated ramp study.

Bank steps 0–3 match the ramp elevation at their inner edges and rise through
a curved deposited-material profile to the two-metre cliff top. Left/right
pieces and all four uphill directions share matching seams. Individual bank
pieces are also available as rampbank props. The rendered triangles are reused
for tactical ray occlusion. Editor undo, blocked placement and block export
are covered by regression tests. This is the first visual pass on the join.
