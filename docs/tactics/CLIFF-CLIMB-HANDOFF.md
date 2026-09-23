# Cliff climb animation proof

The first motion study uses the approved 10k horse and rifle on a flat cliff exactly **2.00 world units high**, matching the approved wall height. Open `tactics/cliff-climb-study.html`. Original and Red Hat outfits, four camera angles, close/gameplay scales, grey form, contact guides, phase buttons and an absolute timeline are available.

The six-second sequence follows the requested order: stow rifle, crouch and jump with arms raised, catch the edge, pull up, swing the right/leading hoof onto the cap, push up, bring the trailing leg through, stand, and ready the rifle. The torso leans left to make room for the right leg, then shifts right and rises over that planted hoof. The leading hoof rises outside the face before crossing the lip; the body rises before its seat advances over the rock. Both hands hold fixed edge contacts until the leading hoof is planted. The rifle remains visible on its shoulder sling during the climb.

This is a **horse/rifle presentation proof**, not a gameplay traversal implementation or approval of the other animals. No core, editor, map, inventory or navigation rule is changed. There is no authored descent or swimming approach.

## Integration contract

- `createCliffClimb(worker, profile)` in `dist/tactics/cliff-climb.js` returns `duration`, frozen `phases`, `apply`, `diagnostics`, `restore`, and `dispose`.
- Call `apply(progress, {origin: [x,y,z], heading: degrees})` with absolute progress in 0–1. It clamps finite progress and rejects malformed inputs. Local +X points into the ledge; the face is X=0 and the cap Y=2. Heading rotates this frame about Y with the tactical convention. The root must be unscaled under an identity parent. Origins and headings transform all reported contact points.
- The actor begins at local root `[-0.65,0,0]` and finishes at `[0.365,2,0]`, both carrying the rifle. Call the animation after ordinary posture updates. Avoid another controller overwriting its bones or equipment during playback.
- Diagnostics include phase/time, local and world root, hand/foot contacts, planted flags, contact error, and weapon presentation. These are review diagnostics, not simulation events or route validation.
- Constructor capture, cancellation and disposal restore exact entry transforms, visibility and affected geometry attribute references. Construction failure rolls back the helpers it created. Dispose once the clip has finished or is cancelled; subsequent calls to dispose are harmless. Inventory ownership is never changed.
- The temporary hand mesh curls fingers over the stone instead of around a ladder rung. The horse's upper pastern temporarily shares the trouser cuff's shin/hoof skin blend, preventing an exposed rigid upper-hoof cap during deep flex. Lower horn and sole vertices remain rigid; original attributes are restored afterward. The approved character asset is unchanged.

## Remaining integration work

Validate an actual climbable edge, clear handholds, lower approach space and a hoof/body-sized upper landing before starting this clip. Transform the local frame to the chosen face. Reserve the animation route and upper support in the gameplay adapter. The normal floor spacing is 2.12: do not silently substitute that for this 2.00-unit physical cap. Impassable crag faces must not gain climb links; usable ground behind them remains a separate support question. Water-bottom cliffs do not automatically acquire a swimming or wading approach.

Other animals, equipment, uneven/curved edge contacts and descending need their own motion and visual review. The horse fixture does not establish those cases.

## Validation

Six permanent animation tests cover fixed-length limbs and planted contacts, all visible skinned and helper surfaces against the cliff/floor, fingertip contact, phase-boundary continuity, left/right weight transfer, deterministic scrubbing, world-frame transforms, rigid sole and upper-pastern attachment, exact restoration, invalid input and injected construction failure. Together with cliff geometry/tile/water regressions, **19 tests pass**.

The browser matrix renders **480 outfit/view/scale/grey/phase combinations** with no errors, plus a narrow viewport overflow check. Independent real-time playback completed in approximately six seconds. The 3D Pages build includes the motion module and viewer. Independent hostile review: **9/10** after the stronger leftward lean and endpoint carry correction. Fresh close and gameplay-size Red Hat views passed; actual playback finished in 6.10 seconds without browser errors. The independent visible-surface scan found no blocking rock intersections, and maximum phase-boundary displacement was 2.03 micrometres. Deep-flex cloth remains compressed at close scale; this is a nonblocking limitation of the bounded motion study.
