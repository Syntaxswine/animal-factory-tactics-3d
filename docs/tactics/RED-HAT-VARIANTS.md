# Red Hat character outfit study

The twelve-character motion viewer now has an **Outfit** selector. Choose **Red Hats** for eleven new faction variants; the pig foreman retains his existing Red Hat uniform. Original outfits remain selectable. A direct link is `tactics/animal-motion.html?animal=horse&outfit=red-hats`.

The new variants are horse, goat, bull, cow, donkey, sheep, skunk, pig director, rabbit, dog, and hen. Existing Red Hat sprites establish the olive shirts, brown trousers, leather braces, brass fittings, red armbands, and red peaked caps. The hen adapts this clothing to feathered wings and an apron. She remains unarmed.

## Assets and attachment

The approved reduced body meshes and their dimensions remain unchanged. A fitted 700-triangle cap attaches rigidly to each head bone; the UI reports the combined body-and-cap triangle count. Each species has its own cap placement. The hen's crown has a central rear recess for her comb while the front band sits against the forehead. Foreman's original cap remains part of his existing mesh.

Nine mammals share a registered horse uniform painting on garment surfaces. Their original facial, fur, and species detail layers remain in use. The broader director and the hen have individual registered uniform paintings. Hidden garment panels, sleeve rolls, neckline residue, and apron edges have bounded source footprints to prevent gloves, feathers, or old pale cloth from appearing on the wrong surface during aiming or crouching.

Files are `red-hat-model.js`, `red-hat-uniform.js`, and `red-hat-tailored-paint.js`. `animal-motion-paint.js` selects the appropriate painting. No gameplay roster, tactical rules, original character data, or standalone character viewer was replaced.

## Validation

Evidence is under `hybrid-review/red-hat-motion/`: front, side, three-quarter, rear, and native-size sheets; close and native motion videos; browser pose report; outfit-switch lifecycle report. Gameplay scale remains **58 CSS pixels per world unit**, with 300 for close inspection.

The browser harness checks all twelve characters across heading, elevation, timing, and viewing scale (2,992 sampled poses). It checks cap attachment and triangle counts, weapon contacts, muzzle/flash/trace alignment, and the hen's unarmed limits. The lifecycle harness exercises 96 cap poses per equipped species and checks exact original-outfit pixel restoration and stable GPU resource counts after removal. Firing effects are warmed before resource comparison to avoid mistaking their first upload for a leak.

All **504 automated tests passed**, and the 3D distribution build passed. All **2,992 Red Hat browser samples passed** without browser errors, and the outfit restoration/resource checks passed for all twelve characters.

Visual review is separate from these mechanical checks. All **eleven new variants reached the required 9/10 hostile-review threshold** after corrections. See `hybrid-review/red-hat-motion/HOSTILE-REVIEW.md`. The director's hidden hip panel remains a little softer than the surrounding folds, and the hen's rear tie is simpler than the front uniform. Original-outfit findings in the viewer refer to the earlier motion study, not this new outfit work.

This remains a character presentation study. Integration and publication to the separate 3D project require the architect's review; the review branch does not deploy automatically.

## Painting provenance

Generated with the built-in image tool, using the imagegen skill, September 21, 2026. All three selected outputs are stored in `dist/assets/characters/lowpoly-proof/`. Existing assets were not overwritten. The generated faces are not substituted for the approved species facial paintings.

### Shared mammal uniform

Output: `red-hat-uniform-paint-v1.png` (1774 × 887).

References: `horse-worker-model-paint-v1.png` as the registration target and `red-hats/horse-idle.png` as faction clothing reference.

Prompt: Edit the precisely aligned four-view model texture turnaround, changing only clothing from cream shirt and olive bib overalls to a bright hand-painted olive military collared shirt with center placket, two flap chest pockets/brass buttons, brown leather suspenders, brown trousers, belt/square brass buckle, vivid red armbands on both sleeves, and rolled olive sleeves. Keep the small red neckerchief. Preserve exact aspect, placement, silhouettes, dimensions, A-pose, head, face, ears, mane, fur, hands, exposed hooves, and grey background. No hats (separate 3D), weapons, or text. Preserve shoulder/elbow/waist/knee/cuff registration. Bright high-contrast graphic painting and sharp seams; no muddy gradients or photorealism.

### Pig director uniform

Output: `pig-director-red-hat-paint-v1.png` (1774 × 887).

Reference: `pig-director-model-paint-v1.png`.

Prompt: Edit the exact registered four-view pig director texture sheet. Preserve 1774 × 887 aspect, precise placement of all four figures, silhouette, anatomy, expression, skin, ears, hands, shoes, and grey background. Repaint only garments into an olive military shirt/jacket with rolled sleeves and olive collar to the neckline, two distinct small flap chest pockets with brass buttons, dark brown leather suspenders and belt, warm brown trousers, and rich red cloth armbands with angular highlights and creases. Replace all burgundy waistcoat and cream shirt, including the rear collar. Remove the watch chain. Follow existing garment shapes and folds exactly; preserve the plump belly and outline. Sharp painterly facets and readable shapes; no camouflage, stripes, flat patches, hat, weapon, text, new accessories, or altered pose.

### Hen uniform

Output: `hen-red-hat-paint-v1.png` (1774 × 887).

Reference: `hen-model-paint-v1.png`.

Prompt: Edit the exact registered four-view hen turnaround. Preserve aspect, figure positions, scale, silhouette, poses, head, face, comb, wattles, feather colors, lower wing feathers, tail fan, scaly legs/toes, and grey background. Repaint clothing into an olive upper waistcoat with center placket/brass buttons and two small separate flap chest pockets, dark brown leather shoulder straps and waist belt. Replace the cream apron and tie with warm brown cloth and angular painted folds and highlighted hem. Paint olive short sleeves and vivid red cloth armbands on the top third of each wing, with folds, highlights and edge creases, leaving lower feathers exposed. Preserve every silhouette; no new limbs, trousers, boots, hat, weapon, or text. Bright, crisp illustrated shading, no rubbery or flat rectangular fields. Pixel registration is essential.
