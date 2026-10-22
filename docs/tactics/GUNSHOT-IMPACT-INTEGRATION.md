# Gunshot impact integration

The simulation now supplies the body-impact records needed by the artist's gunshot effects. Ordinary hit and damage rules remain in force. A qualifying head hit commits a permanent death even on Easy; other lethal gunshots retain their existing casualty rules. The painted spray and species-specific head masks are the artist's next integration stage.

## Fatal head rule

For each damaging bullet or pellet, use its resolved injury after resistance and the existing head multiplier, before HP is clamped. The threshold is `max(2 × HP at action start, 0.5 × maximum HP)`. Only an actual head impact meeting that threshold and leaving zero HP qualifies. Constants live in `FATAL_HEAD_RULE` in [gunshot-impacts.js](../../dist/tactics/gunshot-impacts.js).

Starting HP is captured for the whole firing action: a burst, both shots from dual pistols, or all pellets of a shell. Earlier hits cannot lower the threshold. A retaliation has its own action and snapshot. Pellets never pool damage, and a natural critical success changes accuracy without supplying extra damage. A fuel-tank rupture keeps its existing fire presentation and emits no body-impact record for that impact.

The persistent unit field `fatalHead = {version: 1, impactId}` identifies the committed outcome. It is validated against zero HP and a dead casualty, retained by encounter and campaign saves, and held back by shot playback until the matching discharge. It must never be used to change HP from rendering code. Loading restores this outcome without replaying the transient shot.

## Artist data contract

Read [gunshot-impacts.v1.json](../../dist/tactics/fixtures/gunshot-impacts.v1.json). Its eleven cases are resolved by the actual attack command, including an incidental victim, a retaliation, bursts, shotgun pellets, dual pistols and layer six. `source.revision` identifies the base commit and `source.sourceSha256` identifies the exact producing sources, including changes made after that commit. Hashes use UTF-8 text with LF line endings so Windows and Linux produce the same result. Run `node tools/generate-gunshot-impact-fixture.mjs --check` to verify the source hashes and reproduce the attacks.

Each firing event has an ordered `bodyImpacts` array. `validBodyImpact` in [gunshot-impacts.js](../../dist/tactics/gunshot-impacts.js) validates the shared records.

| Fields | Meaning |
| --- | --- |
| `version`, `coordinates` | Version 1 uses tactical `{x, y, h}`: horizontal tile coordinates and logical height, with 3 logical units per layer. |
| `id`, `attackId`, `dischargeId`, `projectileId`, `projectileIndex` | Stable encounter-local identities. A pellet has its own index within its shell's discharge. Consume an impact once by `id`. |
| `shooterId`, `victimId`, `zone` | Actual participants and resolved region, which can differ from the selected target and region. A weapon-zone body collision can still inflict an ordinary wound under existing rules; it cannot qualify as a head hit. A weapon-only collision with no body injury produces no record. |
| `contact`, `incoming`, `origin`, `originSupport` | Authoritative contact, normalized incoming ray and launch snapshot. There is no exit-point or penetration claim. |
| `victim` | Species, stance, heading, position and support at impact. Support contains `kind`, `level`, `baseHeight` and `offset`; do not look up the person's later position to place this effect. |
| `hpBefore`, `hpAtActionStart`, `maxHp`, `injuryDamage`, `hpAfter` | Per-impact health and resolved damage, preserving overkill. |
| `casualtyBefore`, `casualtyAfter`, `fatalHead`, `threshold`, `qualificationReason` | Explicit injury/fatality result and its explanation. |
| `visualSeed` | A deterministic hash of the impact identity. Use a local generator; never consume combat RNG. |

Use `impactFrame(receipt)` in [shot-coordinates.js](../../dist/tactics/shot-coordinates.js) to obtain rendered contact, origin and incoming direction. It shares the game's floor spacing and body scale and preserves tower/cliff offsets. A bounded correction to the animated skin may adjust presentation only; it cannot select a new victim, region or damage.

## Painted spray placement

The artist's ordinary spray from `work/painted-blood-spray` at `4cdbcd9` is available unchanged in the placement review. Its local **+X** is the emission axis. [gunshotSprayFrame](../../dist/tactics/gunshot-spray-frame.js) maps that axis to **negative incoming**: a short entrance fan back toward the incoming bullet. World up determines roll, with a stable alternate axis for vertical hits. The camera never determines that transform; the emitter uses camera-facing cards to display the painted texture while droplets retain their world trajectories. Gravity remains world down. There is no forward exit jet without an independently resolved exit.

Call the helper once for an eligible impact at the matching discharge. Supply only the actual victim's authored body parts, after posing it at the captured impact stance and heading and updating its bounds. Do this before a casualty fall or head removal alters the surface. The query checks one short ray, extending at most **0.4 tile on each side** of the collider contact. It accepts only an entrance-facing skin triangle in the recorded region, classified by its interpolated bone weights. The torso includes arms; a weapon-region body injury may use torso or arms, but the query excludes held equipment. Wrong-victim, wrong-region, missing-model and distant-surface results retain the authoritative collider contact. The correction changes presentation only. Keep the returned frame fixed throughout the effect rather than following the victim as it moves or falls.

```js
const placement = gunshotSprayFrame(receipt, {
  model: {victimId: receipt.victimId, parts: victimModel.worker.parts}
});
const spray = createPaintedBloodSpray(sharedAtlas, {seed: placement.visualSeed});
spray.setFrame(placement.matrix);
// Add the identity-transformed emitter mesh to the scene. During playback:
spray.update(elapsedSeconds, camera, {floor: placement.floor});
// The caller owns visibility gating, pooling, retirement and sharedAtlas.
```

Open `tactics/gunshot-spray-study.html` in the 3D packaged build to inspect the shared attack fixture with the painted asset. Gold shows the incoming bullet, red the outgoing entrance fan, white the combat contact and green the corrected skin contact. The panel reports the correction and fallback reason. The camera control verifies direction from both sides; Horse and Hen are explicitly labelled art references, while Actual victim uses the species in the receipt. The two panels show close-up and gameplay scale, with pause and scrubbing. Selecting an attack or inspecting the effect never rerolls combat.

The fixture audit anchors 17 of its 20 impacts to a matching surface. Its leg shot, incidental goat hit and sixth shotgun pellet retain the collider contact: those recorded rays do not intersect a matching visible triangle within the correction budget. This is an explicit limitation of the simplified tactical collider. Do not shift the effect to another body part or invent a penetration to conceal it. The helper reports `no-matching-surface`, and the review exposes the fallback. Automated checks cover these cases plus horse and hen head, torso and legs in standing, kneeling and prone poses. The artist's painted root remains at contact and droplet positions remain unchanged when the camera turns.

![Painted spray at the resolved torso contact, shown close up and at gameplay scale](review-images/gunshot-spray-placement.png)

## Playback and visibility

`BattleCombat.active.event.bodyImpacts` follows the matching discharge. `canPresentBodyImpact` combines character knowledge and current contact visibility. Effects should use normal scene depth testing as well. Easy's revealed scenery and camera cutaways do not grant knowledge of an undiscovered victim. Skip a hidden impact when it occurs; do not queue it for discovery later.

Bullet traces can enter the visible area from an unseen shooter, leave it and re-enter elsewhere. Each visible run is separate; fog gaps are never joined. No hidden muzzle flash, actor or detection flag is added. Trace geometry uses a fixed buffer, including during repeated shots.

Open `tactics/battle-3d.html?study=gunshot-impacts` in the packaged build for a small playable review map, or append `impactDebug=1` to an ordinary encounter. At discharge the diagnostic overlay shows the contact point, incoming arrow, actual region, injury, threshold and reason. The review map uses the ordinary shot planner; it does not force hits or alter weapon damage.

## Next visual stage

The ordinary painted asset is attached to real receipts in the placement review; the live battle still needs the effect lifecycle. Connect the helper at the matching discharge, with Full, Reduced and Off preferences, independent reduced-motion behavior, a bounded emitter pool and impact-time visibility gating. The special head presentation then reads the explicit fatal outcome and uses instance-local species/outfit masks. Until that art is integrated, the game uses its ordinary casualty appearance for these deaths.

The current checks cover threshold boundaries, resistance, actual incidental regions, casualties, per-pellet association, hidden-source traces, saved outcomes, event deduplication, six layers and support snapshots. Fifty repeated trace/debug cycles retain the same geometry and dispose cleanly. Particle/GPU performance budgets require measurement after the artist's effects are connected.

## Release checks

The impact foundation passed 167 relevant combat, casualty, save, ammo, layer, query, fire and packaging tests. Its core reproduction check, real-attack fixture reproduction and asset audit passed. The playable map was checked through the ordinary shot planner, including a damaging hit and a missed shotgun blast.

The spray-placement follow-up passes 32 focused tests covering the new transform, actual posed surfaces, painted pivots, camera invariance, artist asset integrity, the existing impact contract and both packaging lists. The 3D packaged build, fixture reproduction and asset audit pass. Browser review covers horse and hen skin contacts, camera changes, layer six, scrubbing and the collider-only/still controls, with no browser console errors. The temporary review server and tab are closed after verification.

The full release run is not green. Its initial 2,830-test run had 17 failures and six existing TODOs. Replaying those failing cases with the pre-change `HEAD` versions of all changed modules reproduced 16 failures; the new discharge deduplication required updating the synthetic two-shot tank fixture to use two different identities. The renderer test now exercises the effect update after posing, and the visibility test covers the shared six-layer limit. All three affected playback/visibility cases pass.

Fourteen failures remain outside this change, confirmed again with the current code: the foliage source manifest, old plateau counts, old backpack-ammunition expectations, decorative-roof and arch assumptions, and intro camera/terrain checks. Their files are `biome-foliage.test.mjs`, `biome-obstacles.test.mjs`, `character-screen.test.mjs`, `editor-workbench.test.mjs`, `intro-ambush.test.mjs`, `intro-sprites.test.mjs`, `parapet-access.test.mjs` and `stone-arches.test.mjs`. This branch is ready for review of the impact work; these results do not authorize a canonical release.
