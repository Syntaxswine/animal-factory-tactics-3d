# Utility helicopter and crashed airframe

Two static, painted 3D assets inspired by the Bell UH-1: a parked helicopter on skids and a matching grounded wreck. The silhouette uses the framed cockpit, sliding cabin doors, single turbine cowling, long tapered tail, two-blade main rotor and small tail rotor. This is a stylized game aircraft, not an exact historical replica. The [Smithsonian's UH-1H collection entry](https://airandspace.si.edu/collection-objects/bell-uh-1h-iroquois-huey-smokey-iii/nasm_A19960005000) is the design reference.

Open `tactics/utility-helicopter-study.html`. Both states are shown beside the existing canvas truck and horse at their original scale. The viewer supports individual states, five camera angles, dragging to orbit, grey forms, tile grid, fit view and 58 px/tile gameplay scale. The truck study links to it.

| Asset | Triangles | Main dimensions in game tiles |
| --- | ---: | --- |
| Intact | 2,456 | Body 8.65 long; central cabin 1.72 wide; total height approximately 3.27 |
| Crashed | 2,482 | Same component sizes, with compressed/rolled cabin, detached tail and spread fragments |
| Scale reference | Existing 9,992-triangle truck | Approximately 4.7 long, 1.9 wide, 2.36 high |

The aircraft body is approximately 1.84 truck lengths. The nominal main rotor diameter is 9.6 tiles. Reference characters and truck are not resized. The rotor is overhead geometry; its visual extent must not later become a solid rectangular ground obstacle.

The wreck retains a visibly related cabin and tail rather than substituting an unrelated rubble pile. The cabin is settled on its side with folded skids, missing front/right cockpit glazing, an exposed interior and detached door. Both main blades bend from the retained hub to supported ground tips. The tail's torn mouth and a stabilizer edge both rest on the ground. Small fragments lie beside the cabin. The wreck is readable without smoke obscuring its construction.

## Paint and source assets

Most detail is in one shared 4×2 painted atlas: olive panels, vents, blue-grey glazing, dark steel, scorched paint, torn metal, upholstery and ash. Geometry supplies the silhouette, framing and major wreck deformation. Meshes use inset atlas UV regions, with smaller glass/metal crops to avoid inappropriate painted borders.

- [Reference sheet](../../dist/assets/environment/utility-helicopter/reference-v1.png)
- [Paint atlas](../../dist/assets/environment/utility-helicopter/paint-atlas-v1.png)
- [Exact image-generation prompts and provenance](../../dist/assets/environment/utility-helicopter/PROMPTS.json)

Both paintings were made with the built-in image-generation tool and retained unchanged. The truck drawn in the concept sheet is an illustrative reference only; final scale comes from the actual truck geometry in the viewer.

## Model API and scope

`dist/tactics/utility-helicopter.js` exports `createUtilityHelicopter(atlas, {state: 'intact' | 'crashed'})`, `HELICOPTER_DIMENSIONS` and the paint/reference paths.

The factory returns `root`, named `parts`, `setGrey(boolean)`, `diagnostics()` and idempotent `dispose()`. Coordinates are **Y up, +X forward**, with the ground at Y 0. The origin stays with the cabin, not the overall rotor bounding-box center. Geometry/materials belong to the instance; the supplied atlas belongs to the caller. All instances retain unit root scale.

Diagnostics measure actual transformed vertices. This matters for the tilted wreck: using rotated local bounding-box corners would leave tapered pieces hanging above the surface. Reported bounds are world-space. `rotorClearance` identifies the intact main rotor's nominal radius and actual lowest world height; it is descriptive metadata, not a collision definition.

These are static art assets and a comparison study. Flight, rotor animation, boarding, destruction transitions, editor placement, ground occupancy and cover rules have not been added. For later placement, reserve the cabin/skids/tail or individual wreck components, not the entire rotor span. The wreck's separated pieces need individual occupancy/cover review.

## Validation and review

- Seven model tests cover native truck scale, geometry/UV validity, state correspondence, independent ground contacts, cockpit openings, rotated placement and resource ownership.
- Two distribution tests pass, including module closure and byte-for-byte inclusion of both source paintings and their provenance.
- Sixty browser combinations pass: three display modes × five views × two scales × painted/grey.
- Fit-view geometry remains on screen. Gameplay scale intentionally keeps 58 px/tile; a small viewport may need fit mode to show the whole formation.
- Actual controls, mobile layout, repeated toggling without resource growth, double teardown and a missing-atlas failure are checked.
- [Visual evidence](../../hybrid-review/utility-helicopter/) includes the paired scale view, both forms from four angles, and grey views. The [independent hostile visual review](../../hybrid-review/utility-helicopter/REVIEW.md) approved the result at **9/10**, with thirteen additional captures and thirty configuration changes.

Run:

```powershell
node --test tests/utility-helicopter.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-utility-helicopter.mjs
node tools/capture-utility-helicopter.mjs
```

The viewer and painting folder are included by `tools/build-tactics-3d.mjs`. A feature-branch push makes the work available for integration; it does not deploy Pages.

## Preview and helper lifetime

`tools/serve-utility-helicopter.mjs 4476` serves only read-only GET/HEAD requests from `dist`. The current preview has a real 24-hour shutdown timer, expiring **October 11, 2026 at 10:28 p.m. Eastern**. Its local PID, creation time, expiry, restart inputs and stop-file method are registered with the shared helper lifecycle utility. Local records are in `artifacts/utility-helicopter/server/`.

Create `artifacts/utility-helicopter/server/STOP` to finish the preview early. Preserve the ready/stopped receipts before deliberately restarting, clear that private stop marker, and register the new process lifetime. Review browsers close through their owner API in `finally`; their close receipts are under `artifacts/utility-helicopter/helpers/`.
