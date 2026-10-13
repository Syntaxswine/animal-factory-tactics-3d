# Seeded environment regions

Each world seed selects **one through five environment families**, with equal
probability for each count. Families are sampled without replacement from Jungle,
Temperate, Snow, Dry grassland and Wetlands. No family is mandatory; all five can
be the only environment in a world. Wetlands count toward the selection.

The selection has its own seeded random stream. Geographic retries do not reroll
the family count, and generating environments consumes none of the random numbers
used for rivers, cliffs, difficulty, settlements or roads. Generator version is
`strategic-plan-11`; environment-field version is `1`.

## Region layout and joins

The generation order is tutorial, rivers, cliffs, environments, difficulty zoning,
settlements, roads, gates, validation. One or two widely separated region centers
per selected family produce unequal coverage and allow the same family to appear
in several places. Wetland centers favor proximity to the generated rivers. This
is a placement preference, not a rule that every river must be wetland or that a
wetland-only world must be submerged.

Weighted distance fields with continuous spatial warping create broad irregular
boundaries. Nearby families blend across a transition band; three-way junctions
are supported. Every chosen family must occupy at least one sector center before
a generated world is accepted. Environment regions are independent of difficulty,
settlement role, elevation, and travel permissions. They do not introduce water,
block a road, alter foliage density, or change passability.

Local sectors sample the same field at their final world position. Samples on
shared edges and corners agree exactly. Quarter-turns or mirrors of a reusable
geometry template must happen **before** attaching the local profile. The profile
belongs to the placed sector, not the reusable block: copied blocks use their new
sector's ground and vegetation environment. No multiplication of the modular
sector catalog is required.

## Tester and local rendering

Choose **Environment** in the overmap's Overlay selector. The legend and summary
show the selected families and approximate coverage. Select a sector to inspect
its mixture, then choose **Preview ground / foliage in 3D**. This opens an editable
ground sample with a small patch of passable foliage. It can be exported or
playtested. It does not assign tactical templates, roads, rivers, or encounters.
Preview records are keyed by world seed and sector, so opening another preview
does not change the sector an existing preview will reopen.

The current renderer uses the existing painterly atlas and low-poly plant shapes
as provisional assets. Grass, eligible diagonal-road surrounds, cliff caps and
foliage use the environment palette; rock, paving and architectural floors retain
their materials. Grass remains textured, and foliage keeps its density and
walking settings. The new Jungle/Temperate/Snow/Dry grassland/Wetlands asset family
models still need to be supplied and registered. `coverUndergrowth` receives the
selected `family` as the hook for their asset selection.

New campaign assignments receive local profiles without changing authored terrain,
starts, characters, objects or encounters. This also allows authored tutorial
geometry to adopt a world's environment. An explicitly attached local profile is
preserved. Existing maps, sketches and campaigns with no profile retain their
previous appearance; loading never invents regions for an older save. The current
playable campaign still uses its fixed two-sector foundation; this feature does
not turn the other strategic sectors into playable maps.

## Persistence and validation

The overmap stores `environments`; a local map stores
`environment: {version, field, origin, size}`. Both are portable, versioned JSON.
Local profiles survive editor save/export/import and encounter/campaign saves.
Overmap changes use the existing undo/redo history. Malformed family IDs, field
versions, region centers, scales, origins and missing region data are rejected at
load. The shared core is regenerated through `core-environment-adapter.mjs`.

Tests cover family selection across 10,000 seeds, single-family worlds including
the tutorial, repeatability, variable coverage, shared edge/corner samples and
palette texels, legacy maps, invalid imports, undo/redo, campaign preservation,
encounter saves and palette disposal. Existing overmap, foliage, sector-library
and campaign checks remain applicable. Both deployment builds include the new
modules and retain their missing-module checks.
