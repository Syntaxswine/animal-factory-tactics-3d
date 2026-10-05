# Worn tank explosion study

October 4, 2026. A separate fatal-event presentation for a flamethrower fuel pack rupturing while still worn. The wearer reacts and collapses on the source tile while a painted blast spreads into surrounding ground fire and black smoke.

Open `tactics/tank-blast-study.html` from the study server or packaged gallery. Select any of the **11 armed mammals in either outfit: 22 combinations**. The hen and donkey guide retain their established unarmed roles and are not tank wearers. Character and weapon dimensions are unchanged.

The [looping horse GIF](evidence/tank-blast-study.gif) records the surrounding-blast view of `c2c78e9` at 960 × 540 and 20 sampled frames per second. Its 6.4-second loop includes short introductory and aftermath holds; the animation itself retains the study timing. The GIF is approximately 6.6 MB and was fully decoded and visually spot-checked after export.

The [skunk versus Red Hat pig GIF](evidence/skunk-vs-red-hat-pig.gif) stages the requested combined sequence: an original-outfit worker skunk fires at a Red Hat pig foreman carrying his own flamethrower, then the pig's worn tanks explode. The pig stands seven tiles away, with the skunk outside the recorded ground-fire footprint. The 1.10-second rupture follows visible flame contact. Both approved motions and their actual equipment are reused; this is an illustrative composition, not a captured game outcome or a new damage rule. The 960 × 540, seven-second loop is approximately 13.6 MB. Reproduce with `tools/capture-skunk-pig-fire.mjs STUDY_TACTICS_BASE_URL` (Playwright through `PLAYWRIGHT_PATH`), then `tools/encode-skunk-pig-gif.py` (Pillow).

## Sequence

| Study time | Presentation |
| --- | --- |
| 0–0.55 s | Actual twin fuel cylinders, hose and projector remain equipped. |
| 0.55 s | A bright painted flash starts at the measured midpoint of the worn cylinders. The destroyed equipment disappears; no intact duplicate drops. |
| 0.55–1.2 s | Irregular overlapping fireball lobes expand, curved tank fragments fall, and the wearer releases the grips into protective gestures. |
| 1.2–1.75 s | Knees buckle into the existing supported collapse. The wearer stays on the source tile. Thick black smoke rises. |
| Around 1.75–2.3 s | The body and its sunlight shadow break up together; the existing ash ending appears below it. |
| Through 5.4 s | Ground fire and smoke fade for a convenient preview loop. |

Surrounding-blast and wearer focus, four views, drag orbit, gameplay scale, water exclusion, effects-off inspection and reversible scrubbing are available. Reduced-motion preferences start paused.

## Art and motion

The [new four-frame painted burst atlas and generation prompt](PROMPT.md) supply the flash, orange fireball and soot shapes. Existing painted flame, black-smoke and ash textures are reused. Fourteen varied outward lobes and ten smoke cards provide depth without a dense sculpt. Ground flames overlap and fade inward at their boundary; their painted bases soften before reaching the floor.

The pack origin is measured while equipped and then frozen in world space. Eight small curved shell fragments follow gravity and stop when their actual geometry first meets the floor. They fade as cosmetic debris; they do not create inventory items. The wearer keeps the approved foot and hand support through an in-place collapse. Grip release, including finger curl, blends continuously across the rupture instant. Reverse seeking restores the weapon, hose and complete character.

The shared fire actor now applies the same bind-space breakup in its sunlight shadow depth material. Hats and body meshes share that behavior, equipment remains separate, and depth materials are restored/disposed with the actor.

## Game contract and integration limits

`dist/tactics/fixtures/tank-blast-contract.json` captures real `attack()` results from the incoming gameplay core, including the source SHA-256. Regenerate with `node tools/capture-tank-contract.mjs INCOMING_CHECKOUT`; the tool reads that checkout without editing it. It records **81 open-ground fire cells** and **66 cells with the water fixture**, together with the fatal wearer result and flamethrower removal.

The surrounding fire mask uses those supplied cells, not an art-defined damage radius. Open-ground and water cases are the two supplied fixtures. Their tile coordinates are translated into the study's local Three X/Z plane. This is a **standing, same-height study at the local origin**, not an adapter for arbitrary world coordinates, walls, upper floors or terrain heights.

The gameplay event removes the flamethrower and kills the wearer. The **ash ending remains a presentation proposal**: that event does not currently emit a separate ash outcome. The ground fire's actual lifetime is turn-based; its shorter preview fade must not replace authoritative gameplay persistence. Other affected characters should use their actual damage/burn outcomes, not automatically copy the wearer's fatal reaction.

Live event wiring, visibility, fog, interruptions, nearby casualties and authoritative ash/loot ownership remain integration work. This study changes no combat rules or gameplay checkout.

## Validation and handoff

- **16 tank tests**: all 11 mammals, worn origin, equipment destruction, fixed feet, grounded collapse, no duplicate loot, reversible playback, grip continuity, exact fire mask, fragment contact and partial-load cleanup.
- **85 existing fire/lifecycle tests** and **40 related motion/paint/outfit tests** passed: **141 total**.
- **352 browser configurations** across 22 wearers, two ground fixtures, four views and two scales. Twelve forward/reverse timestamps per configuration; no errors. Five identical reload cycles had stable GPU resource counts.
- Targeted final polish checks: close rupture and late breakup renders, exact GPU comparison of a fully dissolved actor against a hidden actor, reduced-motion startup and unavailable-contract reporting. See [review evidence](REVIEW.md).
- Asset validation and the 3D packaging build passed. The package includes the viewer, modules, fixture and atlas.

The independent hostile review passed **9/10** for this bounded study. Its scope and evidence are in [REVIEW.md](REVIEW.md).

- [x] Worn rupture and surrounding painterly explosion.
- [x] Fit all 22 supported wearer/outfit variants.
- [x] Preserve actual fire-cell exclusions and weapon destruction.
- [x] Supported collapse, shadow breakup, reversible playback and resource cleanup.
- [x] Independent hostile review at least 9/10.
- [ ] Agree on the authoritative ash/casualty endpoint and ground-fire persistence.
- [ ] Wire the real event, transforms, visibility and interrupts in gameplay.
- [ ] Exercise nearby victims and elevated/obstructed cases in the integrated game.
