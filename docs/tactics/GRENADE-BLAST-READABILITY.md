# Grenade blast readability

The gameplay grenade damages out to five tiles, but its previous twelve small dust meshes never conveyed that reach. The replacement uses the approved painted burst and smoke atlases: a brief central detonation followed by overlapping, uneven dust spreading toward the resolved five-tile perimeter.

This branch starts at the integrated grenade implementation, `bd58196`. It changes presentation, not damage, falloff, AP, ammunition, throw animation, bouncing, or fuse rules. The normal aftermath remains 0.8 seconds; reduced motion retains its 0.18-second queue duration with a static, dim dust footprint.

## Delivered

- [x] Read the resolved grenade explosion's position and radius, including bounced throws and different event radii.
- [x] Share the same effect between `BattleGrenades` and the new `grenade-blast-study.html` viewer.
- [x] Clip the effect against intact pre-damage cover, including walls and overhead floors destroyed by this explosion.
- [x] Clip rising paint beneath both the origin ceiling and adjacent roof overhangs using a local ceiling mask.
- [x] Preserve real ground, rooftop, cliff and tower heights; avoid inventing a floating floor beneath an airborne burst.
- [x] Mask individual painted fragments using current visibility on the correct logical floor. Exploration alone does not reveal the effect.
- [x] Clear the effect on completion/cancellation and release textures, masks and geometry on teardown, including late texture completion.
- [x] Hostile subagent review: **9/10**, after fixing the initial ceiling and overhang leaks.

The dust envelope conservatively indicates reach. It does not calculate damage or promise that every tile inside the circle is hit: distance falloff, elevation and intact cover still govern the authoritative result. Ceiling sampling uses native tile columns. Narrow tower supports can leave angular gaps in the dust; softening these is optional future polish.

## Destructible building follow-up

Walls and floors are destructible, with resistance depending on the building. They must not become permanently solid merely because this effect clips against them. The current blast holds a snapshot of cover at impact for its short lifetime, even if existing damage handling has already removed an element from state.

- [ ] When the building-destruction presentation is implemented, keep the initial flash/pressure event synchronized with intact cover, then allow the trailing dust and debris through the actual breach after that wall or floor fails.
- [ ] Supply the presentation with the affected element identities, prior geometry and destruction time. Update or replace the cover mask at that transition without recalculating or enlarging authoritative damage.
- [ ] Check intact, damaged and destroyed walls/floors from both sides, including an upper floor collapsing above a blast. Do not hide a valid destruction result behind the original ceiling mask.

This is an integration hook for the later building-destruction work, not a claim that the full material-dependent destruction system is implemented here.

## Review and verification

Open `tactics/grenade-blast-study.html`; it includes open ground, wall shielding, rooftop, below-roof, overhang, cliff, tower and partial-visibility scenes, three views, two scales, a radius guide and reduced motion. The horse is native size and each square is one tile. The gameplay link opens the existing grenade encounter.

Focused tests:

```text
node --test tests/grenade-blast.test.mjs tests/grenade-integration.test.mjs tests/battle-combat.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
```

Browser scripts use `PLAYWRIGHT_PATH` for the installed Playwright package:

```text
node tools/check-grenade-blast.mjs
node tools/check-grenade-gameplay.mjs
```

Set `GRENADE_REVIEW_URL` to the review server's `tactics/battle-3d.html?study=grenades` page. `GRENADE_BLAST_REVIEW_URL` optionally overrides the blast study URL. The blast script checks rendered pixels outside the radius, behind cover, in fog and above ceilings, plus repeated scene changes and resource counts. The gameplay script checks real committed throws, AP/ammunition, projectile playback, a paused peak-blast capture and queue cleanup for horse, goat, pig director and hen.

Local evidence is under `artifacts/grenade-blast/` and `artifacts/grenade-integration/`; browser helper records and close receipts are under `artifacts/strategic-sites/helpers/`. Each test browser closes in `finally`.

Final checks on October 8: **51 focused tests passed** (8 blast, 25 grenade integration, 16 combat, 2 deployment), build passed, **96 browser configurations** passed with no errors. Pixel comparisons found no effect outside the radius, behind the sampled wall/fog boundary, or above the tested ceiling/overhang. Four committed gameplay throws passed with painted five-tile blasts and correct AP/ammunition; their peak captures use a paused playback clock to avoid racing the 0.8-second effect. Repeated scene changes retained the same GPU resource counts. Hostile review independently confirmed the overhang correction and returned **9/10**.

## Retained preview

`node tools/serve-grenade-blast-study.mjs 4476` serves `dist/` read-only. This review lifetime started October 8, 2026 at 22:30 UTC and self-stops October 9 at 22:30 UTC. Its exact process identity and restart sources are registered with the shared helper lifecycle utility. The private `artifacts/grenade-blast/server/STOP` marker also shuts it down and writes `stopped.json`; ready/registration records are in that same directory. The former grenade preview's earlier expiry was honored before this new lifetime started.

This delivery is on `work/grenade-blast-readability`; publication still requires integrating the branch into canonical. The existing Pages workflow only deploys `main`.
