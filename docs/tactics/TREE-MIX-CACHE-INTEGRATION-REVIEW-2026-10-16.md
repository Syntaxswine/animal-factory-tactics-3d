# Tree mixes and live geometry cache: integration review

Reviewed `a42004f` and `935cbca` against canonical `6a58a48` on 16 October 2026.

**Approved for canonical with the small preview correction included in this review.** No blocking regression found. This approves the editor integration and cache correctness; populated battles still need rendering and simulation performance work.

## What passed review

- Brush-led, mixed and tree-led composition are saved per cell, using the same deterministic population for art and physical trunks. Existing trees stay in place when neighboring cells change mix. Sight screens and the impassable mask remain intact.
- The editor's tree-cover-only brush preserves undergrowth density and protects clear ground, structures and access points. The packaged editor successfully painted a tree-led patch, undid it and redid it. The inspection modes clearly warn that hiding vegetation does not change obstruction.
- The packaged corridor study showed the selected character through foreground foliage, and cutaway openings updated during movement. The reveal remains a presentation effect: selected friendly display positions and known route/hover ground drive it. Hidden enemies do not generate apertures or become visible actors.
- Live geometry uses an explicit revision instead of serializing the whole map every frame. The mutation audit and regression tests cover doors, lock picking/forcing, fence cutting, bullets, floor collapse, canopies, explosions, barrel chains, strategic-site destruction, saves and campaign transitions. Temporary explosion scenery can still differ from the authoritative map. Editable maps retain content checks.

## Correction made during review

The added-tree preview always requested a mature tree. That made open-woodland previews 1.8 times their eventual size. `InspectionScene.preview` now takes maturity from the authoritative tree's `dense` flag, matching the existing placed-tree renderers.

A headless geometry comparison checked the actual preview bounds against the placement record's scale for open woodland and dense thicket in all five habitats: **10/10 cases matched**. This changes only the editor preview, not saved trees or gameplay.

## Verification

- Independent full `npm run check` on `935cbca`: **2,528/2,528 tests passed**, followed by the asset check; no skips or failures.
- Generated-core verification: all 20 modules matched their recorded adapters.
- Final editor-preview syntax check, 10 geometry comparisons and the final 3D Pages build passed. The build includes the module-closure checks and worker dependency.
- Browser smoke checks used the built Pages output. No console warnings or errors were captured in the forest corridor or editor checks. These were functional checks, not timing benchmarks; the full test suite was running concurrently.
- The coder's separate populated-battle comparison has equal complete save hashes, equal final state hashes and byte-identical captured images. Its recorded candidate renderer hash matches `935cbca`. The manifest's base-commit label remains `a42004f`, so use the recorded source hashes to distinguish the two runs.

## Performance judgment and next work

The separate cache **prototype** experiment reduced median CPU frame work from roughly **40–41 ms to 27 ms**, with about 20 callbacks/second becoming 29–30 across three matched pairs. That is useful evidence for this approach. It is not a measured 47% frame-rate guarantee for the final production implementation: the final comparison primarily established state/image equivalence, and callback rate is not displayed FPS.

The populated fixture still submitted about 7,647 draw calls and 9.62 million triangles including shadow passes. Its enemy-step median remained around 108 ms, and rare long frames remained. Next priorities:

1. Reduce character and shadow submissions while preserving contact shadows, lighting and hidden-actor rules. The existing no-shadow and no-character measurements justify investigating these paths; they are diagnostic comparisons, not proposed visual settings.
2. Profile and reduce enemy-turn spikes, especially repeated sight/path/world work. Verify a complete enemy turn and normal input-driven battle after each optimization.
3. Resolve the separately recorded texture-unit warning and startup WebGL error 1281. Both appeared in the coder's baseline and candidate populated fixture, so image parity does not establish their harmlessness. They did not appear in this review's smaller browser checks.
4. Repeat controlled timing on the final production code with no competing tests, at normal and larger viewports, then run a longer edit/save/playtest session for memory retention.

The foliage aperture is useful at gameplay scale. Its grainy transition and the busy dense-brush texture can receive a later art pass without changing collision or sight rules. Keep the existing one-tile routes readable while doing that work.

Related: [implementation and recorded foliage measurements](TREE-MIX-INTEGRATION-2026-10-16.md), [original editor proposal](TREE-MIX-EDITOR-PROPOSAL.md).
