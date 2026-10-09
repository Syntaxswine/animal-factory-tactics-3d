# RPG projectile flight study

A fast, inexpensive RPG round now leaves the existing launcher, trails painted smoke, and hands off to the approved four-tile RPG blast on arrival. The projectile is **136 triangles**: a pointed olive head, narrow dark booster and four simple fins. The smoke and short motor flare reuse the existing painted fire atlases.

This delivery is a **standalone presentation study and reusable effect** on `work/rpg-flight`, based on `fe4af77`. Battle timing, damage, ammunition, visibility rules and character firing animation are unchanged.

## Review

- [x] Native launcher/horse dimensions and an uninterrupted forward release from the loaded warhead tip.
- [x] Distance-based flight: 8 / 16 / 28 tiles take 0.25 / 0.50 / 0.875 seconds at full speed.
- [x] Smoke is born behind the booster, stays where it was emitted, rises slightly and fades over 0.58 seconds. It continues after impact rather than disappearing with the round.
- [x] Painted variation, small motor flare and launch puff, with a fixed pool of at most 72 smoke cards.
- [x] The existing RPG explosion starts at arrival, with its existing four-tile radius.
- [x] Whole-flight framing includes the entire launch/impact envelope, including overhead and long-range views.
- [x] Gameplay scale, quarter-speed inspection, scrubbing, keyframes, smoke toggle and orbit controls.
- [x] Reduced-motion preference opens a static, dim impact preview and disables automatic playback.
- [x] Deterministic rewinds, dropped-frame timing, finite vertical/zero-length paths, resource reuse, failed-load cleanup and teardown during pending paint loads.
- [x] Independent hostile subagent review: **9/10** for this scope. Minor optional polish: fresh smoke has a regular bead rhythm in paused side views; it reads adequately at full speed.

Open `tactics/rpg-flight-study.html`. The horse and target board are scale references, not new firing or target-destruction animations. The link in the explosion study also opens this flight study.

## Reusable API

`rpg-flight.js` exports `createRPGFlight(origin, impact, {speed})`, `sampleRPGFlight(flight, time)`, `rpgSmokeSamples(flight, time)` and `createRPGProjectile()`. Endpoints are native Three.js coordinates: **X/Z ground, Y height**. Inputs are cloned. Negative time is pre-launch; arrival is `flight.duration`; `blastAge` is `time - flight.duration`. Zero-distance paths have no moving projectile or smoke.

`rpg-flight-effects.js` exports `createRPGFlightEffects(scene)`. Call `setTextures({smoke, flame})`, then `update(time, {flight, camera, smokeEnabled, reduced, visible})`. The supplied textures are **borrowed**; the effect releases only its own geometry and materials. `hide()` and idempotent `dispose()` clear the effect. The `visible` flag is a whole-effect suppression switch, **not** per-fragment fog clipping.

The study uses a straight resolved path. This module does not trace hits, home toward targets, simulate gravity, or apply gameplay damage. Any future adapter must pass the actual resolved path/impact rather than invent a new hit location.

## Gameplay integration still required

The existing launched attack resolves scenery and damage synchronously, before its queued visual presentation. Adding a travel delay only to the flash would expose those results before the round arrives. Do not wire this in as a cosmetic delay alone.

- [ ] Capture event-owned **pre-impact** scenery and affected element identities. Existing `blast.cover` is surviving cover after detonation and cannot reconstruct the wall/site before the rocket arrives.
- [ ] Hold visible destruction and casualties until arrival; coordinate the impact with the queued discharge time, fire, tank/barrel chains and other dependent effects.
- [ ] Convert endpoint heights into native scene units once. Preserve the logical visibility floor separately, especially for roofs, cliffs, ramps and native-height towers.
- [ ] Clip the moving round and individual smoke/exhaust fragments to **current** visibility on their actual floor, including billboard edges and cover. A hidden muzzle must not suppress a later visible part of the path or reveal hidden trail portions.
- [ ] Check actual committed attacks, hidden launchers, interrupted/cancelled queues, elevated surfaces, destruction and chain reactions before gameplay approval.

## Verification and evidence

```text
node --test tests/rpg-flight.test.mjs tests/grenade-blast.test.mjs tests/launched-blast.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/check-rpg-flight.mjs
```

The browser checker uses `PLAYWRIGHT_PATH` and optionally `RPG_FLIGHT_REVIEW_URL`. It runs against the existing preview, closes its owned browser in `finally`, and stores process identities and close receipts under `artifacts/rpg-flight/helpers/`.

October 9 results: **26 focused/build tests passed**; **36 browser configurations (288 keyed states)** passed, plus full/quarter-speed dropped-frame timing, loaded-warhead restoration, smoke controls, reduced-motion startup, repeated range changes, failed texture loading and cancellation during paint loading. No main-page console errors. Warm GPU counts stayed at 38 geometries / 9 textures. The independent review also checked 72 keyed states and full-speed playback. All test browsers closed with exit code 0.

Selected renders and reports are in `hybrid-review/rpg-flight/`. The distribution build packages this study and verifies its module dependency graph.

## Local preview lifetime

The existing, registered read-only preview on **port 4476** is reused without extending its deadline. It stops automatically on **October 9, 2026 at 22:30 UTC / 6:30 p.m. Eastern**. It can also stop through `artifacts/grenade-blast/server/STOP`; its source, exact process identity, restart instructions and deadline remain in that server directory and the shared helper-lifecycle registry. Restart deliberately with `node tools/serve-grenade-blast-study.mjs 4476`, then register the new process lifetime.

The feature branch does not deploy. The Pages workflow publishes `main`; integrating/publishing this study remains a separate action.
