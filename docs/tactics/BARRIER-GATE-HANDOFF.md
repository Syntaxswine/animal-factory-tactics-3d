# Lifting barrier gate

Reusable model study for a painted industrial boom gate. The footprint is one tile across local X and three tiles along local Z, centred on the origin. The far support post was removed at the user's request; the boom is supported by its hinge pedestal and the far end remains clear.

## Preview and model API

- `tactics/barrier-gate-study.html`: open, closed, scrub and playback controls; four camera views; close and 58 px/tile scales; optional horse for scale.
- `createFurnitureLibrary(...).build('barrier-gate', 'honey', {openness: 0})` creates an instance. The finish is fixed; the skin argument is ignored.
- `setBarrierGateOpen(root, amount)` in `barrier-gate.js` accepts a finite absolute value from 0 to 1. It can be reversed or scrubbed without accumulating transforms.
- Hinge: `[0, 1.07, -1.2]`; closed boom points along +Z, fully open rotation is -90 degrees around local X.
- Named anchors: `hinge`, `operator`, `lane-center`. Instance state is in `root.userData.barrierGate`.
- The furniture library owns the shared geometries and materials. Dispose the library when its collection is no longer used, rather than disposing each instance's shared resources.

## Scope

The model and study are included in the Pages packaging list and the furniture collection. Gameplay/editor registration, interaction rules, collision changes while opening, and movement interruption remain integration work. The ray tests establish visual passage clearance, not gameplay pathfinding.

## Validation

- 13 focused gate, furniture and packaging tests pass.
- The gate tests sample 181 opening positions for the 1×3 footprint and moving-part clearance around the pedestal, cap and service fittings. They also check passage rays, deterministic reversal, instance independence and stable shared resources.
- Browser checks cover 24 view/scale/pose combinations, animated opening and closing, reduced motion, mobile layout, and stable GPU resource counts.
- The 3D Pages build passes.
- Independent hostile review: 9/10 for this model-study scope, after correcting the counterweight link's clearance around the pedestal cap.

Commands:

```sh
node --test tests/barrier-gate.test.mjs tests/painted-furniture.test.mjs tests/tactics-pages-files.test.mjs
node tools/build-tactics-3d.mjs
```
