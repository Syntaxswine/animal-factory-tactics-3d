# Clothing and skinning corrections: handoff for the visual builder

Reviewed October 9, 2026. Apply the useful corrections to the current models and
animation projects, preserving their approved character shapes and equipment.
This is a reference handoff; no v5 animation code or replacement assets were
integrated as part of writing it.

## Source and freshness

The source is draft [PR #4](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/4),
`anim/idle-look-around`, inspected at `4a819dc6577f365c52011a05106498ebc6a7b847`.
Its substantive v5 changes are in `4dbc54e`; the later commit preserves the
existing viewer fix. V4 already reached main through
[PR #3](https://github.com/Syntaxswine/animal-factory-tactics-3d/pull/3).

Against canonical `40b7a6c0e4f4a68f7d1519290265b74def4cd0ca`, all eleven catalog
mammal `10k-data.json` files are byte-identical. The catalog and its local model
module dependencies are also unchanged: 30 files compared in total, including
those eleven meshes. This is not a claim about unpublished builder work or every
appearance variant. Compare again with the destination branch before applying.

PR #4 changes animation code, fitted motion limits, tests and documentation. It
contains no replacement animal meshes or texture atlases. Here **skinning means
the weights that make a surface follow bones**, including clothing; it does not
mean repainting the characters. The corrections currently belong to the idle
controller and are undone when it is disposed. Other animations do not
automatically inherit them.

The supplied final-review message reports **8/10, no must-fix, after round five**;
the target was 9/10. The complete round-five report was missing at the initial
handoff, and has since been committed; see the author's notes below. The findings
here come from committed code, documentation and renders, not an independently
repeated v5 animation audit.

## Corrections worth carrying forward

| Area | What to apply to current work | What to preserve/check |
|---|---|---|
| Collar, scarf, shirt and bib | Make an outer layer follow the surface directly beneath it. V5 transfers nearby underlying cloth weights instead of independently pulling every layer toward the neck. | A downward glance should not drag the lower chest or pull the bib through the shirt. Keep the restored neck lengths, especially the donkey's. |
| Neck attachment | Fade neck influence near the actual neck base. Choose skin at a compatible height; when there is no suitable surface, keep the garment's own weights. | A collar must not attach to a nearby jaw merely because that is the nearest point. Inspect the shoulder beside the collar during nods. |
| Shirt sides and sleeves | Remove unintended **forearm** influence from torso cloth beside the hands, while retaining the upper-arm influence that supports broad sleeves. Match sleeve-end weights to the forearm underneath. | The pigs' upper sleeves must not collapse or lag behind their arms. Preserve the approved armband and hand positions. |
| Collision checks | Check triangle interiors and crossings as well as mesh vertices. V5 samples affected triangle surfaces at 4 mm spacing, interpolating the already-skinned corners. | Sparse vertices can pass while the middle of a large triangle cuts through another surface. Use an independent check and rendered motion, not only the fitting routine's verdict. |
| Reusable fitted limits | Invalidate cached limits when vertices, triangles, bone transforms or weights change. Refit the destination rig. | V5 hashes individual ordered vertices rather than aggregate sums. Do not copy its numeric limits onto a changed model or another controller. |

The main implementation reference is the clothing/neck section inside
[`createIdle` at the reviewed commit](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/4a819dc6577f365c52011a05106498ebc6a7b847/dist/tactics/idle-motion.js).
The [author's report](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/4a819dc6577f365c52011a05106498ebc6a7b847/docs/tactics/IDLE-LOOK-AROUND.md)
explains the measurements and remaining compromises.

## Local model changes to investigate first

| Character | Remaining obstruction reported by v5 | Proposed localized pass |
|---|---|---|
| Sheep | Wool ruff overhangs the tight neckerchief; forearms contact the shirt/waistcoat. | Adjust the scarf's fit beneath the ruff and improve sleeve/waist clearance. Retain the approved soft scarf shape and overall silhouette. |
| Pig director | Jowls rest directly on the collar, leaving only 2.5 degrees of head turn each way and no nod in this fit. | Test a small collar clearance or local corrective deformation beneath the jaw. Retain the jowls and character identity. |
| Pig foreman | Shirt hem/waistband presses into the forearms during leaning. | Improve the local hem/sleeve fit and weights. V5 avoids the problem partly by limiting him to a quarter lean and disabling arm easing; those are protective limits, not an artistic target. |
| Goat and other bib/vest wearers | Some edges still slide or show thin uneven seams during turns and nods. The report also names the goat's collar showing through its throat at rest. | Inspect the rest pose first, then moving layers. Prioritize seams visible at gameplay size; confirm the goat throat finding on the current asset before editing it. |

The supplied close-ups show remaining thin, jagged boundaries around sleeves,
bibs and waistcoats. Some are already visible at rest. These are useful places
for polish, but static pictures do not establish whether an edge flickers in
motion.

Pinned reference renders:

- [Pig foreman: rest and leans](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/4a819dc6577f365c52011a05106498ebc6a7b847/docs/tactics/hybrid-review/idle/clothes-foreman-leans.png)
- [Six characters: bibs at rest and looking down](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/4a819dc6577f365c52011a05106498ebc6a7b847/docs/tactics/hybrid-review/idle/clothes-bib-glances.png)
- [Goat, sheep, horse and skunk: layer-edge movement](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/4a819dc6577f365c52011a05106498ebc6a7b847/docs/tactics/hybrid-review/idle/clothes-slides.png)

## Porting and acceptance

Start from the latest destination branch in its own worktree. Transfer the
relevant weighting and measurement changes in a focused patch. The armed-idle
controller is separate from `idle-motion.js`; enabling both on one rig would
give two controllers ownership of the pose. If corrections become shared rig
preparation, make their lifetime and restoration explicit and verify transitions
to the current walk, aim/fire, throw and traversal controllers.

V5 uses a **6 mm neighborhood** around previously covered points to choose a
depth allowance; it does not limit how far the covering edge travels. Within
that neighborhood a point may sink to the prior covered depth plus **3 mm**;
elsewhere the allowance is **3 mm**. Round five measured edge advances of
**15–18 mm** and strict sinking up to **6.5 mm** on fresh seeds. Keep depth and
travel measurements separate, and improve weighting or clearance before
increasing tolerances to buy more motion.

For each changed character, compare rest, left/right turn, downward glance,
breath, lean and arm movement from front, side, rear and three-quarter views.
Show close-ups and normal gameplay size. Check representative current armed
carries and a throw/climb transition as regressions. Inspect affected outfit
variants as well as the default worker. Keep hands, grips, weapon scale and
approved character proportions intact.

Retain the relevant independent surface and lifecycle regressions. If porting
the idle changes themselves, run `tests/idle-motion.test.mjs`,
`tests/idle-clothing.test.mjs` and `tests/idle-fits.test.mjs`; regenerate
`idle-fits.js` using the matching `tools/fit-idle-rigs.mjs` after rig or weighting
changes. Additional controller changes need their own existing regression suites.
The viewer loading fix is already in canonical; the PR's remaining viewer diff
is only a timing comment. Hen wings were excluded from this study and need their
own checks.

Return the changed files and commit, paired before/after views, the rigs and
outfits checked, test results, and any remaining motion restrictions. Completion
means cleaner clothing movement on the current characters, with their existing
animation and equipment work preserved.

## Notes from the v5 author after review round 5 — October 9, 2026

Added by the v5 author. The round-five report, whole, is now on the PR branch:
[IDLE-REVIEW-ROUND-5.md](https://github.com/Syntaxswine/animal-factory-tactics-3d/blob/b8f6a53d21a8985bef764ee3ed694d448749bf9d/docs/tactics/IDLE-REVIEW-ROUND-5.md)
(8/10, no must-fix), with the author's doc corrected to match at the same commit. Four of its findings bear
on a port. The first corrected an error in this handoff's original tolerance description, repeated from
the v5 doc; the text above now incorporates that correction. The weighting recommendations still apply.

- **The 6 mm bounds depth, not travel.** Within 6 mm of where its part lay covered at rest, a point may sink
  as deep as that covered point lay, plus 3 mm; elsewhere 3 mm. An edge may advance any distance while what
  it covers sinks 3 mm or less. Through loops, edges advanced 15–18 mm over what they cover on the sheep and
  the pig foreman (14 mm on the dog's knot); none read as a tear at the close-up. On fresh seeds the strict
  no-slide census found up to 6.5 mm (the 5.9 mm was seeds 1–2). If a port needs a bound on travel, measure
  the advance itself.
- **Key cached limits on the rest pose.** v5's `rigKey` hashes the bones' current positions, turns and
  scales, so a worker another controller left posed (a carry, mid-walk) misses its row and refits for
  22–37 s on the main thread, under a new key each pose. Hash the bind or neutral pose before the key is
  shared with other controllers. v5's key test edits only the first part.
- **Probe the combinations that play.** v5 fits each motion on its own: its probes never turn the hips, lag
  the arms or take a sigh inside a lean. On fresh seeds its own census failed 3 of 3,960 frames by
  0.1–0.8 mm (the sheep, the pig foreman). Carries, aiming and transitions add combinations: probe those,
  and sample the held characters densely (every 0.5 s on several seeds). v5's census test, one seed every
  2 s, passed a mutant that reverted its knee fix.
- **The depth rule is blind to direction.** It scores an inner layer going under an outer one (a bib's edge
  covering more shirt: natural) like an outer layer going into an inner one (braces into a shirt:
  clipping). The natural case is what limits the horse, the bull and the cow. The neck glue's layer order
  can tell them apart; that corrects the measure rather than loosening a tolerance.
