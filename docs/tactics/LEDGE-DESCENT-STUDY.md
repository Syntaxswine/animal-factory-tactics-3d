# Roof and cliff descent study

Open `tactics/ledge-descent-study.html`. The standalone viewer offers all twelve catalog animals in Original and Red Hat outfits, plus the donkey's Blue Hawaiian guide outfit. Mammals carry the rifle; the hen and donkey guide are unarmed. The weapon field displays this constraint. Other equipment and gameplay traversal are outside this study.

Mammals descend from the top: stow the rifle, crouch, place the anatomical left hand on the edge, then hop down while retaining contact. Release, landing absorption, standing, and ready complete the descent. The hen uses a separate wing-braced controller. Both controllers use a dedicated descent sequence with the same **3.78 second** duration and absolute scrubbing API.

Both surfaces use the existing mantle study geometry: the lip is at `x=0, y=2`, the raised surface extends toward positive x, and the landing plane is at `y=0`. The roof occupies `x=0..3`. The cliff uses `createCliffMantleSurface()` with the established grass-and-rock tile kit.

Use four camera views, Full descent / Close / Gameplay scales, grey form, and contact guides to inspect the motion. The timeline scrubs in either direction; each phase button seeks to its phase midpoint. Play runs the complete sequence at normal speed and stops at the end. Animal, outfit, constrained weapon, surface, view, and scale selections are preserved in the URL. Switching from the donkey guide to another animal returns to Original and its supported equipment.

The browser inspection API is `window.ledgeDescentStudy`: `ready`, `seek(normalizedProgress)`, `render()`, `motion`, `worker`, `profile`, `outfit`, `weapon`, `result`, `surface`, `scene`, `camera`, and `renderer`. The result exposes the controller's phase, time, root, and contacts. The viewer uses `createLedgeDescent(worker, profile)` for mammals and `createHenLedgeDescent(worker, profile)` for the hen; playback and arbitrary scrubbing share the same application path.

## Timing and controller contract

| Time | Mammal action |
| --- | --- |
| 0–0.65 s | Stow rifle / prepare when unarmed |
| 0.65–1.20 s | Crouch at the edge |
| 1.20–1.55 s | Plant left hand |
| 1.55–1.93 s | Hop off while holding the edge |
| 1.93–2.23 s | Lower on the left hand |
| 2.23–2.51 s | Release and drop |
| 2.51–2.73 s | Absorb landing |
| 2.73–3.13 s | Stand |
| 3.13–3.78 s | Ready rifle / settle when unarmed |

Both controllers expose absolute `apply(progress, {origin, heading})`, `restore()`, and `dispose()`. Temporary rig changes are restored on cancellation/disposal. Local coordinates use an unscaled actor under an identity parent. Changing equipment while the clip owns the rig is rejected.

## Species adaptations

The horse keeps the approved sequence. The goat, sheep and rabbit use the same body path at their authored dimensions. Both pigs keep their heavier build with a higher crouched pelvis, a deeper chest lean and a counter-rotated head; the planted palm stays fixed and the supporting arm retains its original length. Free hands stay within their reachable range. The director's rifle angles outward to clear his broader head and cap.

Bull, cow, donkey and dog lift their tails around the lip; the skunk turns its plume sideways. These temporary bends preserve the tail root and restore the source attributes exactly. Longer-tailed animals land farther out so the tail can relax without crossing the wall. The donkey guide remains empty-handed throughout.

The hen uses an unarmed wing-tip brace and a separate avian crouch/drop. Rigid toes and bone lengths are preserved. Flexible cloth and feather fringes receive local contact deflection at the lip. A descent-only paint layer registers the exposed Red Hat sleeve, coat hem and tie to their complete authored clothing textures; Original and the shared climb/ladder paint remain unchanged. This is authored deformation rather than cloth or feather physics.

## Verification and evidence

**87 focused tests pass**: the six original horse regressions, 74 mammal/guide and director-clearance tests, and seven hen motion/paint tests. The 3D Pages build and module-closure check also pass.

The 3D Pages build includes both controllers and the viewer, and checks the viewer's module import closure. Run the focused controller tests and build, followed by browser inspection against a running local server:

```sh
node --check dist/tactics/ledge-descent.js
node --check dist/tactics/hen-ledge-descent.js
node --check dist/tactics/ledge-descent-study.js
node --check tools/ledge-descent-review.mjs
node --test tests/ledge-descent.test.mjs tests/animal-ledge-descent.test.mjs tests/hen-ledge-descent.test.mjs
npm run build:tactics-3d
node tools/ledge-descent-review.mjs
```

The browser tool defaults to all twelve animals, both supported outfits, the donkey guide, and both surfaces. It checks four views at three scales in paint and grey form, contact guides, finite reachable contact results, forward/reverse deterministic scrubbing, every phase button, URL selections, and constrained guide/hen equipment. Each animal/outfit/surface produces a sequence sheet, a grey contact frame, and a recorded normal-speed WebM clip.

The tool accepts `ANIMALS` (comma-separated catalog IDs), `SURFACES` (roof and/or cliff), `PLAYWRIGHT_PATH`, `BROWSER_CHANNEL`, and `REVIEW_URL` (default `http://127.0.0.1:4447`). Evidence and a JSON check report are saved under `artifacts/ledge-descent-viewer/` and are not shipped. Filtered runs use separate report names. A browser matrix checks controls and controller results; geometry clearance and visual quality require the focused geometry tests and review of the images and clips.

The expanded browser matrix completed **9,600 samples across 1,200 configurations**, with **50 normal-speed recordings**, covering every supported animal/outfit on both surfaces. The final director and hen corrections each received another 768-sample, four-playback rerun. No browser errors were reported.

## Hostile review and remaining limits

**9/10 for each of the twelve animals**, reviewed sequentially in both outfits on roof and cliff, plus the unarmed donkey guide. The horse retains its approved body path. Review found and corrected long-tail clearance, pig crouch/reach, director rifle/head interference, hen Red Hat paint coverage, and guide label encoding.

The director regression checks actual indexed rifle/skull triangle crossings, containment and 2 mm clearance through the crouch and hop. An isolated negative control with the previous rifle placement fails on the wooden fore-end at 1.05378 seconds; the outward placement passes. Other regression checks cover rendered hand/wing/sole contact, fixed bones, dense bidirectional scrubbing, visible phase continuity, geometry clearance, arbitrary world placement and exact source restoration.

This approves the animation study, not gameplay integration or new weapon artwork. The supported mammal loadout remains the rifle; the hen and guide stay unarmed. Variable heights, other equipment and traversal rules remain separate work. Cloth, feather, tail and sling motion are authored approximations rather than physical simulation; small close-up garment compression remains polish.
