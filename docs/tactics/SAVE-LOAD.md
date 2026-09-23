# 3D encounter save/load

Use **Save / Load** in the battle or title screen. There are three manual slots, a quicksave and an autosave. **F6** saves the current encounter to Quicksave; **F9** loads it. Explicit Save/Overwrite buttons identify which slot is replaced.

Saves live in a separate IndexedDB database in the current browser/site. They are independent of editor designs and sprite-game campaign saves. Localhost, the published site and different browsers have separate storage. Clearing site data removes saves; file export/import and cloud synchronization are not included in this first pass.

## What is retained

The snapshot includes the original map definition and changed encounter geometry, locks, fixture condition, loot, unit positions and tower posts, stats, injuries, casualties, stamina, AP, inventory/ammunition, contracts/social state, guard awareness/search state, fog-of-war Sets, overwatch, RNG streams, current phase/round/enemy index and the encounter clock. Custom editor-playtest saves can load without the original editor tab.

Snapshots are versioned and validated before replacing a running encounter. An invalid/unsupported record reports an error. Failed IndexedDB writes leave the previous slot intact; success is reported only after the transaction commits.

## Loading and timing

Loaded encounters begin **paused**, centered on the selected merc. They do not reset HP/AP/stamina, recompute awareness, advance time or replay a completed action. Pending movement orders and transient combat/climb presentation events are cleared. The saved physical position and completed combat results remain authoritative. Press Resume to continue, including from the middle of a guard turn.

The round-clock observer is primed for the restored state, so loading cannot count the same round again. Replacing the renderer clears animation queues and presentation caches.

## Autosave policy

Autosave occurs after the completed-round number changes or every 30 seconds of active play, and before using **Restart** or the in-game link to the title screen. A visibility change flushes an overdue checkpoint when storage is available. A new/restarted encounter does not immediately overwrite the prior autosave.

Autosaves capture committed state; pending movement orders are not resumed. Browser crashes, forced closure and arbitrary external navigation can still lose progress since the last checkpoint. A storage failure is shown explicitly and automatic retries stop until a successful manual save. If the pre-restart/pre-title checkpoint fails, that transition is cancelled so the current fight remains available.

## Verification

Simulation tests cover full snapshot round trips, detached snapshots, RNG/awareness/resource preservation, mid-enemy-turn deterministic continuation, clock idempotence, and invalid/versioned data rejection. Browser checks cover manual slots, quicksave/quickload, title-screen loading, paused restoration, corrupt-record rejection, simulated quota errors preserving prior saves, restart autosave and narrow-screen layout.
