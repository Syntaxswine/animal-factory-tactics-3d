# September 22 integration review

Approved `b17828d` for the separate 3D canonical project: group selection, standing/kneeling/prone and casualty presentation, and shared walk/run/sneak controls. Validation: 578 tests and assets, Pages build, byte-for-byte verification of 20 modules at source commit `ee61884`, 30 source movement/reaction/travel tests, and browser posture/selection, movement cadence, reduced-motion and rifle firing checks. Movement rules are pinned to the published `work/movement-modes-core` source branch; this review does not merge that branch into the 2D canonical branch.

## Deferred: mature trees (`2d0cb7a`)

Builder follow-up: [shared catalog fix and 3D workflow evidence](MATURE-TREE-INTEGRATION.md)
is ready on `work/mature-tree-3d`, with a 9/10 hostile review. The original finding
below is retained as the review history; canonical merge/publication is pending.

The two new prop names are registered in `dist/tactics/environment.js`, but not the pinned `dist/tactics/core/environment.js` used by the 3D editor and map loader. Both `tree-broadleaf-large` and `tree-pine-large` reproduce `Invalid environment props.` through the current core `parseMap`. The supplied editor test targets `editor.html`, not `editor-3d.html`. Register the variants in the shared source, reconcile with the movement source revision, regenerate the core dependency, and test 3D editor placement, export/import and actual playtest handoff. Do not patch generated core files independently.

## Deferred: finished environment (`bfc677e`)

The rigid square forms are a useful improvement. Integration must retain the approved foliage module, three-tier pine, broadleaf crown, grass tufts and foliage atlas. This branch has its own tree geometry and replaces the shared renderer's material path; it does not integrate the new catalog paint into `editor-3d-scene.js`. Rebase/reconcile those overlaps before merging, then verify matching materials in `editor-3d.html` and `battle-3d.html`, lower-floor dimming, fog, rebuild/disposal and deployed assets. The supplied workshop image review does not establish this integration.

The completion handoff in `d87e072` is a useful backlog, but its stance/casualty status must be reconciled with the now-approved movement work before implementation.
