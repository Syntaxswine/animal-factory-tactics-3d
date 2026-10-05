# Scorch decal hostile review

October 5, 2026. Independent reviewer: `fire_storyboard_hostile`.

**9/10 — pass for the scoped standalone presentation and reusable decal API. No blocking findings.** The marks read as flat, mottled soot on meadow grass, sand, concrete and the plain study floor. Overlap conceals internal tile joins, water cutouts remain clean, and the central character ash pile stays distinct.

The reviewer inspected the atlas, all eight surface/fixture images, source and disposal paths, and the browser checker/report. The review used still images and code; it did not claim continuous playback or an independent rerun of the browser matrix.

## Validation

- **24 focused tests passed**, independently rerun by the reviewer: eight decal tests and sixteen existing tank tests. Coverage includes persistent marks after flames end, reverse seeking, coordinate deduplication, floor separation, invalid-input preservation, exact masks, deterministic variation, empty footprints, clearing, texture failure and disposal.
- [Browser report](evidence/review.json): **64 configurations**, four surfaces × two ground fixtures × four views × two scales, with initial/burning/aftermath/reverse samples. No errors.
- An actual top-down GPU pixel comparison between marks on/off found **264,097 changed pixels and zero changes outside supplied burned tiles**, including the excluded water cells.
- Five repeated open/water switches stayed at **77 geometries and 16 textures**. Marks use one instanced draw batch per horizontal height rather than one material per tile.
- The updated skunk/pig composition captured all 121 source frames without errors and replayed deterministically; its moved scorch footprint stayed at the pig, outside the skunk's tile. Previously saved GIFs were not overwritten.
- Asset validation and the 3D package build passed. The atlas is RGBA with genuine transparent and partially transparent pixels; its original alpha is unchanged.

## Selected evidence

- [Meadow aftermath](evidence/grass-open.png)
- [Sand and water exclusion](evidence/sand-water.png)
- [Concrete aftermath](evidence/concrete-open.png)

The capture browsers closed through their owning API and their recorded exact process identities were verified exited. Complete captures and helper receipts remain under `artifacts/ground-scorch/`; the existing port 4473 preview retains its original automatic expiry of October 5, 1:17 a.m. Eastern.

## Integration boundary

The API owns flat decals and accepts actual burned cells with rendered horizontal heights. Gameplay must own accumulation/clearing, visibility/fog and lifetime. Sloped ground needs its own projection. No damage, terrain replacement, navigation or gameplay checkout changes are included.
