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

## Playback and visibility

`BattleCombat.active.event.bodyImpacts` follows the matching discharge. `canPresentBodyImpact` combines character knowledge and current contact visibility. Effects should use normal scene depth testing as well. Easy's revealed scenery and camera cutaways do not grant knowledge of an undiscovered victim. Skip a hidden impact when it occurs; do not queue it for discovery later.

Bullet traces can enter the visible area from an unseen shooter, leave it and re-enter elsewhere. Each visible run is separate; fog gaps are never joined. No hidden muzzle flash, actor or detection flag is added. Trace geometry uses a fixed buffer, including during repeated shots.

Open `tactics/battle-3d.html?study=gunshot-impacts` in the packaged build for a small playable review map, or append `impactDebug=1` to an ordinary encounter. At discharge the diagnostic overlay shows the contact point, incoming arrow, actual region, injury, threshold and reason. The review map uses the ordinary shot planner; it does not force hits or alter weapon damage.

## Next visual stage

Connect the artist's ordinary spray to these records first. Add Full, Reduced and Off preferences, independent reduced-motion behavior, a bounded emitter pool and impact-time visibility gating with that effect. The special head presentation then reads the explicit fatal outcome and uses instance-local species/outfit masks. Until that art is integrated, the game uses its ordinary casualty appearance for these deaths.

The current checks cover threshold boundaries, resistance, actual incidental regions, casualties, per-pellet association, hidden-source traces, saved outcomes, event deduplication, six layers and support snapshots. Fifty repeated trace/debug cycles retain the same geometry and dispose cleanly. Particle/GPU performance budgets require measurement after the artist's effects are connected.

## Release checks

The relevant combat, casualty, save, ammo, layer, query, fire and packaging suites pass 167 tests. The core reproduction check, real-attack fixture reproduction and asset audit pass. The playable map was checked through the ordinary shot planner, including a damaging hit and a missed shotgun blast.

The full release run is not green. Its initial 2,830-test run had 17 failures and six existing TODOs. Replaying those failing cases with the pre-change `HEAD` versions of all changed modules reproduced 16 failures; the new discharge deduplication required updating the synthetic two-shot tank fixture to use two different identities. The renderer test now exercises the effect update after posing, and the visibility test covers the shared six-layer limit. All three affected playback/visibility cases pass.

Fourteen failures remain outside this change, confirmed again with the current code: the foliage source manifest, old plateau counts, old backpack-ammunition expectations, decorative-roof and arch assumptions, and intro camera/terrain checks. Their files are `biome-foliage.test.mjs`, `biome-obstacles.test.mjs`, `character-screen.test.mjs`, `editor-workbench.test.mjs`, `intro-ambush.test.mjs`, `intro-sprites.test.mjs`, `parapet-access.test.mjs` and `stone-arches.test.mjs`. This branch is ready for review of the impact work; these results do not authorize a canonical release.
