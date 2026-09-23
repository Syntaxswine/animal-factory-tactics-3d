# Wall-height cliff sets

User brief: one flat-topped, climbable set and one uneven-topped, nonclimbable set. **Both must be the height of a wall.**

## Art and geometry contract

`cliff-models.js` provides `createCliff(set, shape, seed)`, its matching `cliffLayout`, and independently inspectable geometry. All dimensions use the approved prototype units. Ground is Y=0; the flat cap and the highest broken crest are exactly `DIMENSIONS.wall`, currently **2.00**. The animal is not resized.

Each family has straight (4×2 tiles), corner (3×3 L, five occupied tiles), and end (2×2 tiles) pieces. Straight sections share matching end profiles across seed variations. Pieces are closed solids with chipped outlines, recessed strata and painted-style mineral colour. The flat set has a contrasting soil cap; the crag has exposed, sloping stone all the way across the crown. Both support ordinary root rotation. The entire rectangular corner bounding box is not occupied: use the supplied five-cell footprint.

The ledge alone exposes `walkable` cell-centre positions and a local +Z climbing socket containing approach, lip and landing positions. The lip sits inward from the chipped edge. The crag exposes no standing positions and no climbing socket. These are authored integration descriptors, not an engine rule inferred from a colour or mesh normal.

`cliff-study.html` compares both sets with the approved horse and a real 2-unit wall. Controls include three shapes, separate or paired sets, seed variations, grey forms, wireframe, guides, orbit and native 58px/unit scale.

## Integration boundary

This drop is an environment-art study. It does not register new saved-map props or change existing maps, movement, AP, editor catalogs, climb animation or ray collision. The viewer explicitly marks that boundary. No ladder or tower code is changed.

The engine's ordinary level spacing is **2.12**, while the user specified wall height **2.00**. Do not raise these cliffs to a floor level or float characters 0.12 above their caps. Integration needs an explicit physical support-height adapter and traversal endpoints at Y=2.00. Preserve the existing logical level rules and resolve that offset deliberately before enabling placement/playtest. Flat pieces need grounded support, blocked rock volume, upper standing cells and a validated climb edge. Crags need blocked rock volume with no upper floor or climb link. Use actual mesh surfaces or an agreed collision approximation rather than silently filling the empty corner notch.

## Continuous landform revision

The original crag now falls farther toward its edges. The expanded kit in `cliff-tiles.js` uses the **same `shoreField` and `shoreMask` functions as the river tiles**, including NW=1, NE=2, SE=4, SW=8 and all three contour variants. There are **16 masks × 3 variants per family** (96 combinations total). Mask 0 is empty and mask 15 fills the tile; inner/outer curves, straight shorelines, saddles, inlets and connected interiors follow the river field rather than an independently approximated outline.

`cliffTileGeometry(set, tiles)` takes integer world-grid `x,z`, `mask`, and `variant`. It rejects duplicate tiles, invalid inputs and inconsistent adjacent corner bits. Each world tile remains one unit. Fine clipped triangles follow the contour; vertices are welded across the whole patch before outer skirts are built, removing internal walls. The original standalone blocks remain in the viewer under Original pieces.

The flat cap stays at exactly Y=2. Crags fall to Y=0.60 at the exposed contour, with irregular sloping crown planes and a Y=2 maximum envelope. Heights are computed in shared world coordinates, so variants join on both axes without independent per-tile peak scaling. A small boundary fragment need not itself contain a highest crest. No horizontal standing surface is assigned to a crag.

The viewer now defaults to a broad plateau and also includes a winding cut, long escarpment, and 16-pattern atlas with A/B/C switching. Swath previews mix variants and show large filled interiors. Atlas order is 0–15 left to right, top to bottom. When building additional chunks, retain world-coordinate tile positions; choose a shared connected tile collection for each mesh to avoid internal crop walls. New terrain metadata labels the family but does not invent automatic climb routes across narrow contour slivers. Integration must derive safe body-sized support and validated edges from these actual surfaces.

Revision hostile review: **9/10** for the bounded art/geometry study. All 96 tile configurations pass closed-surface and height checks. Joined swaths pass positive-volume, contour occupancy and no-internal-wall checks. Compatible neighbor profiles are tested in both axes across different variants. **Twelve focused/environment tests pass**, and the 3D build passes. The browser matrix covers **90 layout/family/grey/variant configurations with zero errors**, plus native-size, low-angle and mobile checks. Independent review also passed six focused tests, 384 translated Z-edge comparisons and fifteen rebuild cycles without errors or resource growth. Painted front, rear, low-angle and gameplay-size views passed. Gameplay/editor integration, automatic climb routes and crop-wall handling for independent chunks remain outside this approval.

## Review and verification

Independent hostile review: **9/10**, scoped to this art/geometry handoff. The reviewer checked all three shapes at native 58px/unit and close low-angle views, confirmed the distinct soil cap and broken crest, the usable ledge cells, the empty corner notch and the inset lip. Thirty independent rebuild/grey/wire/seed cycles had no browser errors and stable GPU resource counts. Matching joins are approved for straight end profiles; editor/gameplay activation remains separate.

**Nine focused and environment regression tests pass.** Tests cover exact height, finite/nondegenerate closed surfaces with outward volume, planar room for feet at every standing point, absence of horizontal crag cap triangles, deterministic matching straight joins and invalid inputs. The viewer matrix passed **36 configurations with zero errors**, plus a mobile overflow check. The 3D Pages distribution build passes and includes the three new cliff files. No gameplay/core file was changed.
