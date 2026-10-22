# Integration review — 22 October 2026

## Decision

Approve the coder's `cc6ee171` live entry-wound integration and the artist's
`790f0499` fatal-head and weapon-drop studies. They merge cleanly together on
canonical `c87358da`. The ordinary wound effects are ready for gameplay. The
fatal-head and dropped-weapon visuals remain studies; publishing them does not
wire them into combat.

## Ordinary gunshot wounds: now live

The painted entrance fan reads clearly at gameplay size and fits the existing
characters. It follows the incoming shot in world space, rather than turning
with the camera. Stains follow the victim's skinned body through movement and
the normal casualty pose. The spray has its own lifetime and does not hold up
the combat queue. Pause freezes travel and fading together.

A normal rifle shot in the playable impact-review encounter inflicted 45 injury,
reducing Boris from 70 to 25 HP. Yakov spent 12 AP and one rifle round. The live
overlay showed one emitter, 18 cards and one retained stain batch. Switching
Blood effects to Off removed all three immediately; returning to Full did not
replay the hit. Quicksave/load preserved the AP and ammunition costs without
restoring cosmetic blood or replaying the shot. Checked browser views had no
application warnings or errors.

The previous three skin-contact gaps are addressed. All 20 fixture impacts now
find the appropriate body region. For the leg, incidental goat and sixth pellet,
the renderer selects a nearby entrance-facing triangle in the same region;
the measured corrections are about 0.086, 0.162 and 0.136 tile. This is a cosmetic
correction to the simplified hit volume, not a change to bullet collision,
penetration, damage or RNG. If an appropriate surface is absent, the code omits
floating blood and retains ordinary impact feedback.

The integration preserves canonical's six-layer visibility and hidden-source
trace handling. Effects require the victim to be known and the impact currently
visible. Hidden hits are consumed without being replayed on later discovery.
Blood preferences do not change the casualty result.

The coding branch also carries `a2747452`'s Quick Fight specialist selection and
paired sidearms. The focused checks cover every four-of-six team combination,
the real Quick Fight map, separate pistol magazines, finite reserves, AP costs,
failed attempts, item transfers and save/load. Campaign and editor constructors
keep their existing cast.

### Rendering budget and persistence

The implementation caps spray at 12 emitters and 216 instanced cards. Retained
stains occupy at most two actors, four patches per actor, or one actor in Reduced
mode. This means older characters' stains disappear when newer wounded actors
replace them. Damage remains in effect. Stains also clear at battle end and on
load; they are not campaign-save data.

There is one shared spray draw and at most two stain draws in the main pass.
Additional lighting/render passes can multiply that work. The two shared
512-pixel atlases use about 2.67 MiB decoded with mipmaps. Projection is bounded
to two new stamps per frame. These are useful cost controls, but neither the
author's CPU benchmark nor this review establishes a full-sector GPU frame-time
or 60 FPS claim.

## Fatal head and weapon release: approved studies

The short painted burst reads as a distinct severe injury at gameplay size.
The checked horse, hen, Red Hat bull and donkey-guide views leave no obvious
floating jaw, beak, horn or hat pieces. The artist's native masks cover all 12
animals and restore original geometry without modifying a second instance.
The close-up neck seals are a little regular; that is optional local polish,
not a reason to rebuild the effect. The hen's awkward fallen garment/wing fold
belongs to the existing casualty pose and is unchanged by this delivery.

Weapon release is improved: the rifle/HMG retains its held pose at release,
falls under gravity, contacts the floor, settles and then fades. It no longer
fades away while still falling. The study does not alter loot or equipment.

The remaining gameplay handoff is specific:

- Connect the fatal presentation to the committed `fatalHead` outcome at the
  matching discharge, including load restoration without replaying the burst.
- Adapt masks and neck seals to the live character-batching path. Native-model
  tests do not certify that path. Rebuild or remove affected head stain geometry
  and preserve body/forearm stains and shared model resources.
- Use the actual impact receipt, normal visibility/concealment and global effect
  budgets. Keep Reduced/Off and reduced motion consistent with the studies.
- Wire dropped weapons through the live casualty/equipment presentation. Rifle
  and HMG examples do not establish hose, tank or every-weapon support. Preserve
  one real inventory/loot item and coordinate held, falling and ground visuals
  so the same weapon is not drawn twice.
- Keep exit spray/stains gated until simulation supplies a confirmed exit point;
  ordinary entry hits do not imply penetration.

## Verification

- 64 focused live-wound, impact, placement, Quick Fight and offhand tests pass.
- 35 focused artist, wound, weapon-drop and packaging tests pass; asset audit,
  core reproduction, impact-fixture reproduction and the combined Pages build
  pass. All 69 changed JavaScript modules pass syntax checks.
- An independent native-model stain smoke check reaches valid skin and produces
  a stain for all 12 animals. This uses a controlled torso receipt, not twelve
  independently played combat encounters.
- The combined packaged battle reproduces the 45-injury rifle hit and the
  one-emitter/18-card/one-stain result. Its fatal study loads the mask and rifle
  release correctly; the weapon reaches the ground before fading. Both pages
  have empty application warning/error logs.
- Combined full regression suite: **2,893 passed, zero failures, six existing
  speaking-head TODOs**, exit code 0. The 307-file run completed in about
  37 minutes using test concurrency four. No tests were cancelled or skipped.

Local diagnostic evidence is retained under
`artifacts/oct22-gunshot-review/`. Review tabs are closed. The temporary server
exited normally and port 64397 is released; source and restart state are saved.
The full-check wrapper and test process exited naturally, with both exits
verified. The artist's separately owned preview retains its existing deadline.
