# Worn tank explosion

The standing worn-pack study from animation commit `c2c78e9` is integrated into gameplay on `work/editor-3d`. See [live behavior, coverage and checks](../LIVE-FIRE-INTEGRATION.md#worn-tank-rupture-integration).

Open `tactics/tank-blast-study.html` from the art gallery to inspect all eleven armed mammals in normal and Red Hat outfits. The hen and Hawaiian guide remain unarmed. Character and weapon dimensions are unchanged.

## Study sequence

| Study time | Presentation |
| --- | --- |
| 0-0.55 seconds | The actual cylinders, hose and projector remain equipped. |
| 0.55 seconds | A painted flash starts at the measured cylinder midpoint; destroyed equipment disappears. |
| 0.55-1.2 seconds | Fireball lobes expand, curved shell fragments fall and the wearer releases the grips. |
| 1.2-1.75 seconds | Knees buckle into a supported collapse on the source tile; black smoke rises. |
| About 1.75-2.3 seconds | The body and sunlight shadow dissolve together into ash. |
| Through 5.4 seconds | Study fire and smoke fade for the preview loop. |

In gameplay, rupture is synchronized to the incoming attack's discharge. Ground flames persist for the rules' three turns; they do not inherit the study's short preview fade. Damage, inventory and loot are committed once by the game, independently of animation.

The [painted burst atlas prompt](PROMPT.md) records the art direction. Existing flame, smoke and ash textures are reused. Fourteen outward lobes and ten smoke cards give the burst depth, with eight cosmetic shell fragments. Reverse seeking restores equipment and the complete character in the isolated viewer.

The fixture at `dist/tactics/fixtures/tank-blast-contract.json` captures real `attack()` results and their source-engine hash. Regenerate it with `node tools/capture-tank-contract.mjs CHECKOUT`; the tool reads the named checkout without editing it. Open-ground and water fixtures contain 81 and 66 fire cells respectively. Live playback uses the actual encounter's cells, not these canned fixtures.

The original study was limited to a standing character on flat ground at the origin. The live adapter supplies world transforms, elevated support, event timing, visibility, save persistence, nearby casualty outcomes and interruption cleanup. The detailed body motion remains standing-only; unsupported postures retain the normal casualty presentation.

## Approved study evidence

- **16 tank tests**: all 11 mammals, worn origin, equipment destruction, fixed feet, grounded collapse, no duplicate loot, reversible playback, grip continuity, exact fire mask, fragment contact and partial-load cleanup.
- **85 existing fire/lifecycle tests** and **40 related motion/paint/outfit tests** passed: **141 total**.
- **352 browser configurations** across 22 wearers, two ground fixtures, four views and two scales. Twelve forward/reverse timestamps per configuration; no errors. Five identical reload cycles had stable GPU resource counts.
- Targeted final polish checks: close rupture and late breakup renders, exact GPU comparison of a fully dissolved actor against a hidden actor, reduced-motion startup and unavailable-contract reporting. See [review evidence](REVIEW.md).
- Asset validation and the 3D packaging build passed. The package includes the viewer, modules, fixture and atlas.

The independent hostile review passed **9/10** for this bounded study. Its scope and evidence are in [REVIEW.md](REVIEW.md).

The [looping horse GIF](evidence/tank-blast-study.gif) preserves the original study preview. The shared `painted-blast-effects.js` now serves that study, the barrel study and live gameplay; tank callers retain their compatibility entry point and world/floor/visibility/texture options.
