# Painted household and street furniture

Open `tactics/painted-furniture.html`, also linked from the 3D gallery. These are reusable design assets, following the cargo and truck study workflow. They are not new map-editor prop kinds: placement, collision, cover, inventory and interaction rules remain unchanged.

## Collection

| Model | Tile footprint | Construction |
| --- | --- | --- |
| Farmhouse table | 1×2 | Flat planked top, square tapered legs, apron and pegs |
| Low living-room table | 1×2 | Flat top and lower shelf |
| Single bed | 1×2 | Panelled frame, mattress, pillow and folded blue quilt |
| Bedside table | 1×1 | Drawer, brass pull and open lower shelf |
| Bedside table with lamp | 1×1 | Drawer table with a compact brass and linen lamp |
| Refrigerator | 1×1 | Cream enamel, freezer door, handles, vents and rear coils |
| Double-door cabinet | 1×2 | Panelled doors, two drawers, brass pulls and raised feet |
| Floor lamp | 1×1 | Weighted base, brass stem, pleated linen shade and pull chain |
| Exterior gooseneck sconce | Wall / 1×1 projection | Curved arm, green metal shade, ivory lining and mounting plate |
| Single-arm streetlight | 1×1 | Cast-iron post, fluted base and green shade |
| Double-arm streetlight | 2×1 | Shared post with two suspended green shades |

Six timber models have honey, aged cream and sage finishes. Appliances and fixtures retain their intended fixed materials. Existing approved painted atlases supply brushwork; timber contrast is subdued, while tiny bevels preserve squared furniture silhouettes. The cabinet's long axis is Z and its doors face +X; other fronts generally face +Z.

## Future lighting integration

`createFurnitureLibrary(atlas, cargo)` returns `build(id, finish)`, `stats()` and `dispose()`. Built roots borrow cached geometry/materials/textures; dispose the library only after removing every consumer. The input atlases remain caller-owned.

Fixture roots contain `mount` and `emitter-0` nodes; the double streetlight also has `emitter-1`. Positions use tile units with Y up. Emitter local **−Z** points down, and metadata identifies `role: 'future-light', enabled: false`. The sconce origin is the wall at floor level, with the mount at Y=1.72; its shade projects forward into the adjoining tile. The wall slab shown in the gallery is a separate display aid, not part of the asset.

There are no Light objects or emissive materials in these models. The gallery uses its own ordinary studio lights. A later day/night implementation can attach lights at the anchors and define illumination, shadows, switching and gameplay visibility together.

## Validation and review

- `npm run check`: **584 tests passed**, plus tactical asset validation.
- `npm run build:tactics-3d`: passed; all three furniture files are included in the Pages output.
- Three furniture tests check all finishes for finite geometry, ground contact, footprint bounds, passive anchors, no emission and stable resource ownership/disposal.
- `tools/painted-furniture-review.mjs`: all 11 forms at close/gameplay scale, an underside sconce view, mobile width, repeated finish changes and browser errors. Set `PLAYWRIGHT_PATH` when Playwright is outside the local module tree; optional `REVIEW_ORIGIN` defaults to port 4331.
- Repeated gallery changes stabilized at 86 library geometries, 23 materials and 19 texture clones; browser rendering reported 97 geometries and 8 textures. No browser errors or mobile horizontal overflow in the final run.
- Independent hostile review: **9/10**, no blockers for this design/gallery scope. Remaining optional art polish: repeated close-up texture crops and heavy refrigerator wear. Screenshots and machine results are local in `artifacts/furniture/` and `artifacts/furniture-review/`.

The viewer uses a stable neutral-character framing envelope because skinned mesh bounds can retain stale positions when switching collection/single views. Model geometry bounds remain exact; this envelope affects camera framing only.

The bedside lamp variant reuses the floor lamp at 48% scale, seated exactly on the tabletop at Y=0.605. Its passive emitter and mount remain inside the transformed lamp group; use world transforms when attaching future lights.
