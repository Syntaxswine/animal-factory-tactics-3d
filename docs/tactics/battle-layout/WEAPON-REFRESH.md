# Painted weapon sprites and Inventory follow-up

## Changes

All 13 weapon kinds, including empty hands, now have painterly PNG sprites with warm wood, dark steel, visible brushwork and bright edge highlights that match the character artwork. The AK magazine, PPSh drum, scoped sniper rifle, launcher cylinder, RPG warhead, machine-gun belt and red flamethrower tanks remain recognizable at small sizes. The HUD and Inventory share these sprites through `weapon-icons.js`; ground loot retains its existing art.

The final assets live in `dist/assets/equipment/painted-ui/`. They were created with built-in image generation using the original rifle and horse art as style references. The complete [prompt set](WEAPON-SPRITE-PROMPTS.json) records their authoring directions. Original PNG pixels and alpha are preserved; a CSS viewport fits the visible painting into each row without stretching it or letting empty source-canvas margins shrink it. The superseded flat SVG set has been removed.

In Inventory, clicking a weapon's picture or name now runs **Equip**. The button shows the actual AP cost and the held weapon reads **Equipped**. A successful action updates the character, ammunition display and HUD, then closes Inventory to play the draw animation. Inspecting another merc's Inventory changes that merc's equipment, even if a different merc remains selected on the battlefield.

The previous Draw button was wired, but opening Inventory immediately after a swap paused its draw animation and left every equipment action disabled. Opening during queued movement had the same practical effect. The correction applies to every Inventory entry point:

- Opening Inventory settles only an outstanding cosmetic weapon draw, including a swap requested before the next rendering frame. It does not advance simulation time, charge AP, change orders or skip combat/climbing/fire playback.
- If movement is queued, Inventory explains the block and offers **Stop squad movement**. Clicking it cancels the remaining route without an AP charge, then enables available equipment actions.
- Other blocked actions explain why they are unavailable. Enemy turns and insufficient AP remain enforced. Manual pause still permits deliberate Inventory equipment changes, matching the existing behavior.
- Reopening Inventory returns to the top so the held and ready weapons are visible.

The approved prices remain **2 AP for a ready weapon** and **3 AP for a backpack weapon** in combat; peaceful exploration remains free.

## Evidence

See the [painted sprite sheet on dark and light backgrounds](evidence/weapon-icons.png), [updated Inventory](evidence/inventory-weapons.png), [updated HUD](evidence/hud-weapons.png) and [browser check report](evidence/weapon-review.json).

The final focused 29-test run passes and covers Inventory, HUD, PNG assets and valid display frames, blocked-state messaging and cosmetic settlement. `tools/check-inventory-weapons.mjs` passes seven groups of real browser interactions, including painted-image clicks, same-frame swap/reopen, paused swaps, queued movement, another merc, backpack draw, insufficient AP, enemy-turn restrictions and narrow screens. It closes its browser in `finally` and records process identity and a close receipt.

The fresh painterly hostile review passed at **9/10 with no blocking findings**. The reviewer inspected all thirteen sprites at HUD and Inventory sizes, independently reran 12 focused tests, and verified ready/backpack image-click equips, paused reopening and same-frame swap → Inventory without browser errors. An independent alpha scan found no pixels with alpha ≥32 outside the display frames; only negligible near-transparent canvas noise is excluded. See the [review result](evidence/weapon-hostile-review.json). On narrow screens the equipment section remains below the portrait/statistics; improving that order is optional future polish.

The final 11-check HUD browser review, asset audit and Pages build pass. All thirteen PNG files are included in the packaged distribution. Disposable review browsers were closed and verified exited.

The prior full `npm run check` at `50593c5` passed **1,830 tests** with zero failures. This painterly follow-up changes art and its display only; gameplay rules and the tested Inventory fixes are unchanged. The focused and browser checks above were rerun on the final painted revision.
