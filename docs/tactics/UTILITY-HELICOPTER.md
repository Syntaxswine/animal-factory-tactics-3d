# Utility helicopter and crash sites

Three static, painted 3D assets inspired by the Bell UH-1: a parked helicopter on skids, a survivable crash site and a matching destroyed wreck. The silhouette uses the framed cockpit, sliding cabin doors, single turbine cowling, long tapered tail, two-blade main rotor and small tail rotor. This is a stylized game aircraft, not an exact historical replica. The [Smithsonian's UH-1H collection entry](https://airandspace.si.edu/collection-objects/bell-uh-1h-iroquois-huey-smokey-iii/nasm_A19960005000) is the design reference.

Open `tactics/utility-helicopter-study.html?mode=survivable`. All states can be shown beside the existing canvas truck and horse at their original scale. The viewer supports individual states, intact/destroyed and survivable/destroyed comparisons, five camera angles, dragging to orbit, grey forms, tile grid, fit view and 58 px/tile gameplay scale. The truck study links to it.

| Asset | Triangles | Main dimensions in game tiles |
| --- | ---: | --- |
| Intact | 2,456 | Body 8.65 long; central cabin 1.72 wide; total height approximately 3.27 |
| Crashed | 2,482 | Same component sizes, with compressed/rolled cabin, detached tail and spread fragments |
| Survivable | 2,754 | Rigid cabin and attached tail; total settled height approximately 3.08; includes ground marks |
| Scale reference | Existing 9,992-triangle truck | Approximately 4.7 long, 1.9 wide, 2.36 high |

The aircraft body is approximately 1.84 truck lengths. The nominal main rotor diameter is 9.6 tiles. Reference characters and truck are not resized. The rotor is overhead geometry; its visual extent must not later become a solid rectangular ground obstacle.

The wreck retains a visibly related cabin and tail rather than substituting an unrelated rubble pile. The cabin is settled on its side with folded skids, missing front/right cockpit glazing, an exposed interior and detached door. Both main blades bend from the retained hub to supported ground tips. The tail's torn mouth and a stabilizer edge both rest on the ground. Small fragments lie beside the cabin. The wreck is readable without smoke obscuring its construction.

## Survivable opening scene

The user proposes a SAM strike bringing down the squad's helicopter at the start of the game. The new variant tells that story through localized tail-boom damage and a rough forced landing: peeled metal around a puncture, a damaged tail rotor, crushed skids, a snapped main blade and a bent surviving blade. The cabin remains rigid, mostly upright and recognizable. This is visual storytelling, not a simulation or a claim about real aircraft survivability.

The [twelve-shot intro storyboard](intro-storyboard/README.md) develops the approach, hen's mission briefing, SAM volley and separate tail/skid/rotor damage beats. It includes two painted sheets and a proposed 37-second shot/audio plan; it is not implemented cinematic playback.

The positive-Z sliding door is absent and the bench beside it is folded away. The jettisoned door, shed blade and small fragments rest on the opposite side, leaving exterior gathering space by the opening. Two feathered skid furrows and a belly scrape lead into the aircraft. The intact and destroyed variants retain their previous geometry, UVs and transforms.

The opening suggests a crouched exit followed by a step down. A standing walk-through or evacuation animation has not been implemented. A future cinematic can connect the SAM strike, forced landing and squad emergence without needing to substitute the destroyed wreck.

### Residual smoke

The survivable site now has a light animated plume from the actual engine exhaust. Seven overlapping painted cards (14 triangles) rise slowly and drift aft, fading before they spread over the cabin or exit. The effect borrows the existing `assets/effects/painted-fire/smoke-atlas-v1.png` and its painted material. It adds no new airframe geometry or textures and does not imply an active explosion.

Smoke is on by default for the survivable variant, including the crash comparison. Use **Smoke** to hide it or **Pause smoke** to inspect a still. Grey forms hide it. Reduced-motion preferences start it paused; hidden pages, disabled smoke and other variants stop the animation loop. The camera fits a fixed plume envelope, so its framing does not pulse with individual wisps. For reproducible captures, use `?mode=survivable&time=3&paused=`, or `&smoke=0` for the clear view.

`utility-helicopter-smoke.js` exports `createHelicopterSmoke(texture, aircraft)` and `HELICOPTER_SMOKE`. The effect owns its geometry/materials and borrows the texture. Call `update(elapsedSeconds, camera, visible)`, use `bounds()` for framing, and call its idempotent `dispose()` before disposing the aircraft and caller-owned texture. Its world-space source follows the transformed exhaust. The effect remains separate from collision and body bounds.

## Paint and source assets

Most detail is in one shared 4×2 painted atlas: olive panels, vents, blue-grey glazing, dark steel, scorched paint, torn metal, upholstery and ash. Geometry supplies the silhouette, framing and major wreck deformation. Meshes use inset atlas UV regions, with smaller glass/metal crops to avoid inappropriate painted borders.

- [Reference sheet](../../dist/assets/environment/utility-helicopter/reference-v1.png)
- [Paint atlas](../../dist/assets/environment/utility-helicopter/paint-atlas-v1.png)
- [Exact image-generation prompts and provenance](../../dist/assets/environment/utility-helicopter/PROMPTS.json)

Both paintings were made with the built-in image-generation tool and retained unchanged. The truck drawn in the concept sheet is an illustrative reference only; final scale comes from the actual truck geometry in the viewer.

The survivable variant reuses the same atlas and the existing `dist/assets/environment/ground-dirt.png`. Its ground marks use feathered vertex alpha; no new painting or generated texture was needed.

## Model API and scope

`dist/tactics/utility-helicopter.js` exports `createUtilityHelicopter(atlas, {state: 'intact' | 'crashed' | 'survivable', groundTexture: null})`, `HELICOPTER_DIMENSIONS`, `HELICOPTER_GROUND` and the paint/reference paths. Supply the optional ground texture for painted skid marks; the factory supplies a brown fallback material when it is omitted.

The factory returns `root`, named `parts`, `setGrey(boolean)`, `diagnostics()` and idempotent `dispose()`. Coordinates are **Y up, +X forward**, with the ground at Y 0. The origin stays with the cabin, not the overall rotor bounding-box center. Geometry/materials belong to the instance; the supplied atlas and ground texture belong to the caller. All instances retain unit root scale.

Diagnostics measure actual transformed vertices. This matters for the tilted wreck: using rotated local bounding-box corners would leave tapered pieces hanging above the surface. Reported bounds are world-space. `rotorClearance` identifies the intact main rotor's nominal radius and actual lowest world height; it is descriptive metadata, not a collision definition.

Survivable diagnostics also report `exitLane`, a model-local box from `[-1.20, 0, 1.35]` to `[-0.20, 2.20, 3.35]`. It marks clear exterior space beside the opening, with `gameplayIntegrated: false`. It is not navigation, a character spawn volume or a complete passage test. `bodyBounds` excludes both overhead rotor parts and ground paint. The viewer offsets the horse beside this exit while retaining native character scale.

These are static art assets and a comparison study. SAM gameplay, the intro cinematic, flight, rotor animation, boarding, squad spawning, destruction transitions, editor placement, ground occupancy and cover rules have not been added. For later placement, reserve the cabin/skids/tail or individual wreck components, not the entire rotor span. The wreck's separated pieces need individual occupancy/cover review.

## Validation and review

- Eleven model tests cover native truck scale, geometry/UV validity, state correspondence, independent ground contacts, cockpit/door openings, rotated placement, the damaged tail-rotor joint, clear exterior space, feathered ground paint and resource ownership.
- Two distribution tests pass, including module closure and byte-for-byte inclusion of both source paintings, their provenance and the reused dirt texture.
- One hundred browser combinations pass: five display modes × five views × two scales × painted/grey.
- Fit-view geometry remains on screen. Gameplay scale intentionally keeps 58 px/tile; a small viewport may need fit mode to show the whole formation.
- Actual controls, mobile layout, repeated toggling without resource growth, double teardown and a missing-atlas failure are checked.
- [Visual evidence](../../hybrid-review/utility-helicopter/) includes the scale comparisons, all three forms from four angles, and grey views. The [original independent review](../../hybrid-review/utility-helicopter/REVIEW.md) approved the intact and destroyed assets at **9/10**.
- The [survivable crash review](../../hybrid-review/utility-helicopter/SURVIVABLE-REVIEW.md) also approved the result at **9/10**, after correcting a separated tail-rotor tip. It includes thirteen fresh views, forty configuration changes and independent ground/exit checks.
- Smoke follow-up checks cover real toggle/pause controls, reduced motion, stopped animation after teardown and stable resources (358 geometries, 12 textures). The [independent smoke review](../../hybrid-review/utility-helicopter/SMOKE-REVIEW.md) approved the effect at **9/10**. [Smoke captures](../../hybrid-review/utility-helicopter/smoke-three.png) and [browser results](../../hybrid-review/utility-helicopter/smoke-browser-checks.json) are retained separately from the clear-airframe evidence.

Run:

```powershell
node --test tests/utility-helicopter.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-utility-helicopter.mjs
node tools/capture-utility-helicopter.mjs
node tools/capture-utility-helicopter.mjs --survivable
node tools/capture-utility-helicopter.mjs --smoke
```

The viewer and painting folder are included by `tools/build-tactics-3d.mjs`. A feature-branch push makes the work available for integration; it does not deploy Pages.

## Preview and helper lifetime

`tools/serve-utility-helicopter.mjs 4476` serves only read-only GET/HEAD requests from `dist`. The current preview has a real 24-hour shutdown timer, expiring **October 11, 2026 at 10:28 p.m. Eastern**. Its local PID, creation time, expiry, restart inputs and stop-file method are registered with the shared helper lifecycle utility. Local records are in `artifacts/utility-helicopter/server/`.

Create `artifacts/utility-helicopter/server/STOP` to finish the preview early. Preserve the ready/stopped receipts before deliberately restarting, clear that private stop marker, and register the new process lifetime. Review browsers close through their owner API in `finally`; their close receipts are under `artifacts/utility-helicopter/helpers/`.
