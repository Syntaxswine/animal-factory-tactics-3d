# Horse window vault

2026-09-28 · `work/window-shatter`

The user proposed a somersault through a window and was open to alternatives.
This first horse proof uses a compact, hand-supported tuck vault: the low window
has room for a horizontal tucked silhouette, with less rotation than a full roll.
Review it at `tactics/window-vault-study.html` before adapting other animals.

## Sequence

The 3.84-second clip stows the rifle, crouches, breaks the glass with the right
hand, braces the left glove on the sill, pushes into a tuck, passes through the
opening, releases into a descending arc, absorbs the landing, stands, and readies
the rifle. Glass breaks at 1.20 seconds, using the approved sound and fade effect.
The settled fragments disappear completely before the clip ends.

The crossing takes .35 seconds. Its forward velocity continues into the drop,
and its height decreases rather than holding a level midair pose. The rifle sits
lower on the back and the sling fits higher against the chest for clearance.
The shared equipment helper's new optional `slingWaist` setting preserves its old
default, so other studies retain their existing equipment placement.

## Geometry and scope

- Approved 10k horse and rifle, at their authored scale.
- Wall center X=0; movement travels in +X; floor Y=0 on both sides.
- Wall remains 2 high and .16 thick. Opening remains .85–1.55 high, with the
  existing .025 frame leaving a clear .875–1.525 by .95 aperture.
- Both feet remain planted during the crouch. The left glove visibly contacts
  the sill during the launch, then releases as the horse travels through.
- Rig, weapon and glove helper are restored when the study is disposed.
- `createWindowVault(worker).apply(timeSeconds)` is deterministic and supports
  scrubbing, reset and replay. Use a horse with its rifle and an identity parent.
- This is a presentation proof for one horse, normal outfit, rifle, and level
  ground. It does **not** authorize gameplay jumping or establish clearance for
  other animals, outfits, weapons, or landing heights.

The viewer includes four angles, gameplay/close scale, slow playback, silent
scrubbing, phase buttons, and a wall cutaway. Sound is triggered once when live
playback crosses the glass-impact time. Scrubbing does not produce repeated sound.

## Verification

**9/10 hostile review passed** after correcting clearance, planted-hand continuity,
and the level midair pause. Ten vault tests plus seventeen glass/equipment tests
pass. Focused checks cover rendered vertices and triangle edges against the wall/frame,
floor clearance, phase continuity, stationary/reachable planted supports, visible
glove contact with the sill, hand/glass impact timing, rewind, and exact restoration.
The triangle collision detector includes a negative control whose endpoints are
outside the wall but whose edge crosses it.

Run `node --test tests/window-vault.test.mjs tests/window-shatter.test.mjs
tests/equipment-stow.test.mjs`, followed by `npm run build:tactics-3d`.
`tools/window-vault-review.mjs` serves the packaged output, checks 8 angle/scale
configurations and 648 sampled poses, and verifies live playback, one glass sound,
final glass cleanup, and reset. Set `PLAYWRIGHT_PATH` to an installed Playwright
package. Screenshots and reports remain in uncommitted `artifacts/window-vault/`.

No gameplay movement, collision rules, saved state or canonical map dimensions
are modified. Architect/user approval of the motion remains the next art gate.
