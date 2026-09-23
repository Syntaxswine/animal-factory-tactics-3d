# Cliff climb animation proof

The first motion study uses the approved 10k horse and rifle on a flat cliff exactly **2.00 world units high**, matching the approved wall height. Open `tactics/cliff-climb-study.html`. Original and Red Hat outfits, four camera angles, close/gameplay scales, grey form, contact guides, phase buttons and an absolute timeline are available.

The six-second sequence follows the requested order: stow rifle, crouch and jump with arms raised, catch the edge, pull up, swing the right/leading hoof onto the cap, push up, bring the trailing leg through, stand, and ready the rifle. The torso leans left to make room for the right leg, then shifts right and rises over that planted hoof. The leading hoof rises outside the face before crossing the lip; the body rises before its seat advances over the rock. Both hands hold fixed edge contacts until the leading hoof is planted. The rifle remains visible on its shoulder sling during the climb.

This is a **horse/rifle presentation proof**, not a gameplay traversal implementation or approval of the other animals. No core, editor, map, inventory or navigation rule is changed. There is no authored descent or swimming approach.

## Integration contract

- `createCliffClimb(worker, profile)` in `dist/tactics/cliff-climb.js` returns `duration`, frozen `phases`, `apply`, `diagnostics`, `restore`, and `dispose`.
- Call `apply(progress, {origin: [x,y,z], heading: degrees})` with absolute progress in 0–1. It clamps finite progress and rejects malformed inputs. Local +X points into the ledge; the face is X=0 and the cap Y=2. Heading rotates this frame about Y with the tactical convention. The root must be unscaled under an identity parent. Origins and headings transform all reported contact points.
- The actor begins at local root `[-0.65,0,0]` and finishes at `[0.285,2,0.268]`, both carrying the rifle. Call the animation after ordinary posture updates. Avoid another controller overwriting its bones or equipment during playback.
- Diagnostics include phase/time, local and world root, hand/foot contacts, planted flags, contact error, and weapon presentation. These are review diagnostics, not simulation events or route validation.
- Constructor capture, cancellation and disposal restore exact entry transforms, visibility and affected geometry attribute references. Construction failure rolls back the helpers it created. Dispose once the clip has finished or is cancelled; subsequent calls to dispose are harmless. Inventory ownership is never changed.
- The temporary hand mesh curls fingers over the stone instead of around a ladder rung. The horse's upper pastern temporarily shares the trouser cuff's shin/hoof skin blend, preventing an exposed rigid upper-hoof cap during deep flex. Lower horn and sole vertices remain rigid; original attributes are restored afterward. The approved character asset is unchanged.

## Remaining integration work

Validate an actual climbable edge, clear handholds, lower approach space and a hoof/body-sized upper landing before starting this clip. Transform the local frame to the chosen face. Reserve the animation route and upper support in the gameplay adapter. The normal floor spacing is 2.12: do not silently substitute that for this 2.00-unit physical cap. Impassable crag faces must not gain climb links; usable ground behind them remains a separate support question. Water-bottom cliffs do not automatically acquire a swimming or wading approach.

Other animals, equipment, uneven/curved edge contacts and descending need their own motion and visual review. The horse fixture does not establish those cases.

## Validation

Eight permanent animation tests cover fixed-length limbs and planted contacts, all visible skinned and helper surfaces against the cliff/floor, fingertip contact, phase-boundary continuity, left/right weight transfer, deterministic scrubbing, world-frame transforms, rigid sole and upper-pastern attachment, exact restoration, invalid input and injected construction failure. **Eight motion tests pass**, including the supported-transfer ordering and shared knee-hinge planes. Separate cliff geometry/tile/water regressions cover the terrain assets.

The browser matrix renders **480 outfit/view/scale/grey/phase combinations** with no errors, plus a narrow viewport overflow check. Independent real-time playback completed in approximately six seconds. The 3D Pages build includes the motion module and viewer. Independent hostile review: **9/10** after the stronger leftward lean and endpoint carry correction. Fresh close and gameplay-size Red Hat views passed; actual playback finished in 6.10 seconds without browser errors. The independent visible-surface scan found no blocking rock intersections, and maximum phase-boundary displacement was 2.03 micrometres. Deep-flex cloth remains compressed at close scale; this is a nonblocking limitation of the bounded motion study.

## Wider leg swing revision

The rear-view draw-over is implemented as a knee-led right leg arc: the knee prepares during the pull, rises above the rim, and the hoof lands at local `[0.25,2,0.50]`. That exact plant remains fixed while the body transfers right and the left leg follows. The trailing leg has its own lower knee path and stays below the rim until its turn, avoiding the former paired tuck. The completed stance is shifted sideways, with the left hoof at `[0.25,2,0.036]` and root `[0.285,2,0.268]`; both endpoints still match the native rifle-carry bone pose. Duration remains six seconds.

The newly exposed underside crotch bridge had pale projection artifacts. `cliff-climb-paint.js` temporarily samples clean rear trouser cloth from the same outfit only on that downward-facing bind-space patch. It handles Original and Red Hat paint separately and restores the original material hooks on cancellation/disposal. The outer thigh and static reference asset are unchanged. Deep-flex cloth compression remains visible at close scale.

A focused regression checks the actual right knee above the hoof during swing, separate lower trailing knee, wide fixed plant and unchanged native carry endpoints. All seven animation tests, 480 browser configurations and the 3D build pass. Independent hostile review: **9/10** for this widened-leg revision after fresh rear and side views of both outfits. The localized paint repair preserves olive versus brown ownership and restores the prior shader hooks. Close-up cloth stretching is a disclosed nonblocking limitation.

## Both legs swing right

Following the clarified rear-view draw-over, the trailing knee and hoof also sweep to local +Z during the pull and leading-foot placement. The trailing hoof passes Z=0.04 at 2.55 seconds and Z=0.28 at 3.20 seconds, below the already raised right leg, then follows a rightward arc over the lip. It no longer hangs on the left while the right leg swings. The leading hoof remains planted, and the final carry stance, six-second timing and exact hand contacts are unchanged. The rear-view regression now requires both the trailing knee and hoof to travel right while staying below the leading knee.

Independent hostile visual review: **9/10** for the both-right revision, with fresh Original/Red Hat rear and side captures showing distinct limbs and no obvious interpenetration. Seven motion tests and 480 browser configurations pass, as does the 3D build. The updated intent test explicitly checks positive trailing hoof/knee displacement and lower vertical position; prior opposite-side expectations are removed.

## Supported weight transfer

The 3.20–3.85-second push now advances the chest through a forward hip/spine hinge before substantial hip extension. The left hand remains fixed while the right hand lifts and replants on the cap at local `[0.18,2,0.26]` by 3.395 seconds. The left hand then releases; the right palm remains planted through 3.7525 seconds, when the hips have reached the ledge and the shoulders have advanced past the planted hoof in X. Its release finishes at 3.85 seconds. The trailing hoof stays low during the initial forward loading, then follows the rising body and clears the lip afterward. The character stays bent through the trailing step and straightens after both hooves land. Both-right sideways movement, final native carry pose and six-second duration remain.

The supporting glove has a flat thumb and raised wrist/cuff attachment appropriate to a palm pressing onto the cap. A modest head counter-rotation keeps the muzzle clear. Both thigh and shin now use a common anatomical hinge plane: the previous independent rotations twisted knee fabric into pointed flaps when the pelvis pitched forward. This corrective changes pose rotations, not the approved mesh asset. Close-up cloth compression remains.

The new regression checks actual shoulder and hip world positions: shoulder advance precedes a five-centimetre hip rise, at least one palm supports the push through 3.75 seconds, actual supporting fingertips meet the cap, and final palm release waits until hips reach the face and shoulders pass the planted hoof in X. It also checks delayed trailing-leg passage and matching thigh/shin hinge axes. These are presentation/support proxies, not a center-of-mass physics simulation. Eight motion tests, 480 browser configurations and the 3D build pass. Fresh fixed-camera side/rear evidence covers both outfits across the complete transfer.

Independent hostile review of the supported-transfer revision: **9/10** after fresh Original/Red Hat side and rear temporal views and normal-speed playback. All eight tests passed independently; live playback completed in 6.05 seconds without browser errors. The reviewer confirmed the requested support order and removal of the hinge-induced trouser spikes. Approval remains limited to this horse/rifle proof on the fixed two-unit ledge.
