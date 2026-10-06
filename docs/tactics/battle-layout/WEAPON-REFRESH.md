# Weapon icons and Inventory follow-up

## Changes

All 13 weapon kinds, including empty hands, now have a flat side-profile SVG icon with consistent outlines and colors. The AK magazine, PPSh drum, scoped sniper rifle, launcher cylinder, RPG warhead, machine-gun belt and flamethrower tanks remain recognizable at small sizes. The HUD and Inventory share these icons through `weapon-icons.js`; ground loot retains its existing art.

In Inventory, clicking a weapon's picture or name now runs **Equip**. The button shows the actual AP cost and the held weapon reads **Equipped**. A successful action updates the character, ammunition display and HUD, then closes Inventory to play the draw animation. Inspecting another merc's Inventory changes that merc's equipment, even if a different merc remains selected on the battlefield.

The previous Draw button was wired, but opening Inventory immediately after a swap paused its draw animation and left every equipment action disabled. Opening during queued movement had the same practical effect. The correction applies to every Inventory entry point:

- Opening Inventory settles only an outstanding cosmetic weapon draw, including a swap requested before the next rendering frame. It does not advance simulation time, charge AP, change orders or skip combat/climbing/fire playback.
- If movement is queued, Inventory explains the block and offers **Stop squad movement**. Clicking it cancels the remaining route without an AP charge, then enables available equipment actions.
- Other blocked actions explain why they are unavailable. Enemy turns and insufficient AP remain enforced. Manual pause still permits deliberate Inventory equipment changes, matching the existing behavior.
- Reopening Inventory returns to the top so the held and ready weapons are visible.

The approved prices remain **2 AP for a ready weapon** and **3 AP for a backpack weapon** in combat; peaceful exploration remains free.

## Evidence

See the [weapon icon sheet](evidence/weapon-icons.png), [updated Inventory](evidence/inventory-weapons.png), [updated HUD](evidence/hud-weapons.png) and [browser check report](evidence/weapon-review.json).

The focused 29-test run covers Inventory, HUD, art, blocked-state messaging and cosmetic settlement. `tools/check-inventory-weapons.mjs` exercises seven groups of real browser interactions, including same-frame swap/reopen, paused swaps, queued movement, another merc, backpack draw, insufficient AP, enemy-turn restrictions and narrow screens. It closes its browser in `finally` and records process identity and a close receipt.

The independent hostile review passed at **9/10 with no blocking findings**. The reviewer independently reran 12 focused tests and verified the same-frame, paused, other-merc and queued-movement paths in the live default map without browser errors ([browser result](evidence/weapon-hostile-review.json)). On narrow screens the equipment section remains below the portrait/statistics; improving that order is optional future polish.

The existing 11-check HUD browser review and the equipment-draw review also pass, including AP costs, animation restoration, modal focus and small-screen layout. The Pages build and pinned-core verification pass.

Final full `npm run check`: **1,830 tests passed**, zero failures, followed by a successful asset audit.
