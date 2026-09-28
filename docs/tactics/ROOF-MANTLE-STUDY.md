# Pool-style roof and cliff mantle — twelve-animal study

Viewer: `tactics/roof-mantle-study.html`. Choose **Surface: Roof / Cliff**, or open `tactics/roof-mantle-study.html?surface=cliff`. Both surfaces retain the approved two-unit wall height. The cliff mode uses the existing grass-and-rock tile kit, with the same lip and landing plane as the roof. The approved pose sheet is linked from the viewer and shipped as `assets/characters/roof-mantle-keyframes.png`.

This separate 6.25-second study covers all twelve completed animals, both original and Red Hat outfits, and the unarmed donkey guide. It transfers the user-approved pig sequence (`ef58cd6`) to the roster: press the chest over the lip and shift anatomically left **before** the right leg rises, slide onto the belly, gather the legs, stand and ready the weapon. The settled pose is held for 0.3 seconds so it can be judged before animation integration.

| Time | Action |
| --- | --- |
| 0–0.65 s | Stow rifle |
| 0.65–1.4 s | Crouch, jump, grab and catch weight |
| 1.4–2.2 s | Press to waist |
| 2.2–2.7 s | Chest over lip and anatomical-left weight shift; legs still hang |
| 2.7–3.35 s | Right leg over |
| 3.35–4 s | Slide belly onto roof with alternating palm replants |
| 4–4.3 s | Lie flat |
| 4.3–4.95 s | Gather legs with staggered hand and hoof transfers |
| 4.95–5.6 s | Stand |
| 5.6–6.25 s | Ready rifle |

## Species adaptations

- Horse, goat, bull, cow, donkey, sheep, skunk, rabbit and dog use `worker-mantle-profile.js` for the earlier chest-first left turn. The left palm remains planted through the leg lift; the right palm replants during the slide before the left moves. Each species has a reviewed belly-settle height and torso angle. Knees unfold early enough during gathering to keep the trousers above the landing. Larger boots and paws still lift before passing through the face; the sheep shirt remains beneath its waistcoat.
- Both pigs press the upper chest over the lip, turn left and lower the left shoulder **before** the right leg swings up. The left palm stays fixed through this early shift; the right arm relaxes and then replants during the slide. They settle into an uneven, belly-and-hip-supported sprawl, soften one elbow and briefly unload the left palm. The left palm replants before the right moves to gather their shorter/heavier bodies. Their waistband and waistcoat move together; proportions and the 6.25-second duration are unchanged.
- The hen has a separate unarmed, wing-assisted mantle: breast and left wing take the load before the right foot lifts, followed by a low belly pause with asymmetric feet and one wing briefly relaxed. The right foot gathers before the pelvis rises. No hands or weapon grips are added. Temporary apron/feather contact corrections leave rigid toes and bone lengths intact. The apron maintains 2 mm of roof clearance to avoid coplanar flicker. Its authored drape can stretch and compress triangles at the lip; this is a study correction, not a cloth simulation, and garment strain remains a future polish item.
- The donkey guide wears the blue Hawaiian shirt and straw hat and climbs empty-handed.
- The HMG sits slightly farther off the back during the settled/gather poses to clear the independently bending torso. The skunk additionally shifts it laterally while leaning so the receiver, ammunition, bipod and sling clear the plume. Weapon and tail geometry are unchanged. The sling remains an authored path rather than a simulated strap with weight or sway.

## Review controls

Choose a surface, animal and outfit, then use the four camera angles, grey form, timeline or phase buttons. Selection is reflected in the URL. Surface switching keeps the current pose for direct comparison. **Full climb** and **Gameplay** use a fixed camera; **Close** follows the character. Contact guides distinguish planted supports from moving limbs. Use the fixed side/rear views to assess weight transfer rather than relying only on the tracking camera.

## Implementation boundary

`createRoofMantle(worker, profile)` exposes absolute `apply(progress, {origin, heading})`, `restore()` and `dispose()` methods. It accepts the eleven authored mammal rigs with the full equipment catalog at a two-unit roof. See [equipment inspection](ROOF-MANTLE-WEAPON-REVIEW.md) for the weapon matrix, attachment corrections and review evidence. `createHenRoofMantle` provides the same playback/lifecycle interface for the unarmed hen. Local +X enters the roof, +Z is anatomical right, and the roof lip is X=0/Y=2. The rig must be unscaled beneath an identity parent.

The proof keeps a hand planted while repositioning the other and while gathering the feet. Hoof soles, rifle and limb lengths remain rigid. Temporary corrections keep the shirt hem tucked, finish hidden cuff paint, extend the buried pastern overlap and let the soft sling lie against the roof. Restoration returns the original transforms, material hooks and geometry attributes exactly.

`createCliffMantle(worker, profile)` selects the same mammal or hen animation for the natural cliff study. `createCliffMantleSurface()` supplies the matching tile-kit surface. The older horse-only `createCliffClimb` and its gameplay journey remain unchanged. This is an animation study for user/architect review; approach/landing, descent, pathfinding and gameplay timing remain separate integration work.

## Hostile review

**9/10 each** for the nine revised nonpig mammals, reviewed sequentially on roof and cliff in original/Red Hat outfits. The donkey guide also passes. Both pigs retain their separately approved reference sequence. A separate reviewer scored the hen **9/10** on both surfaces and outfits after fresh multi-angle renders and normal-speed playback.

The revised timing is checked at the end of the lean, before the lead foot enters the ledge. A shoulder-midpoint and chest-axis check guards against a nominal left rotation that leaves the upper body outside the lip. Belly tests use central front garment vertices, excluding sleeves, coat hems and tails. Gathering checks require actual rendered finger or foot contact, not merely a declared marker.

Review found and corrected a skunk HMG/plume intersection. The new triangle-level tests check receiver, ammunition, bipod and sling against the posed tail, including enclosure and 2 mm surface clearance. An isolated negative control disabling the new lateral offset fails on the feed lid and ammunition belt at 2.600 seconds. No tail or weapon geometry was changed.

Remaining polish: some close-up trouser compression and the hen's broad apron folds; straps and garments use authored deformation rather than physical simulation. Per-animal visual gates primarily inspect rifle presentation, with extra HMG views for the skunk and rabbit. The complete equipment matrix adds numeric and browser coverage; it does not imply a new art approval of every weapon model.

## Verification and reproduction

The completed all-animal revision passes **1,231 repository tests** and tactical asset verification (`npm run check`). The Pages build and module-closure check also pass. The character browser matrix passes **13,200 rendered pose samples across 1,200 configurations**, including 50 indexed outfit/surface clearance sweeps. The equipment browser matrix passes **578 combinations and 23,120 rendered samples**, plus 26 normal-speed horse equipment playbacks across the two surfaces. Neither browser matrix reports errors.

- The focused motion/equipment suites include 28 semantic checks for the nine nonpig mammals, eight pig weight-transfer regressions, twelve hen tests, five actual skunk HMG/tail tests, and fourteen cliff adapter/surface/packaging checks, alongside the existing dense motion and complete equipment suites.
- The browser motion matrix covers all 25 animal/outfit pairs on both surfaces: four views, three scales, grey/painted rendering, indexed-surface clearance sweeps including hats, and normal-speed playback.
- The browser equipment matrix covers the complete supported catalog in both outfits on both surfaces, plus the unarmed hen and donkey guide. Every weapon mode also receives normal-speed horse playback.
- The Pages build checks module closure for the shared worker profile, natural cliff surface adapter and study viewer. The older cliff gameplay journey is retained and tested separately.

Run the full repository checks with `npm run check`, then package with `npm run build:tactics-3d`. For focused development:

```text
node --test tests/roof-mantle.test.mjs tests/animal-roof-mantle.test.mjs tests/animal-mantle-style.test.mjs tests/pig-roof-mantle-weight.test.mjs tests/hen-roof-mantle.test.mjs tests/roof-mantle-weapons.test.mjs tests/skunk-mantle-equipment.test.mjs tests/cliff-mantle.test.mjs tests/cliff-climb.test.mjs tests/cliff-gameplay-animation.test.mjs
```

Set `PLAYWRIGHT_PATH` to a Playwright installation, start a local server on port 4439 (or set `REVIEW_URL`), and set `SURFACES=roof,cliff`. Run `node tools/animal-roof-mantle-review.mjs` and `node tools/roof-mantle-weapons-review.mjs`. Optional comma-separated `ANIMALS` and `WEAPONS` filters support focused reruns. Surface names are included in reports and screenshots; evidence stays under `artifacts/animal-roof-mantle/` and `artifacts/roof-mantle-weapons/`.
