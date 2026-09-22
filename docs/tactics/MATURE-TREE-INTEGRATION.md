# Mature trees: shared catalog and 3D editor integration

22 September 2026 — resolves the mature-tree hold in
[the integration review](INTEGRATION-REVIEW-2026-09-22.md).
Independent hostile subagent review: **9/10**, no blocking findings.

The 3D editor and playtest loader now recognize `tree-broadleaf-large` and
`tree-pine-large`. Previously they existed only in the older presentation/editor
catalog, so the pinned shared map parser rejected their saved maps with
`Invalid environment props.`

## Source and presentation

- Shared source: `Syntaxswine/animal-factory`, branch `work/mature-tree-core`,
  commit **`e529f4b3d512d32cea522d701d01ebe8488af013`**, based directly on the
  approved movement source `ee61884`. It registers the variants and aliases
  their existing 2D artwork/manifest entries for source-game compatibility.
- 3D integration branch: `work/mature-tree-3d`, based on canonical `4ff0ab1`.
  `tools/sync-tactics-core.mjs` imports the new source commit and regenerates
  `core/environment.js` and its manifest. All 20 modules match upstream bytes;
  the other 19 modules, including movement and combat, are unchanged.
- Presentation reuses the approved `2d0cb7a` mature-tree variants: **1.8×** the
  existing broadleaf and three-tier pine parts. Downward branch paint, foliage
  atlas, grass and the editor/battle material paths are retained. No sculpt or
  texture rebuild was needed.
- Each tree still occupies one solid trunk tile with the base tree's cover and
  tall-prop rules. Overhanging visual crowns are not new canonical hit volumes.
  Experimental hybrid geometry remains separate from authoritative gameplay.

To reproduce the dependency import in a separate clone, fetch the source branch
first, then run `node tools/sync-tactics-core.mjs --check` (or omit `--check` to
regenerate). Do not hand-edit generated core modules.

## Validation

- Source: **488 tests passed** plus asset checks.
- Integration: **580 tests passed**, asset checks and `npm run build:tactics-3d`
  passed; all 20 generated modules passed upstream byte verification.
- `tests/mature-tree-3d.test.mjs` exercises the actual pinned editor/parser,
  portable roundtrip, undo/redo, unknown-kind rejection, one-tile movement rules,
  unchanged model parts/materials and 1.8× transforms across floors and rotations.
- `tools/mature-tree-3d-review.mjs` exercises palette mouse placement, rotation,
  undo/redo, browser Save → page reload → Load, JSON download → new map → Import,
  Validate and the real **Playtest button / popup message handoff**.
- Both tree IDs reach the game unchanged. All **29 model parts** match the editor's
  GPU instance transforms and use the foliage atlas; all 29 render in playtest.
  Fog counts are 0 unseen, 17 with only broadleaf known, 29 with both known.
  Lower-floor dimming retains the atlas; eight floor switches retain stable
  geometry/texture counts. Browser errors: **none** (Edge 153.0.4234.48).

Evidence: [editor](hybrid-review/mature-tree-integration/editor.png),
[playtest](hybrid-review/mature-tree-integration/playtest.png),
[recorded checks](hybrid-review/mature-tree-integration/browser-checks.json).
The hostile reviewer independently verified the pinned modules, ran the focused
tests and reviewed the browser harness and images.

This is review-branch delivery, not a canonical merge or deployment. The separate
finished-environment art/material reconciliation remains held; it is not included
in this fix. Approved selection, stance/casualty and Walk/Run/Sneak behavior from
`4ff0ab1` is preserved.
