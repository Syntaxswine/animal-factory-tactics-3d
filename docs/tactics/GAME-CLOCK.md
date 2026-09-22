# Shared game clock

`dist/tactics/game-clock.js` owns time units, pacing, formatting, round accounting and the day/dusk/night schedule. Game time is cumulative minutes since Day 1, 00:00; animation and browser timestamps are milliseconds. The existing `{minutes, incomeRemainder}` clock shape is retained. New encounters begin at 08:00 unless their map specifies `time.startMinutes`, an integer from 0 to 1439.

## Advancement

- Exploration, including cleared maps: one game minute per three real seconds of active play. A full day is 72 minutes of exploration.
- Combat: one game minute per completed round, as requested. Thinking, individual actions, guard animations and rendering frames add no clock time. Starting contact opens a round without charging time. Completing a round advances once. A contact that ends mid-round, including victory or defeat, charges its last minute once. Repeated UI refreshes never charge it again.
- Travel, rest and training retain their existing explicit durations: one hour per successful crossing and the selected number of hours for downtime. Failed operations take no time. Production, morale and contracts use actual elapsed game minutes.
- Hidden tabs and open game dialogs pause live time. The 3D encounter also has a Pause/Resume button that stops simulation and presentation motion. Visibility and resume transitions reset the browser time baseline, so suspended frames never produce catch-up time. A lost encounter stops its clock after settling the final round.

Round accounting observes the engine's existing phase and round transitions; it does not derive combat time from AP spending or animation duration. The observer resets when the active map identity changes. Travel uses its explicit one-hour duration, without stacking another partial-round charge on top. Its WeakMap bookkeeping is runtime-only. The running encounter clock belongs to the game state; it never writes back to the editor blueprint. Save-game persistence remains a separate future task.

## Movement calibration

A baseline standing walker has 12 AP and spends 2 AP per cardinal tile: six tiles per one-minute combat round. Each walking tile takes 500 ms in the 3D presentation, so those six tiles take 3,000 ms. Exploration therefore advances 20 game seconds per real second. `movement-timing.js` shares the walking duration with `battle-motion.js`; the clock derives its rate from this reference round. Tests check the reference AP values against the pinned engine and progression rules.

This is a steady world clock, including when the squad is idle. Selection, party size, AP upgrades, posture and movement mode do not change its speed. Running covers twelve cardinal tiles per game minute. Sneaking retains its existing slower presentation (three tiles per exploration minute); its combat AP budget permits four. Diagonals, posture and climbing also retain their existing costs rather than rebalance movement in this clock change.

## Integrations

The existing sprite campaign uses the shared primitives in `world.js` and a `FrameClock` in `app.js`. The 3D encounter uses `encounter-clock.js`, attaches the same clock shape to its state, and calls the pinned campaign's existing morale/contract settlement rules. It does not create a campaign, extra maps or an income source for Quick Fight.

The pinned dependency is still reproducibly generated. `tools/core-clock-adapter.mjs` applies explicit, checked transformations to `core/engine.js` and `core/world.js` during `tools/sync-tactics-core.mjs`. The engine's off-map guard recovery conversion now imports the same one-minute round constant; fires and guard recovery therefore no longer treat that round as ten minutes. Stress recovery still uses real elapsed game minutes, with no multiplied surrogate interval. The world adapter uses the shared clock and round accounting. The manifest records each adapter's reason, upstream hash and effective module hashes. Other core modules remain unchanged. Do not hand-edit generated modules.

Local AI route/search/sweep counts remain tactical behavior counters. Movement interpolation and firing effects remain presentation durations. Neither is a second campaign clock, and neither adds time to combat. This pass does not rebalance those behaviors.

## Day, dusk and night

The initial shared schedule is dawn 05:00–06:00, day 06:00–18:00, dusk 18:00–20:00, and night 20:00–05:00. These boundaries are centralized for later tuning. The encounter clock displays its current phase, and editor Design controls can set the start time with undo/save/export support.

The editor and 3D encounter share `daylight.js` and `daylight-rig.js`: a map-fixed east (+X) to west (−X) directional sun, a high but angled noon position, warm dawn/dusk fades, cool night ambient light, and soft geometry shadows. Shadow coverage follows the camera view with a single 2048px shadow map; overview shadows are less detailed. Painted actors use lighting-aware materials in these scenes. Combat minute changes ease over presentation time and freeze when paused. The editor daylight slider previews without modifying the blueprint, undo history or playtest start time; reset follows the authored start time. Lamps and illumination-based detection remain the next tranche; lighting does not change LOS or reveal hidden people.

## Verification

`tests/game-clock.test.mjs` covers fractional frame updates, day boundaries, pause/resume, invalid values, actual engine rounds, final partial rounds, both campaign world modules, income, off-map guard effects, and editor start-time round trips. Existing clock/rest/travel tests remain passing. `tools/game-clock-review.mjs` verifies a real playtest round at 19:59 becoming 20:00, midnight rollover, a frozen paused clock and presentation, visibility without catch-up, restart, and blueprint isolation. `node tools/sync-tactics-core.mjs --check` verifies reproducible core output and the adapter manifest.
