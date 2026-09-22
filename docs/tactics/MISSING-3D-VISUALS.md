# 3D visual inventory — 22 September 2026

This inventory is based on the checked-in model, weapon, environment and motion catalogs. A model being present does not establish every pose, equipment combination or frame-time budget.

## Already available

- Twelve character entries: horse, goat, bull, cow, donkey, sheep, skunk, rabbit, dog, hen, pig foreman and pig director. Existing smaller meshes and authored paint are reused.
- Weapon models for unarmed, knife, pistol, rifle, assault rifle, SMG, HMG, shotgun, sniper rifle, grenade, grenade launcher, RPG and flamethrower. These are static equipment/carry assets; a complete firing cycle for each weapon and species is not established.
- An environment workshop with 47 props, 16 boundary types, 11 terrain types and two access structures. Trees, fences, industrial furniture, medical equipment, floors, walls, doors, roofs and water have modeled presentations.
- The newer painted cargo library is now connected to all 261 crate/drum placements on the authored factory map. Large multi-tile cargo arrangements remain gallery assets until matching map footprints are authored. The latest donkey neck paint correction is also integrated.
- Eleven mammal rifle motion studies and an unarmed hen study. The current walk/kneel/aim/fire/stand sequence is a timed demonstration, not a gameplay animation controller.
- Existing 2D UI artwork can continue serving inventory, portraits and menus in a 3D game.

## Missing or incomplete visual work

| Element | What remains | Priority |
| --- | --- | --- |
| Gameplay locomotion | Standing walk, position/facing interpolation, stop settling and reduced-motion support are now connected. Remaining work: stance-specific gaits, terrain transitions and further visual refinement | Partial |
| Aiming and firing | Standing rifle aim, grip, recoil and muzzle attachment now follow resolved game shots for mammals. Other weapons, stance variants and armed hen handling remain | Partial |
| Kneeling and prone | Controls, transitions, low movement cycles and rifle aiming are connected. Further gait polish and other weapon action cycles remain | Partial |
| Casualties | Grounded bleeding/stable/dead poses, fall transitions and recovery are connected. Terrain-conforming falls and treatment animation remain | Partial |
| Combat feedback | Rifle muzzle flash and visibility-clipped resolved traces are connected, with basic impact markers for ballistic shots. Material-specific sparks/dust, hit reactions and richer damage feedback remain | Partial |
| Opposing uniforms | Red-hat/outfit variants are not connected to the character models; the model alone must not be relied on to identify allegiance | First |
| Reloads and equipment changes | Magazine/round insertion, reload motion, draw/stow/swap, empty weapon poses and carried secondary equipment | Next |
| Hen equipment | Wing grip and armed animation; existing hen motion is explicitly unarmed | Next |
| Climbing | Stair locomotion, ladder hand/foot contacts, roof climbing and floor transitions | Next |
| Explosives and fire | Thrown grenade arc, launcher/RPG flight, explosions, flamethrower stream, burning ground and persistent burn/damage effects | Next |
| Interaction actions | Wire cutters and fence-cutting motion, medical treatment, pickup/drop and teammate transfer | Next |
| Ground items | World-space loot piles, ammunition, dropped weapons and medical items, correctly gated by actual visibility | Next |
| Door interaction | Animated door hinges/open/close presentation tied to the canonical door state; existing models supply static poses | Next |
| Tactical guides | Movement route/AP preview, facing and sight guides, overwatch area, target body zones, stair/ladder/roof-climb indicators, exits and travel markers | Next |
| Fog and occlusion | Explored-but-not-currently-visible shading, roof/wall cutaway, actor occlusion feedback and multi-floor readability | Next |
| Large-map navigation | Minimap, numbered sector navigation and mobile pinch zoom in the new encounter UI; clickable overview is now available | Next |
| World/campaign interface | Connect the existing inventory, progression, hiring, economy and travel interfaces to this presentation; these are largely UI integration, not missing 3D art | Later |
| Factory skyline | Audit decorative sprite-only machinery/building silhouettes against modeled replacements; the encounter currently omits the decorative skyline | Later |
| Distant characters | Reduced-detail meshes or impostors and distance-based animation updates; measure before selecting budgets | Later |

## New encounter coverage

`dist/tactics/battle-3d.html` loads the authored 36-guard factory map and uses actual 3D models, current shared-core movement, attack previews, attacks, reloads and enemy turns. It now animates standing locomotion and turning, while retaining the equipped weapon's carry pose. This is the first encounter integration, not a complete replacement for the sprite game's interface or campaign.

Easy displays the map's scenery even outside explored terrain. It does not add cells to `seen` or `visible`, add enemies to `detected`, reveal unseen bodies, reveal loot, or change attack legality. Standard retains explored-terrain filtering. Bodies in this page require current terrain visibility; living opponents require canonical detection. Known contacts and peripheral glimpses are not yet drawn.

The first encounter keeps the fixed isometric camera, with pan, zoom, floor selection and an overview that can be clicked to inspect any part of the authored map. Free camera rotation would also require replacing projection-based tactical overlays and reviewing wall/roof visibility from every angle.
