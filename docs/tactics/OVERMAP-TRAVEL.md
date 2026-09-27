# Overmap group travel

Implemented on the overmap workshop as a strategic travel test. Select a group (its roster button or map marker), then click a destination
sector. A route line and confirmation popup show the members, travel/rest time
and arrival. Confirm Send group to commit the order; Cancel or Escape leaves
orders and time unchanged. With no group selected, tile clicks edit sectors. Arrival at a tactical map, combat at
fortresses/gates, and transfer of a live encounter roster remain deferred until
campaign/local-map assignment. The separate original 2D campaign is unchanged.

## Rules approved by the user

Agility bands use their lower bound: 1–9, 10–19, …, 90–99, 100.
Land/road minutes respectively:
1: 180/120; 10: 163/109; 20: 145/97; 30: 127/84; 40: 108/72;
50: 90/60; 60: 84/57; 70: 78/54; 80: 72/51; 90: 66/48; 100: 60/45.
The explicit 45-minute road time at 100 takes precedence over a strict 50%
speed multiplier. Group pace uses the slowest member; ties identify the lowest
actual agility. No averaging and no species modifier.

Connected road endpoints on the shared sector edge grant the road rate.
Dijkstra selects the fastest route in game minutes. Ordinary land permits
cardinal travel. Tutorial boundaries require reciprocal declarations. River
and cliff sectors require connected roads through a matching bridge/passage;
travel along the barrier or through an ungated barrier is rejected. This uses
the generator's conservative strategic crossing model, not tactical bank geometry.

Each traveller gains 10 fatigue per travelling hour. At 80, everyone stops.
Fractional progress through the current crossing is retained. Rest recovers
10 points/hour; forced rest remains in force until all members reach 60 or less.
Arrival exactly at 80 does not add an unnecessary rest to the arrival forecast.
Confirmed orders include automatic required rests. Advance 1 hour moves every
group over the same interval; Next arrival advances to the earliest scheduled
arrival. Rest and travel both advance the shared game-clock module. Tactical stamina is
not consumed by this long-term fatigue system.

## Persistence and integration points

`overmap-travel.js` contains UI-independent routing, travel, preview, rest and
validation functions. `createTravel(map, members)` accepts roster entries with
`id`, `name`, `stats.agility`, and optional `social.fatigue`. The workshop defaults
to the four existing mercenary stat profiles. Select members of a stationary group and Split selected members to create
another group at the same position. Members keep their stats and fatigue.
Groups in transit cannot be split or retargeted mid-crossing.

The version 2 session stores map, groups, member data, shared clock, positions,
routes, partial progress, coordination waits and the forced-rest latches under `animal-factory-overmap-travel-v1`. Travel actions
autosave. Load travel restores that session including its map after a reload;
the editor's sketch Save/Load remains separate. Map edits reset the active test
without overwriting its saved session. Travel does not change sketch undo history.

## Validation

- 50 group travel, overmap, generation and shared-clock tests passed.
- Deployment build and module-closure checks passed, now including overmap.js.
- Browser checks cover explicit group selection, splitting, destination popup,
  route lines, cancellation, coordinated arrivals, shared time and saved orders.
- No generated core files or original 2D campaign mechanics were changed.

## Coordinated arrivals

If another travelling group has the same destination, the popup offers Arrive
together. The shared arrival is the latest predicted arrival among those groups.
Earlier groups receive a coordination hold for the difference; this also works
when an earlier group is already partway through a crossing. Holding preserves
position and fatigue; it is not extra recovery. Required fatigue rests retain
their own forecast. The popup reports shared arrival and added wait per group.
Declining sends the selected group independently and does not change other orders.

`overmap-groups.js` owns the shared clock, group splitting, orders, coordination
and concurrent progress. Version 1 single-group saves migrate without losing
partial progress. Duplicate memberships and inconsistent saved clocks are rejected.
