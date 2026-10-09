# Long-gun arm overlap audit

The previous tuck correction covered the rifle in the armed-idle study only.
Walking, weapon drawing and the aim controller could replace it with a different
carry. The other stocked weapons also needed their own fit.

## Changes

- A shared carry fit places the trigger forearm in front of the broad stock for
  horse, goat, bull, cow, donkey, sheep, skunk, rabbit and dog. It covers rifle,
  assault rifle, SMG, shotgun, sniper, grenade launcher and HMG. Native model
  dimensions, bone lengths and weapon geometry are retained.
- The shared worker pose, both armed-idle moods, locomotion, rifle motion studies
  and aim/draw transitions use this fit. Garment-specific overrides keep the
  larger receivers out of the bull, donkey and sheep clothing.
- Gloves keep their authored grip orientation while raising the weapon. The HMG
  retains its upper handle and fitted closed support hand. Its cuff is refreshed
  after the final arm pose, and its support elbow is fitted to approach that
  handle without the cuff cutting through it. A shorter HMG raising arc keeps
  the handle reachable.
- Drawing transports the elbow bend plane instead of blending opposing poles.
  The pickup wrist approaches the near side of the stock. A whole-weapon reach
  correction keeps engaged palms attached without stretching either arm.
- The fitted HMG has a slightly deeper stow arc. Its roof-study starting distance
  is measured from actual equipment geometry, including the deployed bipod,
  leaving a 6 mm gap. Feet stay planted during stow; landing and tile dimensions
  are unchanged. Existing RPG and pig approach offsets are preserved.

These are posed surfaces and ordinary depth occlusion, not draw-order changes.
Stock-neck contact inside a closed grasp is distinct from broad-stock clipping.

## Review and holds

Independent reviewers awarded the nine-mammal carry and trigger-arm transition
corrections **9/10**, with the following limits kept explicit:

- [x] Review all seven stocked weapons on the nine changed mammals.
- [x] Preserve the hen's existing feather cupping, including the upper HMG handle.
  Her armed study remains experimental; this adds no hen gameplay weapon support.
- [ ] Pig foreman: a stock-under-arm carry still needs a dedicated rig fitting pass.
- [ ] Pig director: a stock-under-arm carry still needs a dedicated rig fitting pass.
- [ ] Polish the existing fully shouldered stock/sleeve contact. The earlier aim
  pose can bury stock vertices roughly 4.6 cm into a sleeve. This predates the
  change and is not covered by the relaxed-carry clearance approval.
- [ ] Fit steep HMG aiming separately. The new support-hand clearance checks
  cover carry, both idle moods and level raises; elevated targets can still
  bring the cuff into the handle. HMG firing remains a study, not a newly
  enabled gameplay action.

The pig probes tested shoulder protraction, forearm roll, actual surface contact
and support-hand placement. They either buried the butt in clothing or intersected
the forearm; none was accepted. Their existing carry fits, meshes and rest bind
remain unchanged. The audit does not certify every animation as collision-free.

## Verification

The permanent checks use actual skinned surfaces, reciprocal containment and
edge/triangle crossings, rather than only distances between named anchors.
Front and three-quarter occlusion checks prove that the arm covers the stock.
Both idle cycles also check the receiver against clothing and head/tail surfaces.

Transition checks cover intermediate raises, engaged palm contact, dense draw
continuity, epsilon samples around engagement/release boundaries, and final cuff
freshness. Endpoint-only tests missed the original elbow flip and pickup jump.
These remain sampled checks, not a continuous collision solver.

Completed evidence:

- **111 carry/idle checks passed**, including each of the 63 changed
  species/weapon pairs through both moods and the earlier rifle regressions.
- **22 draw/raise checks passed**, including 101 raise samples for each changed
  species/weapon pair and 201 draw samples plus engagement-boundary probes.
  An independent 7,623-frame raise sweep found no unsupported poses or broad
  trigger-forearm/stock crossings.
- **337 related motion checks passed**: roof transfers, equipment clearance,
  stance changes, aiming, combat presentation, and the animal/dog motion studies.
- **238 roster regressions passed**: grenade throws, ladder equipment, ledge
  descent, casualties and fire presentation.
- **13 equipment, model, packaging and resource-lifecycle checks passed**,
  including the unchanged HMG finger-wrap and shroud-clearance checks.
- **9 HMG cuff checks passed across 1,170 poses**: both idle moods, carry and
  level raises. Entire cuff triangles stay more than 2 mm outside the actual
  faceted handle. The support elbow also moves continuously between samples.
- **350 packaged browser selections / 4,550 seek samples**, zero errors.
  Repeated animal/weapon replacement returns to the same 20 geometries and
  7 textures for the horse/rifle baseline. The full 3D distribution builds.
- The independent visual reviewer inspected 43 additional configurations,
  followed by 39 views of the final HMG carry and level raise.

Selected renders and the packaged-browser report are in
[hybrid-review/stock-overlap](hybrid-review/stock-overlap/). After the last HMG
support-pose adjustment, its carry, draw, roof-clearance and grip regressions
were repeated, along with 1,089 raise samples and 50 packaged HMG browser
selections / 650 seeks, with no browser errors.
The counts above do not include failed intermediate attempts.

Reproduce the focused checks:

```powershell
node --test tests/armed-idle.test.mjs tests/armed-idle-rifle.test.mjs tests/long-gun-carry.test.mjs tests/long-gun-transitions.test.mjs tests/equipment-draw.test.mjs
node --test tests/hmg-support-cuff.test.mjs tests/weapon-grips.test.mjs tests/weapon-models.test.mjs
node --test tests/roof-mantle-weapons.test.mjs tests/battle-combat.test.mjs tests/battle-aim-reach.test.mjs tests/battle-posture.test.mjs tests/animal-motion.test.mjs tests/dog-motion.test.mjs
node tools/build-tactics-3d.mjs
node tools/check-armed-idle.mjs --stocks --packaged
```

The browser command requires `PLAYWRIGHT_PATH` pointing to the installed
Playwright package. It routes the packaged files locally without a server and
closes its owned browser in `finally`. It covers all 25 appearances, seven stocked
weapons, both moods, seeking, repeated replacement, camera/scale and UI controls.

## Delivery

Changes belong to `work/long-gun-arm-overlap`, based on published `84a87d9`.
The architect's separate integration checkout is untouched. A feature-branch
push does not deploy Pages; the publishing workflow runs on `main`.

For a read-only local preview, `node tools/serve-armed-idle-review.mjs 4477`
serves the existing armed-idle viewer. It stops after 24 hours or when
`artifacts/stock-overlap/server/STOP` exists. Retained launches must be registered
with the project's helper-lifecycle utility; remove an old stop marker only when
deliberately starting a new, registered process lifetime.
