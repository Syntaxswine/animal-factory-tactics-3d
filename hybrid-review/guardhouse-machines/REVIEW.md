# Guardhouse consoles: independent hostile review

October 9, 2026. Reviewer: `strategic_sites_hostile`, read-only inspection of the new model library, viewer, texture and native guardhouse fit. **9/10; approved for reusable assets and fit study.**

The reviewer independently inspected close-up front, side, rear, top and three-quarter views of both modules; green and amber screens; grey geometry; the native horse at 58 px/tile; the room cutaway; and mobile layout. Painterly controls and monitor/receiver silhouettes read clearly. Geometry stays simple at 72 and 128 triangles.

Measured model height: 0.80000001. Actual sill clearance: 0.02115999. Rear wall gap: 0.00300001. Pair gap: 0.06000000. Floor contact is within 4e-10. UVs are valid.

All six permanent model tests passed independently. After 18 replacements the renderer remained at 35 geometries / 8 textures and the library at 12 geometries / 2 materials / 2 models. One initial finding was corrected: the horse paint owns its input texture, so the viewer must not dispose that same texture again. Instrumentation after the fix confirmed exactly one disposal per texture even when viewer disposal is called twice. No browser console errors remained.

The review browser closed with exit code 0; the exact recorded process identity was verified absent. The retained port 4476 preview was untouched.

Approval does not certify a playable room layout. Nominal footprint outlines and the cutaway remain explicitly labeled as a fit check. Gameplay catalog, tile origins, pathfinding, guard-post positions and machine interactions await integration.

Evidence:

- `pair-painted.png`: shared painterly skin on the two simple models.
- `window-fit.png`: original window wall and native-size horse.
- `sill-side.png`: actual sill clearance in profile.
- `gameplay-size.png`: 58 px/tile inspection.
- `independent-browser-review.json`: original independent measurements and resource/disposal results.
