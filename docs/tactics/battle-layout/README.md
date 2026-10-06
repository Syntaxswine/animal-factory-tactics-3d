# Battle screen layout

Implements the user's four-character HUD sketch on top of gameplay revision `34b045f`, in branch `work/battle-screen-layout`. This branch is ready for integration review; it does not publish the canonical game.

## Visible controls

- A thin left rail opens an overlay drawer for camera options, character details, saves, difficulty, restart, instructions and the event log. Overview and Save / Load also have direct rail shortcuts.
- Game day/time stays above the map. Level 1–3 buttons at the top right choose the interaction level while other floors remain visible.
- Four persistent character cards show portrait, health, stamina, AP and current stance/movement or casualty status. Click a portrait to select; Shift-click adds or removes group members.
- **S** opens the stance choices. It applies to the selected group if that character belongs to the group; the popover identifies the affected group. **I** opens that character's Inventory, free to inspect.
- Each card shows the equipped weapon and one ready alternative from the existing Inventory slots. Everything else remains in Inventory. The counter shows loaded rounds, grenade count or fuel bursts; reserves are in its tooltip.
- **R** reloads or clears the held weapon's jam. **Swap** draws the other ready weapon. These actions affect the corresponding character, not the whole selection.
- Walk / Run / Sneak, Pause / Stop / End turn, and contextual actions remain beside the squad controls.

Desktop keeps all four cards in one row. Narrow screens use two columns with a scrollable squad dock; the map stays visible. The drawer overlays the map without moving the camera. Escape closes the topmost modal before a drawer or stance popover and restores the appropriate control's focus.

## Approved AP rule

The user explicitly chose **2 AP for a ready-weapon swap**. The HUD and Inventory draw buttons use the same core `equipCost()` function, preventing a free Inventory bypass. Backpack draws retain their existing 3 AP cost. Holstering to empty hands remains free, but drawing a ready weapon again costs 2 AP. Peaceful exploration retains free actions; combat and alerted exploration use AP. Reload/jam-clearing retain the existing 3 AP rule.

`tools/core-ready-swap-adapter.mjs` applies the rule when regenerating the pinned core. `tools/sync-tactics-core.mjs` records the override in the manifest. Do not hand-edit the generated core to integrate this change.

## Files and integration

`battle-hud-model.js` derives card information from game state; `battle-hud.js` keeps persistent card nodes and callbacks; `battle-hud.css` lays out the screen. `battle-3d.js` owns gameplay actions, selection, focus, pause and overlays. The Pages build includes the new modules, stylesheet and the Inventory knife icon.

The existing behavioral browser scripts now reveal drawer/stance controls through `tools/battle-ui-review.mjs` and target portrait buttons explicitly. The equipment-draw review expects the approved 2 AP ready draw. This preserves the scripts' original gameplay checks after the layout change.

## Verification

- Full `npm run check`: **1,825 tests passed**, zero failures, plus the asset audit. This run preceded the final portrait-coverage test and bleeding-countdown polish.
- Final focused run: **24 tests passed**, including all **8 HUD tests**, Inventory, character screen and art checks.
- `node tools/sync-tactics-core.mjs --check`, `node tools/build-tactics-3d.mjs`, asset audit and syntax checks passed.
- HUD browser review: **11 checks passed**, nine captures, no page errors or failed resource responses. It covers group selection/stances, a real 2 AP combat swap, free Inventory inspection, pause gating, levels, drawer camera stability, keyboard focus and responsive layouts down to 390×844.
- Existing browser reviews passed for keyboard camera controls, desktop/mobile character Inventory, jam clearing, and equipment drawing. The draw review confirms both the new 2 AP ready draw and retained 3 AP backpack draw, plus animation restoration.
- Independent hostile review: **9/10, approved** after correcting Red Hat pig portrait fallback, topmost-modal Escape handling and the bleeding countdown. The reviewer independently exercised the fixes in the live page.

See [desktop](evidence/desktop.png), [drawer](evidence/drawer.png), [mobile](evidence/mobile.png), and the [browser report](evidence/review.json).

## Running the review

Use Node 22 or newer and Playwright with Edge installed. Set `PLAYWRIGHT_PATH` only when the dependency is outside the normal Node resolution path.

```powershell
node tools/serve-hud-review.mjs 4474
# In another terminal:
$env:REVIEW_URL = 'http://127.0.0.1:4474/tactics/battle-3d.html'
node tools/check-battle-hud.mjs
```

The preview is read-only and exits after 24 hours or when `artifacts/battle-layout/STOP` is created. Remove a stale stop marker before deliberately restarting, and register each retained process lifetime with the user's helper-lifecycle utility. Review browsers close in `finally`; local process identities and close receipts remain under `artifacts/battle-layout/`.
