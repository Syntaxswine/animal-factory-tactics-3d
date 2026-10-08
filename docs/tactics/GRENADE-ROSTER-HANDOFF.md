# Grenade throw: all-character study

2026-10-08. Extends Claude's horse revision `db9cd0e`, approved at `fc1573e`,
on `work/grenade-throw`. **Hostile subagent review: 9/10, approved as a study.**

The viewer now covers horse, goat, bull, cow, donkey, sheep, skunk, pig foreman,
pig director, rabbit, dog and hen. Each has Original and Red Hat outfits; the
donkey also has the guide outfit: **25 combinations**.

Open `tactics/grenade-throw-study.html`. Animal and Outfit selectors retain the
timeline, keyframe board, grenade/reference comparison, orbit controls and
130-pixel-per-tile gameplay view. Links accept `animal`, `outfit`, `view`,
`scale`, `mode`, `time` and `paused` query parameters.

## Lessons carried forward

- [x] Turn side-on and load before striding. Hips lead the chest, then the
  throwing arm. Release stays at 1.92 seconds in the 4.6-second clip.
- [x] Keep the lead sole planted through release; let the rear foot pivot on
  its actual supporting surface, then step back into a relaxed neutral pose.
- [x] Recalculate balance from each native rig, its supporting sole geometry
  and approximate segment masses. Preserve character scale and bone lengths.
- [x] Keep position, velocity and spin continuous from the hand into flight.
  The pulled ring, safety lever and casing fall and settle separately.
- [x] Fit the preparation to the pigs' wider bodies and shorter legs. The
  director's trouser rise follows the pelvis, with brown cloth registered on
  the newly exposed surface instead of waistcoat paint.
- [x] Raise the skunk's backswing and move its elbow forward enough for the
  entire forearm to clear the plume, not just the grenade.
- [x] Give the hen a feather-cup grip and toss, using her native wings, legs
  and dimensions. Added invisible control bones deform the existing feather
  mesh; no mammalian hands or general firearm handling are introduced. Wing
  undersides and the turning apron receive a local paint/weight correction.
- [x] Restore temporary skin weights and hen rig changes on disposal. Outfit
  changes own and release their textures and superseded actors.

The 820-triangle painted grenade remains unchanged. These are animation and
study fits; the approved character source meshes and shared motion catalog are
unchanged.

## Balance correction discovered during review

A denser release audit caught an approximately 6 cm pressure excursion at
1.95 seconds in the inherited horse solver. Refining its time step from 10 ms
to 2.5 ms and using six balance passes removed that numerical defect. Horse
art curves, step targets and timing remain intact. A fixture from `fc1573e`
checks 24 approved poses within a 0.001 local-component tolerance; the measured
largest change before the species fitting pass was 0.000251.

For other species, pressure targets follow the actual soles rather than horse
coordinates. Wider bodies use adjusted relative torso masses; shorter legs
take shorter steps. A separate check reconstructs required pressure from the
posed bones and angular momentum. Its allowed distance beyond the supporting
sole hull is 0.016 tiles. This is an approximate flat-ground balance model,
not a full contact-force or biomechanical simulation.

## Verification

**57 final tests pass**, including the original 12 throw tests, 40 roster tests,
paint lifecycle checks and deployment/module-closure checks. Coverage includes
60 Hz playback, actual skinned soles, fixed bone lengths, release continuity,
gravity, target-tile landing, reverse seeking, restoration, the approved horse
fixture, casing/body clearance, visible hen grip and the full skunk forearm.

```text
node --test tests/grenade-roster.test.mjs tests/grenade-throw.test.mjs tests/animal-motion-paint-lifecycle.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-grenade-roster.mjs --packaged
node tools/check-grenade-study.mjs
```

The browser tools require `PLAYWRIGHT_PATH` pointing at an installed Playwright
package. `--packaged` serves the freshly built `.pages-output` through browser
request routing under an `/af3d/` prefix; it needs no additional server.

- Packaged roster: **25 combinations, 3,475 seek samples, no browser errors**.
  Rapidly superseded selections return to the same 17 geometries/7 textures.
- Original viewer regression: **36 configurations, 363 seek samples**, control
  checks and stable resource counts, with no browser errors.
- Build and import closure pass. The new modules use the existing Pages file
  list rather than adding a duplicate packaging path.
- The reviewer independently ran **61 passing tests** across the throw,
  roster, weapon model and horse model suites before the last skunk regression
  was added. Fresh close-up captures, dense release-support sampling, force
  estimates and a 20 ms all-vertex arm/tail sweep supported the 9/10 rating.

Review evidence is in
[hybrid-review/grenade-roster](hybrid-review/grenade-roster/). The browser report
lists every animal/outfit. Selected keyframe boards include the broadest bodies,
hen, skunk and guide outfit. Independent diagnostic JSON files retain their
sampling results rather than claiming unsampled poses are collision-free.

## Remaining work

- [ ] Gameplay target, range, facing and world-space transforms.
- [ ] Terrain slopes, obstructions and general projectile collision handling.
- [ ] Inventory/AP spending, throw events, detonation and damage integration.
- [ ] Optional close-up polish: director collar seams and cloth compression;
  one roughly 2.3 mm free-hand/skull graze at 0.40-0.42 seconds. The reviewer
  judged these nonblocking for the study.

The fixed five-tile throw operates in local +X on flat ground and finishes at
landing. It does not make the new throws available to gameplay. Appearance-only
outfits share each species' physical profile; cap and clothing mass are not
separately simulated. The hen grip is a stylized animation convention.

## Ownership and preview

`createGrenadeActor` owns the actor's paint, cap, rig and grenade. The viewer owns
the shared atlas/prop surface. `createGrenadeThrow` accepts an `animal` option;
`createHenGrenadeThrow` supplies the hen adapter. Both retain deterministic
`at`, `projectile`, `ring`, `lever`, `palmAt` and disposal behavior. These adapters
restore their own neutral rig; they do not snapshot arbitrary gameplay poses.

The existing port 4476 preview remains available for review until
**2026-10-08 22:11:05 UTC (6:11 p.m. Eastern)**. Its original automatic shutdown
and helper-lifecycle registration remain in force. The stop marker is
`artifacts/grenade-throw/STOP`; the restart source is
`tools/serve-grenade-study.mjs`, and a restarted process needs fresh lifecycle
registration. Temporary review browsers closed through their owning API and
recorded exit receipts. No main-branch merge or public deployment is included.
