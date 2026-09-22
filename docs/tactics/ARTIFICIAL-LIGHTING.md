# Placed artificial lighting

The 3D editor and encounter now support the gallery's nine light-bearing props: floor lamp, bedside table with lamp, gooseneck sconce, single and double streetlights, standing and wall torches, campfire, and hanging cooking pot. The cooking fire occupies 2×2 tiles and the double streetlight 2×1; the other fixtures occupy one tile. Wall fixtures are passable; freestanding fixtures block their footprint. Fire props do not yet cause burns or spread fire.

## Authoring

Choose the fixture in Build → Prop. Choose Automatic, Always on, or Off / extinguished under Light schedule. To change an existing fixture, select it and use Apply to selected light. Schedules survive undo/redo, rotation, browser saves, JSON export and playtests. Automatic electric lamps operate from 18:00 until 06:00; automatic fires remain lit. The existing daylight preview drives these schedules. Wall fixtures mount on the chosen tile's north edge, or its east edge when rotated; place them against an authored wall. They do not create a wall automatically.

`light-sources.js` is the shared source catalog. Bulb/flame offsets are checked against actual model anchors in tests, including the scaled bedside lamp, nested cooking fire and both streetlight arms. Logical floors use the established three-unit tactical spacing; rendering uses the existing 2.12-unit presentation spacing. Heights above each floor stay aligned to the sculpt.

## Falloff and visibility

Measured in 3D from the emitter: 0–5 tiles is 100%, 5–10 is 50%, then 25%, 12.5%, 6.25%, and 3.125% through 30 tiles. Beyond 30 tiles the contribution is ignored. Exact outer boundaries belong to the brighter band. The scene shader and detection share this stepped rule; actual rendered surface brightness also depends on orientation, paint and material. Detection sums contributions with ambient/sunlight and caps at daylight level.

Point lights cast geometry shadows in the scene, using a 512px cube shadow map per bulb. Tactical exposure traces from the target's body region to the source through the existing sight/projectile solids, including floors, walls and cover; the source's own coarse prop footprint is excluded. Decorative fixture details and tactical collision approximations can produce differences from rendered shadows. Light does not bypass the observer's sight cone or LOS.

The existing known-scenery and floor inspection filters also apply to rendered fixtures. Tactical illumination considers all sources, independent of the camera or which lamps have been discovered. This means inspecting a cutaway floor or unexplored area is not a complete lighting simulation preview. Dense clusters of shadow-casting lights have a GPU cost. More than four active bulbs use additive batches of four, accumulated in a linear-light render target, to stay within WebGL shadow sampler limits without discarding sources. Ambient, sunlight, flame glow and overlays are included only once.

Fires use self-lit painted flames and the model's existing animation loop. Pausing a battle freezes that loop; illumination used by detection remains steady rather than flickering the awareness score. Turning a fixture off removes its light and flame/glass glow. Removing or destroying its prop removes its emitter on the next scene update.

## Validation

`tests/light-sources.test.mjs` verifies band boundaries, emitter/model alignment, schedules, editor persistence, overlap, walls and floors. `tools/lighting-review.mjs` checks the editor, night playtest, day schedule and all nine models together. Pinned core environment additions are recorded and reproduced by the existing core adapter.

## Sweeping spotlights

Place the one-tile `spotlight` prop, use Select / pan to select it, then click **Pick spotlight aim points**. Click one to three tiles in order. **Save aim points** finishes after one or two picks; the third pick saves automatically. Escape cancels without changing the stored route. One point is stationary; two or three interpolate continuously in a repeating loop (including the final point back to the first), taking one game minute per leg. Until configured, the lamp aims eight tiles south.

The motorized head follows a 60-degree beam with a soft outer edge. The cone gates both rendered illumination and detection, retaining the same five-tile falloff bands, schedules, range and occlusion rules as other lamps. The battle sweep samples the shared clock: pausing freezes it, and a completed combat round advances it by one minute. The editor previews movement at exploration speed; reduced-motion previews hold a clock-sampled pose. Aim points are relative map offsets, so saving, block capture/placement and undo preserve them. Rotating the fixture base preserves the chosen world aim points.

`tools/spotlight-review.mjs` checks point picking, cancellation, sweeping, and mixed spot/point-light shadow batches in a real browser. Unit tests cover the cycle, cone, occlusion, and persistence.

### Spotlight exposure rule

Any nonzero direct spotlight illumination of an observer-visible head, torso or leg region immediately identifies that person. This applies even in the dim outer bands, without waiting for awareness to accumulate. Sneaking, stance, camouflage/foliage concealment, partial-cover penalties, observer perception, and ordinary identification-distance penalties cannot prevent it. The observer must still face the target within their sight field, and solid geometry can block either the beam or the observer's view. A lit region hidden behind cover does not reveal an unlit region. Cover still provides physical protection against bullets. Ordinary lamps retain the normal gradual awareness rules. Once the beam moves away, normal visibility and last-known-position rules apply; observers do not forget an already identified person instantly.

### Tower searchlights

The prop catalog includes `wooden-spotlight-tower` (5×5), `iron-searchlight-stair-tower` (6×5), and `iron-searchlight-ladder-tower` (6×5). Select any of these towers and use the same **Pick spotlight aim points** and schedule controls as the standalone spotlight. Their narrower authored 45-degree cones retain the shared range, falloff and instant-reveal rule. With no authored points they aim outward, twenty tiles ahead of the mounted fixture; rotating the tower rotates that default aim. Authored points remain fixed map destinations when the tower rotates.

The lamp head turns toward the sampled destination, and its emitter moves with the recessed fixture anchor. Tactical origins and rendered anchors agree on the model's height above its base; as with other fixtures, map floor offsets retain the existing tactical/presentation spacing distinction. Coarse timber deck slabs (with the ladder opening) and opaque iron guardhouse volumes block beams, including from neighboring lights. Rendered shadows use the detailed model; tactical tower volumes intentionally omit tiny braces and treat guardhouse windows as opaque.

These are static tower props with blocked ground footprints. Their lights are wired; stairs, ladder climbing and elevated guard navigation are not yet wired. The passive gallery models remain unchanged. `tools/tower-lighting-review.mjs` checks all three in the editor and playtest; unit tests check moving anchors, rotation, footprints, saving and self-shadow volumes.
