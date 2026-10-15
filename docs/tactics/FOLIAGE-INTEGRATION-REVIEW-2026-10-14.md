# Foliage integration review

Approved for canonical integration on October 14, 2026. The painted screens and mixed trees clear the visual hold on the foliage gameplay work. They are a useful working baseline, with localized art polish still worthwhile.

The reviewed artist commits are `6ef88ba` and `df47887`, following the coder's sight and shot integration at `e0102b3` and handoff at `1119290`. The combined code was tested at `c4fa8d0`, based on canonical `bff5d98`.

Dense growth now reads more like foliage than the earlier rounded banks and wooden fencing. The separate reed treatment helps wetlands, and mixing existing tree models gives open woodland more variety. The elevated camera shows the one-tile passage clearly. The authored fixture's rectangular patches are test boundaries, not a recommendation for landscape composition.

The visible tree and its physical branches share the same deterministic model choice. Dense leaves obstruct sight; substantial wood also stops bullets. Leaves do not become bulletproof. Saved overlays, placement margins and the existing separation between open woodland and blocked thickets remain intact.

Validation completed on the integrated code:

- `npm run check`: **2,441 passed, zero failed**, followed by a successful asset audit.
- Shared-core synchronization: all 20 recorded modules verified.
- `npm run build:tactics-3d`: passed, including missing-module checks.
- Source editor save and reload, ordinary Playtest, and packaged editor-to-Playtest: rendered successfully with the squad and foliage.
- No application, asset-loading or shader error was observed. The in-app browser's popup tabs emitted the same Electron sandbox initialization messages seen before this change; gameplay still rendered.

Deployment conflicts were reconciled while preserving canonical's intro files, study exports, module-closure checks, image dimensions and asset hashes. The integration does not change the approved intro.

The builder's comparable five-biome overview changes from 178 to 200 draw calls and 292,128 to 265,936 submitted triangles. Known texture storage increases from about 32.2 to 53.4 MiB. The mixed-tree follow-up adds no textures. These fixture measurements include submitted shadow geometry and do not establish sustained performance for a full wooded sector. Retain spatial chunks and distant detail reduction; measure a representative sector with a squad before increasing foliage detail again. See the [artist delivery](FOLIAGE-SKINS-ARTIST-DELIVERY-2026-10-14.md) and [tree-mix measurements](TREE-MODEL-MIX-2026-10-14.md).

Two follow-up art changes would improve the result without rebuilding it:

- Break up the uniform canopy pattern with broader clumps, quieter areas and restrained color variation. Keep occupied tile edges and narrow passages readable.
- Soften the snow thicket's repeated white-and-dark pattern. Use broader snow patches and more legible bough groups at gameplay scale.

These are polish items, not release blockers. Preserve the finite sight envelopes, visible solid cover, clear routes and fog behavior during further art changes.
