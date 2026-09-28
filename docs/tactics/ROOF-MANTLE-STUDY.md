# Pool-style roof mantle — twelve-animal study

Viewer: `tactics/roof-mantle-study.html`. The approved pose sheet is linked from the viewer and shipped as `assets/characters/roof-mantle-keyframes.png`.

This separate 6.25-second study covers all twelve completed animals, both original and Red Hat outfits, and the unarmed donkey guide. It follows the user's revised roof-mantle sequence. The character presses the roof to waist height, leans forward and to his anatomical left, swings the right leg over, and slides fully belly-down onto the roof. He then gathers his legs, stands, and readies the rifle. The flat pose is held for 0.3 seconds so it can be judged before animation integration.

| Time | Action |
| --- | --- |
| 0–0.65 s | Stow rifle |
| 0.65–1.4 s | Crouch, jump, grab and catch weight |
| 1.4–2.2 s | Press to waist |
| 2.2–2.7 s | Lean forward and left |
| 2.7–3.35 s | Right leg over |
| 3.35–4 s | Slide belly onto roof with alternating palm replants |
| 4–4.3 s | Lie flat |
| 4.3–4.95 s | Gather legs with staggered hand and hoof transfers |
| 4.95–5.6 s | Stand |
| 5.6–6.25 s | Ready rifle |

## Species adaptations

- Horse, goat, bull, cow, donkey, sheep, skunk, rabbit and dog retain the approved support sequence. Larger boots and paws lift before passing through the roof face; the sheep shirt remains beneath its waistcoat.
- Both pigs press the upper chest over the lip before the right leg swings up. They then slide into an uneven, belly-and-hip-supported sprawl, soften one elbow and briefly unload the left palm. The left palm replants before the right moves to gather their shorter/heavier bodies. Their waistband and waistcoat move together; proportions and the 6.25-second duration are unchanged.
- The hen has a separate unarmed, wing-assisted mantle: breast press, right-leg lead, low belly pause, then a foot-supported rise. No hands or weapon grips are added. Temporary apron/feather contact corrections leave rigid toes and bone lengths intact. The apron maintains 2 mm of roof clearance to avoid coplanar flicker. Its authored drape can stretch and compress triangles at the lip; this is a study correction, not a cloth simulation, and garment strain remains a future polish item.
- The donkey guide wears the blue Hawaiian shirt and straw hat and climbs empty-handed.

## Review controls

Choose an animal and outfit, then use the four camera angles, grey form, timeline or phase buttons. Selection is reflected in the URL. **Full climb** and **Gameplay** use a fixed camera; **Close** follows the character. Contact guides distinguish planted supports from moving limbs. Use the fixed side/rear views to assess weight transfer rather than relying only on the tracking camera.

## Implementation boundary

`createRoofMantle(worker, profile)` exposes absolute `apply(progress, {origin, heading})`, `restore()` and `dispose()` methods. It accepts the eleven authored mammal rigs with the full equipment catalog at a two-unit roof. See [equipment inspection](ROOF-MANTLE-WEAPON-REVIEW.md) for the weapon matrix, attachment corrections and review evidence. `createHenRoofMantle` provides the same playback/lifecycle interface for the unarmed hen. Local +X enters the roof, +Z is anatomical right, and the roof lip is X=0/Y=2. The rig must be unscaled beneath an identity parent.

The proof keeps a hand planted while repositioning the other and while gathering the feet. Hoof soles, rifle and limb lengths remain rigid. Temporary corrections keep the shirt hem tucked, finish hidden cuff paint, extend the buried pastern overlap and let the soft sling lie against the roof. Restoration returns the original transforms, material hooks and geometry attributes exactly.

The existing cliff/ladder animation and gameplay traversal are unchanged. This is an animation study for user/architect review; approach/landing, descent, pathfinding and gameplay timing remain separate integration work.

## Hostile review

**9/10 each** for all twelve animals, including original/Red Hat outfits and the donkey guide. Independent fixed-camera playback, close rear/side views and 58 px/unit review confirmed species silhouettes, planted support, flat pause, costume coverage and full-length playback. The hen passed after independent checks of both outfits, actual feather/toe support, apron clearance and normal-time playback. Close-view faceting remains a polish item.

## Verification

- The subsequent pig weight-transfer correction passed **220 focused/regression tests**, including the full equipment suite and six new chest-first, belly/hip-contact and arm-unloading regressions. Independent hostile review scored both pigs **9/10** after fresh side/rear views, both outfits and four normal-speed runs. Minor trouser pinching during gathering remains a polish item.
- The revised pigs passed 1,056 browser samples in 96 view/outfit/scale/rendering configurations and four actual indexed-surface sweeps. All 52 pig/outfit/equipment combinations passed another 2,080 rendered samples with no browser errors.
- **70 focused tests pass**, including eight existing cliff-climb regression tests. The original seven horse tests remain. The roster suite adds four dense contact/clearance/continuity/lifecycle checks per mammal, roster coverage and an unarmed guide regression. Hen tests check rigid bones, visible wing/toe contact after cloth correction, continuous support, original endpoint geometry, surface clearance, deterministic placement and restoration.
- Browser review exercises 6,600 samples in 600 combinations of animal, outfit, view, scale and grey/painted rendering. All 25 animal/outfit pairs also receive actual indexed-surface clearance sweeps, including hats. Normal-time playback covers every species. After the final hen garment correction, another 528 samples across 48 configurations and both outfit surface sweeps passed without browser errors.
- The 3D Pages build includes the viewer and dependencies with module-closure validation. Existing gameplay traversal is untouched.

Reproduce unit checks with `node --test tests/roof-mantle.test.mjs tests/animal-roof-mantle.test.mjs tests/hen-roof-mantle.test.mjs tests/cliff-climb.test.mjs tests/roof-mantle-weapons.test.mjs tests/pig-roof-mantle-weight.test.mjs`. Set `PLAYWRIGHT_PATH` to a Playwright installation, start a local server on port 4439 (or use `REVIEW_URL`), then run `node tools/animal-roof-mantle-review.mjs`. Optional `ANIMALS=pig-foreman,pig-director` filters a focused rerun. Local evidence is saved under `artifacts/animal-roof-mantle/`.
