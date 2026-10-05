# Roster fire integration — October 4, 2026

The fire animations on `work/fire-animation-storyboards` are connected to the 3D battle renderer: the initial horse study `fdcac12`, roster fitting `7b94117`, and the adopted sideways hen collapse `d1f20f4`. Runtime modules, the updated study, resource cleanup and focused checks were imported selectively. Unrelated roof-grounding changes were not merged.

## Live behavior

- All eleven authored mammal operators brace the actual flamethrower, emit from its model muzzle, cut off the spray and recover, in normal and Red Hat outfits. The painted fan uses the resolved scenery-clipped cone and current visibility. Fuel, AP and damage are charged once by the rules. The hen and Hawaiian guide remain unarmed in the authored coverage.
- Standing victims from all twelve species engulf, panic and remain alive for the existing three-turn fire mechanic. The simulation records the accepted neighbor steps. Playback stops at each change of direction rather than cutting diagonally through scenery. Blocked routes keep the feet planted, and the last panic move completes visually even if fire expires that round.
- Burning survivors retain their actual fitted equipment. The new loadout-specific poses replace the horse integration's temporary stow workaround. Survivors never perform the fatal weapon release, collapse, dissolution or ash transition. The existing fitted pig/RPG carry also applies when walking resumes, avoiding an out-of-reach grip. No replacement rifle, inventory mutation or extra loot is created.
- Only a direct fatal incendiary hit marks burned remains. The victim collapses at the committed death position and dissolves into a selectable ash pile. Existing casualty, damage, loot and militia drop policies remain authoritative. Tank explosions retain their existing casualty presentation.
- The adopted hen animation buckles, tips onto her wing and settles on actual skin contact. Smoke and ash follow her fallen body, including rotated stationary deaths; logical coordinates remain on the committed tile. Her temporary fire skeleton replaces her walking skeleton for the performance and is retired before walking resumes.
- Fire envelopes fit each animal's actual body, horns, ears, tail and headwear. Separate hats and corrective grip meshes dissolve with the body. The flamethrower lance, pack and hose use the authored release treatment during fatal playback; visual release does not bypass the game's loot policy.
- Saves retain burned remains and ongoing burn turns, and discard transient playback receipts. Loading cannot replay movement or charge another attack. Reduced motion skips the transient performance and shows the committed outcome.
- Hidden characters, floor changes, weapon changes, casualties, traversal and restart dispose the temporary pose, equipment state and material changes. Atlas loading is independent of combat; a missing ash asset leaves a visible, lootable corpse.

## Scope

Coverage is 25 appearances (twelve normal, twelve Red Hat, one Hawaiian guide), 289 authored target/loadout combinations, and 22 operator appearances. New body motion remains standing-only. Kneeling/prone characters and routes that change surface height retain the existing fallback; ordinary flat upper floors and tower platforms preserve their rendered elevations.

This connects the twelve-model 3D renderer, without changing the legacy local-map species list. That schema still lists nine species; bull, rabbit and dog renderer checks select the live appearance after loading a valid fixture. Expanding editor placement choices is separate from fire playback.

The study still demonstrates a terminal three-step sequence. Live gameplay only plays moves that the rules actually committed, and never invents a postmortem run to reach the study's ending.

## Checks

The integration passes 196 focused tests, the original live horse battle check, the full 25-appearance live renderer check, all 289 target and 22 operator study configurations, pinned-core verification and the Pages build. The roster study captures 121 review images and repeated variant switches retain 95 geometries and 21 textures. Disposable review browsers close in `finally`; lifecycle receipts are written beside their artifacts.

`tests/battle-fire.test.mjs` covers rules receipts, route segmentation, timing, resource conservation, save validation, fog clipping, failed textures and interruption cleanup. `tests/battle-fire-roster.test.mjs` exercises every supported loadout with the live posture/walking rigs, nonfatal reactions, restoration, hen interruptions, headwear cleanup and operator timing. The original fitting checks, roster geometry checks, corrected hen contact/ground-anchor checks, and failed outfit-resource cleanup checks are retained.

`tools/check-battle-fire.mjs` exercises the actual battle page and writes screenshots under `artifacts/live-horse-fire/`. `tools/check-battle-fire-roster.mjs` runs the actual core attack and battle renderer across 25 appearances, covering panic, save during playback, extinguishing, collapse and ash; results are under `artifacts/live-fire-roster/`. `tools/check-painted-fire-roster.mjs http://127.0.0.1:4364/tactics/painted-fire-study.html` exercises the authored study matrix and writes under `artifacts/painted-fire/roster/`. Set `PLAYWRIGHT_PATH` if Playwright is supplied outside this checkout. Live checks accept `EDITOR_ORIGIN`.

Run the existing flame-cone, combat, movement, equipment, traversal and encounter-save regressions, the pinned-core check and Pages build alongside those tests. Deployment includes all new runtime modules, the study fixture and all three atlases. `work/editor-3d` is the integration branch; only `main` triggers Pages deployment.

The broad `tools/check-assets.mjs` audit currently fails on the pre-existing environment manifest mismatch for `ground-wood-planks`, `wall-wood-trellis` and `wall-wood-trellis-arch`. The same failure reproduces using the script from the unchanged `7c211ef` baseline. Fire atlas dimensions and alpha channels have a separate passing regression; no manifest checks were weakened for this integration.
