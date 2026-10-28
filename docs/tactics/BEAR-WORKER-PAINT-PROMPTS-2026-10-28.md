# Bear painting provenance

All raster artwork was generated with the built-in ImageGen tool, using the imagegen skill, on 28 October 2026. The existing horse worker and Red Hat uniform were style references. Existing assets were not overwritten.

## Concept

Output: `dist/assets/characters/model-references/bear-worker-turnaround-v1.png`.

Reference: `horse-worker-model-paint-v1.png`, for style and costume only. Create four orthographic views of a broad brown bear worker with rounded ears, a short broad tan muzzle, dark nose, plantigrade paws, short tail, cream rolled-sleeve shirt, olive overalls, red neckerchief and dark gloves. Preserve the game's crisp angular painterly finish. Front, right-facing profile, back and left-facing profile on grey; no weapons, hats or text. This is a concept reference, not a registered texture.

## Registered regular outfit

Output: `dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png`.

Edit target: `docs/tactics/review-images/bear/neutral-paint-reference.png`, rendered from the stored author sculpt with `BEAR_PAINT_FRAME`. Supporting style reference: the bear concept above. The generated 1774 × 887 output uses the same normalized 2:1 projection layout as the 2048 × 1024 input.

Prompt:

Use case: style-transfer. Image 1 is the exact neutral four-view 3D BEAR mesh registration sheet and is the EDIT TARGET. Image 2 is only a painterly bear character/costume reference. PAINT IMAGE 1, preserving its 2:1 aspect, all four figure centers, margins, baseline, poses, silhouettes, body dimensions and every head/ear/eye/nose/hand/foot location exactly. Do not copy the framing or dimensions of Image 2. Apply the bright crisp painterly Animal Factory Tactics game finish: warm dark-brown bear fur with restrained chestnut brush highlights, lighter tan short broad muzzle, dark charcoal nose, one small alert amber-brown eye in each actual eye socket under the existing brow (both in front, only one in each profile), dark ear interiors, cream work shirt and rolled cuffs, olive bib overalls with painted seams/pockets/brass strap buttons, a small red neckerchief at the neckline, dark work gloves, brown furry plantigrade paws with small dark painted claws. Paint underside and side-facing forms as well as visible front planes, with coherent garment construction across all four views. Sharply grouped broad strokes and readable illustrated folds matching the reference, no photorealistic pores, no busy procedural noise, no shiny plastic. All anatomy comes from Image 1; do not enlarge the head or limbs, straighten the arms, add hair polygons, move the eyes or change the feet. Keep the same uniform solid mid-grey background. No hat (a separate 3D attachment), no weapon, no text, no labels, no shadows outside the silhouettes, no cast floor shadow. Surface painting only.

## Registered Red Hat outfit

Output: `dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png`.

Edit target: the registered regular outfit. Supporting clothing reference: `red-hat-uniform-paint-v1.png`. The existing painted service cap is separately fitted to the bear's head; it is not painted into the body sheet.

Prompt:

Use case: precise-object-edit. Image 1 is the precisely registered four-view brown BEAR texture sheet: edit THIS sheet, preserving its exact 2:1 aspect, neutral grey background, figure positions, scale, silhouettes, limb poses and all anatomical landmarks. Image 2 is a clothing/style reference for the Red Hat faction. Change ONLY the bear's clothing to this faction: olive military work shirt with rolled olive cuffs, two small distinct flap breast pockets and brass buttons, brown leather shoulder braces and belt with brass buckle, warm brown trousers, bright red cloth armbands on BOTH upper sleeves, and the existing small red neckerchief. Paint seams, wear, soft dirt and angular brush highlights matching the game style; retain crisp readable folds. Remove cream shirt and olive bib-overall coloration, adapting the uniform to the exact current garment surfaces. Keep all bear fur, rounded ears, eyes, tan muzzle, nose, face, dark work gloves, paws and short tail identical in placement, markings and colors. No hats: the peaked Red Hat is a separate 3D attachment. No weapon, no logos, no text, no labels, no new equipment, no changed dimensions, no moved figures, no enlarged anatomy. All four views must depict the same uniform consistently. The original paint registration is essential.
