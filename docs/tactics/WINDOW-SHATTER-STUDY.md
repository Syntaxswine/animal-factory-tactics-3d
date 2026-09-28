# Window shattering study

2026-09-28 · feature branch `work/window-shatter` · based on 3D main `f694104`

The three canonical wall windows now have a reusable glass-breaking animation:
`window-brick`, `window-concrete`, and `window-corrugated`. The study is
`tactics/window-shatter-study.html`. It supports individual windows or the whole
set, front/back bursts, four views, close/gameplay scale, slow motion, silent
scrubbing, and sound on the Smash button.

The user requires **all glass to fall to the ground**, leaving an unobstructed
opening for a later jump-through animation. No jagged remnants or mullions remain
across the opening. The surrounding wall and narrow perimeter frame stay intact.

## Animation

- Replace the pane with 70 deterministic triangular fragments at impact.
- Eject fragments clear of the wall thickness over 0.10 seconds.
- Tumble and fall under gravity, with varied outward and sideways scatter.
- Give each shard a small ground bounce, then settle it flat on the floor.
- Retain the fallen glass until reset or disposal. The timeline ends at 2.2 seconds.

Fragment triangles partition the whole pane; they are not a particle substitute
that leaves the original glass visible. One dynamic mesh renders all fragments
per window. Ground contact moves whole triangles rather than deforming vertices.
This is a deterministic presentation effect, not a rigid-body simulation.

## Integration contract

`createWindowShatter({kind, seed, direction})` returns `group`, `sample(time)`,
`dispose()`, and diagnostics. `direction` is +1 or -1 along local Z.

- `sample(-1)` restores intact glass; `sample(0)` starts the fracture.
- `sample(elapsedSeconds)` is seekable, repeatable, and independent of frame rate.
- The local floor is Y=0, window center is X=0/Z=0, and local X spans the pane.
- Canonical wall height 2, thickness .16, and aperture .85–1.55 remain unchanged.
  A .025 perimeter frame leaves a .95 by .65 glass pane.
- Translate/rotate the root group to the saved edge. For a south edge the center
  is `[x, floorHeight, y+.5]`. For an east edge use `[x+.5, floorHeight, y]` and
  rotate Y by π/2 (positive local Z then points east).
- This version expects a flat receiving floor on the burst side at local Y=0.
  Upper-storey drops, nearby solid props, slopes, and differing floor heights
  require a receiving-surface adapter before gameplay use.
- Dispose on map unload; rebuilding restores intact glass unless the caller
  reapplies its saved broken-window state.

**Gameplay integration remains pending.** No damage, collision, movement,
visibility, jump action, or save rules were changed. Current gameplay windows
are empty apertures in the renderer; this study does not silently add blocking
glass to them. The future integration must own broken state, trigger the sound
once per break, restore broken state after loading, and authorize the jump.
Guard-tower lookout apertures and vehicle glazing are separate props, not the
three wall-window types represented here.

## Sound

`assets/audio/glass-breaking-cc0.wav` is **Glass Break** by Till Behrend, submitted
by TinyWorlds with the author's permission. The original recording is unchanged.
Source: https://opengameart.org/content/glass-break
License: https://creativecommons.org/publicdomain/zero/1.0/
The shipped `GLASS-BREAK-LICENSE.md` records provenance and the legal-code link.

Audio only starts from the Smash button, at .65 volume; scrubbing is silent.
Pause, reset, changing windows, hiding the tab, and muting stop playback.
Audio failure leaves visual playback usable. The comparison plays one sound
when smashing all three windows to avoid stacking identical recordings.

## Validation and hostile review

- **12 focused tests pass**: canonical inventory, pane partition/area, seed
  repeatability, visibility swap, sampled wall/floor clearance, final flat shards,
  mirrored bursts, rigid triangle shape, rewind, settle, invalid time/type, disposal.
- Packaged viewer: **64 configurations / 448 sampled states**, plus 20 rebuild
  cycles without increasing retained geometry count. No browser/module/asset errors.
- WAV decodes as stereo, approximately 1.31 seconds. Button playback succeeds.
- `npm run build:tactics-3d` passes and includes the viewer, effect, audio, license,
  and module-closure validation.
- Independent hostile review: **9/10**, after replacing a straight debris strip
  with varied depth scatter. Approval is for the animation study.

Reproduce with `node --test tests/window-shatter.test.mjs` and
`npm run build:tactics-3d`, then run `node tools/window-shatter-review.mjs` with
`PLAYWRIGHT_PATH` pointing to an installed Playwright package. The browser check
serves `.pages-output` itself; `REVIEW_ROOT=dist` can instead check source assets.
Screenshots and reports go to uncommitted `artifacts/window-shatter/`.
