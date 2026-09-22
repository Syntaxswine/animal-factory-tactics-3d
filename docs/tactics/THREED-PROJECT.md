# Animal Factory Tactics 3D

Update, 22 September: a separate first playable encounter now consumes the pinned current sprite core and renders modeled characters. See [PLAYABLE-3D.md](PLAYABLE-3D.md) for its exact scope and [MISSING-3D-VISUALS.md](MISSING-3D-VISUALS.md) for the remaining work. The historical snapshot notes below describe the older studies and hybrid lab.

This is a separate experimental project and deployment. It preserves the committed graphics history through `6d40981`; unpublished builder changes are excluded. The user's visual approval covers the painted horse direction. It does not imply that the new horse is already playable or that the earlier hybrid collision experiment has gameplay parity.

## Available now

- Bull worker: `tactics/bull-worker.html?mesh=10k`, built at `30b7662` and integrated through `7844ae8`. The 9,998-triangle version uses the existing rig and rifle. Independent review passed 64 browser combinations plus horse/goat regression views. Its leaner proportions versus the stockier sprite remain an art note, not a prototype blocker. Tail animation and equipment beyond rifle carry remain untested. The skunk has a corrected turnaround reference, not a completed model in this release.

- Goat worker: `tactics/goat-worker.html?mesh=10k`, through `b5a47d6`. The 9,994-triangle model reuses the worker rig and the existing rifle at unchanged scale. Independently checked 64 mesh/pose/heading/scale combinations and the horse shader regression. Accepted for the static prototype; hand detail and the small collar transition remain polish. Other goat equipment poses, animation and real-world weapon dimensions are not validated by this review.

- Weapon workshop: `tactics/horse-weapons.html?weapon=hmg`, integrated through `156665a`. Correct hand placement is the current acceptance criterion; hand anatomy, cuffs and weapon finishes remain polish. The HMG upper handle and grasp pass the dedicated clearance checks. All 391 repository tests pass. Shotgun and flamethrower remain the accepted weapon baselines. This is static equipment inspection, not firing or animation integration.

- Painted, skinned horse and separate rifle: `tactics/horse-light.html?mesh=10k`. The 10,300-triangle model retains the same painted skin and rig; the 28,886-triangle model remains selectable for comparison. This reduces character geometry by 64.34%, without establishing a frame-time improvement. See [model validation and limits](HYBRID-HORSE-10K.md).
- Representative painted environment: `tactics/hybrid-viewer.html?visual=room&props=sample`.
- Earlier playable hybrid and editor: retained as explicitly labeled development prototypes. These use sprite characters and experimental geometry rules.

## Shared-core contract

The authoritative game is `Syntaxswine/animal-factory`, branch `tactics-prototype`. Future 3D gameplay must use its movement, AI, AP, inventory, campaign, perception and combat outcomes. The 3D project owns presentation, animation, camera, picking and visual assets. Input must translate into shared game actions; rendering must not decide hits or damage.

This initial publication is a graphics snapshot, not a synchronized core release. The old `geometryMode: hybrid` changes collision and is incompatible with the reskin-only target. Do not promote that prototype as the parity implementation. The current canonical G2/map changes are not included in this snapshot.

Before presenting the 3D game as a parity release, select and record a canonical core revision, consume the same core in both launch targets, and verify identical command/replay outcomes with rendering on or off. Implement that dependency explicitly rather than maintaining two independently edited copies of the simulation. Preserve the old geometry lab as a separate diagnostic if needed.

## Development and delivery

Run `npm run serve` and open `/tactics-3d.html`. Run `npm run check` and `npm run build:tactics-3d` before delivery. The `main` branch of the 3D repository publishes `.pages-output` with GitHub Pages. The source game and its existing Pages repository are unaffected.

Next character milestone: preserve the approved skin through locomotion, stance changes and aiming. Check hidden-surface coverage and paint seams under deformation. The new horse's carry pose does not yet prove firing origins, full animation coverage, or many-character performance.
