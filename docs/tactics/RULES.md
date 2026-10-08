# Sector generation, height and environment test rules

This slice implements mechanics only.

- Landscape visibility reaches 75 tiles and character detection reaches 60 tiles, using three-dimensional distance and ray checks. Elevation does not extend these caps. Solid walls and floors remain authoritative.
- Guns use horizontal distance plus 1 tile per level uphill for range and distance-based accuracy. Downhill shots use normal horizontal distance with no range bonus or penalty. Melee range does not change. An elevated target gives a 15 percentage-point uphill cover penalty; ordinary directional cover remains 25 points and the two do not stack. Direct vertical stair shots have no imaginary platform-cover bonus.
- Stairs cost 2 AP per level, ladders 3 AP. Old untyped connections remain stairs. Both connect matching XY cells on adjacent levels. Elevators are reserved for later travel between local maps and are not implemented here.
- Environment props have explicit footprints independent of artwork. Tables and workbenches occupy 2x1 cells, or 1x2 when mirrored. Low props provide directional cover; stacked crates block sight; pallets can be walked over. Fences and railings block crossing while leaving sight open. Wall art remains on shared tile edges.
- Ground textures are six alternatives for walkable surfaces. Water is impassable. Bridge decks and approach roads remain walkable.
- A river layout uses a deterministic 10x10 sector plan with matching north/east/south/west sockets. The first templates are yard, workshop, river, bridge and approach road. North-south and east-west rivers use the same templates with the whole plan rotated. The river runs continuously across the map with exactly two separate 4-tile-wide bridges and continuous approach roads.
- This is the first rule set, not a general constraint editor or winding-river solver. Room placement remains available independently. Generated river channels and approaches are validated after edits; violations prevent playtesting until repaired. General map validation also checks all starts and the travel marker are reachable.
- Existing version-1 and version-2 maps remain loadable. Props, sector metadata and typed vertical links extend the current version-2 format without requiring older maps to supply them.

Review gates: core rules and geometry >=4/5; editor/rendering integration >=4/5; final checks and sprite playtest >=4/5.

## Window and door additions

Six more source assets arrived during integration, bringing the usable palette to 28. Window walls provide 25-point directional cover and block crossing. Their central aperture accepts rays within the middle 70% of an edge, between height 1.0 and 2.4 of a 3-unit level. Decorative mullions are ignored; sills and outer wall portions remain solid. Closed steel and wooden door sprites are fixed barriers for this test; the open concrete frame is passable. No opening/closing interaction or matched door animation is claimed.

## Verification results

All 88 automated tests and all 28 environment asset checks pass. The original factory balance smoke test won 20/20 seeds, in 5–7 rounds with 3–4 survivors. This does not establish balance for every 50-character generated map. Browser checks confirmed sprite placement, readable window and door openings, and squad traversal across a generated bridge.

Independent hostile review gates passed at 4/5 for core mechanics, editor integration, the six additional window/door assets, and the final overall review. No blocking findings remain. Evidence screenshots accompany this document.

## Uphill distance correction and roof climbs

Uphill gunfire adds one tile of effective horizontal distance per level; downhill has no distance penalty or bonus. Melee retains its original three-dimensional reach. Existing elevated cover remains; sight uses the visibility caps below.

Optional marked roof edges connect adjacent tiles exactly one level apart. Climbing costs 6 AP in either direction (twice a ladder), allowing the 7 AP guards to use these routes. Roof support, empty foothold headroom, an open upper edge, and unoccupied endpoints are required. Roof links do not cut sight holes through floors. The editor provides placement and erasure from either endpoint; JSON and world state preserve links. Multiple links can share a foothold: climb buttons choose the first route, while selecting a destination tile allows other routes.

Validation: 95 automated tests pass, including actual enemy roof traversal and AP accounting. Browser playtesting confirmed editor placement and player ascent/descent. Hostile review passed at 4/5 after correcting the initial unaffordable guard climb cost.

## Stance movement

Three actor states: standing (2 AP/tile), kneeling (4), prone (8). Direct stance changes cost 2 AP in combat and are free outside combat. Dead characters, enemy turns, insufficient AP, active movement, invalid stances and redundant changes cannot spend AP. Stairs/ladders/roof links require standing and retain 2/3/6 AP costs. Actor-aware path costs drive previews, movement, queued-step revalidation and enemy movement. Stance persists with squad state through local travel. No new shooting or visibility modifiers are inferred. Current sprites retain standing poses; UI and map labels expose stance.

Validation: 102 tests pass; factory balance smoke test wins 20/20 seeds in 7–10 rounds with 3–4 survivors. The bot uses actual route costs and stays standing. Browser checks confirm all three stance controls and labels. Hostile review: 4/5 pass. The review found and resolved a distant-path slowdown by making the A* estimate account for stance movement costs.

## Diagonal movement

Same-level diagonal steps cost1.5 times cardinal movement:3 AP standing,6 kneeling,12 prone. A step requires both flanking tiles and the destination to be supported and clear, with all four bordering edges open. Living flank occupants block the route and queued steps recheck them. Vertical links retain their fixed cost and standing requirement. Melee pursuit still closes to valid striking range.

Verification: all117 current tests passed, including six diagonal regressions. The committed asset validator passed; an unrelated in-progress stance-art validator references an unfinished PNG and was excluded from this release. Factory balance won20/20 seeds. Hostile review4/5. Connectivity checks use cardinal links because permitted diagonals cannot connect otherwise disconnected regions; this avoids unnecessary work in large-map validation.


## Unknown terrain and long-distance visibility

Individual movement orders can target unexplored ground. Routes treat unknown terrain as open, favor direct travel, and replan after each step using newly discovered terrain, barriers, and visible occupants. Hidden obstacles and characters cannot influence the preview. Discovered stairs, ladders, and roof links support travel between levels.

Landscape visibility reaches 75 tiles; character detection reaches 60 tiles in clear conditions. Terrain discovery and character detection are separate. Walls, floors and window openings still block rays. These are distance limits for the upcoming sight-cone work; facing cones are not implemented yet. Longer detection means the default factory can begin in combat.

Movement stops on new hostile contact, exhausted AP, a blocked destination, or explicit cancellation. Combat orders may exceed remaining AP and stop when the next step is unaffordable; they do not automatically resume next turn. Existing stance, diagonal and climbing AP costs remain unchanged.

Verification: all 124 automated tests, syntax checks and asset validation pass. Seven new regressions cover distance boundaries, unknown-route information leaks, replanning, blocked goals, contact interruption, partial AP orders and visibility-cache invalidation. Browser testing confirmed travel into an unexplored sector. Independent hostile review passed at 4/5, including 20,000 comparisons between compiled terrain rays and existing LOS with zero mismatches. Factory balance won 20/20 seeds in 7–10 rounds with 2–4 survivors; this is not a balance guarantee for generated encounters.

## Wire cutters and medkits

Each squad member starts with reusable wire cutters and one consumable medkit. Cut an adjacent chain-link edge from either side for 4 AP in combat (free during exploration); railings and walls cannot be cut. The result is a fence-cut edge: visible posts around a passable opening, transparent to sight. Cut edges persist in the local-map state during travel.

Lethal damage incapacitates squad members instead of immediately killing them. Incapacitated characters cannot act, block their tile, and do not drop their weapons. Their six-turn timer decreases at each squad-turn end; they die at the sixth end unless stabilized. Pending casualties keep turn-based play active even after the last guard dies, preventing an exploration/travel timer bypass. An entirely incapacitated squad still loses immediately because no one can administer aid.

Stabilization requires a conscious teammate on a cardinally adjacent tile at the same elevation, with no intervening barrier. It consumes one medkit. Medical skill 0–100 sets cost to ceil(12 − 9 × skill / 100), bounded to 3–12 AP. Starting skills are Yakov 0, Anya 25, Misha 50 and Vera 100. Treatment stops bleeding but leaves the patient incapacitated until the encounter is cleared, when stabilized patients recover to 5 HP. Repeated treatment, insufficient AP, missing supplies and invalid range cannot consume resources. Medical skill and remaining supplies follow the squad between maps.

Verification: 152 tests plus syntax and asset checks pass. Tests cover lethal downing, all six turn boundaries, last-guard death, stable recovery, treatment constraints, AP/supply accounting, and fence traversal. Hostile review 4/5 includes additional travel-persistence and all-incapacitated probes. Browser checks confirmed 12 AP versus 3 AP treatment displays and no console errors. Full inventory management and picking up utility loot remain separate work.

## Group movement and aimed targeting

Shift-click squad cards or map characters (or Shift + 1–4) to toggle membership. Select all on layer gathers conscious squad members on the focused floor. A normal selection returns to one character. The named primary character controls weapons and equipment. Ground clicks translate the formation, reserving distinct nearby destinations when geometry blocks an exact slot. Selected teammates' starting cells may be vacated; actual steps still enforce occupancy, terrain and each character's AP. All members advance during the same update. Contact, blocked routes, insufficient AP and Escape stop the group. Narrow passages can temporarily distort spacing.

Click a visible enemy to select it, choose an aim location if desired, then click that enemy again to fire. Hover text shows current hit odds and AP. Torso remains the default. Provisional firearm modifiers: head −25 accuracy and ×1.5 damage; weapon −15 and ×0.75; legs −10 and ×0.85. These currently change accuracy/damage only. Changed combat state requires renewed target selection; Escape cancels confirmation. The explicit Attack button or F also fires the selected shot after fresh validation.

Verification: 157 tests plus syntax and asset checks pass. Hostile review 4/5. Browser checks confirmed four-member selection, unchanged AP on first target click, head-shot odds/damage updates, and one shot charged on the second click, with no console errors.

## Mechanics backlog completion — 2026-09-15

This pass supersedes earlier free-armoury, unlimited-reserve, uniform-stat and omnidirectional-sight notes. See DIRECTION.md for each completed gate and dist/tactics/README.md for current controls. Turning is free. Species-specific cones govern personal sight and firing; map memory does not grant live targeting. Two equipped slots swap freely, stored secondary equip costs3AP, reload consumes finite compatible rounds, and 16kg backpacks support nearby ground/corpse loot and adjacent transfers. Sneaking and one-shot reserved overwatch share visibility and movement rules, including formation orders. Easy auto-stabilizes; Standard retains six squad-turn ends. Both retain whole-squad defeat. Character sheets expose traits and five trainable skills; each100XP awards3points, up tolevel10.

Every stage passed independent hostile review4/5. Final177tests, syntax and asset checks pass. Twenty deterministic factory simulations all won in7–13rounds with four survivors (229–368totalHP). Browser checks covered free turns, free equipped swaps, finite reserve display, sneaking costs, overwatch reservation/cancellation, next-run difficulty, and species sheets; no console errors. The bot knows guard positions for navigation and does not establish human difficulty. Values remain provisional. Campaign saves across browser reloads, full spatial inventory, respec, additional species and story are outside this pass.

## Spatial inventory — current rule

The weight-only limit is superseded by a 4×4 backpack grid. Rifle/assault weapons use two contiguous horizontal cells; pistols, ammo stacks, knives and utilities use one. Two separate ready slots each fit one long gun and do not consume backpack cells; switching between them is free. Equipping either ready slot from storage costs3AP in combat; the outgoing item must fit the backpack. Manual placement, fragmentation and capacity are enforced atomically. 180 tests passed; hostile review4/5, headless browser placement verified.

## Defeat and permanent training — current rule

On total defeat, stabilized mercenaries become captured and all bleeding mercenaries die immediately. The captured roster preserves identity, progression and carried equipment in a separate snapshot within the run. Captured characters cannot act, gain XP, auto-recover or appear as corpses. The planned mid-to-late-game rescue facility and post-defeat campaign continuation are not yet playable; reloading or restarting still resets the run. Training is permanently learned, with no respecs. 182 tests passed; capture/no-respec hostile review4/5.


## Flamethrowers and tank fires

A flamethrower costs 6 AP, reaches 10 tiles and deals 180 damage within 3 tiles, falling linearly to 45 damage at 10 tiles. Its four fuel bursts reload from finite fuel reserves. Fire kills bypass bleeding/stabilization, including on Easy; unusually durable survivors burn and panic. The Factory template supplies a flamethrower and spare fuel beside the first squad start and includes one flamethrower guard. Editor guards can also use it.

A successful ranged torso hit has a 25% detonation chance when the target carries a loaded flamethrower; a hit aimed at the held flamethrower has a 90% chance. Each landed burst round gets its own check until detonation. Shots that hit nobody, head/leg impacts, empty tanks and melee do not trigger it. A bullet missing its intended target can still detonate another carrier on an incidental torso hit. A carried loaded tank remains vulnerable to torso shots even while a sidearm is selected.

Detonation destroys the fuel and flamethrower. The wearer and all eight neighboring cells on the same floor suffer permanent, non-healable death, including allies and downed units. All non-water, supported cells within a 5-tile circular radius burn for three rounds, including across walls. Survivors in that radius or entering burning ground ignite for three turns: actions and overwatch are disabled, and each round they flee up to three legal steps in a seeded random direction. Walls, occupancy and floor boundaries still constrain movement. Fire alone keeps turn mode active until it expires.


## Structure durability (3D)

Walls, windows, closed doors, built floors and roof modules retain damage for the encounter and campaign. Thin timber (including plank floors, wooden doors and trellises) has **75 HP**; light construction (corrugated walls/roofs, ordinary floors and tiles) has **100 HP**; heavy construction (concrete, brick, steel doors and parapet roofs) has **200 HP**. An intact surface needs no saved HP entry, so old maps and saves begin at full health. Dirt, grass, gravel, water and natural cliff supports are not destructible floors.

Firearms damage the actual wall/floor they strike, using the weapon's normal damage at that distance. That bullet stops even when it destroys the surface; subsequent shots can pass through the opening. Grenades, launchers, rockets and fuel explosions apply their damage falloff to exposed surfaces, once per structure per explosion. A window's sill and lintel share one HP pool. Blast cover is evaluated before committing structural damage. Direct flamethrower sprays damage timber; masonry and metal require physical damage.

At zero HP a wall disappears, including its lock and collision. A ground floor becomes gravel rubble (a broken bridge exposes water). An upper floor leaves a hole. A 2×2 roof module has a single HP pool and loses all four supporting tiles together, including on the decorative fourth level. This avoids leaving an intact model and parapet hovering above a missing tile.

Occupants of a broken upper floor fall to the next supported level without spending AP. A blocked landing can displace them to a clear cardinal neighbor on that level; it cannot push them through a wall. No traversable landing uses the normal fatal-casualty path. Ordinary falls currently change position and interrupt orders/overwatch without an additional injury roll. Bodies and loot descend too; loose props on the broken slab become debris, and unsupported access links are removed. This does not simulate progressive collapse of an entire building. Natural cliff and tower platforms are handled by their own supports.

Grenade presentation retains the old scenery and occupant height until detonation; loading during that animation restores only the committed result. Right-clicking a discovered tile shows floor and adjacent wall HP. Partial HP, openings and fallen positions persist in encounter and campaign saves; invalid HP records or missing structural references reject a save.

## Physical bullets and scatter

Pistol, rifle and AK-47 rounds now trace continuous three-dimensional rays from the muzzle. Each burst round rolls alignment independently. Misaligned rounds scatter horizontally and vertically within a forward cone that widens with poor accuracy and burst fire. Bullets continue up to 1.5 times the weapon targeting range, including beyond the selected unit. The first intersected live or downed body takes the hit regardless of team, visibility or intended target; walls, window frames, floor slabs and solid cover can intercept it first. Ordinary rounds stop on impact without penetration or ricochet.

Stance changes body height and muzzle height. Incidental injuries use the impacted body region, not the originally selected aim zone. An aimed weapon hit retains its 90% tank chance only if it actually hits the intended weapon carrier; incidental torso hits use 25%. Each impact resolves before the next round, so a tank explosion can kill the shooter and stop the burst. AP is charged once, ammunition only for emitted rounds. Normal bullet casualties retain medical rules; additional hits on downed units kill them. Flame jets and melee retain their distinct resolution.

The firing panel shows aim alignment odds and flags center-line interceptors without blocking the shot. The warning is not a guarantee against scatter. Tracers end at actual impacts and the combat log names collateral victims and friendly fire. projectiles.js provides shared impact tracing for future projectile weapons; grenade launchers and RPGs are not yet registered combat weapons.

## Sight lobes (2026-09-16, in progress)

Flat species cones are superseded by measured-vision sight lobes: total field, binocular core, hyperbolic acuity fall-off, motion-gated peripheral detection and a detect/identify split that feeds guard suspicion. Parameters, sources, stages and acceptance checks are tracked in SIGHT.md.

## Guard alertness (2026-09-16, in progress)

A gunshot alerts every guard within twice the weapon's range, whoever fired; alerted listeners converge on the approximate report. The alert / at-rest state machine and guard personalities drawn at random from twelve archetypes are planned in GUARDS.md.

## Retreat and border crossings — 2026-09-16

Direction from the user: to retreat you physically walk to the edge of the map; the three tiles along the border can manually walk to the next map tile over on the overmap. This answers the open "Easy whole-squad retreat versus retry" question for every difficulty: retreat is a walk, not a button.

- The overmap is a grid of local-map tiles (`world.positions`; Factory 0,0 · Freight yard 1,0 · Outer factory 2,0). Two tiles are linked when they touch. The old link list is derived from the positions, so the travel marker still works as before.
- A squad member standing on the ground level inside the 3-tile band along an edge that has a map beyond it can cross that edge, in or out of combat, when it is controllable, not moving and (in combat) has one step of AP: the stance's cardinal move cost, plus 2 sneaking; free while exploring.
- A crosser is off the origin map at once: guards cannot see or target it, its tile is empty, it cannot act there. It waits on the far map's border. Comrades who stay keep fighting.
- The squad regroups when the last standing member crosses, or when the last standing member falls (the map is lost for those who stayed; the crossers still arrive). All crossers must use the same destination; the travel marker, if used meanwhile, must go to that destination and merges the two groups.
- Crossers land on the opposite border of the next map at the row or column they left from, on the nearest free walkable tile. Arrival takes the usual 1 hour of clock. The origin map keeps its alerted guards and their last fix; return and the fight resumes.
- Downed comrades left on the map when the last standing member crosses meet the defeat rule: stabilized are captured, bleeding die. The log names them.
- A crosser has no body on the map it left: bullets and blasts pass through the tile it stood on (`projectiles.js`, `explosives.js` skip `away` units, the same test `alive()` makes).
- The far border walks both ways: a waiting crosser can be returned onto the tile it left from while that tile is free, for the same step of AP in combat. Rest and training wait until the squad has regrouped.
- Crossing mid-turn does not refill the turn: a member that crossed in combat and arrives into a live contact keeps the AP it had. A map left mid-fight, or lost after some comrades crossed, is entered fresh: its guards keep their alert and last fix, contact starts a new round with full AP, and the earlier defeat record moves to `world.defeats` (captured comrades stay captured, the dead stay dead).
- Shared combat XP still reaches crossers (deliberate: the squad pool is shared). A waiting crosser gets each new round's AP like everyone else, so a return or a later arrival is charged from a fresh turn, not from the AP it crossed with rounds ago.
- A return is a step: it makes a footstep (3 sneaking / 10) and walks into any fire burning on the tile.
- Comrades abandoned when the last standing member crosses are written to `world.defeats` exactly as a lost fight records its fallen (cause `abandoned`); a comrade is recorded once, so a map lost twice lists only what the second loss cost.

Checks: `tests/tactics-retreat.test.mjs` (16 cases: grid links; band, ground and AP gates; one crosser leaves a live fight; full regroup on the far border with the clock; abandonment; a lost fight after a crossing; destination commitment and marker merge; landing on a generated map; no body for a rifle round or a blast; return across the edge; downtime waits for regroup; AP carried into a live contact and overwatch cleared; re-entry of a map left mid-fight; re-entry of a lost map; a westward retreat resolves to the factory).


## Implemented weapon ranges and accuracy

Unarmed/knife: 1 tile including clear diagonals on the same floor. Flamethrower: 10. Pistol/shotgun: 12. SMG: 20. AK-47/rifle: 24. Heavy machine gun: 28. Sniper rifle: 36. Grenade launcher: 22 effective; RPG: 40 effective. Existing explosive overshoot, scatter and height advantages remain.

Distance penalties scale from 3 tiles to each weapon’s range: pistol 35 points plus a constant 20-point accuracy penalty; rifle 18 with a 5-point bonus; AK 26; sniper 12 with a 10-point bonus; shotgun/flame 15; explosives 25 within effective range, dropping to 10% aim beyond it. Burst adds 10 penalty points. Head/weapon/leg and cover penalties remain. These are initial game balance values.

Shotguns fire six 27-damage pellets in one 5-AP action using one shell. Every pellet follows geometry and can strike a different unit; spread thins concentration with distance. Sniper shots cost 8 AP, including for guards (sniper guards have sufficient maximum AP). Both weapons have finite ammunition, inventory support, editor selection, finished character art and Factory supply pickups.

SMGs and heavy machine guns are playable with finished character sprites, equipment icons, editor loadouts and supplies beside Misha and Vera in the Factory test. Both support three-round bursts (+2 AP, −10 aim), costing one round per emitted projectile. SMG rounds and shotgun pellets each deal 27 base damage, matching the pistol; multiple pellets can accumulate damage. They share the pistol penetration class. Armor equipment/mitigation is not yet implemented; bullets still stop at their first collision. HMG shots cost 6 AP and deal 48 base damage.

### Editor repair tools and functional doors

Editor zoom stays within the local map (minimum scale 0.2); Reset view returns to the chosen sector. The campaign overmap remains a separate screen. Roof module places a 2×2 roof on level 2 or 3 and adds missing supporting floor. Erase prop / crate keeps supporting terrain; Erase floor / tile removes the selected-level terrain and any overlapping prop, resetting ground to yard or upper terrain to empty space. Starts, stairs and roof-climb endpoints remain protected. Undo restores the whole edit. Building walls and windows render at 72 pixels per floor in the editor.

Steel, wooden and jail doors are unlocked by default. Pathfinding and map validation allow cardinal passage through them; characters open them automatically when crossing, for the ordinary movement cost. Until opened, their existing sight and projectile blocking still applies. Opening persists on the tactical map and uses the open-doorway artwork. Windows and ordinary walls remain barriers; diagonal movement cannot bypass a closed door.
