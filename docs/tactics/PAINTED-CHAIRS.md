# Painted chairs and shared sitting targets

Four low-poly chair models use one painterly atlas for eight finishes. The seat and contact targets are identical in every variant, so the future sit/stand sequence can use the same furniture coordinates rather than a separate animation for each chair.

| Chair | Finishes | Triangles |
| --- | --- | ---: |
| Wingback | Russet leather / teal upholstery | 448 |
| Simple wooden chair | Honey / walnut | 180 |
| Metal chair | Sage enamel / dark iron | 248 |
| Desk chair | Teal / russet upholstery | 284 |

Seams, buttons, cushion channels, wood grain, stamped ribs, fasteners and wear are painted. Geometry supplies the major silhouette, seat, back, supports, wingback arms and five simple desk-chair casters. The wingback has a continuous upholstered back extending into the seat and faceted cabriole front legs with shaped rear legs. All models fit within one native 1×1 tile; the characters are not rescaled.

The wingback remains about 1.36 high. The wooden, metal and desk chairs end at approximately 0.99, level with the original horse's rolled cuffs (the cuff sculpt runs around Y 0.99–1.035). Only their backs/supports were lowered; the shared seat remains at 0.48.

Open `tactics/painted-chairs-study.html`. Select the collection or an individual chair, either finish, grey forms, five views and 58 px/tile gameplay scale. Horse, pig director and pig foreman are standing references. The optional gold fitting mannequin is identical across all four models; it is a furniture-space check, not an animated or species-fitted character.

## Shared contract

`dist/tactics/painted-chairs.js` exports `CHAIR_CONTACT`. The chair origin is on the floor, **Y up and +Z forward**. Native animal models face +X and must be oriented by their eventual adapter.

| Target | Chair-local value |
| --- | --- |
| Seat top | Y 0.48 |
| Usable seat | X −0.42…0.42; Z −0.32…0.30 |
| Seat center | `[0, 0.48, -0.01]` |
| Mannequin pelvis | `[0, 0.62, -0.03]` |
| Left / right sole | `[−0.23, 0, 0.43]` / `[0.23, 0, 0.43]` |
| Forward approach | `[0, 0, 0.80]` |
| Back reference | `[0, 0.91, -0.36]` |
| Minimum arm inside gap | 0.88 |
| Wingback arm top | Y 0.72 |

Geometry checks reserve the same seated torso volume, forward rise volume and both heel channels across the collection. There is no front stretcher. The desk base has its forward spoke between the feet, keeping both heel channels open. Casters and swivel stay fixed in this study.

There is no shared tail opening. The wingback is closed, including the previously open space above the seat. Per-model metadata records `backClosed: true` and `tailOutlet: null` for that model. The open-backed styles retain smaller outlets (0.62 wide, from Y 0.48 to 0.65 or 0.68), which a chair-independent animation must not rely on.

The shared animation should use feet, seat and hands-on-thighs support. It must not require armrests, compressible cushions or a rotating seat, because those features differ across the models.

## What still needs a character animation pass

The design audit measured hip/body widths of approximately 0.527 for the horse, 0.687 for the director, 0.727 for the foreman and 0.714 for the hen, excluding the mammals' neutral arm spread. This informs the 0.84 seat width, but does not establish seated contact or clothing clearance.

- [ ] Author one supported sit/stand sequence in chair-local space: feet planted, torso leans forward, hips lower onto the seat; reverse support transfer before rising.
- [ ] Retarget that common sequence through species-specific limb lengths and IK; do not scale characters or bones to fit. The pelvis marker is not an exact bone target for every species.
- [ ] Verify the actual skinned butt/thigh surface contacts the seat, with soles planted and hands on the thighs. Check every chair with no chair-specific root offsets.
- [ ] Give the shorter-legged foreman an appropriate adapter. The hen's wing/leg rig needs its own adapter rather than the literal mammal bone clip.
- [ ] Author tail handling once per species that accommodates the closed wingback as well as the lower open-backed chairs. Neither the large hip-weighted skunk plume nor the hen's upright fan has been fitted to a native seated pose.
- [ ] Check all outfits and any equipped/stowed weapons before claiming complete animation support.
- [ ] Add editor/gameplay placement, occupied tiles, an adjacent approach/interaction cell and chair occupancy rules when integrating. A one-tile object bound alone is not a complete interaction footprint.

## Library and texture ownership

```js
const library = createChairLibrary(atlas); // Borrowed, sRGB texture.
const chair = library.build('wingback', {finish: 'russet'});
scene.add(chair.root);
const target = chair.anchors.seat.getWorldPosition(new THREE.Vector3());
library.setGrey(true);
chair.dispose(); // Detaches this model; shared resources remain cached.
library.dispose(); // Idempotent; releases all owned geometry and materials.
atlas.dispose(); // Caller owns the atlas.
```

Other anchors: `pelvis`, `back`, `approach`, `leftFoot`, `rightFoot`. Invalid chair/finish values and builds after library disposal fail explicitly. The viewer renders on demand and cancels stale reference loads; pending loads cannot install a character after selection changes or teardown.

The shared skin was generated with the **built-in image-generation tool** and saved unchanged:

- [Paint atlas](../../dist/assets/environment/painted-chairs/paint-atlas-v1.png)
- [Exact final prompt and provenance](../../dist/assets/environment/painted-chairs/PROMPT.md)

UVs use the actual 1254-pixel atlas boundaries: columns `[0,315,629,941,1254]`, rows `[0,312,628,924,1254]`, with 5-pixel panel insets. No runtime image-generation dependency exists.

## Checks

```text
node --test tests/painted-chairs.test.mjs tests/guardhouse-machines.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-painted-chairs.mjs
```

The browser checker accepts `PLAYWRIGHT_PATH` and `CHAIR_REVIEW_URL`, reuses the existing preview, and closes its owned browser in `finally`. It writes screenshots, exact helper identities, close receipts and its report under `artifacts/painted-chairs/`.

Current verification: **14 focused/build tests passed** and **100 browser configurations passed**. Checks cover both finishes, all angles/scales, each native reference, mobile overflow, repeated model replacement, delayed-reference cancellation and idempotent teardown. Geometry checks also verify real continuous upholstery over the formerly open back and complete lower-chair bounds at cuff height. After warming the variants, the renderer remains at 46 geometries / 2 textures with no character selected. No console errors were observed. The build packages the atlas and viewer and validates the complete module import graph.

Independent hostile subagent review of the refinement: **9/10**, no blocking findings. The reviewer inspected nine fresh views, including the closed wingback from front/rear/side, grey forms, alternate finishes, gameplay scale and a front comparison against the unscaled horse. Complete lower-chair heights measure 0.986–0.988; all shared anchors are unchanged. Six chair tests passed independently with no browser errors. The initial asset review also covered 28 live configurations and resource ownership. Current review and selected evidence are recorded in `hybrid-review/painted-chairs/`. These results certify assets and the shared furniture contract, not a completed sit/stand animation or playable chair integration.

## Branch and local preview

`work/painted-chairs` starts at the preceding guardhouse-console commit `bba7416`. The feature branch does not deploy; Pages publishes `main`.

The registered port **4476** preview is reused for user review. Its unchanged automatic shutdown is **October 9, 2026, 22:30 UTC / 6:30 p.m. Eastern**. Exact process identity, source, restart information and the `STOP` marker remain in `artifacts/grenade-blast/server/`. Restart deliberately with `node tools/serve-grenade-blast-study.mjs 4476` and register the new process lifetime with the helper-lifecycle utility.
