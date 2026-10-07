# Hand grenade and horse throwing study

## Review state

2026-10-07 — hostile subagent review **9/10**, approved as a horse motion study.
The previous workshop contained a small grenade model and carry pose, but no
dedicated throw. This branch replaces that prop with a painted **820-triangle,
five-mesh** model and adds a deterministic, scrubbable throwing study.

Open `tactics/grenade-throw-study.html`. The Study menu switches between the
animation, six keyframes, and the model beside the approved inventory drawing.
Side, front, rear, three-quarter and draggable views are available. Gameplay
inspection uses 130 CSS pixels per tile; model and horse dimensions are unchanged.
The weapon workshop also links to the study and uses the replacement grenade.

## Completed

- [x] Separate grenade prop with grip/release anchors and a painted surface.
- [x] Native horse preparation, rear-leg loading, forward step, release,
  follow-through and recovery.
- [x] Lateral pelvis transfer before each hoof lifts; forward hoof planted before
  the throwing stroke. Fixed bone lengths and skinned soles checked throughout.
- [x] Hand contact until release at **1.90 s**. Projectile position, linear
  velocity and spin continue from the held prop without a release teleport.
- [x] Gravity-driven flight, contact with the actual rotating prop surface,
  dissipative bounce, decelerating ground skid, rest within the five-tile target.
- [x] Reverse seeking/restart and resource cleanup; no accumulated simulation.
- [x] Packaged study/modules/texture and import closure; existing workshop,
  carry, stow/draw, fire and roof-mantle equipment regression checks.

## Validation

**223 tests pass**, including eight new throw tests and the related weapon,
horse mesh, equipment stow/draw, fire roster and roof-mantle weapon tests.
`tools/check-grenade-study.mjs` checks **36 browser configurations**, **363 seek
samples**, controls and stable GPU resource counts. No browser errors. The
reviewer independently checked all eleven supported mammal carry rigs and
verified explicit disposal clears tracked GPU geometries/textures.

`npm run build:tactics-3d` succeeds. Review images and browser report are in
`docs/tactics/hybrid-review/grenade-throw/`.

Commands:

```text
node --test tests/grenade-throw.test.mjs tests/weapon-models.test.mjs tests/horse-light.test.mjs tests/roof-mantle-weapons.test.mjs tests/painted-fire-roster.test.mjs tests/equipment-stow.test.mjs tests/equipment-draw.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-grenade-study.mjs
```

The browser checker requires `PLAYWRIGHT_PATH` pointing to an installed
Playwright package and a preview on port 4476 (or a URL argument).

## Integration and next passes

- [ ] Fit the throw to the other animals and outfits, with a separate hen pass.
- [ ] Add gameplay target/range/facing/obstruction handling. This proof aims at
  one flat-ground target; it is not a general projectile collision solver.
- [ ] Connect throw events to inventory/ammunition/AP spending and the existing
  grenade effect. No rules or gameplay attack implementation changed here.
- [ ] Add detonation and damage timing in gameplay; this viewer ends at landing.
- [ ] Optional close-up polish: brighter wear on the lever and the small rear
  sleeve/cuff seam. These were nonblocking at the scoped 9/10 review.

`createGrenadeThrow(worker, grenade)` operates on the horse rig in local +X
space and owns the study's bind-pose/foot-weight adjustments. It exposes `at(t)`,
`projectile(t)`, `impacts`, and `dispose()`. Dispose restores its foot weights;
the caller owns the character, grenade and textures. It does not restore an
arbitrary gameplay pose, choose a route, or handle world collisions.

## Texture provenance and preview lifetime

`dist/assets/equipment/painted-ui/grenade-surface.png` was generated with the
built-in imagegen skill for this task: a flat, tileable olive painted-metal
swatch with angular brushwork, warm ochre highlights and restrained wear.
The existing `grenade.png` drawing remains the visual reference. The skin is
mapped onto casing facets and reused as a desaturated brush layer on metal.

The read-only preview is `node tools/serve-grenade-study.mjs 4476`. It records
its PID/start/expiry and stop receipt under ignored `artifacts/grenade-throw/`,
honors that directory's `STOP` file, and self-stops after 24 hours. The retained
preview is registered with the workspace helper-lifecycle utility. Deliberate
restarts require fresh registration for the new process lifetime. Temporary
review browsers close through their owning Playwright server in `finally`.
