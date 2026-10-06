# Strategic sites — intact and destroyed

Three custom sites, each occupying **8 × 8 tiles including all wreckage**. The
painted reference boards and shared material atlas are authored for these assets.
Each site has a complete intact form and a persistent destroyed form.

This is an **art library and comparison study**. The sites are not yet registered
as editor props and do not implement strategic effects, targeting or destruction
events. The two states are static models; there is no destruction animation.

## Review checklist

- [x] Painted intact/destroyed reference board for each site.
- [x] Shared painted skins, with geometry concentrated on silhouettes.
- [x] Six reusable 3D forms at native game scale.
- [x] 8 × 8 footprint, including debris, verified after quarter-turn rotations.
- [x] Each loose wreck assembly independently contacts the slab.
- [x] Shared foundation and equipment positions retained between states.
- [x] Side, rear, overhead and three-quarter review; gameplay scale comparison.
- [x] Focused geometry, resource ownership and browser checks.
- [x] Pages build includes viewer, models, materials and reference images.
- [x] Independent hostile review: **9/10**, 2026-10-06, no blocking findings.

## Assets and visual intent

| ID | Intact silhouette | Destroyed silhouette |
| --- | --- | --- |
| radio | Tall red/ivory open lattice mast, two microwave dishes, aerials, service hut | Two fallen striped lattice sections, snapped stubs, detached dish, scorched equipment |
| radar | Broad concave segmented dish and feed, red yoke, open trestle and maintenance deck | Reflector with a missing sector, buckled supports, fallen deck, detached dish sector |
| sam | Twin ivory missiles with red nose caps, elevated rails, trunnion and lifting ram | Bent rails, broken charred fuselage, detached nose, damaged turntable and controls |

The concrete hardstanding gives each site a complete base. The 2 × 2 concrete
panels are a visual treatment, not a change to the 1 × 1 game tile size. The
viewer's optional grid shows all 64 individual tiles.

The radio mast is about 9.67 units tall, the radar tower 8.10, and the SAM site
3.19. A normal wall remains 2 units high. Each model is approximately 4,000–9,600
triangles (the radar is 9,636). Exact counts and bounds are generated into the asset manifest.

Materials use broad hand-painted wear, cream highlights, olive/red industrial
paint and charcoal scorch. Generated raster sources are preserved unmodified;
the meshes map into bounded regions of one eight-material atlas.

## Files and local use

- Viewer: `dist/tactics/strategic-sites-study.html`
- Library: `dist/tactics/strategic-sites.js`
- Asset manifest: `dist/assets/environment/strategic-sites/manifest.json`
- Painted files: `dist/assets/environment/strategic-sites/*.png`
- Image prompts/provenance: `docs/tactics/strategic-sites-image-prompts.json`

Start the read-only preview with:

```powershell
node tools/serve-strategic-sites.mjs 4475
```

Open `http://127.0.0.1:4475/tactics/strategic-sites-study.html?site=radio&mode=pair`.
Select `radio`, `radar` or `sam`; show both states or inspect one. View choices
include side/rear/overhead. Gameplay scale is exactly 58 CSS pixels per tile.
The horse is a scale reference and is not part of the asset footprint.

The server shuts itself down after 24 hours or when its private
`artifacts/strategic-sites/STOP` file appears. A deliberate restart must remove
that marker first and register the new process lifetime with helper-lifecycle.

## Library contract

```js
const atlas = await new THREE.TextureLoader().loadAsync(STRATEGIC_SITE_ATLAS);
const library = createStrategicSiteLibrary(atlas);
const {root} = library.build('radio', {state: 'destroyed'});
scene.add(root);
// Move/rotate each root independently; roots share library-owned resources.
// After removing every borrowed root:
library.dispose();
atlas.dispose(); // Caller owns the input atlas.
```

The local anchor is the center of the footprint at ground height:
`[0, 0, 0]`, Y up, X/Z in `[-4, 4]`. The top of the slab is Y=0.24.
Quarter-turn rotations preserve the footprint. Build never disposes another
root's resources. Library disposal is idempotent; building afterward throws.

Whole-site roots can be swapped at the same transform for a persistent wreck.
They contain named semantic assemblies such as `fallen-reflector` and
`fallen-mast-lower`; individual meshes inside those assemblies are batched by
material. The pack is currently procedural Three.js source, not a rigged GLB.

## Checks

```powershell
node tools/export-strategic-sites.mjs
node --test tests/strategic-sites.test.mjs
npm run build:tactics-3d
# Use an installed Playwright dependency; this creates and closes a temporary Edge.
$env:PLAYWRIGHT_PATH = 'PATH/TO/node_modules/playwright'
node tools/check-strategic-sites.mjs
```

The nine geometry/resource tests cover all six forms and all four quarter turns,
per-assembly ground contact, retained foundations, finite geometry and bounded
UVs, clone independence, repeat construction, single disposal, radar platform
clearance and the manifest.
The browser check covers 24 model/view combinations, native scale, repeated
selection, grey/wireframe/grid/horse controls, a narrow viewport and disposal.
Screenshots and helper close receipts go to ignored `artifacts/strategic-sites/`.

## Gameplay integration still required

- [ ] Register both states for all three sites in the **shared 3D prop catalog**.
- [ ] Define editor placement/rotation and 8 × 8 occupancy.
- [ ] Decide walkable slab areas and collision/cover/visibility geometry separately
      for intact and destroyed states; do not treat the full bounding box as a solid.
- [ ] Connect game damage events to persistent state changes and save/load.
- [ ] Define any radio, radar or SAM strategic behavior independently of the art.
- [ ] Exercise editor save → load → playtest with all six variants.

Do not register these only in an older editor catalog. Previous large-tree work
showed that the current 3D editor and game must agree on their shared prop types.

## Hostile review result — 2026-10-06

Independent reviewer: **9/10 — pass for six presentation assets and viewer**.
Reviewed close and gameplay scales, side/rear/overhead angles, footprint and
ground contact, painted readability, resource ownership and packaged files.
The SAM crossbeam connection, radar platform clearance and rear mount, and
the paired horse references were corrected during review.

All nine focused tests passed independently. Browser checks covered 36 initial
configurations and targeted fresh renders after corrections, plus repeated
selection, controls, mobile fitting and disposal. The builder's repeatable browser
script also passed its 24 model/view combinations on the final implementation.
The build and module closure passed; all nine packaged asset/viewer files matched
their source files. Temporary review browsers exited and their recorded PIDs were
verified absent.

The approval covers **static art and the viewer**. The gameplay checklist above
remains open.

![Radio tower — intact and destroyed](strategic-sites-review/radio-pair.png)
![Radar tower — intact and destroyed](strategic-sites-review/radar-pair.png)
![SAM site — intact and destroyed](strategic-sites-review/sam-pair.png)
