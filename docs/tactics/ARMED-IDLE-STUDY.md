# Armed idle: guards and mercenaries

2026-10-08 · `work/armed-idle`, based on grenade roster `f8eb82a`.

The study covers the twelve native animal models, Original and Red Hat
outfits, and the donkey guide: 25 appearances. Every appearance supports the
twelve weapons plus empty hands, in Guard and Mercenary modes: **650 selections**.

Open `tactics/armed-idle-study.html`. The viewer has original sketches, six
rendered keyframes, a scrubbed loop, four camera directions, free orbit, and
close or 130-pixel-per-tile gameplay views. Query parameters include `animal`,
`outfit`, `weapon`, `mood`, `mode`, `view`, `scale`, `time`, `phase`, and `paused`.

## Keyframes and motion

| Beat | Guard, 12 s | Mercenary, 16 s | Physical constraint |
| --- | ---: | ---: | --- |
| Rest | 0.00 | 0.00 | Balanced carry, both soles planted |
| Glance left | 2.40 | 3.20 | Head leads the small chest turn |
| Shift weight | 4.80 | 6.40 | Pelvis shifts above the soles; knees soften |
| Glance right | 7.20 | 9.60 | Opposite glance, then shoulder follow |
| Settle the grip | 9.48 | 12.64 | Small supported lift and downward check |
| Return to rest | 12.00 | 16.00 | Same pose and velocity at the loop seam |

The mercenary loop is slower, with a longer pause, a slightly larger shift,
and a more noticeable downward look. Heavy loads reduce the movement.
Phase offsets allow characters to enter different points in the loop.
No steps, firing, reload, pin pull, or unsupported weapon release is included.

- [x] Illustrated keyframe concept, independently reviewed at 9/10 before rig work.
- [x] Fixed actual sole surfaces, native character dimensions and bone lengths.
- [x] Continuous palm attachment and preserved HMG upper-handle grasp/cuff.
- [x] Species-specific carries for bulky pig torsos, SMG drums and RPG fittings.
- [x] Foreman HMG lowered and elbows brought forward to preserve sleeve shape.
- [x] Flamethrower straps routed across each character's shoulders. Skunk pack
  offsets around the plume; hen folds her existing tail fan backward at its root.
- [x] Hen uses existing feathers as a cup/hook, with study-only control bones;
  the selected equipment is visible rather than silently replaced with hands.
- [x] Reversible skin/normal, skeleton, equipment-parent and transform changes.
- [x] Pages packaging includes the new entry point and full module closure.

The idle solver estimates body/equipment centre of mass and recentres the
pelvis over the supporting soles. A separate test uses a more top-heavy mass
distribution, heavier equipment and sampled acceleration to estimate floor
pressure. This supports restrained flat-ground idles; it is not a general
dynamics, cloth, collision-response or contact-force engine. Collision tests
sample weapon vertices against actual posed body surfaces; they do not prove
continuous triangle clearance for every possible scene or accessory.

## Verification and review

The automated and hostile-review results are recorded in
[ARMED-IDLE-REVIEW-2026-10-08.md](ARMED-IDLE-REVIEW-2026-10-08.md).

```text
node --test tests/armed-idle.test.mjs tests/grenade-roster.test.mjs tests/weapon-grips.test.mjs tests/weapon-models.test.mjs
node --test tests/animal-motion-paint-lifecycle.test.mjs tests/tactics-3d-deployment.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-armed-idle.mjs --packaged
```

The browser checker requires `PLAYWRIGHT_PATH` to an installed Playwright
package. Packaged mode routes the built output under `/af3d/` without starting
another HTTP server. Every selection renders both moods, with thirteen seek
samples per mood; it also checks controls, original-sketch loading, compact
layout, superseded selection disposal, and stable renderer resource counts.
Raw capture/check output lives in ignored `artifacts/idle-study/`.

## Scope and next integration work

- [ ] Blend entry/exit to the game's existing carry, walking and aiming poses.
- [ ] Select idle mood and deterministic phase from gameplay actor state.
- [ ] Terrain/slope support and nearby wall/character collision handling.
- [ ] Runtime cost profiling with an entire visible squad.
- [ ] Further hen feather-grip polish. These stylized hooks establish the
  study carry; they do not establish her firearm aiming or firing behavior.

The shared gameplay rig and approved source meshes are unchanged. This branch
contains an animation study, not a gameplay integration or a main-branch merge.
Outfits share species mechanics; hats and clothing have no separate mass model.

## Preview lifecycle

The existing read-only preview on port 4476 is reused. It serves this worktree's
`dist`, retains its original automatic shutdown at **2026-10-08 22:11:05 UTC**
(6:11 p.m. Eastern), and is registered with the helper-lifecycle utility.
Its durable source is `tools/serve-grenade-study.mjs`; its current identity and
shutdown receipt are under `artifacts/grenade-throw/`. Writing the `STOP` marker
there stops this specific preview. A deliberate restart uses
`node tools/serve-grenade-study.mjs 4476` from this worktree and requires a fresh
helper registration. No deadline extension or additional retained server was made.
Temporary review browsers close in `finally` and record process exit receipts.

## Sketch asset provenance

The [keyframe sheet](../../dist/assets/characters/animation-studies/armed-idle-keyframes.png)
was generated with the built-in ImageGen tool, using the approved horse worker
turnaround as the character reference. A corrective edit reversed the fourth
panel's glance in both rows so it clearly opposes panel two, preserving the
other panels. The image is a concept; rendered poses and measurements establish
the actual character/weapon fitting. The full initial generation prompt is in
[ARMED-IDLE-SKETCH-PROMPT.txt](ARMED-IDLE-SKETCH-PROMPT.txt).
