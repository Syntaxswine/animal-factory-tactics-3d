# All-animal motion revisions

This revision follows the twelve-animal comparison published as `544f08d`. It remains isolated on `animal-motion-study`; publication and gameplay integration are pending architect review.

## Preview

Serve this worktree on port 4428 and open `tactics/animal-motion.html`. All twelve characters retain their authored dimensions and smaller meshes. Native scale is the approved **58 CSS pixels/world unit**; close scale is 300. Switching characters preserves the timeline for direct comparisons. Front, side, rear, three-quarter, grey and gameplay views are available.

Eleven mammals run walk → kneel → aim → fire → stand. The hen remains an explicit unarmed exception: walk → crouch → observe → rise. She has no rifle, aiming or firing effects; wing weapon contacts are not authored.

## Localized repairs

- Horse, bull, cow, rabbit and skunk: exposed overall side panels reuse each character's own cloth painting. Bind-space masks keep the painting attached through arm raising and recoil, with feathered transitions that preserve front and rear details.
- Sheep: the upper sleeve borrows adjacent cream cloth; the waistcoat side retains olive cloth. The approved sheep sculpt and scarf forms remain intact.
- Donkey: the exposed lower jacket and trousers receive separate cloth sources. The final trouser footprint stays within brown fabric, away from the jacket, tail and grey background; the broad transition avoids a separate dark hip patch. Intentional elbow patches remain.
- Foreman: exposed lower neck receives continuous pink skin paint. The apparent cap problem was not cap drift: all cap vertices already follow the head. No cap transform was added. A single continuous source avoids a seam down the nape.
- Hen: the corrected feather/shank weights were previously only on the CPU. Paint-atlas rendering had already uploaded the original weights, so the visible model retained stale GPU buffers. Marking both skin attributes dirty makes the existing deformation reach the renderer and keeps closed upper-leg ends under the feathers.

These are motion-only corrections. Static model modules, reduced mesh JSON, original raster artwork, bone lengths and the accepted dog sequence are unchanged. The goat and director transfers remain review candidates. Shared hand quality, cautious gait and compressed kneeling trousers remain prototype limitations.

## Validation

- **504 tests pass**, including the 37 cross-species motion tests. Asset validation and the 3D distribution build pass.
- **2,992 browser pose samples** cover both scales, four headings and eleven timeline samples. Eleven mammals also cover three aim elevations. The hen contributes 88 unarmed samples. No browser errors.
- The dense geometry suite checks actual planted soles, floor clearance, fixed bone lengths, hand surface contact, joint continuity, physical muzzle alignment, recoil during flash, deterministic scrubbing and restoration of the original rigs.
- **21 rendered hen cap checks** cover front, side and rear at seven times. Every intact pose has zero visible upper-cap pixels. Three positive controls remove occluders and reveal 279, 352 and 567 pixels, proving the probe renders the target surfaces.
- A mutation check temporarily removed the two GPU update flags: the render test correctly failed, detecting 590 exposed pixels during front walking, 682 during front crouching and 248 during side crouching. The fix was restored. CPU geometry checks alone would not catch this failure.

Fresh five-view still sheets and uninterrupted native/close WebM recordings for all twelve animals are in `docs/tactics/hybrid-review/animal-motion/`, with `browser-checks.json` and `hen-rendered-caps.json`. Mechanical checks do not establish convincing painted seams or clothing; those receive separate visual review.

Reproduce with the server on port 4428 and Playwright available through `PLAYWRIGHT_PATH` if needed:

```text
npm run check
node tools/build-tactics-3d.mjs
node tools/animal-motion-review.mjs
node tools/hen-rendered-caps.mjs
```

The capture tool accepts `--no-video` and `--animal=hen` (or another catalog ID).

## Hostile visual review

Independent review has cleared horse, bull, cow, rabbit, skunk, sheep, donkey and foreman repairs at **9/10 each**, plus **9/10** for the hen's unarmed leg-junction repair. These scores apply to the actual localized visuals in carry, crouch/aim, recoil, front/side/rear and gameplay views, rather than merely the diagnostic packet.

Architect approval of the revised motion transfers and publication remain pending. The hen's weapon-handling limitation remains explicit.
