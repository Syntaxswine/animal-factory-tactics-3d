# Guardhouse computer and telephone consoles

Two reusable, painted consoles fit against the existing guardhouse window wall. The complete units, including the monitor, radio panel and handset, stay below the window sill. This follows the user's direction to use simple shapes and keep most detail in the painterly skin.

| Module | Triangles | Native dimensions (width × depth × height) |
| --- | ---: | --- |
| Computer terminal | 72 | 0.94 × 0.58 × 0.80 |
| Telephone and radio console | 128 | 0.94 × 0.58 × 0.80 |

The computer has green and amber screen variants. Painted details include the displays, keys, rotary dial, radio controls, cabinet doors/drawers, vents, latches and wear. Geometry supplies only the main cabinet, worktop, simple equipment housings, handset and its two cradle supports. Both modules share one opaque atlas and one painted material.

Open `tactics/guardhouse-machines-study.html`; it is linked from the main art gallery and furniture gallery. Controls compare the assets together or individually, in isolation, against the actual window wall, or in a cutaway guardhouse. Grey forms, five angles, native-size horse and 58 px/tile views are available.

## Fit and placement

Each module's nominal footprint is 1×1 tile. Its origin is at the floor; +Z faces the operator. Actual local bounds are X −0.47…0.47, Y 0…0.80, Z −0.40…0.18. `anchors.rear` (named `back-wall`) is `(0,0,-0.40)` and `anchors.operator` is `(0,0,0.72)`.

The preview measures the original guardhouse mesh, including its bevels. Relative to the nominal room deck, the actual floor top is 0.00192 and the sill underside is 0.82308. Standing on that floor, the console has **0.02116 units of sill clearance** and a **0.003 rear gap**. Side-by-side modules have 0.06 between cabinets. Tests cover the seven existing guardhouse forms, including rotated wraparound shells and larger rooms, without changing their scale.

This is asset and fit-study approval. The centered pair is not an approved gameplay furniture layout: an odd-width 3×3 room's grid does not align with both module-centered outlines, and current lookout posts overlap the wall-side furniture band. Future integration needs room-relative tile origins, occupied cells, adjacent interaction cells and relocated guard posts. No editor catalog, pathfinding, computer or phone interaction is included in this change.

## Reusable model library

`dist/tactics/guardhouse-machines.js` exports `GUARDHOUSE_MACHINE_FORMS`, `GUARDHOUSE_MACHINE_SIZE`, `GUARDHOUSE_MACHINE_PAINT`, `GUARDHOUSE_PAINT_CELLS`, `guardhousePaintRect(cell)` and `createGuardhouseMachineLibrary(atlas)`.

```js
const library = createGuardhouseMachineLibrary(atlas); // Borrowed sRGB texture.
const computer = library.build('computer', {screen: 'green'});
scene.add(computer.root);
const phone = library.build('telephone');
scene.add(phone.root);
library.setGrey(true); // Applies to existing and later instances.
computer.dispose(); // Detaches this instance; shared resources remain cached.
library.dispose(); // Idempotent: releases owned geometries/materials/instances.
atlas.dispose(); // Caller owns the input texture.
```

The study borrows the original guardhouse geometry from its furniture library and the original horse data/paint. It renders on changes rather than running a permanent animation loop. Initialization failure, page teardown and repeated disposal release owned resources; the horse paint owns its input texture, so the viewer does not dispose that texture twice.

## Painted skin

- [Saved atlas](../../dist/assets/environment/guardhouse-consoles/paint-atlas-v1.png)
- [Exact generation prompt and provenance](../../dist/assets/environment/guardhouse-consoles/PROMPT.md)

Generated with the **built-in image-generation tool** on October 9, 2026, then copied unchanged into the project. The actual output is 1254×1254. Its drawn panel boundaries are not a perfectly even grid: UVs use measured columns `[0,314,629,943,1254]` and rows `[0,288,580,883,1254]` with a 5-pixel inset, avoiding adjacent-panel bleed. Do not substitute an evenly divided 4×4 UV grid.

## Verification and review

- [x] Simple silhouettes and readable painterly details; 200 triangles for the pair.
- [x] Correct floor contact, real wall/sill clearance and physically supported handset.
- [x] Green/amber displays, grey forms, front/side/top/rear/three-quarter views.
- [x] Native-scale horse, 58 px/tile and mobile inspection.
- [x] Bounded geometry/texture use after 18 replacements; every texture disposed exactly once even when viewer disposal is called twice.
- [x] Six model tests plus nine related furniture and two packaging tests: **17 passing**.
- [x] Independent hostile subagent review: **9/10**, no remaining blocker for the reusable assets and fit study.

```text
node --test tests/guardhouse-machines.test.mjs tests/painted-furniture.test.mjs tests/tactics-3d-deployment.test.mjs
```

The production build copies the model, study and atlas, and validates the study's module dependency closure. Selected screenshots and independent browser measurements are in `hybrid-review/guardhouse-machines/`. Review browser helpers closed with exit code 0; their exact identities and close receipts remain under `artifacts/guardhouse-machines/helpers/`.

## Delivery and preview lifetime

Feature branch `work/guardhouse-consoles`, based on `a6e56f5`. Only `main` deploys; gameplay integration and publication remain separate actions.

The already registered preview on **port 4476** is retained for user review with its existing automatic shutdown at **October 9, 2026, 22:30 UTC / 6:30 p.m. Eastern**. Its deadline was not extended. Exact identity, restart record, original source and stop marker are in `artifacts/grenade-blast/server/`; the stop marker is `STOP`. Restart deliberately using `node tools/serve-grenade-blast-study.mjs 4476`, then register the new lifetime with the shared helper-lifecycle utility.
