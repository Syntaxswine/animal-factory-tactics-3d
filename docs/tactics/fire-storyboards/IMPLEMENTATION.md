# Painted fire: roster animation study

October 5, 2026. Open `tactics/painted-fire-study.html` in a served build, or follow **Painted fire** in the 3D gallery. The architect approved the horse foundation and reported publishing it as `0473dde`. This extension fits the roster and equipment; it does not wire the terminal burn into combat.

## Coverage

| Role | Supported variants |
| --- | --- |
| Burning character | All 12 animals, original and Red Hat outfits, plus the donkey guide: **25** |
| Target equipment | All 13 catalog choices on the 22 armed mammal outfits, both unarmed hen outfits and the unarmed guide: **289** |
| Flamethrower operator | The 11 armed mammals in both outfits: **22** |

The equipment choices include unarmed, knife, pistol, rifle, AK, SMG, HMG, shotgun, sniper rifle, grenade, grenade launcher, RPG and flamethrower. The hen and guide keep their established unarmed roles. Their selector disables unsupported weapons; the hen is not offered as an operator. Approved character and equipment dimensions are preserved.

The viewer has separate target and operator selectors. Focus isolates the chosen actor; whole-sequence view retains both. Four camera views, drag orbit, three scales, obstruction fixtures, shortened escape routes, effects toggle and reversible scrubbing remain available. Reduced-motion preferences start playback paused.

## Motion and equipment

Operators retain carry → brace → spray → trailing cutoff → recover. Feet stay planted and both hands remain on the projector anchors. The emission transform holds until the last flame departs at 1.58 seconds; recovery ends at 2.10 seconds. Pig poses account for their different reach. Pack placement accounts for body depth and the skunk's plume.

Targets startle, travel through up to three supplied legal tiles, settle into support, dissolve under fire and leave grounded ash. The full three-tile run takes 1.62 seconds. Mammals use uneven catching steps, head/shoulder reactions, and protective, swatting and outward/downward gestures. Heavy equipment keeps two-hand support during travel; one-handed equipment leaves the other hand free. Unarmed mammals react with both hands. The hen uses her avian skeleton, shorter steps, wing reactions and a low folded-leg collapse.

Pigs lean farther over a supporting hand instead of reaching through a clamped arm. Actual palm surfaces finish within 0.00036 tile of the floor. Other mammal palm clearances are approximately 0.0003–0.0013 tile. The HMG keeps its fitted closed glove after release and bears on that glove at a 0.001-tile clearance. Its cuff updates after the final arm transform. Authored contact offsets and elbow bend directions remain continuous across release, including the pigs' rifle grips.

Long tails bend around their roots during collapse. Foot soles remain rigid while the upper pastern/cuff follows the shin. The hen's temporary rig restores original skeleton, parenting and skin weights on disposal.

Equipment releases during collapse and falls at 9.81 world units/s² with a geometry-based floor limit. The flamethrower lance and fuel pack settle independently; the flexible hose follows their real sockets and rests on the floor. Each rigid prop's lowest vertex finishes 0.006 tile above ground. These are deterministic visual falls, not a general rigid-body simulation or newly created loot.

## Painted effects

The same generated flame atlas, smoke atlas and ash decal supply the art. No character subdivisions or sculpt work were added. The spray now uses 48 overlapping strokes with varied birth times, lateral positions, aspect ratios, rotations and atlas phases over a faint clipped core. This addresses the architect's request to reduce repeated flame rows.

The engulfing envelope derives regions from each mesh and follows its bones. Tail regions follow posed tail geometry. Head regions include caps, horns, long ears and the guide's brim. Eighteen charcoal-black billows retain their world-space birth positions and rise away from the moving body.

Bind-space soot and breakup cover the body, hats and fitted glove materials. Equipment is excluded. Fire outlasts complete body breakup, then decays toward ash. Reverse seeking restores the complete outfit. Character switching disposes owned meshes, skeletons, paints, caps, effect cards and textures. Partial outfit-load failures also dispose already-created projection targets and layers.

The [horse GIF](evidence/painted-fire-study.gif) remains the earlier approved horse capture: 960 × 540, 6.4 seconds, approximately 5.5 MB. It does not record this roster/spray revision. Current selected evidence and approval status are linked from [REVIEW.md](REVIEW.md).

## Integration contract and limits

`painted-fire-motion.js` owns presentation only. It does not change health, authoritative position, inventory, ammunition or damage. Callers supply the actual legal route and decide whether a terminal burn is authorized by the combat outcome.

The fitted study supports **standing, straight, same-height paths of up to three adjacent steps**. Turns are explicitly rejected. Kneeling/prone firing, arbitrary aim heights, terrain changes, corner footholds and combat interruptions remain separate work. Do not silently straighten a path through obstacles.

The fixture `dist/tactics/fixtures/painted-fire-contract.json` records incoming gameplay `flameShape` results and a SHA-256 of its source. `tools/capture-fire-contract.mjs INCOMING_CHECKOUT` regenerates it without modifying that checkout. At capture, gameplay defined range 10, mouth radius 3 and 37 clipped rays. The art module does not independently define damage, angle or range.

The fan and billow mask use a shooter-relative ground-level frame: subtract the fixture origin's map X/Y to obtain Three X/Z. The operator is at the study's local origin. A game adapter must map actual level height, muzzle, visibility and fog into one consistent frame. Discontinuous ray boundaries remain unbridged; decorative cards cannot fill in a doorway's wall shadow. Wall-protected targets do not react in the demonstration.

The terminal proposal differs from the existing turn-based burning rule. Gameplay must define eligibility, interruptions, shortened routes and final unit/casualty/loot ownership before enabling it. Tank explosions are not implemented by this animation study.

## Validation

- `node --test tests/painted-fire.test.mjs tests/painted-fire-roster.test.mjs tests/animal-motion-paint-lifecycle.test.mjs`: **78 passed**, including dense loadout playback on blocked, one- and three-tile paths; actual sole and hand/glove support; fixed bone lengths; reverse seeks; independent tank/lance support and hose sockets; wrist/elbow continuity sampled one microsecond either side of release; and failed/late texture cleanup. Another **40 related motion, paint and outfit tests passed**.
- `node tools/check-painted-fire-roster.mjs STUDY_URL`: 289 target loadouts and 22 operators, selected effects-on/off renders, repeated variant switching and GPU resource stability. Set `PLAYWRIGHT_PATH` to an installed Playwright package. `--quick` runs only targeted visual and resource checks.
- `node tools/check-painted-fire.mjs STUDY_URL`: 72 view/scale/obstruction/route configurations, reduced-motion startup and timestamped normal-speed playback captures.
- `node tools/check-assets.mjs` and `node tools/build-tactics-3d.mjs`: asset validation and packaged module closure.

Complete local captures, tests and helper receipts live under `artifacts/painted-fire/`. Selected portable evidence accompanies the review. Numerical checks establish the stated contacts and repeatable playback; the independent visual review is a separate gate and distinguishes still sequences from continuous playback.

## Remaining checklist

- [x] Build the approved horse storyboard, painterly textures and panic refinement.
- [x] Fit all 25 character/outfit variants and supported equipment.
- [x] Fit standing flamethrower operation for the 22 armed variants.
- [x] Refine spray overlap and retain incoming wall/door clipping.
- [x] Independent roster review **9/10**, with no blocking findings; see REVIEW.md.
- [ ] Agree on terminal events, interruptions, tank explosions and inventory/loot behavior.
- [ ] Adapt actual game transforms, visibility, aim, stances and corner/elevation routes.
- [ ] Exercise the final event in gameplay and review integration separately.

The other agent's gameplay checkout was not changed. This branch does not trigger the `main` Pages deployment.
