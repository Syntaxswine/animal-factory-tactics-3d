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
