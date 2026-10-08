# Armed idle hostile review

**9/10 — approved as an animation study**, 2026-10-08.

The independent `idle_hostile` reviewer inspected the concept sheet before
implementation and then reviewed painted motion/keyframe captures, native
gameplay scale, geometry, grip, support, disposal and packaged playback.

The first implementation was held for pig HMG reach/body overlap, the hen's
raised feather fan failing to read as a handle grip, and offset flamethrower
straps floating beside the skunk. A second review held the foreman's sleeve
deformation. These findings were fixed before approval:

- Pig HMG carries fit outside the torso, retain the physical upper handle and
  fitted grasp, and remain within native arm reach. The foreman's lower carry
  and forward elbow preserve the sleeve and continuous armband.
- The hen's existing feather tips drape around the handle; all her held
  equipment has measured contact with visible feather vertices. Close-up
  feather compression remains stylized, accepted as study polish.
- Fuel-pack straps reconnect to actual shoulders. The skunk's offset pack
  clears his plume, and the hen folds the tail fan back for clearance.
- A denser test found a foreman pistol/trouser intersection during the wider
  mercenary shift; the pistol was moved forward and outward.
- The hen pack's original mount transform was initially captured too late.
  Equipment parents/transforms are now saved before the adapter is created,
  and every tested mesh attribute is restored on disposal.

## Final evidence

- **92 tests passed**: 39 idle, 40 grenade roster regression, 4 weapon grip,
  4 weapon model, 3 paint lifecycle, 2 deployment/module-closure.
- **650 packaged browser selections, 8,450 seek samples, zero browser errors.**
  Covers 25 appearances × 13 equipment choices × 2 moods.
- Repeated weapon/animal switches and superseded async selections return to
  **20 geometries / 8 textures** for the same horse/rifle baseline.
- UI controls, pause/play, six keyframes, original sketch loading, four views,
  close/gameplay scale, and compact layout were exercised.
- Independent audit: all **156 species/equipment pairs**, both moods and
  fifteen phases per mood. Actual soles drift less than `1.6e-15` tiles;
  loop poses match exactly, with worst finite-difference seam velocity mismatch
  `1.22e-6` units/second. The reviewer's deliberately conservative approximate
  pressure estimate stays at least **2.06 cm inside** the actual sole hull.
- Weapon/body surface checks sample sixteen poses in each mood, preserving
  bone lengths and model scale. These are sampled clearance checks, not a
  continuous collision solver.

Selected renders, full browser report and the independent support audit are
retained in [hybrid-review/armed-idle](hybrid-review/armed-idle/).
Reproduction commands and ownership/lifecycle notes are in the
[handoff](ARMED-IDLE-STUDY.md).

The review approves this study's grounded quiet movement, supported carries,
loop continuity and gameplay-size readability. It does **not** establish
gameplay integration, slope adaptation, obstruction avoidance, general hen
firearm handling, or a full physical dynamics simulation.

## Rifle forearm overlap follow-up

**9/10 — focused correction approved**, 2026-10-08.

The horse's rifle butt now tucks behind the trigger forearm. A lower carry,
slightly raised muzzle and turned wrist preserve the grasp while the elbow
rests below the shoulder. This is actual posed geometry and depth occlusion.
Rifle geometry, model scale and rendering order are unchanged.

The same correction applies to horse, goat, bull, cow, donkey, sheep, skunk,
rabbit and dog, in their available outfits and both idle moods. Pigs and hen
retain their previously approved species-specific carries; other weapons are
unchanged. The sheep needs a 5 mm lower carry to clear the stock during the
grip adjustment.

The hostile reviewer held the first trial for its raised elbow and strained
sleeve. The lower carry resolved this. Their triangle audit then caught a
sheep intersection that vertex containment alone missed; the final regression
checks both edge/triangle crossings and containment in both directions. The
narrow stock neck is an intentional grasp; the broad butt must clear the arm.

- **61 tests passed:** 39 existing idle, 9 rifle overlap, 4 weapon grip,
  4 weapon model, 3 paint lifecycle, and 2 packaging tests.
- New overlap checks cover **576 poses**, physical stock occlusion from front
  and three-quarter views, reciprocal containment, surface crossings, and
  a relaxed elbow below the shoulder.
- Independent hostile audit: **864 additional midpoint samples**, all nine
  changed mammals and both moods, with no stock/arm or stock/shirt crossings.
- **50 packaged rifle selections / 650 seek samples**, all 25 appearances in
  both moods, with no browser errors. Repeated swaps return to the same
  **20 geometries / 7 textures**. UI controls, keyframes, scale, camera views,
  compact layout, and source sketch loading also passed.
- Fresh front, side and three-quarter renders, motion keyframes and gameplay
  scale were reviewed. The distribution build passed.

Follow-up evidence is in [rifle-tuck](hybrid-review/armed-idle/rifle-tuck/).
These are sampled study checks, not proof of general collision avoidance or
gameplay integration.
