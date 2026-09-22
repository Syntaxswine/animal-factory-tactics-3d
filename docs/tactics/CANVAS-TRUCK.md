# Canvas-covered factory truck

Isolated study on `environment-painted-study`. Open
`http://127.0.0.1:4329/tactics/canvas-truck.html` to compare author and reduced
meshes, grey form, painted surface, wireframe and paint coverage. The approved
horse provides scale. Native comparison is 58 CSS pixels/world unit.

## Construction and workflow

The brief is a compact older factory cargo lorry with a metal cab and a
canvas-covered bed. Front is +X. The truck is approximately 4.7 units long,
1.9 wide and 2.36 high, beside the 1.65-unit horse. This is a static model;
vehicle movement, collision, doors and cargo placement are not implemented.

The author asset has **29,992 triangles**; the reduced asset has **9,992**.
`tools/build-canvas-truck.mjs` authors softened panels, framed glazing, bonnet,
radiator, headlamps, steps, four grounded tires, hubs, fenders, chassis, bed,
supporting hoops, double-surface canvas, ties and a rolled rear flap.
Seven material groups retain ownership through reduction. The actual author
vertices and indices are the input to the game-mesh reduction using the existing
meshoptimizer dependency. Tests check this provenance, finite data, normals,
bounds and ground contact. This is not a character rig or animated vehicle.

The first hostile grey review scored **8/10**: canvas sides needed dimensional
drapes, and wheel-cap normals made hubs appear pointed. The revision adds broad
cloth pressure/drape forms and diagonal tension folds, reduces the regular roof
scallop, and preserves distinct hub-cap and rim-wall normals.
The revised sculpt reached **9/10 for paint readiness**, with an independent
32-view comparison of both mesh resolutions at native and close scales.

## Registered painting

Like the horse/goat pipeline, painting starts from the actual grey mesh. Six
orthographic cameras capture front, side, rear, opposite side, roof and underside
in a 3×2 sheet. The extra vertical views cover the large canvas roof. Every cell
uses a 5.4-unit square frame centered at (0,1.2,0), with normalized sampling so
image resolution can change without changing the cameras.
Image generation shifted/scaled the individual views. A per-view affine
calibration maps projected mesh bounds to the foreground paint extents before
sampling. The neutral reference cameras and visibility buffer remain unchanged;
the generated image is preserved as delivered. This compensates framing drift,
not arbitrary differences in illustrated anatomy or geometry.

The built-in ImageGen tool paints the registered sheet, using the approved horse
skin as the brushwork reference. The exact prompt is `TRUCK-PAINT-PROMPT.txt`.
The reference is `truck-review/neutral-paint-reference.png`. Final artwork lives
in `dist/assets/environment/painted-study/canvas-truck-paint-v1.png`.

The truck-specific projection shader uses object-space positions/normals and
six mesh visibility passes. Material IDs and depth reject occluded sources;
border-connected background masking rejects grey backdrop. Angular weights
blend valid views. For occluded surfaces the shader first reuses paint from the
same projected material without claiming verified visibility. Surfaces still
unseen, such as the bed deck, use explicit material-matched swatches from the
same generated artwork. Coverage displays direct projection green, reused
paint blue and any remaining flat material fallback magenta. Swatches are
object-space mapped, so turning the truck does not slide their paint.
Like the character prototype, the painted material is unlit because highlights
are authored in the image. It is not a conventional UV atlas and does not prove
complete surface coverage or production-ready vehicle animation.

## Reproduction

- Build meshes: `node tools/build-canvas-truck.mjs`
- Tests: `node --test tests/canvas-truck*.test.mjs`
- Grey views/reference: `node tools/canvas-truck-review.mjs --grey`
- Painted views: `node tools/canvas-truck-review.mjs`
- Full checks: `npm run check`; distribution: `npm run build:tactics-3d`

The browser driver uses Playwright/Edge and port 4329. It checks both meshes,
eight headings, native and close scales, grey/wire or paint/coverage surfaces,
plus mobile layout and browser/shader errors. Evidence is in `truck-review/`.

## Final review

The first painted review scored **8/10**, finding obvious flat gaps on the cargo
deck and fender return faces. Same-material reuse and the painted swatches resolve
those visible gaps. Final hostile review reached **9/10 for the static truck
study** after another independent 32-view author/reduced, native/close inspection
with no browser errors. Small doubled wear marks at projection joins and reused
interior detail remain nonblocking polish observations.

The acceptance driver checks 64 render combinations for each grey/painted pass.
Its 32 painted coverage captures find no classified flat-fallback pixels after
the fixes; this screen-space result does **not** mean complete direct paint
coverage of the mesh. Blue areas remain deliberately reused artwork. Coverage
counts and screenshots are recorded in `truck-review/painted-checks.json`.

Delivery validation: all **469 Node tests pass**. The asset validator checks the
1536×1024 RGB painted source through its actual runtime path, and the 3D Pages
build includes all six truck modules/data files and the paint asset. Asset
validation and the build pass. Main is unchanged; this branch is not deployed.
