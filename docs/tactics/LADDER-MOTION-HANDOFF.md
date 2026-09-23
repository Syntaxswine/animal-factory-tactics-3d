# Ladder climbing presentation handoff

Integration update: the original rifle-only equipment contract below has been superseded by the shared carried/stowed state in `EQUIPMENT-STOW.md`. The authored body route, fixture and rig restrictions remain applicable.

Presentation worktree: `work/ladder-animation`, based on `b56ba05`. This change authors motion and a comparison viewer. Gameplay pathfinding, ladder actions, movement cost, occupancy, visibility and outcome playback belong to the wiring task.

## Review viewer

`tactics/ladder-study.html` shows ascent and descent with original and Red Hat outfits, four views, close-up and native 58 px/unit gameplay scale. The eleven supported mammals retain their approved smaller meshes, proportions and paint. The hen is deliberately unavailable: wing grips need a separate authored solution.

The study begins and ends with the rifle already slung. It does not animate taking a weapon out of the hands or unslinging it. Other equipment, especially the HMG, RPG and flamethrower, needs separate stow placement and clearance work.

## Controller contract

```js
import {createLadderMotion, LADDER_PRESETS, WIDE_LADDER_EXIT} from './ladder-motion.js';

const definition = {...LADDER_PRESETS.tower};
if (animalProfile.id.startsWith('pig')) definition.exitWidth = WIDE_LADDER_EXIT;
// exitWidth is valid ONLY when the visible asset also has that flared exit.
const motion = createLadderMotion(worker, animalProfile, definition);
const pose = motion.apply(elapsedSeconds / motion.duration, {
  direction: 'up',             // 'down' starts on the landing
  origin: [worldX, bottomY, worldZ],
  heading: headingDegrees
});
```

- Local **+X faces into the ladder/landing**, +Y is up and Z runs along the rungs. Positive `heading` applies a negative Y rotation, matching the previous posture controller. `origin` is the ladder frame's origin, not a tile center inferred by the controller.
- Supply an unscaled actor beneath an identity scene parent. Non-identity parents are rejected; put translation and yaw in `origin`/`heading` instead. The actor's root is positioned by this controller for the entire clip.
- Construct during actor/asset preparation. The first rig/fixture combination compiles its bend routes; a bounded cache shares those immutable routes with later matching rigs. Frame playback does not rerun the path search.
- Progress is clamped to 0–1. Sampling is deterministic and may be reversed, skipped or scrubbed. Descending traverses the authored path backward while facing the ladder.
- The controller resolves fixed-length limbs to named rung/rail contacts. Exactly one contact moves at a time during climbing; the other three support the body. Toes support the feet on the rungs. Paw width determines lateral spacing. Hand orientation changes between horizontal rungs and vertical handholds.
- `motion.duration` is **6 seconds**, not an action-point cost. The approach/climb uses 5.16 seconds; the two final landing steps use 0.27 seconds each, followed by 0.18/0.12-second hand releases. Descent reverses the same retimed path. The underlying geometric route and contact sequence are unchanged. `motion.phases` provides phase labels and start/end times. Diagnostics return local and transformed contact positions, planted flags and the posed root. `time` is elapsed playback seconds in either direction; `poseTime` and phase `poseStart`/`poseEnd` expose the original trajectory clock for geometric diagnostics. These are art diagnostics, not gameplay collision authority.
- `motion.restore('carry')` restores the entry root transform and a carry pose, hides the temporary sling and climbing gloves, and clears climbing diagnostics. Use it for cancellation. It deliberately does not place the actor at the destination tile.
- After completion, dispose the controller, then let the wiring owner place the actor at its authoritative destination and apply the next posture. `dispose()` removes the sling and climbing gloves, restores original hand positions/indices and temporary skin weights and returns to a neutral pose at the entry transform. It is idempotent. Do not apply a disposed controller.
- Only one pose controller may drive the worker at a time. Keep the worker rifle equipped during this clip; unsupported weapon IDs are rejected.

The climbing gloves are temporary open-channel meshes sized for these ladder sections, with fitted cuffs joined to a smooth, reversible cut in the original forearm. The approved source assets remain unchanged. The pigs use shorter one-rung steps; the foreman has a temporary pelvis-weight correction at the central rear seat. Dog/rabbit sleeve ownership is corrected locally for raised arms. The dog also receives a temporary olive jacket fill from its own paint atlas, with material hooks restored on exit. Construct the controller after installing the character paint material.

Construction failure rolls back owned resources and the entry transform before rethrowing. Cache reuse, unsupported equipment, invalid playback, cancellation and repeated disposal have explicit regression coverage.

## Ladder fixtures and dimensions

| Property | Compact study | Existing tower ladder |
|---|---:|---:|
| Landing top | 2.12 | 6.36 |
| Rung plane X | 0.35 | 0.35 |
| Rail center separation | 0.60 | 0.70 |
| First rung center Y | 0.1325 | 0.22 |
| Rung pitch | 0.265 | 0.28 |
| Rung count | 8 | 22 |
| Rung thickness | 0.055 | 0.06 |
| Rung depth | 0.07 | 0.08 |
| Handhold top Y | **3.02** | **7.29** |

Tower dimensions follow the ladder branch of `stair-guard-tower.js`: H=6.36, .22+.28n rungs, .70 rail spacing and H+.93 handholds. The wiring owner must transform the source asset's side, offset and facing into the frame above. The viewer's surrounding platform is only a clearance fixture, not a replacement tower asset.

**The compact study is not the unchanged legacy short connector.** That old asset's rails end at 2.12. The study visibly extends the rails to 3.02 so the dismount has real handholds. A definition without at least .65 of upper handhold is rejected. Integrating with the old connector requires an approved upper-handrail/exit adaptation; do not let the character grip empty space.

The descriptor exposes `height`, `plane`, `width`, `firstRung`, `spacing`, `rungs`, `railTop`, and optional `rungThickness`, `rungDepth`, `railThickness` and `exitWidth`. Both pigs additionally require `exitWidth: 0.94`: rails retain their original spacing below the deck, flare outward between landing height and landing +0.35, then continue vertically to the original handhold top. The rung dimensions and spacing stay unchanged. This is a **required visible exit adaptation**, not a claim that the original straight tower fits the pigs. The original narrow opening is rejected for them. The viewer labels and draws the flared fixture explicitly. No pig body compression or source-mesh resizing is used.

The two fixtures above, with this explicit pig adaptation, are the authored and tested configurations. Other geometries require their own reach, surface and exit review rather than assuming these values form a universal solver.

## Integration checklist

- Select a real ladder frame and fixture; implement the flared upper exit before enabling either pig; map authoritative action time to clip progress.
- Keep tactical state, destination placement, interruption rules and visibility outside this controller.
- Enter with the supported slung rifle presentation, or provide a separate weapon-stow transition.
- Sample the actor while it occupies the ladder; do not run walking/stance controllers concurrently.
- On success: dispose, place at the authoritative landing, restore the desired gameplay posture. On cancellation: restore/dispose and place at the authoritative interrupted state.
- Verify the actual tower/connector asset from front, side and rear at gameplay size. The isolated fixture cannot certify surrounding walls, roofs, neighboring props or arbitrary equipment.
- Keep the hen and unsupported weapon stows held until authored and independently reviewed.

## Reproduction

```sh
node --test tests/ladder-motion.test.mjs
node tools/ladder-clearance-review.mjs
node tools/ladder-motion-review.mjs
```

The browser harness accepts `PLAYWRIGHT_PATH`, `REVIEW_URL`, and optional comma-separated `REVIEW_ANIMALS`. Start `tools/serve.mjs` with `PORT=4432` for its default URL. Evidence is written to `artifacts/ladder-review/`; do not mistake earlier captures for a later revision.

Independent hostile review passed at **9/10** for this bounded presentation study. See [the dated review and residual-clearance disclosure](LADDER-MOTION-REVIEW-2026-09-22.md).
