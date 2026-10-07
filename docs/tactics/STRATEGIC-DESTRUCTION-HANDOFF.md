# Strategic site destruction

The radio tower, radar tower and SAM site now have deterministic destruction
keyframes and a reversible animation study. Each sequence begins and ends with
the approved assets from `5d77ec0`. The eight-by-eight placement area, concrete
foundations and service-hut positions retain their existing coordinates.

## Review stages

- [x] Build the collapse without smoke or explosions.
- [x] Explain the break, fall, first impacts, settled fragments and final wreck.
- [x] Cut transient fragments from the original painted surfaces; land them before fading.
- [x] Validate unchanged endpoints, foundation anchors, repeatable scrubbing and cleanup.
- [x] Independent hostile review of the exposed collapse: **9/10**, 2026-10-07.
- [x] Add painterly explosions and thick black obscuring smoke after that gate.
- [x] Independent hostile review of explosions and smoke: **9/10**, 2026-10-07.
- [x] Verify all three sites in the browser, packaged module closure and asset checks.

## Part correspondence

| Site | Surviving parts | Parts that shatter and fade |
| --- | --- | --- |
| Radio | Lower and upper lattice sections, lower microwave dish, permanent footings and hut | Aerial, ladder, torn braces and second microwave dish |
| Radar | Broken reflector, torn dish sector, fallen maintenance platform, buckled feet | Upper trestle, yoke, ladder, planks, extra railings and feed supports |
| SAM | Missile body, nose cone, torn rail section, bent launcher and turntable casing | Other missile casing, fittings and lift arms |

Small persistent rubble follows separate trajectories into the authored wreck.
Hut walls, cabinets and slab panels change paint in place; the concrete does not
dissolve or shift. Structural damage is art-directed between the intact and
wrecked forms. Surviving sections stay opaque as vertices deform into the damaged
shape; their painted material darkens at impact. Only transient debris fades.
This is not a general rigid-body collision solver.

The no-effects review caught an impact dissolve, followed by an incomplete
surface at the SAM rail handoff. Both are corrected: matching parts use direct
vertex correspondence, and differently tessellated parts use complete source
and destination surfaces throughout their opaque deformation. The independent
review checked all 12 major handoffs in two views at 180 px/tile: 22 of 24
silhouettes were pixel-identical, with two one-pixel missile-edge differences.
All six approved endpoint hashes remained unchanged.

Saved boards: [radio](strategic-destruction-review/radio-keyframes.png),
[radar](strategic-destruction-review/radar-keyframes.png),
[SAM](strategic-destruction-review/sam-keyframes.png).

The final effects review also passed **9/10** across three-quarter, side,
overhead and gameplay-size views. Smoke obscures the collapse and clears to the
unchanged wreck; the toggle preserves time and reverse scrubbing is stable.
See the [review record](strategic-destruction-review/REVIEW.md) and effects boards:
[radio](strategic-destruction-review/radio-effects.png),
[radar](strategic-destruction-review/radar-effects.png),
[SAM](strategic-destruction-review/sam-effects.png).

## Use

Open `tactics/strategic-destruction-study.html`. Select a site, then use the
keyframe board or play the animation. Clicking a board frame opens that instant.
The camera remains fixed across the sequence; side and overhead views, a tile
grid and gameplay-size framing are available. Scrubbing backwards reconstructs
the state directly, without resetting a physics simulation.

The **Explosions & smoke** checkbox adds the effects. It defaults off so the
keyframes explain the structure; `?effects=1&mode=motion` opens the full sequence.
Two offset painted bursts lead into overlapping charcoal-black smoke billows.
Brief ground-level flames and embers end first, then the smoke clears completely
to the approved wreck. There is no lingering cloud at either endpoint.

The effects use the existing approved tank-burst, flame and black-smoke atlases,
with no replacement of the sites' painted materials. The camera's effects mode
reserves room for the rising cloud and stays fixed throughout playback.

The presentation API is `createSiteDestruction(library, siteId)` in
`dist/tactics/strategic-site-destruction.js`:

- Add `root` to the scene; call `apply(seconds)` to pose it.
- `duration` is 7.6 seconds, including the settled-wreck hold.
- `keyframes` supplies six labelled review times for the chosen site.
- `diagnostics()` reports supported, buckling, falling and settled parts, plus
  airborne/visible transient-fragment counts and fade ordering.
- `dispose()` releases only the rig's resources. The supplied strategic-site
  library and atlas retain their existing ownership contract.

`createStrategicDestructionEffects(textures, siteId)` returns a separate effects
root. Call `apply(seconds, camera, {visible})` alongside the geometry rig. Hiding
effects also disables the transient point lights. Its three textures are caller
owned; disposal releases only effect cards and materials.

The library's new `articulated()` accessor lazily supplies an unbatched hierarchy
for authoring; ordinary `build()` assets retain the approved batched geometry.

## Scorched ground

Both viewers now include **Burn marks**, enabled by default and independent of
the explosions/smoke toggle. Intact sites stay clean. Four overlapping painted
stains per site appear from 0.5 to 2 seconds and remain beneath the settled wreck.
Broad marks cross paving joins, with broken alpha edges and translucent areas
that retain the original concrete. The shader clips to the local 8 by 8 slab,
including when the whole site is rotated or translated. Foundations and raised
equipment occlude the flat paint through ordinary depth testing.

`createSiteScorch(atlas, siteId)` in `strategic-site-scorch.js` returns a separate
`root`, `setAmount(0..1)`, `at(seconds)`, `diagnostics()` and `dispose()`. Place this
root with the same transform as the site's root. Load `SITE_SCORCH_ATLAS` with
`SRGBColorSpace`. The atlas is caller-owned; the
decal owns its one eight-triangle mesh and material. The exported asset manifest
names this companion layer. The structural library and passage masks are unchanged.

The [existing approved scorch atlas](strategic-destruction-review/SCORCH-ATLAS.md)
is reused byte-for-byte from the earlier ground-fire study. This is soot painted
on the ground, separate from the character ash-pile texture. It creates no new
burning terrain, obstruction or damage rules. The layer is hidden in grey and
wireframe comparison modes so it cannot become an opaque rectangular mesh.

Run `node --test tests/strategic-site-scorch.test.mjs` and
`node tools/check-strategic-scorch.mjs` for the focused follow-up checks.

## Validation

Run the focused geometry and motion tests:

```sh
node --test tests/strategic-sites.test.mjs tests/strategic-site-clearance.test.mjs tests/strategic-site-destruction.test.mjs tests/strategic-destruction-effects.test.mjs
```

Set `PLAYWRIGHT_PATH` to an installed Playwright package, then run
`node tools/check-strategic-destruction.mjs`. Its short-lived browser is tracked
and closed in a `finally` block. It uses the retained local preview on port 4475,
or `SITE_ORIGIN` when supplied. Captures and diagnostics are written under
`artifacts/strategic-sites/destruction/`.

The browser regression renders 12 isolated part silhouettes across the final
topology handoff, plus exposed/effects views for all sites, reverse scrubbing and
unobscured endpoints. The effects tests cover timing, hiding all lights/cards,
repeatable scrubbing and borrowed-texture ownership.

`npm run build:tactics-3d` includes the new viewer and checks its module closure.

Final validation on 2026-10-07: **68 tests passed**, covering 38 site/clearance/
destruction/effects tests plus 30 existing barrel and tank blast regressions.
The browser checker passed all three sites, exposed and effects views, reverse
scrubbing and 12 isolated geometry handoffs without console or page errors.
The Pages build and asset checker both passed. Temporary review browsers closed
successfully; the existing local preview retains its original expiry.

## Integration boundary

This work is a model and animation study. Strategic-site editor registration,
damage rules, destruction triggers, collision-state timing, sound and networked
playback remain integration work. A motion review does not imply those systems
are implemented. No gameplay rules are changed by this study.
