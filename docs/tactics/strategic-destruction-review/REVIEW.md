# Strategic destruction review — 2026-10-07

Scope: radio tower, radar tower and SAM site destruction studies. Both stages
were independently reviewed by the hostile review subagent against the required
9/10 threshold. Gameplay destruction is outside this review.

## Exposed collapse — 9/10

The first reviews held an impact dissolve and a missing surface at the final
SAM rail handoff. The delivered rig keeps surviving components opaque and uses
complete source/destination surface correspondence. Source-only fittings break
into painted fragments that land, pause and fade like broken glass.

The reviewer inspected three-quarter, side, overhead and gameplay-size views.
All 12 major handoffs were checked in two views at 180 pixels per tile: 22 of
24 silhouettes were identical, and two missile views differed by one edge pixel.
All six original endpoint hashes matched the approved intact/wreck assets.
Foundation positions and service-hut footprints remain unchanged.

Boards: [radio](radio-keyframes.png), [radar](radar-keyframes.png),
[SAM](sam-keyframes.png).

## Explosion and smoke — 9/10

Added only after the exposed-collapse gate passed. Painted bursts, offset
secondary flashes, overlapping black billows, short residual flames and embers
obscure the falling structure and clear before the final wreck hold.

The independent reviewer verified normal timed playback, fixed framing,
time-preserving toggles, reverse scrubbing and clean endpoints. Toggle round
trips were pixel-identical. A few reversed burst pixels differed by one colour
channel unit; late smoke was identical. The final wreck rendered identically
with the effect root hidden. No actionable blocker or browser error remained.

Boards: [radio](radio-effects.png), [radar](radar-effects.png),
[SAM](sam-effects.png).

## Checks and delivery boundary

- 68 focused and related regression tests passed: 38 site/clearance/destruction/
  effects tests, 14 barrel blast tests and 16 tank blast tests.
- Automated browser checks covered all three sites with and without effects,
  reverse scrubbing, endpoints and 12 isolated part handoffs. All passed.
- The Pages build, packaged module closure and asset checker passed.
- Review browser processes closed and their recorded identities were absent.
- Delivery belongs to `work/strategic-sites`; this branch does not deploy Pages.
  Editor registration, damage triggers, passage-state timing and sound still
  require gameplay integration.

## Scorched-ground follow-up — 9/10

The user requested persistent scorched ground beneath the sites. A separate
painted layer now covers the blast/impact area on each slab, reusing the approved
four-cell ground-scorch atlas. The source PNG is unchanged (SHA-256
`b3455a35d765b4a0c675d2278c2999c02f1e5be67f7c354488312a7262c2a62a`).

The independent review passed **9/10** on 2026-10-07. Fresh static/animation
views show flat, irregular soot spanning tile joins, clean slab borders and
readable foundations. The original six structural endpoint hashes, passage
maps and camera framing remain unchanged. Static and animated aftermaths use
identical mark geometry; intact sites are clean. Marks reach full strength by
two seconds and persist through the final hold independently of the smoke.

All **42 focused site, clearance, animation, effects and scorch tests passed**.
The automated browser check also passed all three sites, including rotated and
translated slab clipping with zero spill. Isolated scorch rasters have positive
paint coverage and are pixel-identical after resetting. Whole-scene captures
retain tiny edge differences as diagnostics; the independent review's whole-
scene round trips were pixel-identical. The Pages
build and asset checker passed. Both short-lived review browsers closed.

Scorched comparison captures: [radio](radio-scorch.png),
[radar](radar-scorch.png), [SAM](sam-scorch.png).
