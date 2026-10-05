# Horse fire integration — October 4, 2026

The committed horse study at `fdcac12` on `work/fire-animation-storyboards` is connected to the 3D battle renderer. Its three painted atlases, motion, effects, standalone study and regression tests were imported selectively. The source branch's roof-grounding work and uncommitted roster expansion were not imported.

## Live behavior

- A standing horse braces the actual flamethrower, emits from its model muzzle, cuts off the spray and recovers. The painted fan uses the resolved scenery-clipped cone and current visibility. Fuel, AP and damage are charged once by the rules.
- Surviving horses engulf, panic and remain alive for the existing three-turn fire mechanic. The simulation records the accepted neighbor steps. Playback stops at each change of direction rather than cutting diagonally through scenery. Blocked routes keep the feet planted, and the last panic move completes visually even if fire expires that round.
- The reviewed rifle burn keeps its fitted grip. Other horse weapons use the shared equipment stow while the hands react to the fire, then restore the original loadout. No replacement rifle, inventory mutation or extra loot is created.
- Only a direct fatal incendiary hit marks burned remains. The horse collapses at the committed death position and dissolves into a selectable ash pile. Existing casualty, damage, loot and militia drop policies remain authoritative. Tank explosions retain their existing casualty presentation.
- Saves retain burned remains and ongoing burn turns, and discard transient playback receipts. Loading cannot replay movement or charge another attack. Reduced motion skips the transient performance and shows the committed outcome.
- Hidden characters, floor changes, weapon changes, casualties, traversal and restart dispose the temporary pose, equipment state and material changes. Atlas loading is independent of combat; a missing ash asset leaves a visible, lootable corpse.

## Scope

New body motion is horse-only and standing-only. Other species and unsupported stances keep their existing presentation. This does not claim the unfinished roster expansion is integrated. Routes that change surface height use the existing fallback; ordinary flat upper floors and tower platforms preserve their rendered elevations.

The study still demonstrates a terminal three-step sequence. Live gameplay only plays moves that the rules actually committed, and never invents a postmortem run to reach the study's ending.

## Checks

The integration passes 112 focused tests, both live battle browser checks, all 72 original study configurations, the pinned-core verification and the Pages build. The study's repeated seeks retain the same 74 geometries and 15 textures. Disposable review browsers were closed after checking screenshots and playback.

`tests/battle-fire.test.mjs` covers live rules receipts, safe route segmentation, timing, resource conservation, all horse stow loadouts, save validation, fog clipping, failed textures and interruption cleanup. `tests/painted-fire.test.mjs` retains the 17 original fitting and geometry regressions. `tools/check-battle-fire.mjs` exercises the actual battle page and writes review screenshots under `artifacts/live-horse-fire/`; its browser closes in `finally`.

Run the existing flame-cone, combat, movement, equipment, traversal and encounter-save regressions, the pinned-core check, asset check and Pages build alongside those tests. Deployment includes all new runtime modules, the study fixture and all three atlases.

The broad `tools/check-assets.mjs` audit currently fails on the pre-existing environment manifest mismatch for `ground-wood-planks`, `wall-wood-trellis` and `wall-wood-trellis-arch`. The same failure reproduces using the script from the unchanged `7c211ef` baseline. Fire atlas dimensions and alpha channels have a separate passing regression; no manifest checks were weakened for this integration.
