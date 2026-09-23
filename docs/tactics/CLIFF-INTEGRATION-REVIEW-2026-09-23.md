# Cliff study integration review — 2026-09-23

Reviewed `work/cliff-study` through `00c749b`, merged onto canonical `ec13c4a`. This is a presentation kit and asset study. It does not register saved-map terrain, navigation, sight/projectile collision, swim rules or climb-from-water routes.

The joined plateau/gorge forms read clearly at gameplay scale, with distinct grassy ledges and broken crags. Dry-ground native-size and low-angle views were inspected. Keep upper-ground support separate from whether the face below can be climbed. The kit's family descriptors are not body-sized generated landing routes.

Found and fixed a release blocker: `tools/check-assets.mjs` rejected the new study PNGs as unattached. Added explicit allowlisting and PNG dimension/type checks for the seven grass/sand assets, plus validation of their tile manifests. This does not add them to the gameplay prop catalog or weaken checks on other assets.

Validation: 15 focused geometry/material/water tests pass; the core reproducibility check, Pages build, asset validator and diff checks pass. The dry-surface browser matrix passes 66 configurations with no errors, exact tile borders, transparent feather edges, independent sand colour, and mobile layout checks. No unrelated gameplay suite rerun is claimed.

Water review: all 38 browser configurations pass without errors; six water toggles remain at 14 geometries / 8 textures. The loop boundary differs by at most one RGB level, and animation changes 167,607 pixels. Water plateau rendering was visually inspected. Approved for study publication, not gameplay activation.
