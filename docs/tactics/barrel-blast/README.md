# Exploding barrel animation study

The barrel uses the approved flamethrower-tank blast: the same painted fireball, smoke, timing and supplied ground-fire cells. The study is now connected to accepted explosive-barrel events on the builder branch; see [the live integration and review reconciliation](../EXPLOSIVE-BARRELS.md). Canonical publication remains pending architect review.

Open `tactics/barrel-blast-study.html`, also linked from the art gallery. The viewer supports the existing oxide-red, blue, ochre and cream finishes, upright or lying on their side, four camera angles, gameplay scale, orbiting, reversible scrubbing, and an effects toggle for inspecting debris.

## Presentation

- The existing cargo drum remains intact until the same 0.55-second rupture used by the tank study.
- Six irregular shell panels, the lid and the base separate at their actual positions. These are partitioned triangles from the original painted model, including its hoops and bungs; their materials and dimensions are retained.
- Fragments follow gravity and angular motion. Their actual surfaces determine first floor contact, followed by a short settling motion. Cosmetic fragments and their shadows fade together; no intact duplicate remains.
- The blast starts at the drum center. Its fireball, outward lobes, smoke and ground fire share `painted-blast-effects.js` with the tank study. The original tank entry point remains compatible and retains its smaller tank fragments.
- Ground fire uses the recorded tank-event fixture: 81 cells on open ground, 66 in the water-exclusion case. This follows the user's instruction that barrel explosions use the same behavior. The viewer neither applies damage nor creates inventory or collision objects.
- A dark scorch remains after the preview fire and scrap fade. As with the tank study, the ground fire's lifetime is compressed for the loop; gameplay must retain its existing turn-based fire duration.

## Integration handoff

Use the existing tank blast behavior when a designated explosive barrel detonates. Connect one presentation receipt to that accepted event; do not apply damage again from an animation callback or infer an explosion merely because any decorative barrel disappeared.

The study is at the local origin on a flat surface. Gameplay integration must supply the actual barrel position/orientation, accepted fire cells, visibility, floor height and interruption/save behavior. Obstructed terrain, upper floors, nearby characters and chain reactions need their existing authoritative rules and separate integration checks. The viewer's debris and scorch are cosmetic; they do not imply new blocking scenery or loot.

`createBarrelBlastMotion()` owns its fragment geometry and cloned materials while borrowing the cargo library's intact drum. Dispose the motion before its library. Optional `label`, world `position`, `yaw` and `surfaceAt` arguments support live red-labelled drums, roofs and cliffs; omitted options retain the original study behavior. Shader callbacks survive material cloning, and live fog masking covers the fragments and their shadows. `createPaintedBlastEffects()` owns its cards and masks; supplied textures remain borrowed. Barrel playback uses `fragmentCount: 0` because it supplies its own drum-sized debris.

## Validation

`tests/barrel-blast.test.mjs` covers all eight finish/placement combinations, conservation of the original mesh, grounded and deterministic debris, reverse playback, resource ownership, and matching tank fire cells/effects. Existing tank and cargo regressions are retained. The Pages build validates the new viewer's complete module graph, including the extracted shared blast module.

Run:

```text
node --test tests/barrel-blast.test.mjs tests/tank-blast.test.mjs tests/painted-cargo.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-assets.mjs
```

Review the intact drum, initial rupture, falling debris with effects disabled, full blast, water boundary and aftermath. Scrub backward to confirm the complete drum returns. The viewer starts paused for reduced-motion preferences and reports missing assets instead of leaving a silent blank scene.

Review completed: all 32 focused tests passed, including the existing tank/cargo regressions and Pages missing-module checks. Browser inspection covered all four finishes, upright and sideways breakup, the water exclusion, reverse playback, ground contact and the final scorch without leftover barrel shadows. No browser warnings or errors were reported. The overhead camera retains a tilt so the vertical flame cards stay readable.
