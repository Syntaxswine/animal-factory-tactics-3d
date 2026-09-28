# Roof and cliff descent study

Open `tactics/ledge-descent-study.html`, or add `?surface=cliff` to start at the cliff. This standalone prototype covers the horse worker with its rifle in the Original and Red Hat outfits. It does not change gameplay traversal or claim support for the other animal rigs or weapons.

The movement starts on top of the ledge: stow the rifle, crouch, place the character's left hand on the edge, then hop down while retaining that contact. Release, land, and return to ready complete the descent. This is a dedicated descent sequence rather than reverse playback of the climb.

Both surfaces use the existing mantle study geometry: the lip is at `x=0, y=2`, the raised surface extends toward positive x, and the landing plane is at `y=0`. The roof occupies `x=0..3`. The cliff uses `createCliffMantleSurface()` so the same motion can be compared against the established grass-and-rock tile kit.

Use the four camera views, Full descent / Close / Gameplay scales, grey form, and contact guides to inspect the motion. The timeline scrubs in either direction; each phase button seeks to its phase midpoint. Play runs the complete sequence and stops at its end. Surface and outfit selections are preserved in the URL.

The browser inspection API is `window.ledgeDescentStudy`: `ready`, `seek(normalizedProgress)`, `render()`, `motion`, `worker`, `profile`, `result`, `surface`, `scene`, `camera`, and `renderer`. The current result exposes the controller's phase, root, and contacts. The viewer uses `createLedgeDescent(worker, profile)` from `ledge-descent.js`; playback and arbitrary scrubbing share the same controller application path.

The 3D Pages build includes the viewer and controller and checks the viewer's import closure. Basic verification:

```sh
node --check dist/tactics/ledge-descent.js
node --check dist/tactics/ledge-descent-study.js
npm run build:tactics-3d
```

## Timing and support

The clip lasts **3.78 seconds**. The character faces outward, crouches before planting the anatomical left hand, and keeps that palm fixed while both hooves hop clear of the lip. The supporting arm remains reachable at its original length. After lowering outside the wall, the hand lifts away from the lip before releasing into the drop. Both feet plant for the bent-knee absorption, stand, and ready phases.

| Time | Action |
| --- | --- |
| 0–0.65 s | Stow rifle |
| 0.65–1.20 s | Crouch at the edge |
| 1.20–1.55 s | Plant left hand |
| 1.55–1.93 s | Hop off while holding the edge |
| 1.93–2.23 s | Lower on the left hand |
| 2.23–2.51 s | Release and drop |
| 2.51–2.73 s | Absorb landing |
| 2.73–3.13 s | Stand |
| 3.13–3.78 s | Ready rifle |

`createLedgeDescent` exposes absolute `apply(progress, {origin, heading})`, `restore()`, and `dispose()`. Temporary gloves, garment weighting, equipment attachment and paint are restored on cancellation/disposal. Local coordinates use an unscaled actor under an identity parent. Changing equipment while the clip owns the rig is rejected.

## Verification

The six descent tests cover the intended support sequence, actual rendered finger/hoof contact, fixed limb lengths, dense forward/reverse sampling, indexed body/equipment clearance, phase-boundary continuity, world placement, deterministic scrubbing and exact restoration. Review caught and corrected an elbow discontinuity at the stow/crouch and stand/ready boundaries.

**27 focused and regression tests pass**, including the existing horse mantle and twelve-animal cliff adapter suites. The Pages build and module-closure check pass. The browser review passes **384 samples** across both surfaces, both outfits, four views and three scales, plus phase controls, reverse scrubbing and four normal-speed playbacks, with no browser errors.

```text
node --test tests/ledge-descent.test.mjs tests/roof-mantle.test.mjs tests/cliff-mantle.test.mjs
node tools/ledge-descent-review.mjs
```

The browser tool accepts `PLAYWRIGHT_PATH`, `BROWSER_CHANNEL`, and `REVIEW_URL` (default `http://127.0.0.1:4447`). Evidence is saved under `artifacts/ledge-descent-viewer/` and is not shipped. Other animals, equipment, variable ledge heights and gameplay traversal are subsequent work.

**Hostile review: 9/10** for the scoped horse/rifle prototype. Fresh close views verified the left-hand support, free right hand, release and landing. An independent 181-frame triangle-centroid/edge-midpoint probe found no ledge penetration. Remaining polish is the procedural equipment transition and keyframed cadence; the score does not extend to untested species, weapons or gameplay integration.
