# Casualty integration review — 22 October 2026

## Decision

Approve `05abafb1`'s live fatal-head/weapon-release wiring and `94271595`'s
expanded weapon study after the integration repairs below. Hold
`4a1c49f0`'s window animation for its remaining final-motion balance failures.
The animation branch is not part of this release.

Fatal-head appearance and ordinary cosmetic weapon releases now work in battle.
The artist's refined strapped-tank, connected-hose and supported corpse pose
remain a study; the live flamethrower release uses the coder's rigid snapshot.
Exit wounds still need a confirmed simulation exit contact before wiring.

## Integration repairs

Both branches added `casualty-weapon-assembly.js` with incompatible constructors.
The resolved file preserves both implementations with explicit interfaces:

- `createCasualtyWeaponAssembly(worker, profile)` is the artist's study adapter.
  It manages the worn tank, hose and study-local casualty pose.
- `createCasualtyWeaponSnapshot(weapon, options)` captures the live displayed
  equipment without modifying its actor's pose. Battle drops, their tests and
  the measurement tool now use this name.

The merged build initially failed its module-closure check because live imports
reached `casualty-equipment-visual.js` before the later study-copy step. The
helper is now copied alongside the live dependencies. All missing-module checks
remain intact. The failing combined build, subsequent successful build and
negative missing-import test establish that the repair fixes the copy order.

## Live battle review

The packaged playable impact encounter was tested through ordinary commands.
A full-aim rifle torso shot inflicted 45 injury, leaving Boris at 25 HP. After
the normal enemy turn, a full-aim head shot inflicted 69 injury against a
50-point fatal threshold, reducing him to zero HP and playing the fatal burst.
The head and cap disappear in Full, with the remaining body handled by ordinary
casualty playback. The effect reads at gameplay size.

Off restored the ordinary intact-head casualty and immediately cleared blood.
Returning to Full restored the selected mask without replaying the impact.
Quicksave/load retained the fatal appearance, zero AP and three loaded Mosin
rounds without replaying a burst or weapon fall. Browser warning/error logs were
empty. Automated renderer-path tests additionally verify independent releases,
paired items, transfers, saved outcomes, hidden impacts and unchanged simulation
state, ammunition, inventory and loot.

The artist's catalog now covers twelve weapon kinds across eleven armed animal
profiles and three starting stances: 396 release combinations. The hen remains
unarmed. Independent packaged spot checks included the horse's prone
flamethrower and the pig director's prone RPG. The worn tank/connected hose is a
better visual direction than dropping the whole fuel assembly as one rigid
object. Adapting that study to live batching, stable pose caching and resource
budgets remains a separate task.

## Cost and remaining limits

Ordinary and fatal spray share admission limits of twelve emitters and 216 live
cards. They use at most two instanced draws, with up to two retained stain draws.
The three 512-pixel atlases use about 4 MiB decoded with mipmaps. Neck seals add
one small skinned draw per visible masked casualty in the tested native roster.

Weapon releases retain at most two casualty assemblies, up to two items each.
Actual tested items used three to seven material draws; the conservative cap is
nine per item, or 36 transient main-pass draws at the maximum. Additional render
passes can multiply submissions. This is additional to spray, stains and seals.

The [independent CPU/resource record](review-images/casualty-followup-resources.json)
contains hashes of the reconciled sources. Warm mask/batch work measured about
0.034 ms p95, excluding rig posing; a settings switch with bounds and batch
rebuild measured 1.10 ms p95. HMG snapshot creation was the slowest item at
6.38 ms p95. These uncontrolled Node wall-time samples exclude browser/GPU work,
first shader compilation and whole-sector frame time. They do not establish a
60 FPS result.

## Window recovery: keep the improvement, hold the branch

The horse's feet-in, lean and rise are more legible than the earlier recovery.
Committed horse and skunk study views were inspected through an immutable
`4a1c49f0` route, including the seated and feet-supported poses. No browser
warnings/errors appeared.

The author's final-motion report still identifies the skunk rolling on its tail
root and stalling before its feet land, and the cow's tail-root seat. Its reported
remaining over-limit times are 0.70 and 0.67 seconds; the skunk's sit-up reaches
260% of body weight and the cow's required force reaches 5.6 times body weight.
Those are the author's measurements, not fresh independent force measurements.
The complete animation test suite was not rerun here. The delivery does not
claim those gates pass, so it is not ready to replace gameplay traversal.

Keep the improved sit-to-stand and hand support. The next correction should make
the roll solver and the played pose agree on a supported pivot through landing.
Make that correction locally and retain the final-motion gate.

## Verification and cleanup

- 228 focused checks pass across twenty files, including live masks for all
  twelve animals, the complete weapon roster, body poses, batches, settings,
  visibility, fuel casualties, paired equipment and inventory conservation.
- Four final deployment/module-list checks pass, including deliberate missing
  transitive/worker imports. Two module-list checks overlap the focused run.
- All 28 changed JavaScript modules pass syntax checks. Core reproduction,
  eleven-case impact-fixture reproduction, asset audit and the combined Pages
  build pass.
- This follow-up did not independently rerun the full project suite. The prior
  canonical release and its Pages deployment were confirmed green; publishing
  this integration triggers the normal complete CI release check.
- Review tabs are closed. Both temporary preview lifetimes exited and released
  ports 49904 and 54902. Source, candidate patch, logs and restart/cleanup records
  remain under `artifacts/oct22-casualty-followup/`. No local watcher remains.
