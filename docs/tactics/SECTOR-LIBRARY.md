# Local sector placeholder library

The library lives in `dist/tactics/sector-library/`. Open `tactics/sector-library.html` or follow **Sector map library** from the overmap. This is an authoring inventory, not automatic campaign assignment.

## Inventory and scope

78 folders cover the current generator's canonical boundary geometries with separate countryside, village, town, city and fortress identities, including town workshop and city factory/workshop combinations. Five folders reserve the tutorial steps. Difficulty, ownership, biome/ground covering, encounters, decoration, and internal settlement layout are variation axes within folders, not additional boundary shapes. Villages are eligible only in easy and medium under the current schedule.

Enumeration is exhaustive over 80 oriented boundary patterns before role constraints and symmetry reduction: 16 road port subsets; for each of river and cliff, 24 pairs of distinct sides at either third, plus 8 opposite-side crossing patterns. Countryside dead-end roads are excluded; settlements and fortresses require roads. Fortresses cannot occupy barriers. River settlements always provide a crossing. The generator permits a single river or cliff in a sector, with no branches, river/cliff intersections, or same-side local endpoints. A whole river may return to the same world boundary through multiple sectors. New generator rules require expanding this inventory.

The tutorial folders are reservations, not an enumeration of finished tutorial terrain. Their declared internal travel follows `TOO / XXO / XSO`; the town's external road and second town sector must be authored with the group. Only whole-group rotation is valid for eventual assignment. Do not independently rotate tutorial sectors or mirror the group.

## Folder workflow

Each folder contains:

- `placeholder.json`: a compact **declarative local-map recipe**, not a standard v2 map. Open through the catalog, or import directly into the 3D editor. It expands deterministically to 240 × 240 actual tiles, three levels, four safe preview starts and one travel marker. Export produces a normal v2 map with `sectorTemplate` provenance. No buildings, guards or gameplay scripts are invented.
- `preview.svg`: the placeholder paths and attachment labels.
- `README.md`: authoring instructions.

Save authored exports back into that folder, e.g. `orchard-01.json`. Add the filename to the recipe's `variants` array, then change its `status` to `in-progress` or `authored`. The catalog reads progress and variants from these files. Browser exports download normally; they cannot silently write into the repository. Full authored variants open in their saved orientation. Only the primitive placeholders are transformed automatically, avoiding unsafe rotation of props, lights, scripts or animations.

Run `node tools/generate-sector-library.mjs` to recreate generated previews/index and create missing folders. Existing recipes, README files and authored variations are never overwritten. Run with `--check` to verify generated files. The index doesn't embed authoring status, so rebuilding never resets progress.

## Coordinates and widths

A sector is 10 × 10 blocks, each 24 × 24 tiles. Boundary offsets increase west-to-east on north/south and north-to-south on east/west. Road centers lie at 120; feature attachment centers lie at 80 or 160, measured along tile edges.

Six-wide bands occupy these **zero-based** tile ranges:

| Attachment | Tiles | One-based tiles |
|---|---|---|
| One-third | 77–82 | 78–83 |
| Midpoint | 117–122 | 118–123 |
| Two-thirds | 157–162 | 158–163 |

River paths approach each edge straight for 12 tiles to preserve exactly six boundary tiles, then connect across the interior with a rasterized bend/diagonal. Diagonal raster bands can be wider at staircase corners. Roads run between midpoint ports and the center. Road/water overlap is bridge terrain, six tiles across the road. No decorative bridge model is required for these placeholders.

Cliffs are a solid staircase of existing inaccessible cliff props; crossing roads leave a passage footprint. These are wall studies: **high-bank terrain, side/elevation contracts, actual slope connections, bank travel restrictions and cliff-passage gameplay are still unresolved**. They must not be approved as campaign-compatible maps merely because the editor accepts the schema. The preview squad/exit serve editor validation, not campaign spawn placement.

## Symmetry

Canonical keys preserve feature type, both offsets and road ports. The eight transforms are clockwise quarter-turns, optionally preceded by east/west reflection. Both actual tiles and attachment metadata transform together; side changes can swap thirds. Identical geometry orientations may appear more than once in the selector. Recipe `allowedTransforms` may be reduced for a future restricted variant. Setting north alone would not transform tile coordinates and is insufficient.

## Checks

- `node --test tests/sector-library.test.mjs`
- `node tools/generate-sector-library.mjs --check`
- `node tools/check-sector-library.mjs` (Playwright runtime, local server on 4323)
- `node tools/sync-tactics-core.mjs --check`
- `npm run build:tactics-3d`

Tests check exhaustive enumeration, canonical equivalence, all 604 supported placeholder transforms, exact six-tile boundary attachments, local-map validation, geometry/metadata agreement, editor import/export and undo/redo. Browser checks filter the catalog and open a reflected/rotated river sector in the live editor. Template matching against real campaigns remains a later milestone.
