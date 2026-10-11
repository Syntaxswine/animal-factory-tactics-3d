# Building visibility and lighting proposal

Status: design handoff for the 3D coder, 10 October 2026. These changes are proposed; they are not implemented by this document. Source baseline: `587a95a`.

Players should be able to understand the interior space where guards might be hiding without learning where those guards or undiscovered items actually are. Reveal building layouts more generously, remove obstructing roofs automatically, and avoid repeating rendering and lighting work whose inputs have not changed.

The central distinction is between **knowing a building's layout**, **detecting its occupants and contents**, and **choosing which surfaces obstruct the camera**. These must remain separate decisions.

## Interior discovery

A real squad sightline to any interior space through a door, window or breach reveals the building's interior layout on that floor. Entering the building also reveals that layout. An open door somewhere on the map is not enough: the squad must actually see inside.

Layout knowledge includes floors, walls, door and window locations, and structural connections such as stairs. It does not expose guards, NPCs, loose items, searchable containers, their contents or other discoverable props. Structural cover can belong to the layout; movable or searchable objects require their own discovery checks. The coder should make this classification explicit rather than allowing every object in a revealed tile to become visible.

Reveal the layout as a coherent building interior, rather than keeping the current narrow wedge of visible floor tiles surrounded by black corners. A guard in an unseen corner remains hidden even though the floor and walls around that corner are now understandable.

Layout knowledge persists after the door closes or the squad leaves, including through campaign saves. This is memory of the layout, not permission to display live changes to unseen guards, container contents or other hidden state. Keep existing character detection and item visibility rules. Merely revealing the layout must not mark a container searched or reveal its inventory.

Floors are discovered separately. Seeing the ground floor does not discover upstairs rooms or the contents of those rooms. Easy difficulty's existing exterior reveal must not count as an actual look inside.

**Proposed building grouping:** use a stable building footprint with floor-specific interior groups. Include connected rooms inside the same building; do not flood discovery across outdoor space or merge unrelated buildings because they share a material, an overlapping projection or a boundary wall. Derive groups from existing map geometry where unambiguous. For ambiguous maps, keep a conservative room boundary until the author supplies a building association. Recompute affected groups after structural edits or destruction, not on every frame.

## Automatic roof removal

Use the selected floor as the inspection level. Roof removal is a presentation decision and never changes collision, cover, projectile paths, line of sight or simulation lighting.

| Situation | Proposed roof behavior | What the player learns |
| --- | --- | --- |
| Cursor is over a building footprint | Remove that building's overhead roof or ceiling across the footprint, not just a cursor-sized hole. | Previously unknown interior space stays concealed until an actual sightline reveals it. Hover alone does not explore the building. |
| Squad obtains its first actual view inside | Reveal the layout on that floor and default to an open roof while inspecting that interior. | Structure becomes known; guards and items still need their own detection or discovery. |
| A squad member is inside | Keep the relevant interior open without requiring hover. | Own-unit visibility remains as it is now. |
| A detected enemy is fighting inside | Keep that known combat area open so the player can follow the fight. | Only detected opponents are shown. The same layout is available in an otherwise identical empty building. |
| An undiscovered enemy enters, leaves or dies inside | No roof change caused by that hidden event. | No hint that an enemy exists there. |
| Cursor leaves an undiscovered building | Restore its roof unless another legitimate rule keeps it open. | No new exploration record is created. |
| Squad loses sight of a discovered interior | Retain layout knowledge and the normal open-interior presentation. | Hidden occupants do not become visible, and a roof change must not signal their movement. |

The proposed default is therefore **open roofs for discovered interiors**, not open roofs only when an enemy happens to be inside. Provide a simple Auto / Show roofs / Hide roofs presentation control for inspection. Even Hide roofs must preserve fog and hidden-entity rules. Retain the existing cursor wall cutaway as a fallback for obstructing walls and awkward selections.

Determine hover from the building's stable footprint or original roof geometry. Do not raycast only the currently visible roof: removing it must not make the next frame lose the hover target and flicker the roof back on. Handle all four camera rotations, zoom and overhanging roof meshes. Clear transient hover on pointer exit, loss of focus and map changes.

Preserve the selected floor's supporting slab and lower-level visibility. Remove only the overhead assembly that obstructs the inspected interior. Handle stacked floors, rooftop characters, partial roofs and neighboring buildings coherently; characters must not suddenly disappear or appear to float because their support was hidden. This replaces neither manual floor selection nor its use for difficult targets.

## Keep discovery independent from rendering

Use separate presentation data for known layouts and open roof groups. Do not reveal a building by filling the simulation's `seen`, `visible` or `detected` sets with every interior cell or entity.

The distinction must apply to meshes, selection, hover text, outlines, target lists, health bars and minimap markers. An invisible guard or item must not be discoverable through a clickable label or highlight. Preserve the existing peaceful-sector inventory and container-search rules.

Two otherwise identical buildings, one empty and one containing an undetected guard, must have identical roof and layout behavior until the squad obtains information that distinguishes them. This is the main test against accidentally giving away the enemy's presence.

## Skip geometry that does not need drawing

Whole-building cutaways should remove eligible surfaces from the main camera's draw list. Where appropriate, split existing instanced scenery batches by building, floor and cutaway role, retaining useful batching within each group. Toggling a roof should change group visibility without rebuilding the sector or disposing and reconstructing models.

The existing circular cutaway can continue using a shader for partial wall openings. A completely hidden roof should not rely solely on discarding its pixels after its geometry has already been submitted.

Keep gameplay sight and camera occlusion separate. Something outside a merc's sight can still be remembered scenery; something outside the camera can still cast a shadow into it. Preserve the current camera-frustum culling and character viewport margin. Do not implement rendering savings by pausing offscreen AI or removing objects from the simulation.

For further occlusion work, start with conservative building or room groups that can be proven fully covered from the current camera. Test doors, windows, breaches, partial roofs, transparent surfaces and cutaways before skipping any group. If the result is uncertain, draw it. General GPU occlusion queries can be evaluated later if profiling shows they are worthwhile; they are not a prerequisite for the roof and discovery improvements.

Presentation-hidden walls and roofs remain lighting blockers. Their main-camera meshes can be skipped while retaining cached shadows or an appropriate shadow-only representation. A visual cutaway must not turn a sealed interior into sunlit outdoor space or make its occupants easier for the simulation to detect.

## Cache lighting according to what changes

The user's proposed reuse is appropriate for fixed fixture placement and unchanged static lighting. However, rendering a scene still applies lighting to visible surfaces, and the current game has moving characters, sweeping searchlights and a sun that changes continuously with the shared clock. Those effects cannot all be calculated only at map load and dusk.

Separate fixed setup, cached static contributions and dynamic updates. Update only the affected cache or pass when its inputs change.

| Work | Reuse while unchanged | Events that require an update |
| --- | --- | --- |
| Fixture meshes, materials, bulb positions and fixed reach | Build once for the current fixture configuration. | Add, remove, move, rotate or modify the fixture; load another map. |
| Automatic on/off schedule | Retain the current enabled state. | Cross a schedule boundary, interact with the light, damage or destroy it, or load a changed state. |
| Static local-light shadow contribution | Reuse for unchanged light and blocking geometry. | Change a light, open or close a door, destroy a wall or roof, move blocking scenery, or otherwise change the affected geometry. |
| Shadows of moving characters and objects | Reuse while their pose, position and shadow contribution are unchanged. | Movement, stance or animation changes, equipment changes that affect the silhouette, creation or removal. |
| Searchlight direction and shadows | Reuse when the aim and relevant blockers are unchanged. | Sweep advances, target changes or blockers move. |
| Sun direction, color and shadows | Reuse while the relevant daylight and geometry inputs are unchanged. | Shared-clock daylight changes, changed blockers, or changes to a camera-centered shadow volume. Preserve smooth dawn and dusk. |
| Lights relevant to the camera | Reuse the active set while its inputs are unchanged. | Camera pan, zoom, rotation or floor change; changed light reach, position or enabled state. An offscreen bulb may still illuminate an onscreen surface. |

A static/dynamic shadow split is an implementation option, not a requirement to redesign the entire renderer. If a light uses one combined shadow map, a moving character can invalidate that map even when the building geometry is unchanged. Do not label the result cached if the same shadow pass still runs every frame.

The current renderer uses extra lighting passes when more than four local emitters are active. That is per-pixel lighting work, not merely a placement calculation. First cache setup and material variants, eliminate repeated shader invalidation, and reuse unchanged shadow maps. Then measure whether baking static illumination or changing the many-light renderer is justified. Preserve all authored light contributions; silently ignoring the fifth light is not an optimization.

Pause and hidden-tab handling should avoid unnecessary dynamic updates without freezing camera controls or required presentation effects. A paused view with no changed inputs should reuse its lighting setup and shadow results. Camera changes still need a correct image. Water, fire and any animation that intentionally continues need explicit treatment.

## Implementation entry points

The baseline already provides 16-tile scenery batching, camera culling, character viewport filtering, per-cell interior fog, the circular wall cutaway and local-light range filtering. Extend those components rather than introducing a second visibility system.

| Component | Relevant files | Intended change |
| --- | --- | --- |
| Interior layout and fog | `dist/tactics/interior-fog.js`, `interior-fog-scene.js` | Add building/floor layout knowledge while preserving separate content discovery. The existing tile-by-tile interior concealment is deliberately being superseded. |
| Roof and wall presentation | `dist/tactics/wall-xray.js`, `hybrid-renderer.js`, `battle-renderer.js` | Add stable building hover and automatic roof groups; skip fully hidden overhead geometry. Preserve the circular wall fallback and logical picking. |
| People, props and items | `dist/tactics/battle-visibility.js`, `battle-environment.js`, `battle-loot.js`, `battle-inventory.js` | Audit every discovery gate so layout reveal cannot expose hidden content. |
| Lighting and shadows | `dist/tactics/lighting-scene.js`, `light-renderer.js`, `daylight-rig.js` | Cache unchanged setup and shadow work with explicit invalidation for relevant changes. |
| Controls and deployment | `dist/tactics/battle-3d.js`, existing editor preview controls, both Pages build manifests | Add clear roof controls and package any new modules without weakening missing-module checks. Keep design view distinct from gameplay visibility preview. |

Keep the shared game clock and simulation illumination rules authoritative. Avoid changing the generated tactical core as a shortcut for presentation work. See [the existing cursor cutaway handoff](CURSOR-WALL-XRAY-HANDOFF.md) for behavior that must remain available.

## Acceptance and measurement

Deliver the behavior in three reviewable stages: interior discovery and roof rules; actual geometry skipping; then lighting reuse. Include a compact test map with adjacent buildings, multiple rooms, at least two floors, a window, a closed and open door, a damaged wall, hidden guards and loot, a searchable container, and more than four active local emitters including a searchlight.

Verify these cases through gameplay and focused regression tests:

1. A closed building remains concealed. A real glimpse through a door or window reveals its floor layout, including unseen corners, while a distant open door alone does not.
2. A guard and item in an unseen corner remain absent from rendering and interaction. They appear only under their own visibility rules. An unsearched container stays unsearched.
3. The empty-building and hidden-guard variants produce the same roof behavior. Hovering never grants exploration or detection.
4. Discovered layout and its automatic roof policy survive losing sight, leaving the sector and save/load. Upstairs and unrelated buildings remain independently undiscovered.
5. Hover works without flicker at every camera rotation and zoom. Manual roof controls, doors, actor picking, floor changes, partial roofs and rooftop occupants remain usable. Lower-floor characters do not disappear when selecting an upper floor.
6. Removing a roof reduces submitted main-camera geometry. Repeated hovering does not rebuild the map, grow GPU resource counts or alter collision, shot outcomes or illumination used by detection.
7. Unchanged frames reuse cached lighting and shadows. Moving a character or searchlight, opening a door, damaging a wall, shooting a light, switching it, or advancing daylight refreshes the affected result without stale shadows or new light leaks.
8. A scene with more than four active emitters preserves every light's contribution and restores materials and render targets after both successful rendering and errors. Packaged gameplay loads without missing imports.

Record before/after CPU frame time, GPU timing where available, draw calls, submitted triangles, shadow refresh counts and memory for close view, overview, paused view and a moving firefight. Use the same map, camera, clock and roster. Measure the complete frame across every lighting and shadow pass: the last compositing draw alone is not a valid scene cost.

Performance targets should follow that baseline. The immediate correctness targets are zero information leaks, stable roof behavior and unchanged tactical outcomes; the measurable optimization targets are fewer submitted hidden surfaces and no repeated shadow refreshes when their inputs are unchanged.
