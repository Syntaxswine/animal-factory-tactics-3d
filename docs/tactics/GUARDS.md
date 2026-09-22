> Clock update: the current 3D dependency uses one game minute per round, including off-map guard settlement. The historical ten-minute approximation discussed below is superseded by [GAME-CLOCK.md](GAME-CLOCK.md). Tactical AI step/search counters remain behavior counters; animation duration does not advance a combat round.

# Guard alertness and personalities — proposal and tracking record

Opened 2026-09-16 on branch `tactics-guard-alertness`, stacked on `tactics-sight-lobes` (SIGHT.md). Direction from the user: guns alert guards at twice their range; guards, like mercs, get different personalities; that needs an alert / at-rest rule set first; twelve personalities, expanding what the friendly-fire reactions began; then, later the same day, personalities drawn at random from twelve Jungian archetypes rather than authored per guard.

## Status

| Stage | Scope | State |
| --- | --- | --- |
| G1 | Gunshot alarm at twice weapon range, for squad and guard shooters | Built on this branch, tests in `tests/tactics-alarm.test.mjs` |
| G2 | Guard alert states: rest, suspicious, alert, searching, stand-down, broken; combat can end without killing everyone; return to post | Planned, awaiting review of this document |
| G3 | Twelve Jungian archetypes drawn at random; bonds derived by wheel + affinity + friction (`tools/archetype-bonds.mjs`); traits for the state machine; barks | Designed, awaiting review |
| G4 | Shouted alarms between guards, guard-to-guard friendly-fire reactions and grudges | Planned |
| G5 | Happiness meter: opposing mercs on one local map lose 5 a day; 24 hours at zero and the merc quits | Designed, awaiting review |

Same gates as the other arcs: full suite green, 20-seed balance before and after, hostile review of at least 4/5 before the next stage.

Integration review: G2–G5 below remain proposals, not implemented game behavior. The bond script is a design calculator and is not imported by the game. Publishing this document does not satisfy the implementation or balance gates above.

## What exists today

- `alert` is a single boolean per guard. It becomes true when the squad identifies the guard, when the guard identifies a squad member, when the guard is attacked, or (G1) when a gun fires within twice its range. It never becomes false. Combat lasts until every alerted guard is dead.
- Non-alert guards do nothing except investigate: a footstep within 10 tiles (3 sneaking) or a peripheral glimpse gives them a `lastHeard` cell on the 6-tile grid and 12 investigation steps toward it, after which they stop where they are. They never return to post.
- Alert guards run one routine: shoot the nearest identified squad member, else reload, else walk toward `lastKnown`, else rotate 45° a turn. No cover use, no retreat, no cooperation.
- Mercs have authored personalities (`personalities.js`): six traits, bonds, quips, stress and fatigue meters, and a friendly-fire reaction that can retaliate. Guards have none of this. Guard names are fixed: Boris, Lev, Grigori, Oleg, Pavel, Igor, Anton, Vadim, Yuri, Sasha, Pyotr, Nikolai, in map order.

## G1: the gunshot alarm (built)

A firearm discharge (anything with a magazine: pistol, shotgun, SMG, rifle, AK, HMG, sniper, grenade, launcher, RPG, flamethrower) alerts every non-alert guard within **twice the weapon's range**, whoever fired it. Alerted listeners get `lastKnown` set to the shooter's approximate position on the 6-tile grid, so they converge on the report rather than on the exact tile. Guards already alert keep their existing fix. Beyond that ring the old 30-tile suspicion still applies to squad shooters.

| Weapon | Range | Alarm radius |
| --- | --- | --- |
| TT-33 pistol | 12 | 24 |
| Shotgun | 12 | 24 |
| SMG | 20 | 40 |
| Mosin-Nagant | 24 | 48 |
| AK-47 | 24 | 48 |
| HMG | 28 | 56 |
| Sniper rifle | 36 | 72 |
| Grenade (thrown) | 10 | 20 |
| Grenade launcher | 22 | 44 |
| RPG | 40 | 80 |
| Flamethrower | 10 | 20 |
| Knife, fists | 1 | none |

Radii follow the catalog automatically (the rule is 2 x range at fire time); this table was refreshed 2026-09-16 after the weapon-range revision on tactics-prototype (9aeb801, 5b4e0bb). With the longer ranges the old 30-tile suspicion ring only matters for the pistol, shotgun, grenade and flamethrower; every other report already alerts further than it carries suspicion.

Open question for the reviewer: `mag` is the discriminator, so a thrown grenade (no muzzle report) alarms at 20 around the THROWER, not around the impact, and the flamethrower (mag 4, a jet with no report) alarms at 20 as well; blasts themselves make no noise at all (`explosives.js` has no noise or alarm term). If a blast should carry, give explosives their own noise term at the impact in `detonate`, and give the flamethrower a jet term, rather than reusing weapon range.

Balance on the current tip (2026-09-16, after Codex's weapon revision 5b4e0bb and the retreat commit): 19/20, seed 1949 lost, identical to a clean-HEAD control worktree; the 18/2 record below is against the older sight-lobes tip 9c0dac1 and is not re-baselined here.

## G2: alert states

One state per guard, replacing the boolean. Transitions are the rules; personality parameters (G3) scale the numbers.

| State | What the guard does | Leaves when |
| --- | --- | --- |
| **Rest** | Holds post facing its assigned heading. Sight lobe and hearing as today. | Footstep or glimpse → Suspicious. Identification, being attacked, gunshot within alarm radius, or a shout → Alert. |
| **Suspicious** | Walks toward the `lastHeard` cell for up to *N* steps, then sweeps: two 90° turns on the spot. | Anything Alert-worthy → Alert. Steps exhausted → Stand-down. |
| **Alert** | Today's combat routine, plus a shout (G4). Tracks the freshest of: identified target, colleague's shout, gunshot report. | No squad member identified by this guard for *K* consecutive rounds → Searching. Nerve broken → Broken. |
| **Searching** | Goes to `lastKnown`, sweeps, then checks the neighbouring 6-tile cells for *M* rounds. | Identification → Alert. Rounds exhausted → Stand-down. |
| **Stand-down** | Walks back to post. Vigilance raised for the rest of the map (wary: suspicion radius +50%, longer investigation). | Arrives → Rest (wary). Any trigger → the corresponding state. |
| **Broken** | Moves away from the last threat toward the nearest ally or post, does not fire unless cornered. | *R* rounds unshot → Alert if a target is known, else Stand-down. |

Proposed defaults, before personality scaling: N = 12, K = 3, M = 4, R = 2; shout radius follows the archetype table in G4 (base 12, Ruler 20), never the officer role.

The squad's side of "combat can end" is already built (RULES.md, "Retreat and border crossings", 2026-09-16): members walk off the map across its 3-tile border, one at a time, and the map keeps its alerted guards; return and the fight resumes as a fresh contact. A map the squad has left advances no rounds (`stepEnemy` runs only on the current map), so K, M and R alone would leave those guards Alert forever. G2 therefore needs a second clock: while the squad is elsewhere, the state machine settles by campaign time on the next arrival (proposal: 1 round = 10 clock minutes, so K + M = 7 rounds ≈ 70 minutes; the shortest possible return is two crossings = 120 minutes, so a squad that steps out and straight back always finds the guards Stood-down and wary, never mid-search; that is the intended price of a retreat, the guards regroup faster than the squad can). Acceptance (staged by writing the clock in a test, since the game cannot return in under 120 minutes): leave a map with all guards Alert; advance the clock 60 minutes and re-enter: the guards are Searching around `lastKnown`; advance 120 minutes instead: every guard is at post and wary.

**Combat can end.** Contact is any guard in Alert or Searching. When none remain, the phase returns to real-time exploration even with guards alive: "Area quiet." Bleeding and burning still hold combat open as today. This is the "at rest" the user asked for, and it makes stealth and disengagement real options instead of a fight to the last guard.

**Posts.** A guard's start tile and heading are its post. Patrol routes are a later addition; the state machine does not depend on them.

**Acceptance properties.** A guard cannot skip from Rest to Searching. Stand-down always ends at the post (or at the nearest free tile to it when the post is occupied, e.g. by a downed merc) or in a higher state, never stalled. A wall blocks every sight-based transition and none of the sound-based ones. Combat ends within K + (walk to `lastKnown`) + M rounds of the last identification if nobody fires. "Cornered" for Broken means no legal step increases the guard's distance from the last threat. The existing bot cannot exploit "Area quiet" by standing still next to an alerted guard.

## G3: twelve archetypes, drawn at random

Direction 2026-09-16: personalities are randomly selected from twelve archetypes, not authored per guard. Another agent suggested the Jungian twelve, each defined by a want, a fear, a way of speaking and a failure mode:

| Archetype | Wants | Fears | Speaks | Fails by |
| --- | --- | --- | --- | --- |
| Innocent | safety and simple happiness | doing something wrong | plainly, trusts first | denial: ignoring what is ugly until it bites |
| Everyman | to belong | standing out, being left behind | common sense, understatement | going along with the crowd against their own judgment |
| Hero | to prove worth through hard action | weakness | challenges and deadlines | arrogance: picking fights that did not need fighting |
| Caregiver | to protect others | selfishness in themselves | warmly, asks what you need | martyrdom and smothering, helping past the point of being asked |
| Explorer | freedom and new ground | being trapped or conforming | restlessly, about the next place | never committing, wandering when staying was the task |
| Rebel | to break what is broken | being powerless | bluntly, provokes on purpose | destroying things that worked, revolt as habit |
| Lover | intimacy and beauty | being unwanted | sensory detail and devotion | losing self in the other, pleasing rather than telling the truth |
| Creator | to make something that lasts | mediocrity | ideas and half-finished sketches | perfectionism, never shipping |
| Jester | to enjoy the moment, make others laugh | boredom, being boring | jokes that carry the true thing | frivolity, joking through the moment that needed seriousness |
| Sage | to understand | being deceived or ignorant | carefully, cites, qualifies | paralysis: studying instead of acting |
| Magician | to transform situations | unintended consequences | systems and hidden levers | manipulation: treating people as parts |
| Ruler | order and control | chaos, being overthrown | decisions and responsibilities | authoritarianism: control past the point of usefulness |

### Who gets along and who is at each other's throats

Bonds are derived, not authored, by three rules (`tools/archetype-bonds.mjs` prints the matrix):

1. **The wheel.** Pearson's four orientations, 30° apart in this order: Innocent, Sage, Explorer (independence); Rebel, Magician, Hero (risk and mastery); Lover, Jester, Everyman (belonging); Caregiver, Ruler, Creator (stability and control). Opposite orientations sit 180° apart. Base bond = 30·cos(angle between them): +30 for the same, +26 next door, 0 at a right angle, −30 opposite.
2. **Affinity, +15 both ways**, where wants complete each other: Innocent–Caregiver, Innocent–Ruler, Everyman–Caregiver, Everyman–Jester, Hero–Ruler, Hero–Rebel, Caregiver–Lover, Explorer–Rebel, Explorer–Sage, Creator–Magician, Creator–Sage, Jester–Lover, Sage–Magician, Ruler–Creator, Rebel–Magician.
3. **Friction, −15 one way**, when A's failure mode is exactly what B fears: B resents A. The Rebel's habit of breaking what worked hits the Ruler's fear of chaos, the Innocent's need for safety, the Creator's lasting work and the Everyman's crowd. The Magician's manipulation hits five fears (wrongdoing, exclusion, being unwanted, selfishness, powerlessness). The Jester's frivolity hits four. The full failure-to-fear map is in the script.

Same-archetype pairs start at +30, minus 10 for the competitive types (Hero, Ruler, Rebel, Jester, Magician: two Rulers on one shift is one Ruler too many) and plus 10 for the cooperative ones (Everyman, Caregiver, Innocent).

The resulting initial bond seeds (row regards column; the merc bond scale is −100..100 and these are starting values, not ceilings):

| regards → | Inno | Sage | Expl | Rebe | Magi | Hero | Love | Jest | Ever | Care | Rule | Crea |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Innocent** | +40 | +26 | +15 | -15 | -30 | -41 | -30 | -26 | -15 | +15 | +30 | +26 |
| **Sage** | +11 | +30 | +41 | +15 | +15 | -15 | -41 | -45 | -41 | -15 | 0 | +30 |
| **Explorer** | +15 | +26 | +30 | +41 | +15 | 0 | -15 | -26 | -30 | -41 | -30 | 0 |
| **Rebel** | 0 | 0 | +41 | +20 | +26 | +30 | 0 | -15 | -41 | -45 | -41 | -15 |
| **Magician** | -30 | +15 | +15 | +41 | +20 | +26 | +15 | 0 | -15 | -26 | -30 | -11 |
| **Hero** | -26 | -30 | 0 | +30 | +26 | +20 | +11 | 0 | -15 | -30 | -11 | -45 |
| **Lover** | -30 | -26 | -15 | 0 | 0 | +26 | +30 | +41 | +15 | +15 | -15 | -26 |
| **Jester** | -26 | -30 | -26 | -15 | 0 | +15 | +41 | +20 | +41 | +15 | -15 | -15 |
| **Everyman** | -15 | -26 | -45 | -41 | -30 | -15 | +15 | +41 | +40 | +41 | +15 | 0 |
| **Caregiver** | +15 | -15 | -26 | -30 | -41 | -30 | +15 | 0 | +41 | +40 | +26 | +15 |
| **Ruler** | +30 | 0 | -30 | -41 | -30 | -26 | -15 | -15 | +15 | +26 | +20 | +26 |
| **Creator** | +26 | +30 | 0 | -30 | -11 | -30 | -26 | -15 | 0 | +15 | +41 | +30 |

**Allies, both ways:** Explorer–Rebel (+41/+41), Lover–Jester, Jester–Everyman, Everyman–Caregiver (all +41/+41), Sage–Explorer (+41/+26), Rebel–Magician, Ruler–Creator, Innocent–Ruler, Sage–Creator, Rebel–Hero.

**At each other's throats:** Rebel–Ruler (−41/−41), Rebel–Everyman (−41/−41), Hero–Creator (−45/−30), Rebel–Caregiver (−45/−30), Explorer–Everyman (−30/−45), Sage–Jester (−45/−30), Magician–Caregiver, Explorer–Caregiver, Sage–Everyman, Sage–Lover.

**One-sided, which is where the drama is:** the Sage admires the Explorer more than the Explorer notices (+41/+26); the Magician wants the Rebel as an instrument more than the Rebel wants the Magician (+41/+26); the Creator looks up to the Ruler, who barely rates them (+41/+26); the Innocent trusts the Sage (+26), who finds the Innocent's denial tiresome (+11); the Lover is drawn to the Hero (+26), who returns +11. These asymmetric pairs are what the friendly-fire reaction turns into grudges: the one who cared more takes the hit harder.

Across all 66 pairs the mean two-way sum is −7 and 32 pairs are negative in both directions, so a random four-merc squad is fractious by default. That is a knob: the wheel amplitude (30) sets how much orientation matters, the friction weight (15) how much failure modes matter. Halving the amplitude gives a mostly neutral roster with a few feuds.

### What an archetype does in the guard state machine

The four state-machine traits from G2 come from the archetype; Codex's six merc traits are set in the same table so the retaliation formula works unchanged.

| Archetype | Vigilance | Nerve | Initiative | Obedience | Aggression | Pride | Discipline | Forgiveness | Loyalty | Humor | On the gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Innocent | 60 | 30 | 30 | 80 | 20 | 30 | 60 | 85 | 70 | 40 | Trusts the quiet. Slow to believe a shadow is a threat, quick to break when it is. |
| Everyman | 50 | 45 | 30 | 85 | 35 | 35 | 60 | 60 | 75 | 50 | Does what the others do. Goes where the shout goes. |
| Hero | 60 | 85 | 95 | 40 | 85 | 80 | 55 | 30 | 60 | 45 | Pursues at a run. First through the door, first to pick the fight. |
| Caregiver | 65 | 55 | 60 | 60 | 30 | 40 | 70 | 80 | 95 | 35 | Runs to whoever is hit. Stands over the wounded instead of firing. |
| Explorer | 85 | 50 | 80 | 20 | 50 | 55 | 30 | 55 | 40 | 60 | Investigates furthest and longest, then does not come back to post. |
| Rebel | 55 | 75 | 90 | 10 | 90 | 75 | 20 | 20 | 35 | 55 | Ignores the shout, ignores the post, provokes the mercs and the officer alike. |
| Lover | 45 | 35 | 40 | 65 | 30 | 50 | 45 | 70 | 85 | 50 | Stays close to a bonded colleague; breaks when that colleague falls. |
| Creator | 55 | 45 | 25 | 45 | 30 | 60 | 75 | 50 | 55 | 40 | Holds post and improves it: cover, angles. Slow to leave. |
| Jester | 40 | 40 | 55 | 30 | 45 | 45 | 25 | 65 | 60 | 95 | Barks constantly, which is noise. Dozy on watch, lively in contact. |
| Sage | 90 | 50 | 20 | 55 | 25 | 55 | 85 | 55 | 50 | 30 | Notices everything, acts late. Long searches, patient overwatch. |
| Magician | 70 | 60 | 65 | 25 | 55 | 65 | 60 | 35 | 40 | 45 | Flanks. Uses the alarm to move others, keeps its own fix. |
| Ruler | 70 | 70 | 45 | 50 | 55 | 85 | 90 | 30 | 65 | 25 | Holds post, shouts furthest, expects the shout obeyed. Stands down last. |

Species traits (SIGHT.md) and archetype traits stack; the archetype never changes what a species can see.

### Assignment

- Guards draw an archetype from the social RNG stream at map creation (never the ballistic stream), so a seed reproduces its roster. `s.socialSeed` is seeded lazily today (first `friendlyReaction`), so drawing at creation shifts every later social roll: the build must hold the draw off behind its knob in the old fixtures and hash-equal the old rig with the knob neutral before turning it on. Guards may repeat archetypes; the twelve factory names stay as names.
- A merc squad draws four distinct archetypes. The four authored mercs keep their authored bonds and gain an archetype tag for the state-machine traits: Yakov Ruler, Anya Rebel, Misha Creator, Vera Caregiver. The derived matrix scores Yakov–Anya at −41 both ways, Anya–Misha at −15/−30 and Yakov–Vera at +26/+26. That does NOT match the hand-written bonds in every case: `personalities.js` authors Yakov–Anya at +5/+5. Decision (2026-09-16, for the reviewer to confirm): for the four authored mercs the authored value is the resting level and the archetype tag drives state-machine traits only; the matrix is the resting level for random draws (guards, recruits). If the boss prefers the matrix for the authored four, Yakov and Anya start resented and the demo squad has a feud from day one.
- Initial bonds among guards, among mercs, and between a captured merc and its captors all come from the matrix; the friendly-fire reaction, the kill relief and the stress meters then move them as today.
- Each archetype ships with two barks per state, in its speech register from the table above, on the merc dialogue channel.

### Levels of getting along

Direction 2026-09-16: a bond needs rungs, not just a number, and mercs are the cleaner case because recruitment shows the friction before anyone signs. The matrix value is a **resting level**; events push a bond away from it and rest pulls it back, so feuds cool but incompatibility never disappears.

Six rungs on the existing −100..100 scale, retaining the four existing labels (`personalities.js` has trusted / cautious / strained / resented today) and adding bonded at the top and feud at the bottom:

| Rung | Range | Label | What it does for mercs | What it does for guards |
| --- | --- | --- | --- | --- |
| Bonded | 60 and up | bonded | Never retaliates. Stress halves when adjacent to the other. Formation orders keep the pair together. Takes a stress spike when the other is downed. | Runs to the other when hit. Shares the other's fix on a shout regardless of obedience. Breaks when the other is killed unless nerve is high. |
| Trusted | 25 to 59 | trusted | Retaliation chance at half the formula. Adjacent transfers and stabilizing at normal cost. Friendly barks. | Answers the other's shout. Holds a flank next to them. |
| Cautious | 0 to 24 | cautious trust | The formula as written. Neutral barks. | The formula as written. Obedience check as written. |
| Strained | −34 to −1 | strained | Retaliation at 1.5×. Needling barks. Formation orders keep the pair apart by one tile. Transfers cost +1 AP: the handover is grudging. | Ignores the other's shout unless obedience is high. Won't stand adjacent at post. |
| Resented | −35 to −69 | resented | Retaliation at 2×, and a near miss (a bullet passing within a tile) counts as a hit for the incident ledger. Stabilizing the other costs double medical AP. Drops out of group moves the other leads. | Never answers the shout. Investigates away from, not toward, the other. A shot that passes near the other is not corrected for. |
| Feud | −70 and below | feud | Everything above, and at the end of a map either party may refuse the next contract while the other is on the roster: the recruitment screen says so. | If the officer (the Ruler on the map, or the highest-discipline guard) is down, the pair may fire on each other in contact, using the same ammunition-limited retaliation rule. |

**What moves a bond.** Two events exist today: friendly fire (−8 and −20% of the damage fraction) and stabilizing (+20). Proposed additions, all on the social RNG stream and all logged as memories:

| Event | Change | Who |
| --- | --- | --- |
| Survived a contact together, both alive at the end | +3 | each pair present |
| An overwatch or reaction shot that hit the enemy targeting the other | +10 | the one covered, toward the coverer |
| A kill made while the other was bleeding or downed within 6 tiles | +8 | the downed, toward the killer |
| Left bleeding within reach while the other spent its AP elsewhere | −15 | the bleeder, toward each comrade who could have reached |
| The other's death | stress +25 for a bonded partner, +15 for trusted; a feud partner gets relief instead (happiness effects in G5) | survivors |
| Rest between maps, per 8 hours | 10% of the distance back toward the resting level | every pair |

A pair that starts strained can therefore climb to trusted through a good campaign, and drops back toward strained only slowly; a bonded pair that suffers one careless burst falls to cautious and recovers by resting. Rungs are crossed, and the log says so ("Anya no longer trusts Misha").

**Recruitment.** When replacement recruitment exists (STORY.md lists it as unbuilt), the candidate card shows the archetype in its speech register and the predicted rung with every current squad member, as labels not numbers: "would get on with Vera; would clash with Anya; Yakov would not trust her at first." A candidate in a predicted feud with anyone on the roster says so and asks a higher fee. The player is choosing the squad's temperature; the game should never hide it. For guards none of this is shown; the player learns a roster's rungs by watching who answers whose shout.

**Levels of not getting along have different shapes.** Strained is verbal: barks, a grudging handover. Resented is physical: spacing, refusals, carelessness. Feud is structural: someone leaves, or someone shoots. That ladder is what makes the friendly-fire trance more than a coin flip: the same burst that a trusted comrade shrugs off is, for a resented one, the excuse they were waiting for.

## G4: shouts and guard-on-guard incidents

- An Alert guard shouts once on entering the state: guards within the shout radius that pass their obedience check take the shouter's `lastKnown` and go Alert; the rest go Suspicious toward the shouter. Shout modifiers follow the assigned archetype, not a fixed guard name (names carry no traits under G3). Radius by archetype, base 12:

| Archetype | Radius | Why |
| --- | --- | --- |
| Ruler | 20 | Expects to be obeyed and projects |
| Hero | 16 | Challenges out loud |
| Caregiver | 14 | Calls for the others' sake |
| Everyman | 12 | The base |
| Jester | 12 | Loud, but listeners go Suspicious rather than Alert: the joke is not believed |
| Lover | 10 | Calls to the bonded partner first |
| Creator | 10 | |
| Innocent | 8 | Unsure it is real |
| Sage | 8 | Reports carefully, late |
| Explorer | 6 | Usually elsewhere |
| Magician | 6 | Keeps its own fix and uses the shout to move others |
| Rebel | 0 | Does not shout for anyone |
- Bullets already hit the first body on the ray regardless of team, so guards can shoot guards. Reuse `friendlyReaction`: stress, bond loss, grudge, a bark, and the same retaliation chance. Grigori shooting back at Pyotr in the middle of a firefight is the intended kind of chaos, bounded by the existing "ammunition-limited retaliation" rule.
- A guard whose bonded colleague is killed gains stress and, if nerve is low, can break on the spot.

## G5: happiness and quitting

Direction 2026-09-16: personalities conflict when mercs with opposing personalities are on the same map tile; every day they spend together their happiness goes down a little, 5 out of 100; if happiness stays at zero for 24 hours the merc quits.

Assumptions taken, each reversible:

- "Map tile" means the same **local map** on the overmap, the unit the squad travels between. Two mercs on different local maps are apart; the same 240×240 map is together, whatever their tile distance.
- "Opposing" means the pair's current rung is **resented or feud** (bond −35 or below). A strained pair does not decay happiness; it only bickers. Since bonds move, a pair can become opposing through friendly fire, or stop being opposing through a good campaign.
- Decay is **per opposing partner**: a merc in two opposing pairs loses 10 a day.

### The rules

- Every merc has **happiness**, 0..100, starting at 100 on recruitment. It is a separate meter from stress (combat, short-term) and fatigue (rest debt). Shown on the character sheet beside them.
- Time is the campaign clock (`world.js`): exploration minutes, one hour per travel, the hours chosen for rest and training. Happiness is settled whenever that clock advances, at **5 per 24 clock hours per opposing partner on the same local map**, pro rata, so eight hours together cost 1.67.
- A merc whose happiness has been **exactly zero for 24 consecutive clock hours** quits at the next safe moment: the end of the current contact, or immediately if the squad is exploring. Quitting is a new roster state, `quit`, alongside captured and dead: the merc keeps its skills and history in the roster snapshot (a quit merc can be re-recruited later at a price), takes its held weapons and pack, and leaves its loot-pile claims.
- The 24-hour timer resets the moment happiness rises above zero. A merc at zero is shown as "about to quit" with the hours remaining, so the player is never surprised.
- The game logs the rung and the cause: "Anya has had enough of Yakov (2 days together, happiness 0)."
- A merc that crossed a map edge and is waiting beyond it (RULES.md, retreat) counts as on its destination map from the moment it crosses, for decay, the separation bonus and "quits at the end of the current contact" alike (it is in no contact while waiting).

### What raises happiness (proposals, so the meter is not a one-way ratchet)

| Source | Change |
| --- | --- |
| A clock day with no opposing partner on this local map (including a merc that has no opposing partner at all) | +5 |
| Instead of the +5: a clock day when the merc HAS opposing partners and every one of them is on a different local map | +10 |
| A contact won with no squad casualty | +5 |
| A bonded or trusted partner present on the same map, per day | +5 / +2 each (see below) |
| Pay day, if a wage or contract system is ever built (ECONOMY.md has none today; proposal only) | +10 |
| A partner's rung crossing upward (strained → cautious, or better) | +5 once |

The separation bonus is the design lever: the player can keep two mercs who hate each other by never fielding them together, at the cost of a thinner squad on each map. That is the "cleaner with mercs" case from recruitment carried into the campaign: the friction is visible, and managing it is play.

### People a merc likes working with

Direction 2026-09-16: there should also be people that mercs like working with, giving a bonus to happiness, and mercs should feel extra upset if that merc is killed.

"Likes working with" is the bonded or trusted rung, the mirror of "opposing". The same rung that governs retaliation and formation governs the meter, so the player reads one relationship, not two.

| Event | Bonded partner (60 and up) | Trusted partner (25 to 59) |
| --- | --- | --- |
| A clock day together on the same local map | +5 | +2 |
| That partner killed | −75 happiness, stress +25 | −35 happiness, stress +15 |
| That partner captured | −20 once, at the moment of capture; +15 once on the rescue (net −5); dies in captivity: a further −55 | −10 once; +5 once on the rescue; dies in captivity: a further −25 |
| That partner quits | −15 | −5 |
| That partner stabilized by this merc | +5 (relief), on top of the bond gain | +3 |

The daily bonus stacks per liked partner and offsets decay from opposing ones, so a merc who hates one squadmate but is bonded to two others gains 5 happiness a day: +10 − 5. Deaths are settled at the moment of death, at the rung in force then, and they ignore the resting level: a feud partner's death gives relief (stress −10) and no happiness change; a cautious partner's death is proposed to affect stress only, with the amount still to be specified.

The grief case is the intended consequence: a merc at or below 75 happiness who loses a bonded partner drops to zero on the spot and, if nothing lifts the meter within 24 clock hours, walks; a merc above 75 keeps the remainder, at most 25. (Direction 2026-09-16: −75 rather than a full wipe.) A separate map from the opposing partner or a casualty-free win is what lifts it. The log names the reason: "Vera has not spoken since Misha died."

If the killer was a squadmate (friendly fire), the survivor's grudge against the killer uses the existing incident ledger at the dead partner's rung as a multiplier: a bonded partner killed by a comrade's burst is the fastest route to a feud in the game.

### Guards

Guards do not quit; they are not on contract. A guard roster's opposing pairs express themselves through the rungs (shouts ignored, flanks not held, feuds when the officer falls), not through a meter.

### Acceptance checks

1. Two mercs at rung cautious on the same map for ten clock days lose nothing.
2. Two mercs at rung resented on the same map lose exactly 5 per 24 clock hours each, pro rata across rest, travel and exploration minutes.
3. A merc at zero for 23 hours who is separated from the opposing partner for one hour recovers above zero and the timer resets.
4. A merc at zero for 24 hours quits at the end of the current contact, never mid-contact, and appears in the roster snapshot as `quit` with skills intact.
5. Happiness never leaves 0..100; the clock rollover at midnight does not double-settle.
6. A guard never has a happiness meter.
7. A bonded partner on the same map adds exactly 5 per 24 clock hours, and offsets an opposing partner to a net zero.
8. A bonded partner's death subtracts 75 happiness and adds 25 stress at once; a feud partner's death costs no happiness and relieves 10 stress.
9. A bonded partner killed by a squadmate's bullet raises the survivor's grudge against that squadmate by the bonded multiplier.

### Decisions from the integration review (resolved 2026-09-16)

The four items the integration review left open, answered so implementation can start. The G3 assignment bullets, the G5 recovery table and the partner tables above are to be read with these.

1. **Assignment.** The four authored mercs keep Codex's hand-written bonds as both their initial and their resting level toward each other; the archetype tag (Yakov Ruler, Anya Rebel, Misha Creator, Vera Caregiver) supplies only the state-machine and merc traits. Every other pair, meaning random recruit to random recruit, random recruit to authored merc, guard to guard, and captive to captor, takes the matrix value as both initial and resting level. One rule: authored beats derived wherever an authored value exists.
2. **Recovery.** The two daily bonuses do not stack; they are one rate with two tiers. A merc with no opposing partner present on its current map gains +5 a day, including a merc with no opposing partners at all. If the merc has at least one opposing partner and every one of them is deployed on a different local map, the rate is +10 instead, because the player paid for the separation with a thinner squad. The liked-partner bonus stacks on top of either tier, and acceptance check 7 holds because the tier bonus never applies while an opposing partner is present.
3. **Capture.** A one-time loss followed by a partial recovery. Capture subtracts 20 (bonded) or 10 (trusted) once, at the moment of capture; nothing further accrues while the partner is held. Rescue adds 15 (bonded) or 5 (trusted) once, so the net after a rescue is −5. If the captive dies in captivity the death penalty applies minus what capture already took: 55 bonded, 25 trusted.
4. **Quantities.** A bonded partner killed by a squadmate's bullet: the survivor's incident ledger against the killer gains grudge at 2× (trusted 1.5×) and the survivor's bond toward the killer drops a further 40 (trusted 20) on top of the ordinary friendly-fire loss. A cautious partner's death adds 10 stress; strained 5; resented 0; feud relieves 10, as already stated.

Shout radii by archetype are in G4. The retreat rule's consequences for G2 (a second, campaign-clock settle for maps the squad has left) and for G5 (a waiting crosser counts as on its destination map) are recorded in those sections.

## Balance record

### G1, 2026-09-16

Seeds 1947–1966, the same bot, against the sight-lobes tip 9c0dac1.

| | Sight lobes | + gunshot alarm |
| --- | --- | --- |
| Won / lost | 15 / 5 | 18 / 2 |
| Stalled or hung | 0 | 0 |
| Mean survivors on a win | 2.53 | 2.78 |
| Mean squad HP on a win | 180 | 186 |
| Mean rounds on a win | 12.5 | 10.6 |

Losses on 1961 and 1963. The alarm made the factory easier for the frontal bot, not harder: each report pulls every guard within the ring off its post toward the shooter's approximate cell, and a set squad with 85 accuracy wins those meeting engagements against 55-accuracy guards arriving one by one. That is the expected consequence of alert guards having no other behaviour than pursuit; G2's hold, search and break behaviours and G3's initiative trait are what would let some guards stay put or take cover instead. Treat this number as a baseline for G2, not as a tuning target.

Per seed:

| Seed | Sight lobes | + alarm |
| --- | --- | --- |
| 1947 | see SIGHT.md | won r14, 2 up, 112 HP |
| 1948 | see SIGHT.md | won r11, 2 up, 193 HP |
| 1949 | see SIGHT.md | won r12, 2 up, 73 HP |
| 1950 | see SIGHT.md | won r7, 4 up, 212 HP |
| 1951 | see SIGHT.md | won r7, 4 up, 301 HP |
| 1952 | see SIGHT.md | won r12, 3 up, 167 HP |
| 1953 | see SIGHT.md | won r9, 3 up, 261 HP |
| 1954 | see SIGHT.md | won r9, 3 up, 180 HP |
| 1955 | see SIGHT.md | won r11, 2 up, 179 HP |
| 1956 | see SIGHT.md | won r9, 3 up, 185 HP |
| 1957 | see SIGHT.md | won r9, 3 up, 213 HP |
| 1958 | see SIGHT.md | won r10, 3 up, 285 HP |
| 1959 | see SIGHT.md | won r16, 2 up, 37 HP |
| 1960 | see SIGHT.md | won r9, 3 up, 225 HP |
| 1961 | see SIGHT.md | lost r14, 1 guards left |
| 1962 | see SIGHT.md | won r13, 3 up, 267 HP |
| 1963 | see SIGHT.md | lost r7, 2 guards left |
| 1964 | see SIGHT.md | won r13, 2 up, 127 HP |
| 1965 | see SIGHT.md | won r10, 3 up, 78 HP |
| 1966 | see SIGHT.md | won r10, 3 up, 252 HP |


## Sources and lineage

The merc side is Codex's `personalities.js` (commits a2a11a9 "Give mercs personalities and ammunition-limited friendly-fire retaliation" and e600265 "Track injury stress and fatigue"). The sight side is SIGHT.md. Nothing here claims biological accuracy; these are stylised people, like the mercs.
