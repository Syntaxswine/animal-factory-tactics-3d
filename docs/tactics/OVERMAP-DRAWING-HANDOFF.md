# Overmap cartography workspace

Entry: `tactics/overmap.html`, linked from the 3D local-map editor header.

This first pass implements the requested map graphics and editable attachment
points. It is a drawing workspace, not the constrained campaign generator from
the design proposal. The opening example is deliberately labeled illustrative.
It does not claim valid tutorial placement, fortress counts, bridge spacing,
settlement sizes, template compatibility, or reachability.

## Drawing and coordinate contract

- Overmap: 30 columns × 15 rows of sectors. A sector is 10 × 10 blocks / 240 ×
  240 tiles. Blocks remain 24 × 24 tiles.
- Each graphic uses a 100 × 100 viewBox, independent of local geometry.
- North/south offsets increase west to east; east/west offsets increase north
  to south. Opposite boundaries use identical offsets, never mirrored ones.
- Roads use the midpoint. Rivers and cliffs support one-third and two-thirds,
  including the user's north-one-third → south-two-thirds river example.
- Cubic paths meet edges perpendicular to the seam. Their actual endpoints drive
  both the sector graphic and overview; endpoints are not decorative labels.
- Multiple paths support junctions and coexisting roads/rivers/cliffs. Bridges
  and passages follow the first actual intersection between the appropriate
  paths. With no intersection, the marker is provisional and a warning appears.
- Forest, mountain and wetland terrain; village, town, city, fortress and tutorial
  roles; factory/workshop facilities; difficulty and ownership overlays.
- Cliff hatching currently represents a cartographic symbol, not authoritative
  elevation or a traversable passage. Travel arrows are separate declarations.

## Editing and persistence

Click a sector or use arrow keys from the focused grid cell. Edit its properties,
paths, edge/offset pairs, facilities and crossing symbol. Zoom offers a closer
view of the whole map. The selected-sector drawing always labels attachment
positions. Each property/path mutation, blank/example replacement, import, and
load is undoable. Structural validation occurs before document replacement.

Save/Load uses its own browser key, `animal-factory-overmap-sketch-v1`. JSON
export/import preserves the actual arrangement, including all path coordinates.
Map SVG exports a self-contained vector graphic of the current overlay and port
visibility. This does not export local tactical geometry.

The new format is `kind: animal-factory-overmap-sketch`, `version: 1`, with fixed
width/height and a row-major `sectors` array. It does not reuse or reinterpret
the existing local map/block formats. Visible local-editor labels now correctly
call its 24 × 24 sections **blocks**; legacy core property names and DOM IDs stay
unchanged for compatibility.

## Integration still to build

The attached proposal remains the campaign specification. The next phase needs
sector-template metadata and a library linking sketches to real local geometry.
Endpoint checks here compare neighboring drawing declarations only; they do not
prove geometry, cliff elevation compatibility, gates or travel passability.

No local map is assigned to a sketch sector yet. The header link opens the local
editor workspace, not a map for the selected sector. A future document migration
must explicitly introduce template IDs, generation/library versions, seed,
settlement membership, tutorial locks, authored entry areas and retained actual
arrangements. Do not treat this drawing example as generator output.

The tutorial footprint is now authored as TOO / XXO / XSO; its local maps still need authoring. Keep deferred
generation choices (bridge rounding, river-network count and diagonal bridge
adjacency) explicit. Ownership values are planning overlays, not control logic.
There is no new simulation clock or militia, incident, trading or logistics code.

## Verification

- `node --test tests/overmap.test.mjs tests/editor-3d-editing.test.mjs`
- `node tools/check-overmap.mjs` with the configured Playwright runtime and server
  on port 4323: browser edits, attachment mismatch, undo, save/load, JSON round
  trip, rejected import, SVG export, keyboard navigation, mobile layout.
- `node tools/sync-tactics-core.mjs --check`
- `npm run build:tactics-3d`

Browser screenshots are local artifacts under `artifacts/overmap/`.

## Tutorial and river drawing follow-up

The corrected footprint is TOO / XXO / XSO: T is the town, S is the start,
and X is a tutorial sector. The five-sector group therefore contains four
plateau sectors (S + three X) and one town. The only plateau descent leads from
the upper-left X into T. O positions are outside the template and are untouched.

The user explicitly permits rotations, superseding the proposal's initial
no-rotation restriction. Placement controls rotate the entire occupied footprint
by 0/90/180/270 degrees and translate it anywhere all five sectors fit, provided
the town is not on any overmap boundary. Other members may touch the boundary.
The placement anchor is the top-left of the rotated occupied bounding rectangle.

Optional tutorialPlacement metadata stores anchor, rotation and the five covered
background sectors. Moving restores the old background and preserves edited group
properties, rotating travel directions and path endpoints together. Placement is
validated before mutation, undoable, and retained by save/load and export/import.
Old sketches without placement metadata remain valid; use Example to load the
corrected template. The old arrangement is not silently rewritten on load.

Cliff rims are planning graphics, not tactical geometry or enforced travel rules.
The template town has a workshop marker; broader settlement membership, road
routing to the surrounding world and full generator constraints remain deferred.

The river retains straight stretches and occasional bends. Tests cover the exact
corrected footprint, all rotations and legal boundary positions, town rejection,
background restoration, property/connection rotation, undo and persistence.

The toolbar now includes Re-randomize tutorial. Each click chooses a different
valid anchor and quarter-turn rotation, preserves group edits and underlying
terrain, and selects the relocated start. It is one undo step. This randomizes
the tutorial placement only; full-world generation remains deferred.
