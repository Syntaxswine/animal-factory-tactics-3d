# Overmap generator and editor handoff

Entry: tactics/overmap.html. It opens generated seed 7. Generate seed reproduces
a seed/settings combination; Re-randomize world chooses a new seed. Example and
Re-randomize tutorial remain available for focused drawing studies.

## Generation order

1. Reserve and rotate the tutorial: TOO / XXO / XSO. The five occupied sectors
   include the town and starting sector. Four form the plateau; one descent leads
   into the inland town. The town gains its second adjoining sector at step 5.
2. Two river networks, four total world-edge connections, minimum length five.
3. One cliff chain with two world-edge connections.
4. Exactly 150 easy, 150 medium, 150 hard. Easy is connected, includes the tutorial,
   and never directly borders hard.
5. Configurable villages/towns/cities (defaults 6/3/2, including starting town).
   Villages occupy one sector, towns two, cities three to five. Towns have one
   workshop; cities one factory and one to three workshops. Facilities occupy
   constituent sectors. Settlement/facility IDs persist. Fortresses: 1 easy,
   2 medium, 2 hard. Settlements and fortresses initially belong to Red Hats.
6. Roads connect every settlement sector and fortress. Routing reserves eligible
   road crossings under spacing/count constraints before gates are materialized.
7. Bridges and cliff passages at road crossings. Bridge targets round up to one
   per five sectors of each river; no edge or diagonal bridge adjacency. Gate
   guards number 2–15; cliff passages use the lower 2–7 range.
8. Independent structural, attachment, count, tutorial, road and reachability
   checks. Failed attempts retry deterministically, at most 40 in the UI.

The pure generator/validator is overmap-generator.js. A module worker keeps the
UI responsive and reports progress. Success replaces the document in one undo
step. Failure/cancel preserves it and reports reasons. Check world revalidates
edits; saved success flags are not trusted.

## Geography and integration limits

This is a strategic plan generator, not a playable campaign generator. The
current geographic family uses three separate parallel corridors. Orientation,
order, positions, meanders and third-offset attachments are seeded. Intersecting
river/cliff chains and arbitrary branching networks are not generated yet.

Strategic reachability uses a conservative sector graph: ordinary land permits
off-road movement, tutorial travel remains authored, and rivers/cliffs are crossed
only at gates. Every ordinary land sector is reachable; roads join all required
sites. Bank-level movement and cliff elevation profiles require local templates.

No premade tactical sector-template library is assigned yet. The UI and metadata
identify output as a strategic plan. Local geometry, template eligibility by
difficulty, elevation compatibility and travel entry areas still need integration.
No new clock, militia/fortress simulation, incident queue or logistics was added.

## Coordinates, editing and persistence

- Overmap: 30 × 15 sectors. Sector: 10 × 10 blocks / 240 × 240 tiles.
- North/south offsets increase west to east; east/west increase north to south.
  Opposing connections use the same offset without mirroring.
- Roads use edge midpoints; rivers/cliffs use one-third or two-thirds. Roads now
  support a center endpoint for true dead ends and junctions, avoiding fake seams.
- All drawing properties remain editable. Endpoint warnings appear by the detail
  view; whole-world validation covers counts and strategic connectivity.
- Save/Load uses animal-factory-overmap-sketch-v1 browser storage. JSON contains
  the actual arrangement. SVG export embeds its styles.
- Existing version-1 sketches remain valid. Generated documents additionally
  retain original seed, generator version, schematic content version, attempt,
  options, feature/settlement provenance, and counts under generation metadata.
  The sectors array is authoritative after editing. Loads never regenerate it.
- Tutorial placement stores anchor, rotation and covered background. Moving it
  preserves edits, rotates connections and restores the old location. This can
  invalidate a generated world, which the validation panel reports.
- Local map/block schemas and generated core modules are unchanged.

## Verification

Run node --test tests/overmap.test.mjs tests/overmap-generator.test.mjs, then the
browser scripts tools/check-overmap.mjs and tools/check-overmap-generator.mjs
with the configured Playwright runtime and server on 4323. Also run the core
sync check and npm run build:tactics-3d.

Tests cover many seeds, deterministic retries, all rotations, counts, roads,
gates, disconnected edits, atomic failures and persistence. Browser checks cover
same/different seeds, worker progress, save/load, undo, cancellation, invalid
settings and mobile layout. Screenshots live under artifacts/overmap/ locally.
