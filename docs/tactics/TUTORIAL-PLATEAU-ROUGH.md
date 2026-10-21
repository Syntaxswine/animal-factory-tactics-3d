# Six-sector tutorial foundation

The first four tutorial sectors share a two-tier plateau centered on their common corner. Canonical arrangement: northwest step 4, northeast step 3, southwest step 2, southeast starting step 1. Town sectors 5 and 6 are directly north of plateau sectors 4 and 3. The complete footprint is two columns by three rows: `5 6 / 4 3 / 2 1`. Sector 4 to sector 5 remains the sole plateau descent; sector 3 has no descent to sector 6.

Each map is 240 × 240. The main outer cliff meets shared edges 24 tiles from the outside boundaries (one-tenth), or 216 tiles from the central junction. Between the seams the outline varies into broad lobes. Sector 4’s west cliff follows x=24 from y=24 to its southern edge, with the northern connection still bounded by x=80 and x=160. The upper tier follows this outline with a 0–2-tile lower shelf rather than a large concentric terrace. Width is measured on the tile grid; some sections have stacked cliff faces without an exposed shelf.

In northwest step 4, an 80-tile-wide plateau extension reaches the north boundary between x=80 and x=160 (one-third and two-thirds). Its summit travel marker is at x=120, y=0. Sector 5 continues that same cliff footprint from its south boundary for 24 tiles (to y=216), with matching elevations along the shared edge. Its ground-level town area has test starts and a travel marker. Sector 5 now has a three-tile-wide timber descent at x=119–121: two consecutive supported wooden ramps connect the summit at y=217 to ground at y=209. The seam into sector 4 is unchanged. Other cliff faces stay closed. Buildings, encounters and campaign transitions remain to be authored.

Existing full-tile ledge meshes form the perimeter; their potential editor climb capability does not create gameplay links automatically. Lower interior cells are void to prevent walking beneath raised land. The larger perimeter requires the cliff tile budget to increase from 512 to 1,024, within the existing total prop limit.

Files: sector-library/tutorial-step-1 through tutorial-step-6/rough-plateau.json. Original placeholders remain. Each folder is in-progress and defaults to its rough variant in the library. Edit and save normally; rotate the whole six-sector group together.

Open sector-library/tutorial-plateau.html for the combined plan and editor links. All levels are visible by default; choose the edit level for the surface you want to interact with, and Overview to see a whole sector. These maps are terrain foundations without encounters or dialogue.

Generation: node tools/generate-tutorial-plateau.mjs regenerates rough variants and previews; preserve hand-edited versions under another filename first. Tests cover save parsing, closed traversal, elevation seams, 24-tile margin, shelf widths, and the northern approach.

## Town sketch and road placement

The user’s green annotation lines describe newly drawn cliff tiers; they do not invert the original filled preview colours. Ground remains level 0 (dark green fill), the lower cliff tier level 1 (tan), and the original summit level 2 (light green fill). Sector 5 adds an isolated lower-tier outcrop northwest of the junction and a larger lower-tier shoulder south of the west road. An upper-tier curve continues from sector 4 into that shoulder. The usual narrow shelf still applies away from these expressly drawn wider shapes. All cliff faces remain closed.

Town roads are asphalt at ground level, six cells wide. The east–west band occupies y=117…122 across the sector. The north branch occupies x=117…122 and joins it at the midpoint. Sector 6 continues the same east–west road along y=117–122. There is no southern road branch. The town descent is a separate timber route; town buildings remain to be authored.

## Stone arches and deferred layer expansion

The user specified the large arch’s walkable top on **layer 4**, and the small arch’s on **layer 2**, counting ground as layer 1. The separate four-playable-layer / fifth-fringe-layer migration is explicitly deferred. This change does not expand the game’s current layer schema.

- Sector 5 reserves the large landmark at x=184, y=114, ground level, rotation 90°. Its 12-tile span crosses the six-tile road, with an eight-tile clear opening and one ground tile on either side. The reservation is stored as `archLandmark` metadata and drawn dashed in the plan. It is not spawned while layer 4 is unavailable. Regeneration adds the arch and three-stage timber approaches when the shared playable-layer count supports it.
- Sector 6 contains the small six-tile arch at x=172, y=152. A four-tile opening carries a two-tile dirt footpath. Separate timber ramps connect to its layer-2 top.
- Objects → Scenery exposes the arch types and four cardinal rotations. Unsupported height placement is rejected atomically. The small arch can be placed, rotated, captured in a block, saved and playtested now.
- Upper walking surfaces derive from the prop. Moving/removing the prop moves/removes its surface; block capture does not bake a detached floor into the saved block. Ground and upper routes use separate selection levels. The same closed geometry supplies sight, bullet and grenade collisions. Natural rock uses the existing cliff-terrain blast policy.

The current economical procedural stone mesh/skin is an integration placeholder. The artist’s sculpted and painted arch assets, their final dimensions and their collision bake require a subsequent integration review. Large-arch layer-4 movement and the four-playable-layer expansion are not complete.

Review: `editor-3d.html?editing=1&study=stone-arches` and `battle-3d.html?study=stone-arches` rehearse the available small arch with a merc above and others below. The six map folders are also available through Sector presets. The organized authoring source remains `AnimalFactory3D/sectors/tutorial/tutorial-step-1` through `tutorial-step-6`; runtime copies are under `dist/tactics/sector-library/`.

## Verification of this tranche

180 focused/regression tests pass, including six-sector generation and legacy placement backups, reciprocal tutorial reachability, sector presets, original plateau preservation, small-arch traversal and four rotations, block capture/removal, independent ground/top picking, sight/projectile/grenade collisions, save/load, map caches, editor operations and deployment module closure. The Pages build, asset audit, core regeneration and machine/helicopter bakes pass. Packaged UI review selected the arch top on layer 2, walked Anya across it and Misha underneath on layer 1. Large-arch layer-4 traversal remains explicitly unverified and unavailable pending the deferred layer migration.

![Packaged small-arch traversal review](review-images/tutorial-small-arch-gameplay.png)
