# Goat worker: second-species prototype

The goat tests the approved workflow: a roughly 30,000-triangle authoring asset,
bright painted surface detail, then a roughly 10,000-triangle character. This is a
standalone presentation experiment, not a graphics-branch merge or gameplay replacement.

Open `tactics/goat-worker.html?mesh=10k`. Compare the original sprite with either
mesh, or compare author and reduced versions directly. Neutral uses the idle
sprite; carry uses the rifle sprite. The front/side/back controls inspect the
model; the original sprite remains its existing single illustrated view.

## Geometry and equipment

- Author: **29,586 triangles**. Reduced character: **9,994 triangles**.
- Independent existing worker rifle: **480 triangles**; existing rifle wood atlas.
- Eight connected, closed surfaces and the shared 17-bone worker rig.
- Prototype height **1.65 world units**, including horns. Native preview uses
  the unchanged prototype camera and **58 CSS pixels/world unit**.
- Adapted the approved worker clothing to a narrower torso. Built a goat-specific
  skull, swept horns, hollow ears, short swept goatee and genuinely split hooves.
  Retained the accepted shared hands and clothing construction.
- The stored 29k geometry is the actual input to the 10k reduction. The field
  mesher is an offline construction tool; its intermediate triangles are not
  shipped as the character or used as a second hidden sculpt asset.
- Reduction's largest reported absolute error is about **0.00254 world units**,
  approximately **0.15 pixels** at native scale. This is a simplifier metric,
  not proof that every projected contour is identical.

## Painted skin

The built-in ImageGen tool painted the four registered neutral model views using
the original goat sprite for identity and the approved horse skin for brushwork.
The final asset is
`dist/assets/characters/lowpoly-proof/goat-worker-model-paint-v1.png`, edited since
at the throat in both profiles (The throat, below).
The complete prompt is in `GOAT-MODEL-PAINT-PROMPT.txt`; the grey edit target is
`hybrid-review/goat-worker/neutral-paint-reference.png`.

The skin uses cream fur, ochre horn ridges, a mustard shirt, olive overalls and
red scarf. The goat does not inherit the horse blaze or chestnut fallback colors.
The same image is used on both mesh resolutions. Side projections own the eye
and horn markings to reduce competing contours.

This retains the horse prototype's unlit, rest-space projection material. It is
not a finished conventional UV atlas. Visibility and part IDs protect direct
projection; hidden surfaces reuse paint from their own part across four views.
The coverage toggle distinguishes direct projection (green), reused paint
(blue), and flat fallback (magenta). A low fallback percentage alone does not
establish correct paint registration. Close inspection and turning remain
necessary; the image generation can shift fine features slightly.

## The throat (17 October 2026)

Under the jaw, behind the beard, the throat showed a pale patch with a hard outline and
the scarf's red in it. The user, circling it: "its this part here"; "why does it have a
hard outline and look like you can see through it to a scarf underneath it?"

- **Why.** The sculpt's throat was a flat front 2 to 2.5 cm behind where the profile
  paintings draw it, square to the jaw. No painting covered that front: the front painting
  shows the beard there, the profiles see it edge-on. Its paint was reused from all four
  views, the back painting among them, whose scarf wraps the neck at that height: the
  scarf seen through the neck. The reuse switched in at the front's sharp corners: the hard
  outline.
- **The sculpt** (the user: "modify the base sculpt to go out to the dimensions where the
  patch are", and of two shapes, "1: rounded at the painted line"). One ellipsoid blended
  into the neck and jaw rounds the throat out to the painted throat line
  (`build-goat-worker.mjs`, and its copies in `tools/speaking-heads/heads.mjs`). The
  triangle counts are unchanged.
- **The skin** ("after you alter the sculpt you will have to spend some time reworking the
  skins"):
  - Both profile paintings carry the throat's shadowed fur forward over the new throat,
    from 0.040 to 0.062 ahead of the neck's centre, with the old outline's last 2 px
    (`tools/goat-throat-fur.py`, run on the sheet as generated).
  - Reused paint comes only from the paintings that face the surface: the back painting no
    longer paints the throat's front (`horse-model-paint.js`, the goat's weights).
  - The profiles own the throat, as they own the eyes and horns: the front painting reached
    its sides edge-on beside the beard and laid the beard's light painted outline along them
    (the user: "right where the green line is you can still see a lighter colored line").
  - The throat's front, still in no painting (the beard hides it from the front, the profiles
    see it edge-on and the collar hides its base from them), reuses the profiles' throat fur
    4 mm inside its crest and above the collar. It stays blue in the coverage display.

- **The idle.** The goat's idle limits are refitted to its new rig (`node tools/fit-idle-rigs.mjs`,
  `dist/tactics/idle-fits.js`): it nods down 25 degrees at most, not 35. The beard takes its
  weights from the nearest point of the skull's surface, now the fuller throat's, and swings
  into the scarf sooner as the head bows. Raising the throat's base gave 30, or 15: the limit is
  the beard's weighting, which the idle shares with every hair, not the throat's height.

Evidence: `hybrid-review/goat-worker/throat-before-now.png` (before and now at portrait
scale: the viewer's below preset, front, three-quarter and side) and `throat-line-zoom.png`
(the user's spot, 4x). The 21 focused tests pass, and the 83 idle tests on the refitted table.

## Review and reproduction

The grey form underwent hostile review at 6.5, 7.5 and 8/10 before the corrected
horns, eye surfaces and beard reached **9/10 for beginning paint**. This is a
stage-specific gate, not final art or animation approval.

The painted prototype subsequently reached **9/10**, after correcting eye
registration onto the visible orbital surface and reusing the front strap paint
continuously across its hidden upper turn. That reuse remains blue in the
coverage display. The reviewer accepted the matched author/reduced native and
close views. A small scarf/collar transition remains visible close up and is a
nonblocking prototype limitation.

Validation: **21 focused tests passed**. **64 browser combinations** cover both
mesh resolutions, neutral/carry, eight headings, and native/close scale; there
were no browser, shader or asset errors. The approved horse also rendered through
the shared shader unchanged. The Pages distribution build passed; this task does
not publish to the separate 3D project.

Rebuild meshes with `node tools/build-goat-worker.mjs`.
Run `node --test tests/goat-worker.test.mjs tests/horse-light.test.mjs
tests/horse-model-paint.test.mjs tests/weapon-models.test.mjs
tests/weapon-grips.test.mjs` (one command).
With the local server on port 4389 and Playwright available, run
`node tools/goat-worker-review.mjs --grey` for the reference sheet and grey checks,
then `node tools/goat-worker-review.mjs` for the painted evidence.

Tests cover closed connected geometry, preserved horn/hoof landmarks, normalized
weights, neutral restoration, planted feet, actual hand surfaces near rifle
grips, and reduction provenance. The browser checks both meshes in neutral and
carry at eight headings and both scales, plus the reference inspection views. Shared horse and
weapon tests protect existing behavior.

Limits: static neutral/rifle-carry poses only. Walking, firing, transitions,
other equipment poses and gameplay integration are unproven for this goat.
The shared hands remain a known visual weakness. The rifle and broader weapon
material refinements remain their separate task.
