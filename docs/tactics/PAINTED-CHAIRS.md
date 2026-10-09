# Painted chairs and shared sitting targets

Four low-poly chair models use one painterly atlas for eight finishes. The usable sitting area and contact targets are identical in every variant, so the future sit/stand sequence can use the same furniture coordinates rather than a separate animation for each chair.

| Chair | Finishes | Triangles |
| --- | --- | ---: |
| Wingback | Russet leather / teal upholstery | 480 |
| Simple wooden chair | Honey / walnut | 180 |
| Metal chair | Sage enamel / dark iron | 248 |
| Desk chair | Teal / russet upholstery | 284 |

Seams, buttons, cushion channels, wood grain, stamped ribs, fasteners and wear are painted. Geometry supplies the major silhouette, seat, back, supports, wingback arms and five simple desk-chair casters. The wingback has a continuous upholstered back extending into the seat, solid upholstered sides joining the base to the wings, rolled padded armrests, and faceted cabriole front legs with shaped rear legs. All visible furniture now fits within one native 1×1 tile; the wingback's padded armrests span 0.945 in total. `paddingOverhang` is zero for all four chairs. The characters are not rescaled.

The wingback remains about 1.36 high. The wooden, metal and desk chairs end at approximately 0.99, level with the original horse's rolled cuffs (the cuff sculpt runs around Y 0.99–1.035). Following the horse sitting test, all seat tops are now **0.42 high**, down from 0.48. Legs and the desk column are shorter; the wingback's lower upholstery and rolled arms move down with the seat. The subsequent proportion pass reduces every furniture X/Z dimension by the same **0.42 / 0.48 = 0.875 ratio**, making each chair 12.5% narrower and shallower. Current Y dimensions, back-top heights, one-tile placement and character scale are preserved.

The wingback's outer seat padding is 0.84 wide × 0.665 deep × 0.12 thick. It extends under both arm supports and farther beneath the back; the back cushion's lower bevels tuck into it to close the corner gaps. This extra padding surrounds the common **0.735 × 0.5425** sitting area used by the other seats. Its top is Y 0.42, with the shared pelvis target at Y 0.56 and the original foot and approach targets. Triangle counts are unchanged.

Following the user's classic-chair reference, each side is a single low-poly upholstered shell. The separate eight-sided arm roll is 0.0875 across and 0.10 high after the plan-size reduction. Its inside edge is flush with the inner flat side at X ±0.385, and its rounded bulk projects outward to X ±0.4725. Its top remains Y 0.66, preserving its height relative to the lower seat. Flat sides and rolls both leave 0.77 across; `armInside` is 0.385.

Open `tactics/painted-chairs-study.html`. Select the collection or an individual chair, either finish, grey forms, five views and 58 px/tile gameplay scale. Horse, pig director and pig foreman are standing references. The optional gold fitting mannequin is identical across all four models; it is a furniture-space check, not an animated or species-fitted character.

## Shared contract

`dist/tactics/painted-chairs.js` exports `CHAIR_CONTACT`. The chair origin is on the floor, **Y up and +Z forward**. Native animal models face +X and must be oriented by their eventual adapter.

| Target | Chair-local value |
| --- | --- |
| Seat top | Y 0.42 |
| Usable seat | X −0.3675…0.3675; Z −0.28…0.2625 |
| Seat center | `[0, 0.42, -0.00875]` |
| Mannequin pelvis | `[0, 0.56, -0.02625]` |
| Left / right sole | `[−0.23, 0, 0.43]` / `[0.23, 0, 0.43]` |
| Forward approach | `[0, 0, 0.80]` |
| Back reference | `[0, 0.91, -0.315]` |
| Minimum arm inside gap | 0.77 (rolls flush with the flat inside panels) |
| Wingback arm top | Y 0.66 |

Geometry checks reserve the same seated torso volume, forward rise volume and both heel channels across the collection. The current heel corridors run from Z 0.29 to 0.58 around the original foot anchors; actual skinned hoof clearance is checked separately. There is no front stretcher. The desk base has its forward spoke between the feet, keeping both heel channels open. Casters and swivel stay fixed in this study.

There is no shared tail opening. The wingback is closed, including the previously open space above the seat. Per-model metadata records `backClosed: true` and `tailOutlet: null` for that model. The open-backed styles retain smaller outlets (0.5425 wide, from Y 0.42 to 0.65 or 0.68), which a chair-independent animation must not rely on.

The shared animation should use feet, seat and hands-on-thighs support. It must not require armrests, compressible cushions or a rotating seat, because those features differ across the models.

## Horse sit/stand study

Open `tactics/horse-chair-study.html`. The original horse now uses the same **9.2-second** unarmed sit/rest/stand clip with the wingback, wooden, metal and desk chair, in either finish. Switch chairs without changing the character's pose or root offset. Five camera views, gameplay scale, grey forms, pause/scrub and seven keyframe buttons are available. The collection page links to it.

| Time | Action and support |
| --- | --- |
| 0–0.7 s | Bend forward and bring hands toward thighs; both soles stay planted. |
| 0.7–2.7 s | Lower the hips back onto the cushion. |
| 2.7–3.4 s | Settle upright while the clothed seat supports the body. |
| 3.4–5.4 s | Sit and glance to the side. |
| 5.4–6.2 s | Shift the chest forward over the hooves, keeping the hips down. |
| 6.2–7.6 s | Rise through the legs; hands lift clear of the thighs. |
| 7.6–9.2 s | Return the arms to the sides and stand. |

`horse-chair-motion.js` fits the real horse's thigh/shin lengths rather than using the gold mannequin's pelvis marker literally. Two-bone IK keeps both sole surfaces fixed at the shared foot positions, and all bone lengths and character/chair scales remain unchanged. The elbow hinges now fold toward the **back of the torso**, including during the forward lean; their pole direction follows the torso rather than using the forward-bending knee pole. Outward clearance keeps the forearms outside the waist. Hands follow actual thigh triangles farther down the lap, with the palm orientation and offset checked against the visible gloves. The release follows a shallow arc so fingers do not cut through the trousers. Descent timing keeps the body over the hooves until the lower cushion receives its weight.

A reversible cloth corrective compresses loose overalls against the Y 0.42 seat and forms a fold around its front edge. The front fold begins smoothly above the rim, and connected folds blend as neighboring fabric approaches the shorter seat's nose. It changes clothing vertices only, preserving the bind-space paint, original geometry buffers on restoration, skeleton and chair geometry. With the narrower, shallower chairs, maximum vertical cloth compression is about 0.034 tile and combined compression/fold displacement about 0.039 tile. The horse retains the approved joint tracks and planted stance; no character translation is needed. This is authored contact correction, not a cloth or rigid-body simulation. Existing horse underarm/side paint repairs are reused in the viewer.

```js
const motion = createHorseChairMotion(horse);
motion.apply(seconds, {heading: 0, position: [0, 0, 0]});
// Heading is radians around Y; zero faces chair-local +Z.
motion.diagnostics(); // Actual soles, joints and clothed seat contact.
motion.restore();
motion.dispose(); // Restores original weights, positions, normals and skeleton binding.
```

The horse mesh has no tail. This study does not establish tail accommodation, other species/outfits, weapons, approach/turning, or gameplay occupancy. In particular, characters with shorter legs or larger bodies still need their own anatomical fit against this same chair contract.

## Remaining character animation work

The design audit measured hip/body widths of approximately 0.527 for the horse, 0.687 for the director, 0.727 for the foreman and 0.714 for the hen, excluding the mammals' neutral arm spread. The current 0.735 seat width still requires actual seated contact and clothing-clearance checks for each additional species.

- [x] Author the horse's supported sit/stand sequence in chair-local space: feet planted, torso leans forward, hips lower onto the seat; reverse support transfer before rising.
- [ ] Retarget that common sequence through species-specific limb lengths and IK; do not scale characters or bones to fit. The pelvis marker is not an exact bone target for every species.
- [x] Verify the horse's actual skinned butt/thigh surface contacts the seat, with soles planted and hands on the thighs. Check every chair with no chair-specific root offsets.
- [ ] Repeat the actual surface-contact and chair-clearance review for each added species and outfit.
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
node --test tests/horse-chair-motion.test.mjs
node tools/check-horse-chair.mjs
```

The browser checker accepts `PLAYWRIGHT_PATH` and `CHAIR_REVIEW_URL`, reuses the existing preview, and closes its owned browser in `finally`. It writes screenshots, exact helper identities, close receipts and its report under `artifacts/painted-chairs/`.

The horse checker similarly accepts `HORSE_CHAIR_REVIEW_URL` and `PLAYWRIGHT_PATH`. It covers **80 view/finish/scale combinations and 80 motion keyframe configurations**, real playback/loop controls, exact backward scrubbing, mobile layout, repeated chair replacement and idempotent teardown. Its two normal-speed canvas recordings and images are saved under `artifacts/painted-chairs/horse-motion/`. The warmed renderer stays at 50 geometries / 7 textures after switching chairs and finishes; no browser errors occurred. Eight motion tests check dense joint and cloth continuity, actual sole surfaces, limb lengths, mass transfer before cushion release, backward elbow hinges across the complete clip and multiple headings, triangle interiors against chair solids (ray parity for concave shells), actual glove and whole-forearm/trouser penetration, and exact rig/mesh restoration. These checks support visual review rather than replacing it.

The initial horse pass passed **59 focused/regression tests**, including the existing animal motion, horse mesh, paint lifecycle, chair and distribution-build suites. Its [initial review](../../hybrid-review/painted-chairs/horse-sitting-review.md) did not catch the reversed elbow anatomy subsequently identified by the user. The elbow/seat-height correction adds explicit hinge-direction, whole-forearm clearance and cloth-continuity regressions. Its **16 focused chair/motion/build tests**, **100 chair configurations**, and **80 view/finish/scale plus 80 motion keyframe configurations** pass. Selected durable evidence is refreshed with the correction: [three-quarter playback](../../hybrid-review/painted-chairs/horse-sit-stand-three.webm), [side playback](../../hybrid-review/painted-chairs/horse-sit-stand-side.webm), [wingback seated](../../hybrid-review/painted-chairs/horse-wingback-seated.png), and [wooden-chair contact](../../hybrid-review/painted-chairs/horse-wood-seat-contact.png).

Independent [elbow and lower-seat review](../../hybrid-review/painted-chairs/horse-sitting-elbows-review.md): **9/10**. The reviewer checked fresh views of all four chairs, dense elbow directions at multiple headings, and 137,466 forearm vertex/triangle-centroid samples with no waist penetration. The initial correction's forearm overlap and seat-rim cloth pop were fixed before approval.

The following proportion pass matches furniture width/depth to the seat-height reduction: **12.5% in both horizontal directions**. All **16 chair/motion/build tests**, **100 collection configurations**, and **80 horse view/finish/scale plus 80 motion keyframes** pass again. The horse's planted stance and joint tracks remain unchanged. Actual cloth/seat, sole, forearm and chair-solid checks remain enabled; the front-fold correction blends smoothly against the shorter cushion. Independent [proportions review](../../hybrid-review/painted-chairs/horse-sitting-proportions-review.md): **9/10**, including 46 fresh views and a full geometry comparison to `cf2233c`. Current videos and stills linked above and the [collection beside the horse](../../hybrid-review/painted-chairs/proportions-collection.png) show these final proportions.

The height/closed-back revision `2125cc1` passed **14 focused/build tests and 100 browser configurations**. Checks covered both finishes, all angles/scales, each native reference, mobile overflow, repeated model replacement, delayed-reference cancellation and idempotent teardown. Geometry checks also verified real continuous upholstery over the formerly open back and complete lower-chair bounds at cuff height. That revision's warmed renderer held at 46 geometries / 2 textures with no character selected. No console errors were observed. The build packages the atlas and viewer and validates the complete module import graph.

The subsequent cushion-gap correction passed all **six chair tests** and **nine fresh rendered views**, including front, side, rear, top, three-quarter, grey, alternate finish, gameplay scale and the collection beside the horse. No browser errors occurred. Independent hostile review scored it **9/10**, with no blockers; 2,937 front rays across the actual seat/back joint found no holes. Evidence is saved under `hybrid-review/painted-chairs/cushion-*`.

The solid-side and cylindrical-armrest refinement passed the same **six chair tests** and **ten rendered views**, adding the common seated fit guide to those angles and finishes. No browser errors occurred. Independent hostile review scored the final outward-roll version **9/10**, confirming the rolls' inner edges are flush with the flat side faces, 0.88 clearance remains, and all sitting anchors are unchanged. The continuous sides passed 5,642 side-directed ray checks with no holes. Evidence is saved under `hybrid-review/painted-chairs/side-shell-*`.

Independent hostile subagent review of the refinement: **9/10**, no blocking findings. The reviewer inspected nine fresh views, including the closed wingback from front/rear/side, grey forms, alternate finishes, gameplay scale and a front comparison against the unscaled horse. Complete lower-chair heights measure 0.986–0.988; all shared anchors are unchanged. Six chair tests passed independently with no browser errors. The initial asset review also covered 28 live configurations and resource ownership. Current review and selected evidence are recorded in `hybrid-review/painted-chairs/`. These results certify assets and the shared furniture contract, not a completed sit/stand animation or playable chair integration.

## Branch and local preview

Canonical integration on 9 October includes the seven chair commits through `5bd0e47`, with the atlas
registered in the release asset check and both study viewers included in the base and 3D Pages builds.
It also preserves the new fitted neck weights when the horse's motion adapter is installed. Fresh packaged
browser checks covered the wingback and wooden seated poses and side lowering/rising poses with no console
errors. This approves the collection and horse study; the gameplay and species checklist above remains open.
See [the integration review](INTEGRATION-REVIEW-2026-10-09.md) for checks and evidence limits.

`work/painted-chairs` starts at the preceding guardhouse-console commit `bba7416`. The feature branch does not deploy; Pages publishes `main`.

The registered port **4476** preview is reused for user review. Its unchanged automatic shutdown is **October 9, 2026, 22:30 UTC / 6:30 p.m. Eastern**. Exact process identity, source, restart information and the `STOP` marker remain in `artifacts/grenade-blast/server/`. Restart deliberately with `node tools/serve-grenade-blast-study.mjs 4476` and register the new process lifetime with the helper-lifecycle utility.
