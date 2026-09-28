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

The best leadership in the assigned group determines duration: 24 hours at 50,
16 hours at 75, 12 hours at 100; leadership below 10 uses the 10-point floor for
a maximum five-day assignment. These duration/batch sizes are initial tuning
values. Completion records four militia in that sector. Other groups and enemy
logistics continue while the trainer is occupied.

## Persistence and validation

Logistics lives in the saved overmap group session: fort ownership, stocks,
recruitment/dispatch timestamps, convoys, Red Hat routes, fractional movement,
pending contact, funds, captured weapons, training assignments and militia counts.
Old travel saves acquire logistics defaults. Map edits reset the test as before.
Strategic time advances in bounded one-minute steps; long and short advances
produce the same results and cannot skip contact.

Tests cover delivery-relative timing, interruption, captured forts, stockpiles,
reachable targets, absent factories, $500 charging and refunds policy, group
assignment restrictions, completion, deterministic time and save round trips.
`tools/check-overmap-logistics.mjs` covers the packaged browser UI, arrows,
training, persistence and encounter pause. Existing group-travel checks continue
to test split groups and synchronized arrival while resolving tester handoffs.
