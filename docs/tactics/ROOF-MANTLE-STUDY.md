# Pool-style roof mantle — horse proof

Viewer: `tactics/roof-mantle-study.html`. The approved pose sheet is linked from the viewer and shipped as `assets/characters/roof-mantle-keyframes.png`.

This separate 6.25-second horse/rifle study follows the user's revised roof-mantle sequence. The character presses the roof to waist height, leans forward and to his anatomical left, swings the right leg over, and slides fully belly-down onto the roof. He then gathers his legs, stands, and readies the rifle. The flat pose is held for 0.3 seconds so it can be judged before animation integration.

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

## Review controls

Use the four camera angles, original/Red Hat outfit, grey form, and timeline or phase buttons. **Full climb** and **Gameplay** use a fixed camera; **Close** follows the character. Contact guides distinguish planted supports from moving limbs. Use the fixed side/rear views to assess weight transfer rather than relying only on the tracking camera.

## Implementation boundary

`createRoofMantle(worker, profile)` exposes absolute `apply(progress, {origin, heading})`, `restore()` and `dispose()` methods. It currently accepts only the approved horse rig with the rifle, at a two-unit roof. Local +X enters the roof, +Z is anatomical right, and the roof lip is X=0/Y=2. The rig must be unscaled beneath an identity parent.

The proof keeps a hand planted while repositioning the other and while gathering the feet. Hoof soles, rifle and limb lengths remain rigid. Temporary corrections keep the shirt hem tucked, finish hidden cuff paint, extend the buried pastern overlap and let the soft sling lie against the roof. Restoration returns the original transforms, material hooks and geometry attributes exactly.

The existing cliff/ladder animation and gameplay traversal are unchanged. This is an animation study for user/architect review; other species, other weapons, approach/landing, descent, pathfinding and gameplay timing remain separate integration work.

## Hostile review

**9/10** for this bounded horse/rifle study. Fresh fixed-camera playback, close rear views, Red Hat rendering and 58 px/unit review passed. The reviewer confirmed the flat pause, staggered support and repaired cuff/pastern coverage. Close-view faceting remains a polish item.

## Verification

- Seven dedicated tests cover dense forward/reverse contact reach, rigid bones, every visible indexed surface against roof/ground, phase continuity, actual support during gathering, the flat pause, deterministic placement/scrubbing, carry endpoints, cancellation and failure cleanup.
- 31 focused mantle, cliff, ladder and equipment-stow tests passed.
- Browser review exercises 528 samples in 48 combinations of outfit, view, scale and grey/painted rendering; it records fixed rear, side and gameplay sequences.
- The 3D Pages build includes the viewer, dependencies and pose sheet, with module-closure validation.

Reproduce the browser checks with `PLAYWRIGHT_PATH` pointing to a Playwright installation, a local server on port 4439 (or `REVIEW_URL` override), then `node tools/roof-mantle-review.mjs`. Local recordings and contact sheets are written to `artifacts/roof-mantle/`.
