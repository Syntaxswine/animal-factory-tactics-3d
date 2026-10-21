# Gunshot impact and fatal head effect proposal

Builder and artist handoff · 21 October 2026 · Proposed work

Give gunfire a readable physical impact: a short animated blood spray begins at
the place the resolved projectile strikes the character, oriented by its incoming
trajectory. This is the first priority. A separate, stronger head-destruction
effect follows for exceptional, qualifying head hits.

Keep the painted character aesthetic and judge the result at ordinary gameplay
size. A little exaggeration is useful when the characters occupy few pixels.
The desired realism is consistency of location, direction, timing and consequence.
Keep existing HP, resistance, leg wounds, treatment, equipment drops and campaign
population behavior, with the explicit fatal-head rule proposed below.

## Requirements and proposed decisions

The requested direction is:

- Ordinary damaging bullet hits produce a simple animated blood spray using the
  actual impact location and trajectory.
- An exceptional head hit can produce a separate head-destruction animation.
- Strong weapons should make that outcome more attainable. Small arms can also
  qualify when their resolved damage is sufficient, including the existing head
  damage bonus.
- Roughly twice the damage needed to kill is the suggested starting metric.

The exact threshold was suggested rather than finalized. The formula, timing,
budgets and settings below are recommendations for the first implementation.
Expose their tuning values together and record them in the study. Preserve the
ordinary-hit milestone even if the special-effect balance needs another review.

## What already exists

The reviewed baseline is canonical `f7b510e5`.

| Existing part | Consequence for this work |
| --- | --- |
| [Ballistic shot records](../../dist/tactics/ballistic-shot.js) carry impact coordinates, incoming `direction`, `origin`, actual victim and resolved zone. | Reuse those records; the cursor and intended target are insufficient. The accurate aimed-shot path preserves the adjudicated selected zone; incidental hits use their collision classification. |
| [Projectile collision](../../dist/tactics/core/projectiles.js) uses a simplified body collider in the ordinary tactical path. | Its contact is authoritative for gameplay but is not an exact intersection with the animated skin. Check visual placement explicitly. |
| [Attack resolution](../../dist/tactics/core/engine.js) applies resistance and clamps HP to zero. Head damage currently has a 1.5 multiplier. | Capture damage before the HP clamp. Do not multiply head damage again in the effects code. |
| [Critical shot rolls](../../dist/tactics/helicoid-shot.js) affect the accuracy decision. | A critical success does not currently supply an extra damage multiplier or guarantee an unobstructed head hit. |
| [Shot playback](../../dist/tactics/battle-combat.js) queues attacks and holds casualties until discharge; [shot effects](../../dist/tactics/battle-shot-effects.js) show a brief impact marker. | Extend this timing. The current marker reads only the first trajectory; the new receipt must cover every damage-applying impact. |
| Zero HP can mean a stabilized or bleeding squad member. | `downed` alone cannot authorize head destruction. The simulation must explicitly resolve a fatal outcome. |

The generated `dist/tactics/core/` files are reproduced by
[the core synchronization tool](../../tools/sync-tactics-core.mjs). Implement
changes through the maintained source/adapter path and update its manifest;
hand-editing generated output alone will lose the work on regeneration.

## Shared impact receipt: builder first

Add an ordered collection of body-impact receipts to each resolved firing event.
One receipt identifies one projectile or pellet that actually applied injury to
a living or incapacitated character. Preserve its association with the original
trajectory, including incidental hits on another person and friendly fire.

| Receipt information | Purpose |
| --- | --- |
| Stable attack, discharge and projectile/pellet identifiers; victim ID | Play each impact once and associate it with the correct shot in a burst or reply. |
| Impact position, incoming direction, resolved zone and coordinate convention | Place and orient the effect without another combat query. |
| Victim pose, heading and support/base-height snapshot at the hit | Preserve contact when the person subsequently falls, turns or changes support. |
| HP before this impact, HP at the start of this firing action, maximum HP, resolved injury damage before HP clamping, HP after | Drive intensity and evaluate the proposed threshold without losing overkill. |
| Casualty state before and after; explicit fatal-head outcome | Distinguish a wound, incapacitation, ordinary death and the special fatality. |
| Presentation seed derived from event identity | Reproducible visual variation without consuming the simulation's random stream. |

Capture these facts during resolution, before later pellets, retaliation, falls
or corpse posing can overwrite them. A weapon-only collision, miss, blocked
projectile or fully resisted impact must not be turned into a body wound.
Fire ticks, explosions and tank ruptures keep their existing effect paths in
this delivery. An impact already represented by a tank rupture must not also
receive a second head-destruction presentation.

Provide a small versioned JSON fixture containing real attack receipts for the
artist. Include a torso hit, leg hit, nonfatal head hit, qualifying fatal head
hit, incidental victim, burst and shotgun. Record the source revision. A debug
overlay should show the contact point, incoming arrow, zone, damage, threshold
and qualification reason. The fixture and live game must interpret the fields
the same way.

### Coordinates and visible skin

Use the last resolved incoming segment at the contact. Rotate both the effect's
origin and directional basis into render coordinates through one shared transform.
The core's logical layer height and the rendered floor spacing differ. Preserve
the recorded support height on roofs, ramps, cliffs and towers, and cover every
supported layer through shared constants.

Start from the recorded collision contact. If it visibly floats outside the
painted body, allow a small presentation-only surface correction along that same
ray, restricted to the hit character and recorded region. Bound this work to a
single local query at impact, provide a collider-contact fallback, and show the
correction in the debug overlay. It cannot select a new victim, zone or damage.
Avoid scanning the scene or raycasting the full character every animation frame.

## Artist: ordinary blood spray

Build one reusable directional effect, with size and density parameters. Use a
shared painted atlas plus a small number of droplets/cards. Keep it readable
against grass, snow, dark interiors and Red Hat clothing.

- Begin exactly at contact. A compact irregular burst establishes the hit, then
  a few droplets separate, fall and fade. Suggested total duration: 0.3–0.6 s.
- Make the incoming trajectory the effect's axis. For the initial entrance-only
  effect, use a short fan biased back from the contact, with restrained sideways
  variation. A forward exit jet requires a separately recorded exit point and
  penetration outcome; the current single-contact record cannot supply one.
- Use dark red masses with enough contrast to survive gameplay zoom. Avoid a
  luminous red flash, uniform red sphere, repeated star shape or continuous beam.
- Scale intensity within a restrained range from resolved damage. A minor wound
  should read as a hit without producing the special fatality's volume.
- Preserve the local hit height and body region for standing, kneeling and prone
  characters. Rotation of the camera must not turn the spray toward the viewer.
- Let scenery occlude it normally. Keep droplets from visibly passing through a
  nearby wall or floor using short bounded travel and, where necessary, bounded
  collision clipping at spawn. Use the actual supporting surface on upper levels.

The first study needs a painted character, controllable shot direction and hit
location, pause, slow playback, scrubbing and a gameplay-size view alongside the
close-up. Read the shared fixture rather than baking a different hit system into
the viewer. Start with the horse, then check the hen's different proportions
before expanding to the full roster and outfits.

Blood pools, permanent stains, new wound textures and a new medical system can
follow later. The spray should be useful and inexpensive on its own.

## Special effect: exceptional fatal head hit

Use the same contact and incoming axis, with a brief stronger burst, a small
number of painted fragments and a convincing transition into the existing
casualty fall. There is no need for a fireball, smoke plume, blast radius or
camera pause. This is a projectile impact, not the fuel-explosion effect.

The affected head must cease to look intact at the impact moment. Supply an
instance-local head mask, detachable region or equivalent lightweight solution
for each supported character. Check eyes, teeth, muzzle/beak, ears, horns, hair
and hats so disconnected intact parts do not remain floating. Keep the body,
clothing and held weapon aligned with the normal casualty animation. Do not
alter shared model geometry or materials in a way that damages other instances.

Use shared effects with species-specific attachment/mask data. A complete
separate animation bake for every weapon, outfit and camera angle is unnecessary.
Provide a safe ordinary-death fallback for an unsupported model while coverage
is being completed; identify those exceptions in the delivery notes.

### Recommended first trigger

Evaluate each injury-applying projectile separately. Let:

- `D` be that projectile's resolved injury damage after resistance and all
  existing damage modifiers, before clamping HP loss.
- `H` be the victim's remaining HP captured before this firing action begins
  applying its hits. Lock it for the action, including the pellets of one shell.
- `M` be the victim's maximum HP.

Proposed starting rule:

```text
threshold = max(2 × H, 0.5 × M)
fatalHead = eligible body impact
            AND resolved zone is head
            AND D > 0
            AND D >= threshold
            AND the impact leaves HP at zero
```

The `2 × H` term implements the suggested overkill idea. The half-maximum-HP
floor is an additional recommendation: it prevents a 2-damage hit on someone
with 1 HP from looking like an explosive impact. These are tuning constants,
not new damage multipliers. This interpretation measures one projectile against
health at the start of an action, rather than pooling unrelated damage across
an entire turn.

Illustrative cases, using already resolved damage:

| Maximum HP | HP at action start | Head-hit damage | Threshold | Result |
| ---: | ---: | ---: | ---: | --- |
| 45 | 45 | 113 | 90 | Special fatal head effect |
| 45 | 45 | 72 | 90 | Ordinary lethal head hit |
| 45 | 20 | 41 | 40 | Small-arms damage can qualify on a wounded victim |
| 45 | 1 | 2 | 22.5 | Ordinary lethal hit |

Apply the same rule to every ballistic weapon. A sniper rifle, HMG or critical
roll does not bypass the resolved-head-hit and damage requirements. Their
existing damage, accuracy and head multiplier determine their opportunities.
In particular, an HMG is not guaranteed to produce this effect on a healthy
target. Test actual weapon/stat combinations before finalizing the constants;
do not rebalance weapons merely to make the art demonstration trigger.

Do not add up torso hits to turn a later small head hit into head destruction.
For this first version, pellets also qualify individually; shell-total or
turn-total qualification would be a separate balance decision. Locking `H`
prevents an earlier pellet or burst round from quietly lowering the threshold
within the same action. Emit the special outcome at most once per victim.

The qualifying outcome must be committed by the simulation as death. A squad
member cannot lose their head and remain stabilized or recoverable. This is the
one explicit casualty-rule addition proposed here; the renderer must never set
HP or casualty state. Effects settings and headless play produce the same death,
loot and population result. Existing ordinary deaths retain their current rules.

## Builder: live playback and visibility

Emit the effect at the matching impact phase of the queued shot. Reuse the
existing discharge/impact timing and casualty holds. A longer spray may outlive
the short trace phase; give effects their own bounded lifetime rather than
holding the whole firing queue open. Each pellet and burst round can register
its contact, with visual aggregation only when needed for the budget.

Visible wounds must also work when the shooter is unseen. The current combat
queue can skip an unseen shooter's presentation, so do not make visible victim
effects depend on a visible muzzle. Keep the hidden shooter's position hidden.

Apply both character knowledge and current visibility gates. A revealed building
interior, Easy-mode terrain reveal or camera cutaway does not authorize showing
blood from an undiscovered guard. A known guard currently hidden behind a wall
must not acquire an effect visible through that wall. Do not replay a missed
hidden effect when the player later looks there.

Use event-local visual randomness. Particle counts, settings, camera position
and discarded effects cannot consume combat RNG or change attack order. Reset,
load, restart and interrupted playback must clear transient effects. If a saved
live encounter retains a special casualty, restore its presentation consistently
without replaying the spray. Preserve the existing campaign policy: defeated
population and items matter; this work does not require persistent corpses.

Add a saved **Blood effects: Full / Reduced / Off** setting. Reduced uses a small
brief spray and an ordinary casualty presentation; Off omits blood and the
destructive presentation. Both retain the same fatal outcome. Independently
respect reduced-motion preferences with a short still/fade instead of traveling
fragments. Keep hit feedback and casualty status legible in every setting.

## Rendering budget

Start with these measurable caps and tune downward if gameplay readability holds:

| Item | Initial budget |
| --- | --- |
| Ordinary impact | Up to 24 droplets/cards, lifetime at most 0.6 s |
| Special head effect | Up to 64 particles/fragments, lifetime at most 1.2 s |
| Concurrent effects | At most 12 emitters and 256 live particles in total |
| Shared texture | One atlas, initially 512 × 512; approximately 1.33 MiB decoded RGBA with mipmaps |
| Render work | Target at most three added draw calls for all active effects through batching/instancing |

Use pooled data, shared geometry and materials, normal depth testing, and no
particle shadows or local lights. Load assets before the encounter needs them;
avoid per-hit image decoding, shader compilation, mesh allocation or model fetch.
When the cap is reached, coalesce nearby ordinary hits or omit excess cosmetic
particles while preserving the qualifying fatal presentation and combat result.

Compare the same seeded fight, camera and settings with effects enabled and
disabled. Record hardware, resolution, draw calls, decoded texture memory,
frame-time percentiles and worst frame during a burst-heavy case. An initial
target is at most 1 ms added CPU work and 1 ms added GPU work at the 95th
percentile on the documented review machine. If GPU timing is unavailable,
report that limitation and compare total frame time. These are proposed budgets,
not measured performance claims.

## Acceptance evidence and delivery order

1. **Builder: receipt and fixture.** Capture real attacks, add the debug overlay
   and establish deterministic threshold tests. Agree the contract with the artist.
2. **Artist: ordinary spray study.** Submit a short clip and contact sheet at
   gameplay size and close-up, with direction arrows available. Approve location,
   timing and readability before increasing detail.
3. **Builder: ordinary spray in gameplay.** Demonstrate the actual shot planner,
   burst, shotgun, incidental hit, upper-level victim and hidden-shooter case.
   This first priority can ship independently of the special effect.
4. **Artist and builder: special head effect.** Approve the isolated effect,
   connect the explicit fatal outcome, and complete species/outfit coverage.

Acceptance should include meaningful tests for exact threshold boundaries,
post-resistance damage versus clamped HP loss, critical accuracy without
overkill, a selected head shot intercepted elsewhere, per-pellet association,
duplicate-event prevention, ordinary incapacitation and fatal casualty outcomes.
Verify identical combat RNG/results across Full, Reduced, Off and headless runs.

Visually inspect frontal, side, rear and elevated shots; standing, kneeling and
prone targets; all supported layers and tower/cliff support; the horse and hen,
then the complete roster. Include a wounded target who qualifies with small
arms and a high-powered torso hit that must not trigger head destruction.

Check fog and wall occlusion, unseen shooters, pause/resume, reset/load and
settings changes during playback. After at least 50 repeated fire/reset cycles,
GPU resources and pool capacity should remain bounded. Provide the measured
performance comparison, supported-model list and fallback cases.

Publish the study through the existing art gallery and packaged Pages build,
with all its module/atlas dependencies included. Keep the existing missing-module
checks and verify Quick Fight still opens from packaged output. Run the relevant
combat, casualty, visibility, settings, core-reproduction and asset checks, then
the required full release checks before proposing live integration.

Work in separate artist and coding worktrees from the current 3D canonical
branch. Share the fixture and effect interface early so the artist's approved
study can become the live effect without a second implementation.
