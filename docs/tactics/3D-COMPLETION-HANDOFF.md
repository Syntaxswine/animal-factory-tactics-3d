# Tactics 3D completion handoff

Status: actionable backlog with partial implementation. Read the canonical reconciliation below before continuing; some originally missing features now have approved integrated baselines.

Audited 22 September 2026 in `animal-factory-tactics-animal-motion`, branch `animal-motion-study`, through `2d0cb7a`. Other worktrees and the published 3D project may be ahead in integration. Reconcile their current state before implementing a section; do not duplicate completed work or overwrite the architect's changes.

## Starting point

- All nine species/roles in the original tactics sprite roster have character models. The model catalog contains twelve entries including bull, rabbit and dog. Original and Red Hat outfits exist for all twelve.
- Every gameplay weapon has a model: knife, pistol, rifle, assault rifle, SMG, HMG, shotgun, sniper rifle, grenade, grenade launcher, RPG and flamethrower. A static model or successful horse grip test does not establish motion coverage for every species.
- All 49 registered props have 3D representations. Boundaries, terrain and access structures bring the environment workshop to 78 entries. Much of this catalog is basic prototype art rather than finished painted scenery.
- The twelve-animal motion study covers rifle-oriented mammal movement and an unarmed hen sequence. It does not establish complete prone, casualty, death or all-weapon animation coverage.
- In this audited worktree, `HybridRenderer.actor()` still builds camera-facing sprite planes and uses body sprites for fallen units. Ground loot still draws through `drawLootPile()`. Character study models have not replaced that gameplay path.

Treat model existence, motion coverage, gameplay integration and architect/publication approval as separate statuses. Older milestone documents describe earlier snapshots, not the current completion checklist.

## Canonical reconciliation — 22 September 2026

The architect approved and published **`4ff0ab1`** in `animal-factory-tactics-3d`:
group selection, group stance changes, casualty poses and Walk/Run/Sneak controls.
That delivery passed 578 tests and browser checks. Its `battle-posture.js` and
`battle-motion.js` already provide integrated stance/casualty presentation.
The Starting point above describes the older graphics-study worktree only.

Sections 1 and 2 are now **refinement and coverage audits of those existing
baselines**, not instructions to recreate absent gameplay features. Compare the
horse proof against the integrated posture/attachment path before transferring
any improvement; reuse the approved implementation and record remaining gaps.
Do not replace the canonical movement or casualty logic with this study's rig.

The mature-tree parser/editor mismatch has a separate reviewed fix: source
`work/mature-tree-core` at `e529f4b`, and the 3D integration branch
`work/mature-tree-3d`. It passed source/integration tests and actual 3D editor
save → reload → export/import → playtest checks, with **9/10 hostile review**.
See that branch's `docs/tactics/MATURE-TREE-INTEGRATION.md`. Canonical merge and
publication remain separate. Wider environment-art/material reconciliation is
still held; preserve approved foliage while resolving it.

## Constraints and section gate

- Preserve approved prototype dimensions, tile movement, camera convention and character scale. Inspect at **58 CSS px per world unit** as well as close-up; do not resize characters to disguise pose defects.
- Keep the approved sculpt and bright, high-contrast painted style. Use the established roughly 30k authoring to roughly 10k character workflow only when a mesh correction is necessary. Weapons remain separate attachments.
- Reuse existing assets and rigs. Keep original and Red Hat outfits, including caps, coherent during deformation. Retain the hen's anatomy and species-specific tails, ears, horns and hooves.
- Simulation owns AP, stance legality, movement, sight, trajectories, damage, inventory, loot and casualty state. Animation consumes state/events and cannot change outcomes. The experimental hybrid collision path is not proof of shared-core gameplay parity.
- For **each section**, implement and inspect the bounded proof, fix defects, then obtain an independent **hostile subagent review of at least 9/10 before moving to the next section**. Review visual evidence separately from test success. A test count cannot raise an art score.
- Record the reviewed commit, close/gameplay images, front/side/rear views where relevant, transitions/video, checks run, review score and remaining limits. Never mark an unchecked combination as passed.
- Commit only the section's files and push the configured review branch after relevant checks pass. Follow the established architect handoff for separate-project integration/publication; a review-branch push is not a deployment.

## 1. Prone refinement, transitions and coverage

Start by comparing canonical's existing prone implementation with the horse/rifle
proof below, then transfer only reviewed improvements and fill demonstrated gaps.
Keep the hen's prone/crouch locomotion proof unarmed until section 3.

First bounded milestone, reviewed at `db9e1ee`:

- [x] Horse/rifle prone rest, aim, discharge/recovery and reversible kneel/stand transitions in the original and Red Hat outfits.
- [x] Correct hovering transition knees and the exposed shirt-hem paint/join defect; verify actual surfaces, grips, bore alignment and deterministic scrubbing.
- [x] Capture close/native motion evidence and obtain **9/10 hostile subagent review** for this horse-only proof.
- [ ] Transfer the proof to the remaining eleven characters before claiming complete section coverage.

See [Horse prone proof](HORSE-PRONE-PROOF.md) for evidence, exact coverage and canonical footprint limits. The catalog-wide checklist below remains open.

- [ ] Audit the approved integrated prone rest/aim baseline for torso, elbow, knee and foot/hoof support; apply proven corrections where needed.
- [ ] Audit standing/kneeling → prone → aim → fire → recover → kneel/stand, including interruption and direct scrubbing. Reuse approved behavior and implement missing transitions rather than replacing working coverage.
- [ ] Check continuous heading and vertical aim, including angles between compass directions. Preserve correct shoulder contact, support-hand grip, physical barrel/muzzle alignment and recoil timing.
- [ ] Transfer to all twelve characters and both outfits. Inspect underarms, collar, waist, crotch, soles, tails and cap fit for exposed paint, detached surfaces, clipping or excessive stretching.
- [ ] Reconcile prone footprint, picking and render placement with canonical simulation rules. Document any mismatch; do not move simulation hit volumes to make an animation pass.
- [ ] Add meaningful contact/clearance, transition continuity and deterministic-pose checks; capture front/side/rear and gameplay-size motion. Reach the section review gate.

Acceptance: readable grounded prone poses and reversible transitions across the catalog, with a clearly recorded weapon/outfit coverage matrix. Hen weapon use remains explicitly unsupported until section 3.

Start in [animal-motion.js](../../dist/tactics/animal-motion.js), [dog-motion.js](../../dist/tactics/dog-motion.js), [hen-motion.js](../../dist/tactics/hen-motion.js), [animal-motion-catalog.js](../../dist/tactics/animal-motion-catalog.js), [animal-motion-viewer.js](../../dist/tactics/animal-motion-viewer.js) and [animal-motion.test.mjs](../../tests/animal-motion.test.mjs).

## 2. Casualty refinement and death-transition coverage

- [ ] Inventory the current bleeding, stable, dead and captured states and their visual behavior. Preserve their actual gameplay meanings and visibility rules.
- [ ] Review the approved integrated casualty poses and fall/settle transitions, beginning with the horse; correct demonstrated gaps rather than rebuilding the existing baseline. A dead unit must not merely freeze in an aiming pose.
- [ ] Support falls from standing, kneeling and prone, plus spawning/loading directly into a settled casualty pose. Do not make game progression depend on waiting for an animation.
- [ ] Transfer to all twelve characters and both outfits; check head, limbs, wings, horns, caps and tails against the ground and nearby scenery. Use deliberate authored poses before considering ragdolls.
- [ ] Keep weapon detachment, dropped items and body placement consistent with simulation events. Prevent duplicate drops and distinguish a visible casualty from a removed/captured unit.
- [ ] Verify saved-state restoration, floor elevation, fog/visibility and cleanup. Compare against the existing body sprites at equal gameplay scale and reach the section review gate.

Acceptance: canonical casualty states have appropriate 3D presentation and deterministic settled poses without altering damage, rescue, capture or loot rules.

Start in [body-art.js](../../dist/tactics/body-art.js), [body-frames.js](../../dist/tactics/body-frames.js), [loot-art.js](../../dist/tactics/loot-art.js), [hybrid-renderer.js](../../dist/tactics/hybrid-renderer.js), [body-art.test.mjs](../../tests/body-art.test.mjs) and the character motion modules.

## 3. Armed hen poses

- [ ] Establish a convincing rifle carry/aim concept using the existing hen model and wing anatomy; inspect front, side, rear and gameplay size before expanding the equipment set.
- [ ] Build standing, crouching and prone weapon support, turning, vertical aiming, firing and recovery. Correct the actual grip rather than merely placing a hand/wing near weapon geometry.
- [ ] Check scarf/apron/feather coverage, leg ends, body clearance and Red Hat cap/comb fit throughout the sequence.
- [ ] Audit every weapon the canonical game permits the hen to equip. Implement appropriate contacts for each, including two-handed weapons, HMG handle, RPG placement and flamethrower hose/backpack. Record unsupported combinations honestly; do not silently substitute a rifle or change equipment rules.
- [ ] Verify muzzle/trajectory presentation, recoil timing, equipment switching and resource cleanup; reach the section review gate.

Acceptance: replace the catalog's `unarmed` limitation only after the implemented combinations genuinely work. All legal equipment must be accounted for before claiming complete hen coverage.

Start in [hen-motion.js](../../dist/tactics/hen-motion.js), [hen-worker.js](../../dist/tactics/hen-worker.js), [animal-motion-findings.js](../../dist/tactics/animal-motion-findings.js), [weapon-models.js](../../dist/tactics/weapon-models.js), [weapon-grips.test.mjs](../../tests/weapon-grips.test.mjs) and [HYBRID-WEAPON-MODELS.md](HYBRID-WEAPON-MODELS.md).

## 4. 3D dropped-loot presentation

- [ ] Map every canonical ground-loot item to its existing 3D asset: weapons, ammunition/fuel, medical supplies and tools. List any genuinely missing object model rather than duplicating inventory icons as world cards.
- [ ] Add floor-rooted world instances for loot piles using simulation item identity/quantity. Keep backpack/inventory icons as UI assets; they do not need conversion to 3D.
- [ ] Make mixed piles readable without oversized items, floating ammunition, coincident meshes or unreachable selection targets. Use real weapon dimensions and preserve tile-based pickup rules.
- [ ] Handle drops, pickups, transfers, casualty drops, depleted/removed piles and saved-game restoration without stale or duplicated objects.
- [ ] Respect floor filtering, fog and player knowledge. Check all supported item kinds, interaction picking, repeated updates and disposal; reach the section review gate.

Acceptance: world loot uses appropriate models and faithfully tracks inventory state; UI icons remain available and gameplay pickup/transfer outcomes are unchanged.

Start in [loot-art.js](../../dist/tactics/loot-art.js), [environment-models.js](../../dist/tactics/environment-models.js), [weapon-models.js](../../dist/tactics/weapon-models.js), [app.js](../../dist/tactics/app.js) and [loot-art.test.mjs](../../tests/loot-art.test.mjs).

## 5. Remaining environment art polish

This is a quality backlog, not a claim that whole prop categories lack geometry.

- [ ] Reconcile the environment workshop with any newer painted-environment work from the architect/other worktrees. Record which catalog entries use finished paint, which remain basic models, and which are only isolated studies.
- [ ] Review architecture and openings, containers/drums, furniture/workbenches, medical/lab equipment, small tools/supplies, shrubs/reeds and ground surfaces at gameplay size beside an approved character.
- [ ] Upgrade the weakest groups in bounded batches, using purposeful form and painted materials. Preserve the accepted trees/grass, simplified pine and downward branch mapping; keep both standard and mature tree choices.
- [ ] Preserve meaningful openings, map footprints, editor rotation, floor placement and approved collision dimensions. Identify any proposed gameplay geometry change explicitly.
- [ ] Check full-catalog rendering, representative mixed scenes, mobile framing, fog/floor filtering, instancing, texture/geometry disposal and a realistic many-prop performance sample. Apply the 9/10 review gate to each batch.

Acceptance: the catalog has a recorded visual status for every entry, with no unreviewed basic asset described as final. Avoid an unsolicited wholesale redesign of approved assets.

Start in [ENVIRONMENT-MODELS.md](ENVIRONMENT-MODELS.md), [PAINTED-ENVIRONMENT-STUDY.md](PAINTED-ENVIRONMENT-STUDY.md), [TREES-AND-GRASS.md](TREES-AND-GRASS.md), [environment-models.js](../../dist/tactics/environment-models.js), [environment-gallery.js](../../dist/tactics/environment-gallery.js) and [environment-models.test.mjs](../../tests/environment-models.test.mjs).

## 6. Gameplay character integration and completion audit

Begin by checking what the separate 3D project has already integrated. Reuse that implementation where appropriate rather than creating a competing renderer/core fork.

- [ ] Record the canonical simulation revision and the renderer integration baseline. Share the canonical core as required by [THREED-PROJECT.md](THREED-PROJECT.md); do not promote the older experimental hybrid collision mode as a parity release.
- [ ] Connect the approved character rigs, outfits and separate weapons to live unit identity/state/events, replacing this worktree's billboard path in the intended 3D launch target.
- [ ] Complete a species × outfit × legal weapon × stance/state coverage matrix. Existing rifle motion and static horse equipment checks do not prove every cross-species combination. Implement and review missing contacts/animations before marking them supported.
- [ ] Inventory non-rifle actions and access movement: throwing, melee, reload/equip, ladders, stairs, roof climbs, stabilization and wire cutting. Classify each as adequate existing presentation, needs animation or explicitly deferred. Do not invent elaborate animations for UI-only actions, but do not let a rifle sequence stand in for complete action coverage.
- [ ] Audit world combat effects: muzzle flashes, shots/tracers, impacts, explosions, flame bursts and persistent ground fire. Record which existing effects can remain and which need world placement/occlusion work; suitable world-anchored billboards or particles are valid, and fire need not become a polygon model. Verify physical launch/impact registration, simulation-event timing, floor/fog filtering, scene occlusion and cleanup.
- [ ] Integrate movement, stance changes, continuous aiming, discharge/recoil, prone/casualty states and loot presentation. Confirm selection, occlusion, multi-floor placement, fog, save/load, equipment swaps and model lifecycle.
- [ ] Verify identical canonical command/replay outcomes with rendering on and off. Test many visible characters and repeated roster/outfit/weapon changes for frame-time and retained-resource regressions; report the measured hardware and limits.
- [ ] Reconcile the entire sprite/model inventory and remove stale viewer findings only when evidence justifies it. Keep unsupported combinations visible in the completion record and reach the section review gate.
- [ ] Supply the architect with the commit, comparison links, coverage matrix, review evidence, check/build results and known limitations. Verify the actual deployment only when the publication workflow is performed.

Acceptance: a 3D presentation using the shared authoritative rules, with explicit complete coverage or an honest remaining-gap list. Standalone model viewers, passing geometry tests and a successful build alone do not establish gameplay readiness.

Start in [hybrid-renderer.js](../../dist/tactics/hybrid-renderer.js), [animal-motion-viewer.js](../../dist/tactics/animal-motion-viewer.js), [animal-motion-catalog.js](../../dist/tactics/animal-motion-catalog.js), [RED-HAT-VARIANTS.md](RED-HAT-VARIANTS.md) and the architect's current integrated renderer.

## Execution record

### 22 September 2026 — section 1, horse/rifle proof

Implementation: **`db9e1ee`**, branch `animal-motion-study`. Viewer:
`tactics/horse-prone.html?paused`. Evidence and scope:
[HORSE-PRONE-PROOF.md](HORSE-PRONE-PROOF.md) and
[hybrid-review/prone-proof](hybrid-review/prone-proof/).

Original and Red Hat outfits passed 1,296 browser pose samples; recorded close and
native sequences, five view sheets per outfit and grey support views. Eight outfit
swaps retained stable geometry/texture counts; all twelve prior motion viewers
passed loading and phase-scrubbing regression checks. **510 tests passed**, asset
validation passed and the 3D build succeeded.

Independent hostile review: **9/10** for this bounded proof, based on refreshed
temporal stills, source and checks; uninterrupted video was not part of that review.
Both blockers (transition knee support and shirt seam) were resolved. Shared hand
anatomy and compressed clothing remain prototype quality. Architect approval and
publication are pending. The other eleven characters, other weapons, hen handling,
prone crawling and gameplay integration are not covered. No subsequent section
has been started; next work is the section 1 catalog transfer.

For each completed section/batch append: scope, commit, evidence path/viewer, tested combinations, meaningful checks, hostile-review score, architect/publication status and remaining limitations. All section checkboxes are intentionally open at handoff creation.

Use the relevant focused tests and browser review harnesses while iterating. At implementation delivery run `npm run check` and `npm run build:tactics-3d`; the recorded baseline is 507 passing tests. Counts will change as coverage grows. Do not rerun the full implementation suite for a documentation-only checklist update.

Recommended next character work: **reconcile the reviewed horse proof with canonical's integrated posture and casualty implementation**, then refine uncovered combinations using the section review gates.
