# Painted fatal-head assets

Artist delivery · 21 October 2026 · Independent visual review: **9/10**

This supplies the missing artist presentation for a **fatal-head outcome already
resolved by the game**: a brief painted burst, a few falling generic fragments,
reversible head removal and a sealed painted neck. It reuses the existing
casualty fall, with a separate gun drop that lands before fading. No injury
qualification, damage, permanent
death rule or live battle renderer is changed by this delivery.

[Open the study](http://127.0.0.1:4477/tactics/fatal-head-study.html).
It covers **12 animals, both outfits and the donkey guide: 25 combinations**,
with a close view beside a 55-pixel-per-tile gameplay view. Controls include
standing/kneeling/prone starts, all 13 catalog loadouts, contrasting backgrounds,
four camera angles, scrubbing, slow playback and an independent still/fade mode.
The hen remains unarmed, matching its native battle rig.

![Impact, dispersal and the existing fall](review-images/fatal-head/sequence.png)

## Painting and resource budget

The new [runtime atlas](../../dist/assets/effects/fatal-head/fatal-head-components-v1.png)
is **512 × 512 RGBA, 174,140 bytes**. Its four cells are a compact burst, torn
directional fan, generic burgundy chips/flecks and dark-maroon surface paint for
the neck seal. There are no identifiable anatomical fragments. Full motion
uses at most **48 instanced cards**, retiring completely within **0.9 seconds**.
Still mode uses one stationary mark fading within 0.18 seconds.

The painting was made with **built-in ImageGen**. The unchanged
[1254 × 1254 source](../../dist/assets/effects/fatal-head/source-v1.png),
[exact prompt](../../dist/assets/effects/fatal-head/generation-prompt.txt),
hashes, cell UVs and pivots are retained in the
[manifest](../../dist/assets/effects/fatal-head/manifest.json). Runtime preparation
only crops, resizes and packs the painted cells with transparent gutters.
Runtime SHA-256:
`40748bf991e0230812c8c063e6e82ff8201ea47644c8473321faa82daf751557`.

The atlas costs approximately **1.33 MiB decoded with mipmaps**. Reduced mode
reuses the previous entry atlas. One emitter adds one instanced draw. The seal
adds a small skinned draw per neck boundary and casts no shadow. Head geometry
is removed, with no duplicate full-body shell. These are isolated asset costs,
not a full-battle frame-time result; the builder must budget simultaneous actors.

## Builder contract

Use the explicit, supplied `fatalHead` outcome and its saved marker from
`GUNSHOT-IMPACT-INTEGRATION.md`. An ordinary head hit, bleeding casualty or
downed unit does not qualify on its own. Do not recalculate lethality or change
HP in this renderer. Receipt identity, visibility/fog, timing and effect settings
remain with the builder.

- **Full:** use the fatal burst and destructive head mask.
- **Reduced:** use the existing small entry spray and ordinary intact-head
  casualty appearance.
- **Off:** show the ordinary intact-head casualty without a spray.
- All three retain the same supplied permanent fatal outcome. The motion
  preference is independent of these presentation choices.
- When rebuilding an actor from a saved fatal marker, apply its selected mask
  without replaying a historical burst. Head-local blood patches must disappear
  with the head. Ordinary body stains remain visible for the current battle.
  The earlier rule still applies: **clear visible stains at battle end**; do not
  carry those cosmetic stains into another encounter.

[createFatalHeadBurst](../../dist/tactics/fatal-head-motion.js) uses the existing
painted-card renderer. Its local **+X** points out from the resolved entrance,
opposite the incoming projectile. Supply a rigid, unscaled render-world frame;
keep the mesh identity under an untransformed scene/root. Cards face the camera
while retaining world-space travel and world-down gravity. Use an event-local
presentation seed. Normal alpha, depth testing, no depth writes, no lights or
shadows. The caller retains ownership of the shared atlas.

```js
const burst = createFatalHeadBurst(sharedFatalAtlas, {seed: visualSeed});
scene.add(burst.mesh);
burst.setFrame(resolvedEntranceWorldFrame);
burst.update(ageSeconds, camera, {floor: supportWorldY, still: stillMotion});
// Retire by 0.9 seconds.
burst.dispose();
```

The study's contact is an authored surface probe for comparison, not a new
collision or penetration solver. It must not replace the builder's live contact.

## Released gun: land, then fade · 22 October follow-up

The follow-up keeps the gun visible when the casualty releases its grasp.
The study releases it at **0.42 seconds**, at the beginning of the body fall.
Its last held world pose is retained exactly; it falls under world-down gravity
and rotates onto its side. Contact uses the actual rigid model vertices, not
the weapon origin or a box corner. The gun remains opaque in flight, settles
against the supplied floor for **0.12 seconds**, then fades over **0.45 seconds**.
It follows the same sequence in Full, Reduced and Off presentation.

The study's former prone HMG carry put its bipod and belt underground. Its
held endpoint now reuses the existing supported prone firing pose, with both
hands solved to the gun. That endpoint is cached and blended into the existing
casualty, avoiding a new pose search each frame. The shared gameplay pose code
is unchanged. All **66 rifle/HMG × armed-species × stance releases** preserve
their source transform exactly. A penetrating capture is rejected explicitly,
so a bad held pose cannot be silently corrected by teleporting the gun upward.

![The rifle and HMG remain visible until landing, then fade](review-images/fatal-head/weapon-drop.png)

[createCasualtyWeaponDrop](../../dist/tactics/casualty-weapon-drop.js) prepares a
visual proxy with shared weapon geometry/textures and its own materials. It
preserves the painterly shaders and fades without changing the original gun.
The proxy is independent of the falling body's transform. Replay restores the
held gun; no history-dependent integration, timers or per-frame cloning is used.

```js
const drop = createCasualtyWeaponDrop(weapon); // null for unarmed
scene.add(drop.root); // identity, untransformed render-world parent
// Capture the live held pose BEFORE evaluating a pose that releases the grasp.
drop.capture(lastHeldWeaponWorldMatrix, {floor: supportWorldY});
// At release, hide the original held weapon and evaluate the proxy by age:
weapon.root.visible = false;
const visualState = drop.update(secondsSinceRelease);
// Retire when visualState.phase === 'retired'. On replay, restore the carry pose.
drop.dispose(); // before the caller disposes the original weapon
```

The direct adapter handles rigid weapons. The assembly wrapper below adds the
worn flamethrower tank and flexible hose. The caller supplies the actual floor
level and can supply release
velocity. This is cosmetic: it does not create, destroy or alter a loot item,
and it is not a wall/terrain collision solver. It adds transient material draws,
sharing the original geometry; no extra painting is loaded.
The study's `casualty-weapon-pose.js` holds one authored preview direction;
live integration should capture the builder's current supported weapon pose.

## Complete weapon roster · 22 October follow-up

The selector now follows `WEAPON_MODELS`: unarmed, NR-40 knife, TT-33 pistol,
Mosin-Nagant, AK-47, PPSh, HMG, shotgun, sniper rifle, fragmentation grenade,
grenade launcher, RPG and backpack flamethrower. All **12 actual weapons** use
the held, released, grounded and fading sequence. The hen stays unarmed and its
weapon selector is disabled. No grenade fuse or tank explosion is inferred from
this supplied fatal outcome.

![All twelve weapons before impact](review-images/fatal-head/extra-weapons.png)

The prone fitting retains the native palm offsets and solves the arms without
stretching. The cached endpoint rejects actual posed skull containment, surface
grazing within **0.008 world units**, and thin weapon edges crossing the skull.
This uses a temporary CPU surface hierarchy, rather than a head bounding-box
claim. Large heads can turn slightly aside; a heavy gun can rest lower on its
side. The fit is evaluated once, then its complete pose is restored on each
frame before blending into the existing casualty. Intact comparisons are now
captured at **0.20 seconds**, before the head disappears at 0.30 seconds.

![Intact prone fits, including small props and heavy weapons](review-images/fatal-head/extra-weapons-prone.png)

The **flamethrower tank stays strapped to the body**. Its lance drops separately;
a fixed **216-triangle hose** continues to join the actual tank and lance sockets.
The lance and hose fade together only after the lance has landed. The tank
remains visible on the resting casualty. Late in the fall, wearer and tank roll
onto a supported side rest. Both feet and the lower free hand settle through
native-length limb rotations; the skunk uses the opposite roll for its offset
pack. Actual body and tank surfaces clear the supplied floor. These adjustments
are confined to this equipment study and do not change the shared casualty pose.

![The connected lance drops while the worn tank settles with the body](review-images/fatal-head/flamethrower-drop.png)

Use [createCasualtyWeaponAssembly](../../dist/tactics/casualty-weapon-assembly.js)
for a complete loadout. Ordinary weapons return the same rigid drop adapter.
Add its root at identity under an **untransformed render-world parent**: the drop
and hose use world-space coordinates. Re-evaluate a fresh body pose before each
`preparePose` call; its side roll and limb settling are not cumulative updates.
Supply the same render-world floor to preparation and release capture.

```js
const assembly = createCasualtyWeaponAssembly(worker, profile);
scene.add(assembly.root); // identity; no transformed parent
// Each frame, after the caller evaluates and grounds its fresh body pose:
assembly.preparePose?.({floor: supportWorldY, down: casualtyProgress});
// Once, at release, after preparation and BEFORE releasing the live grasp:
assembly.capture(worker.weapon.root.matrixWorld, {floor: supportWorldY});
// Subsequent frames evaluate the fresh body pose and preparePose again,
// then hide the original lance/weapon and evaluate the independent drop:
worker.weapon.root.visible = false;
assembly.update(secondsSinceRelease);
assembly.dispose(); // before caller-owned weapon/actor resources
```

The wrapper owns its proxy materials and fixed hose buffers. Original weapon
geometry, textures and tank resources stay with the caller. It temporarily
suppresses the original allocating hose updater and restores that updater, the
mount fit and original visibility on disposal. The grenade's existing painting
is awaited and owned by the study's cancelable load; no new textures are added.
This remains a flat-support visual adapter, not a terrain collision or loot
system. The builder still owns live equipment, timing, visibility and integration.

## Native model adapter

[createFatalHeadMask](../../dist/tactics/fatal-head-mask.js) prepares an
**instance-local** geometry replacement for the current native skinned model.
Prepare it before combat rather than clipping geometry on a hit. Preserve the
native lower neck and clothing, remove skull/ear/horn/mane/beard or beak/comb/
wattle surfaces, and cap each real cut boundary separately. The horse discards
a disconnected low-weight jaw island; the donkey uses an authored collar
envelope to remove its connected jaw shelf. The hen has a taller cut clearing
its feathered breast; its retained neck follows the breast through the fall.

![Native roster neck silhouettes](review-images/fatal-head/roster.png)

```js
const mask = createFatalHeadMask(worker, {
  species: profile.id, texture: sharedFatalAtlas
});

// Existing contact/pose solvers can cache original vertex indices. Evaluate
// them synchronously against the original geometry, then reapply the mask.
mask.withIntactGeometry(() => {
  locomotion.apply(sample);
  posture.apply(sample);
});
mask.setDestroyed(showFullFatalHead);
posture.ground(); // ground the surface actually being displayed

// On actor teardown, before disposing its original model/rig:
mask.dispose();
```

`withIntactGeometry` is synchronous and restores the previous mask even if the
callback throws. Scrubbing before impact, changing settings and disposal restore
the exact original geometry. Shared body paintings, original geometry, skeletons
and caller-owned texture are not disposed or repainted by this adapter.

Head-bone children, including hats, disappear with the head. Head-surface decals
and accessories are captured on first activation, including wounds added after
mask preparation. If adding cosmetics after that activation, call
`mask.refreshAttachments()`; it prunes detached patches and preserves their
original visibility. Forearm stains/accessories are explicitly tested to remain
visible. Do not call this scan per frame.

This adapter targets the existing native `SkinnedMesh` catalog. Unknown models
fall back to ordinary casualty presentation. A batched, morph-target or rewritten
model path needs its own builder adapter; the study does not certify those paths.

## Validation and remaining scope

- Independent review approves the artist asset and native-model adapter at
  **9/10**, after the horse/donkey jaw remnants, hen seal and head-attachment
  filtering were corrected. The reviewer independently reran all **12 fatal-head
  tests**, with no remaining task blocker.
- **28 focused tests pass**: all 12 native cuts and normalized weights, exact
  restoration and instance isolation, hen's actual rendered skeleton and breast
  seal, separate/late head decals, forearm preservation, caller resource
  ownership, seeded motion, world gravity, lifetime, prior entry/exit/stain
  regressions, hashes and both packaging module-closure lists.
- Asset audit and the packaged 3D build pass. **82 browser captures** cover all 25
  outfits before and after the fall, camera/stance/background/settings changes,
  rifle/HMG examples, mobile layout and identical source/packaged appearance.
  Fifty replay/settings cycles retain **14 geometries and 6 textures**. Initial
  mesh and replacement paint loading can both be canceled safely; late work
  releases its resources before renderer disposal.
- The hen's fallen garment/wing silhouette has an inherited folding weakness.
  Identical Full and Off captures preserve the same body pose; this delivery
  fixes the neck seal without changing that existing casualty layer.

Weapon follow-up validation: **35 focused tests pass**, including seven new tests
for exact release vertex alignment, gravity/contact before fading, all armed
species in three stances, deterministic replay (including tail geometry after
arbitrary prone HMG falls), painterly shader preservation and shared-resource
ownership. Independent follow-up review is **9/10**; the reviewer also reran all
seven weapon tests. The packaged build passes. Browser follow-up
also checks rifle/HMG held, falling, grounded, fading and retired frames in all
three stances, other body sizes, presentation settings and armed replay cycles.
Its **52 captures** complete without browser errors. Source and packaged views
match byte-for-byte under matching fresh-start sequences. Fifty armed replay
cycles retain **24 geometries and 7 textures**; the disposable browser exits and
releases its port. See the [weapon validation record](review-images/fatal-head/weapon-drop-validation.json).

Complete-roster validation: **42 focused tests pass**, including **396 releases**
(11 armed species × 12 weapons × three starting stances), exact native replay,
skull-surface fitting rejection, socket continuity, elevated support at world
height 2.4, shared-resource ownership, and actual foot/arm support for all 11
armed species in three stances. The asset audit and packaged build also pass.
Independent follow-up review is **9/10**. The reviewer independently confirmed
zero embedded weapon vertices in seven native prone cases and reran four
focused tests, including all 33 resting-contact cases. **284 roster captures**
and **28 final fit/rest comparisons** complete without browser errors. Matching
source and packaged sequences produce identical pixels for the ordinary burst,
rifle fall and flamethrower standing fall, prone fall and retired state. Fifty
rifle and fifty flamethrower replay cycles keep allocations bounded; the full
roster run retains 24 geometries / 7 textures for the rifle and 51 / 7 for the
flamethrower before and after cycling. Initial, replacement and grenade-paint
loads can all be canceled safely. Both disposable browsers exited and released
their ports. See the [complete-roster validation record](review-images/fatal-head/extra-weapons-validation.json).

![Hen Full and Off at the identical resting pose](review-images/fatal-head/hen-comparison.png)

The disposable review browser closes in `finally`, with verified process exit
and released port. The existing registered preview on port **4477** retains its
automatic stop on **22 October 2026 at 7:56 PM Eastern**. No extra preview server
is retained. Live gameplay wiring and full-sector performance remain with the
builder.

## Reproduction

Node.js 22+, `sharp` for preparation and review sheets, `playwright` plus installed
Edge for browser review. `SHARP_PATH` and `PLAYWRIGHT_PATH` can point to the bundled
packages. Build before running the packaged review.

```text
node tools/prepare-fatal-head.mjs <original-generated-png>
node --test tests/painted-blood-spray.test.mjs tests/painted-blood-wounds.test.mjs tests/fatal-head-assets.test.mjs tests/casualty-weapon-drop.test.mjs tests/casualty-weapon-roster.test.mjs tests/tactics-pages-files.test.mjs
node tools/check-assets.mjs
node tools/build-tactics-3d.mjs
```

Run `tools/review-fatal-head.mjs` with `FATAL_REVIEW_PACKAGED=1` and
`FATAL_REVIEW_HEN=1`. `FATAL_REVIEW_OUTPUT` chooses the evidence directory.
`FATAL_REVIEW_FAST=1` limits roster captures for a focused follow-up.
Use `FATAL_REVIEW_DROP=1` for the armed fall/fade cases; combine with Fast for
the weapon-only follow-up. `tools/compose-fatal-head-review.mjs <evidence-dir>
--weapon-drop` makes its review sheet and compact validation record.
Add `FATAL_REVIEW_EXTRA=1` for the complete catalog, intact held frames,
flamethrower replay/resource checks and source/packaged comparisons. Use
`FATAL_REVIEW_ASSEMBLY=1` with Fast, Drop and Extra for the shorter intact-fit
and supported-rest re-review. `tools/compose-fatal-head-review.mjs <evidence-dir>
--extra-weapons` creates the three complete-roster review sheets and validation.
Add `--assembly-review=<focused-evidence-dir>` to include the final focused
browser receipt in that validation record.
