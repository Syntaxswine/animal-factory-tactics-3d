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

## Mercenary sector rest

Select a stationary group and choose Rest · 8 hours. The assignment applies to
all members of that group; split a group first to rest only some mercenaries.
Rest cannot overlap travel or militia training. It does not immediately skip time:
use the shared clock controls or Advance to rest completion. Other groups and
enemy logistics continue, and an encounter can stop the advance early.

Eight hours restore up to 15 HP (capped at each merc's maximum) and clear fatigue.
Recovery is proportional to elapsed sleep: 5 HP every 160 minutes, including
fractional recovery between those times. Fatigue loses the same fraction of its
starting amount: after 160 minutes, two-thirds remains. Recovery is computed from
a saved starting snapshot, so small ticks and large advances agree. Sleep never
revives a dead merc. Missing HP in older strategic tester rosters starts at full
health using the strength-derived maximum.

An attack wakes participating groups before the encounter handoff, retaining
only recovery already earned. Wake group allows voluntary early interruption
with the same proportional recovery. Other sleeping groups retain assignments.
The assignment and HP/fatigue survive save/load. Tactical health transfer remains
part of the future battle integration.

## Sector first aid

First Aid assigns the selected stationary group to provide treatment. The highest
raw medical skill among its conscious mercenaries carrying a medical kit sets the
duration. One kit is consumed at assignment start, consistent with the existing
consumable medical supplies; cancellation does not refund it. The strategic tester
starts new merc rosters with one kit per merc, matching tactical squad defaults.
Old saves with no kit count do not receive free supplies on load.

Medical skill 1 takes 48 hours, 50 takes 24 hours, and 100 takes 8 hours. Values
between anchors interpolate linearly in minutes. Intelligence does not alter these
explicit medical-skill timing anchors. Each wounded, living merc already stationary
in the sector is registered as a patient, including mercs in other groups and the
medic. Their initial missing HP heals proportionally over the assignment, capped
at maximum HP. New arrivals require a later assignment; patients who depart stop
receiving treatment and are removed. Dead or incapacitated mercs need the separate
tactical casualty/stabilization system rather than revival by this assignment.

Only one first-aid assignment runs per sector. The assigned group cannot move,
split, rest or train militia while providing care. Other groups' patients may
sleep while receiving treatment; neither system can overwrite higher current HP.
Stopping treatment or an attack preserves healing already earned. An attack ends
the sector's treatment at the encounter handoff. The shared clock continues enemy
logistics during treatment. Assignments, patients, kits and HP persist in saves.
Actual campaign/tactical inventory and health transfer remain future integration.

## Large medical chest

A large medical kit is represented as a chest: a nonstacking backpack item with
count 1, two horizontal inventory cells and ten sector-treatment charges.
Its item kind is largeMedicalKit, type tool, with charges from 1 to 10. The
medicalChest() factory creates a full chest. Its provisional carried weight is
5 kg. New test rosters give Vera one chest; existing saves are not refilled.

First aid prefers a carried chest over loose medical kits, spending one charge
when a sector treatment begins. Interrupted or cancelled treatments retain the
existing no-refund policy. After the tenth treatment the depleted consumable is
removed. Giving, dropping, looting, arranging and saving retain each chest's own
remaining charges; chests never merge. The inventory uses a chest illustration
and displays remaining charges out of ten. Tactical single-target heal and
stabilize actions continue using their existing small-kit supplies.
