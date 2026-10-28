# Bull worker study

This character uses the approved `cow` turnaround and original cow sprites. The
study is called **Bull** in the viewer; the gameplay species roster is unchanged.
Open `tactics/bull-worker.html?mesh=10k` for the reduced model, or add
`&stage=grey` to inspect the form without paint.

## Construction

- Author: **29,572 triangles**. Reduced character: **9,998 triangles**.
- Largest reported reduction error: **0.00260 world units**, about **0.15 pixels**
  at native scale. This is a simplifier metric, not a guarantee of identical contours.

The stored authoring mesh is the actual source for the reduced mesh. The offline
field mesher constructs a broad bovine skull, integrated cheeks and muzzle,
short curved horns, hollow ears, cloven hooves and a hanging tail. The approved
worker garment construction is broadened around the ribcage while preserving
sleeve and hand bind positions. This follows the roughly 30k → 10k workflow.

Eight closed connected surfaces share the existing 17-bone worker skeleton.
The tail follows the pelvis; it has no independent animation. The independent
480-triangle rifle uses the existing attachment system. Hands retain the accepted
baseline and its known visual limitations.

Prototype standing height remains **1.65 world units**, including horns. Native
comparison uses the unchanged isometric camera and **58 CSS pixels/world unit**.
Neutral is compared with the cow idle sprite; carry with the cow rifle sprite.
The sprite retains its single illustrated view when inspecting other model angles.

## Painted skin and review

The built-in ImageGen tool painted the actual registered neutral mesh views using
the approved cow reference for identity and the bright illustrated finish. The
selected asset is
`dist/assets/characters/lowpoly-proof/bull-worker-model-paint-v2.png`.
The initial skin remains beside it as v1, the input to the localized correction.
Prompts are saved in `BULL-MODEL-PAINT-PROMPT.txt` and
`BULL-MODEL-PAINT-CORRECTION.txt`. The grey edit target is
`hybrid-review/bull-worker/neutral-paint-reference.png`.

This uses the existing rest-space projection material, not a finished UV atlas.
Species-specific eye ownership keeps the iris registered on the open eye surface.
The corrected side paintings provide plain pink shading; the frontal painting
supplies the two nostrils, feathered around the nasal pad. This avoids competing
nostrils and stretched fur at the muzzle join. Upper straps reuse their own front
paint. Reuse is shown blue in the coverage display, direct projection green, and
flat fallback magenta. Coverage percentages do not establish correct registration.

The grey stage scored **7.5 → 8.5 → 9/10** after localized corrections to eyes,
horn spread, ears and tail tuft. The painted stage reached **9/10** after the
review caught duplicated nostrils and a conspicuous muzzle transition. Fresh
front, both profiles, three-quarter, gameplay and ±30° views support the final gate.
Minor close-view projection transitions remain acceptable for this bounded study.

Validation: **26 focused tests passed**, plus **64 painted browser combinations**
and 64 grey combinations covering both resolutions, neutral/carry, eight headings
and both scales. No browser, shader or asset errors. Maximum classified fallback
was 0.96% close and 2.21% native; native antialiasing makes this classifier coarse.
Horse and goat shader regression views passed. The Pages distribution build passed.
Delivery is on `sprite-migration`; this does not publish the separate 3D project
or merge the graphics branch into canonical.

## Reproduction

Run `node tools/build-bull-worker.mjs` to rebuild both meshes. Run focused tests:

```
node --test tests/bull-worker.test.mjs tests/goat-worker.test.mjs tests/horse-light.test.mjs tests/horse-model-paint.test.mjs tests/weapon-models.test.mjs tests/weapon-grips.test.mjs
```

With the local server on port 4389 and Playwright available, run
`node tools/bull-worker-review.mjs --grey` for grey evidence and the registered
neutral paint target, and `node tools/bull-worker-review.mjs` for painted evidence.

Tests check closed connected topology, scale, horns and actual cloven hoof
geometry, normalized skin weights, neutral restoration, planted feet and hand
surfaces near rifle grips at intermediate headings. Browser checks cover both
resolutions, neutral/carry, eight headings and native/close scale.

This is a presentation study. Walking, aiming, firing, transitions, other weapon
poses and gameplay integration remain unproven for this character.


## Production follow-up — 28 October 2026

Both outfits, native portraits, equipment fitting, animation coverage, placement
and recruitment are covered by the [production completion delivery](BULL-RABBIT-DOG-INTEGRATION-2026-10-28.md).
The original scope and measurements above describe the earlier model delivery.
