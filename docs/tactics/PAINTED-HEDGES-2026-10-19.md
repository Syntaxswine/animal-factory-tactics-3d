# Short cover hedges and tall hedgerows

Artist delivery on branch `work/painted-hedges`, based on canonical `2107054`.

## Review

Open `tactics/painted-hedges-study.html`. The default comparison includes the native horse beside each height. The viewer also provides a full one-tile opening, corner/T/cross/end combinations, a short-to-tall transition and a 32-tile row. Inspect from front, along the row, above and behind, at fitted or gameplay scale, with a standing or kneeling horse. Grey forms and wood-only inspection expose the actual geometry.

| Form | Nominal crown | Treatment |
| --- | --- | --- |
| Short cover hedge | 0.90 world units | Clipped crown, softened shoulders, low woody stems |
| Tall country hedgerow | 2.12 world units | Uneven crest, round shoulders, denser upright growth |

One world unit equals one tile. Height varies continuously across a run; the nominal crown is not an exact clipping plane. The existing horse is about 1.65 units tall and is not resized to fit the props. The short core screens the tested 0.825-unit kneeling eye while leaving the tested 1.19-unit standing shot above it. The tall core screens a 1.65-unit eye. These are geometry checks, not gameplay integration claims.

The approved foliage screen and fringe atlases carry the detail. Hedges use their own materials, a finer leaf scale and a balanced rotated paint sample; the woodland materials are unchanged. Exposed small leaves soften the edge without entering an unoccupied tile. No new raster assets are required.

## Asset API

```js
import {createPaintedHedges} from './painted-hedges.js';
const hedge = createPaintedHedges([
  {x: 0, z: 0, kind: 'short'},
  {x: 1, z: 0, kind: 'short'},
  {x: 2, z: 0, kind: 'tall'},
  {x: 2, z: 1, kind: 'tall'}
], {screen: screenAtlas, fringe: fringeAtlas}, {seed: 173});
scene.add(hedge.root);
// hedge.setGrey(true), hedge.setDetail(false), hedge.stats()
// hedge.dispose() releases owned geometry/materials, not supplied textures.
```

`x` and `z` are integer tile centers. `base` optionally supplies the ground elevation in world units. Cardinal neighbors on the same base connect automatically. Different elevations cap separately; use separate instances for stacked floors at the same x/z coordinate. Duplicate coordinates and invalid form names are rejected. Keep root scale at one.

Connected geometry is built as one field and merged into 16 × 16 spatial chunks. Shared boundary vertices and normals match across tile and chunk joins, and an internal connection has no hidden end cap. A cell left out of the plan stays clear of leaf cards, cores and wooden beams. Placement order does not change the result.

`contract.cells`, `contract.bounds`, and `contract.wood` are authored coordinates in root-local space. If the root moves or rotates, transform these through `root.matrixWorld`; they do not update themselves. Wood entries contain `a`, `b`, `radius` and `tipRadius`. The render uses those exact tapered five-sided cylinders.

## Integration boundary

This delivery adds assets and a study, not new editor catalog IDs, save-format tuples, tactical movement rules, fog logic or ballistic handlers. The existing woodland and thicket rules are preserved.

For the integration agent:

- Use the occupied cells, not the whole root bounding box, for placement. Preserve omitted cells as openings.
- Use a finite sight envelope matching the core geometry. The contract currently describes this in prose; it does not serialize a ready-to-use sight volume.
- Keep leaf screening separate from solid projectile cover. Only the rendered substantial wood has a matching solid-cover descriptor; do not make the opaque leaf core bulletproof.
- Resolve short-hedge movement/vaulting policy in gameplay integration, then check save → reload → playtest, standing/kneeling sight, shots, fog and elevated terrain.
- Retain spatial chunks. `setDetail(false)` hides the small leaf sprays; those sprays do not cast shadows. Core and wood meshes retain normal frustum culling and shadows.

## Validation and cost

Independent hostile review: **9/10, approved as an art study**. The review caught reversed side winding, a hard tall-hedge shoulder, mirrored paint motifs and overlapping front-view horse references. These were corrected and the reviewer independently reran all 12 hedge tests. No concrete blocker remained; editor/gameplay integration was expressly excluded from that approval.

**73 targeted tests passed**: 12 hedge tests, two packaging/dependency tests and 59 related foliage tests. The 3D build, asset audit and shared-core synchronization also passed.

The focused suite covers the two heights, all sixteen neighbor masks, rotations, clear gates, mixed-height joins, chunk boundaries, winding/normals, raised bases, deterministic ordering, wood/descriptor agreement and resource ownership. Related foliage and packaging checks protect the existing assets and rules. Build module closure, asset audit and all 20 shared-core synchronization checks are included.

The browser capture tool is `tools/review-painted-hedges.mjs`. It captures ten views, checks browser/asset/shader errors, repeatedly rebuilds layouts to check resource stability, and verifies browser disposal and port release. Set `PLAYWRIGHT_PATH` when Playwright is supplied by an external runtime. `HEDGE_URL` selects the packaged preview; `HEDGE_REVIEW_OUTPUT` keeps its evidence separate. Local captures live under `artifacts/painted-hedges/` and are not committed.

| Fixture | Planted tiles | Asset triangles | Chunks | Asset meshes |
| --- | ---: | ---: | ---: | ---: |
| Height comparison | 14 | 4,098 | 4 | 12 |
| Tall hedge with one-tile opening | 16 | 4,760 | 2 | 6 |
| 32-tile tall row | 32 | 9,428 | 3 | 9 |

These are asset counts, excluding reference horses and shadow submissions. They do not establish a full battle frame rate. The viewer reused its resource counts after twelve alternating layout rebuilds: 33 geometries and 14 textures, including the horse paint resources.

The read-only review server is `tools/serve-hedges.mjs`, normally on port 4476. It has an actual 24-hour shutdown timer and a private STOP marker in `artifacts/painted-hedges/server/`. Each retained process lifetime must be registered with the workspace helper lifecycle utility. The current preview expires on October 20, 2026 at 12:03 PM America/New_York; the durable source and captures remain available after it stops.
