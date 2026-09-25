# Diagonal local road-edge tiles

Use Paint terrain in the 3D editor. Each terrain ID stores its road corner,
background surface and optional concrete border; both halves are walkable.
The corner label identifies the asphalt half, not the grass half.

The catalog has 64 variants: NW/NE/SE/SW, plain/bordered, and eight backgrounds:
ordinary grass, dark cover grass, four cliff meadow variants, cliff sand and
meadow/sand blend. Existing meadow/sand GLSL recipes are reused. Dark grass is
visual only on these road tiles and does not grant woodland concealment.

The border is a flat concrete-colored strip 0.09 tile wide centered on the
split. No curb collision or movement penalty is added. Terrain IDs persist
through undo, JSON, blocks and encounter saves using the registered ground list.
The original 2D dependency stays pinned; a recorded 3D terrain adapter extends it.

Review all variants at tactics/diagonal-road-study.html. Existing six-tile,
centered block road-port validation is unchanged: these are local drawing tiles,
not a new diagonal inter-sector connection contract. River/cliff collision,
crossings and elevations are unchanged by this road-edge asset work.
