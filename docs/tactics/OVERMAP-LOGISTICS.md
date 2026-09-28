# Strategic logistics and militia

The overmap travel tester now runs enemy logistics on the same game clock as
mercenary groups. This is strategic simulation: local tactical maps are still
unassigned. Contacts pause at a battle handoff, never silently award a victory.
The explicitly labelled TEST ONLY victory control stands in for the future
combat-result callback. It cannot resolve a battle without a pending handoff.

## Weapons and fortresses

Each enemy-held fortress requests one weapons batch at test start and every
seven days thereafter. The nearest reachable enemy factory supplies it over
connected roads. A disconnected or player-owned factory cannot supply it.
Convoys physically traverse the road graph; roads/gates and elapsed time matter.
For now their escort uses agility 50 and the shared group fatigue/rest rules.
These dispatch and unit balance values are initial tester defaults.

Only delivery starts recruitment. One batch is consumed immediately and the
fortress schedules completion exactly 10,080 minutes after that delivery. No
weapons means no timer. One batch trains at a time; later deliveries stockpile.
On completion four Red Hats spawn, and any remaining stock starts another full
week. There is no catch-up burst for missed deliveries. Capturing the fortress
cancels training, stock and inbound shipments. Already deployed squads remain.

Red Hats target the merc-occupied sector reachable in the shortest travel time.
At sector boundaries they reconsider the target as mercs move. With no reachable
mercenaries they wait. Red route arrows show intended paths; a Red Hat head marker
shows fractional progress on the current edge. Weapons convoys use crate markers.

## Player choices and encounters

Select a group, then click a destination or Send selected group on a convoy,
fortress or Red Hat row. Convoy controls suggest its next sector; players can
choose a more distant road sector to get ahead of it. Interception is positional,
not a free remote destruction command. Co-location and opposite-direction sector
crossings pause time, including during large time skips. Interception takes
precedence over delivery. Capturing a convoy records a weapons batch; defeating
a squad removes it; clearing a fortress stops its enemy production.

The pending handoff includes the sector, participating group IDs, enemy identity
and locally trained militia count. Actual tactical battle generation, defeat and
retreat results, militia combat roster creation and battle losses remain future
integration. The tester only provides a labelled player-victory result control.

## Militia

User-approved price: **$500 per training batch**. Initial balance: four militia
per batch. The test treasury starts at $5,000; this is not campaign starting-money
or income policy. Training requires a stationary group in a player-held sector
or the tutorial town and enough money. It deducts once, occupies the entire
assigned group, and prevents moving or splitting that group. Cancelling releases
the group without a refund. A second click cannot buy an overlapping assignment.

Training uses the highest leadership among all mercenaries physically in the
training sector, across groups. Mercs partway through travel are excluded.
Duration is fixed when the batch starts: 4 days at leadership 1, 3 days at 50,
and 2 days at 100. Intermediate values interpolate linearly between those
anchors, rounded to the nearest game minute. The selected group stays assigned;
the initial leadership snapshot is saved, so another group's later departure
does not change an ongoing timer.

Each settlement (shared settlement ID, or a standalone sector) has at most eight
militia and six completed training batches. Each $500 batch first fills vacancies
with basic recruits, then uses any remaining places to upgrade existing militia,
basic before medium. Nobody receives two upgrades in one batch; new recruits
are not upgraded in that same batch. Cancelling does not consume a completed
batch. Casualties do not reset the six-batch limit.

| Completed batches from empty | Basic | Medium | High |
| --- | --- | --- | --- |
| 1 | 4 | 0 | 0 |
| 2 | 8 | 0 | 0 |
| 3 | 4 | 4 | 0 |
| 4 | 0 | 8 | 0 |
| 5 | 0 | 4 | 4 |
| 6 | 0 | 0 | 8 |

With six medium militia, the next batch yields two basic, four medium and two
high. Basic equipment alternates pistol/rifle; medium alternates SMG/assault
rifle; high alternates sniper rifle/machine gun. The encounter handoff includes
these tier and weapon records; spawning/equipping actual tactical units and
applying battle losses are still awaiting combat integration.

Only one training assignment may run per settlement. Other groups and enemy
logistics continue while the assigned group is occupied.

## Persistence and validation

Logistics lives in the saved overmap group session: fort ownership, stocks,
recruitment/dispatch timestamps, convoys, Red Hat routes, fractional movement,
pending contact, funds, captured weapons, training assignments, leadership snapshots, militia tiers and completed batches.
Old travel saves acquire logistics defaults. Old militia counts up to eight migrate
to basic troops, with completed batches inferred from count. Older tester saves
with more than eight militia, or multiple rosters for one settlement, report an
incompatibility rather than silently discarding troops. Existing in-progress
legacy assignments retain their saved completion time. Map edits reset the test as before.
Strategic time advances in bounded one-minute steps; long and short advances
produce the same results and cannot skip contact.

Tests cover delivery-relative timing, interruption, captured forts, stockpiles,
reachable targets, absent factories, $500 charging and refunds policy, group
assignment restrictions, completion, deterministic time and save round trips.
`tools/check-overmap-logistics.mjs` covers the packaged browser UI, arrows,
training, persistence and encounter pause. Existing group-travel checks continue
to test split groups and synchronized arrival while resolving tester handoffs.

## Save-validation regression tester

Run `node --test tests/overmap-logistics-save.test.mjs` from the repository root.
This automated tester exercises the same group and logistics validators used by
Load. It rejects absent enemy movement state, broken routes, invalid crossing
progress, mismatched clocks, invalid waits, duplicate IDs, missing convoy
fortresses, and stale or malformed encounter references. Positive controls check
partial journeys continue identically after JSON save/load and all three encounter
kinds remain paused until resolved. The suite runs in the normal test command too.

Design clarification: sharing a sector triggers engagement regardless of the
units' fractional positions. No mid-road geometric collision rule is added here.
Recruitment already due when a player arrives may supply a squad at the fortress;
that behavior is retained. Tactical spawn positions still await combat integration.
