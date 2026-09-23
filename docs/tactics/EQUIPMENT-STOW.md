# Shared equipment stow state

`createEquipmentStow(worker, profile)` in `equipment-stow.js` provides a reusable **carried / stowed** presentation state. Call `apply()` after posing the body to stow the held model and follow the spine, then `restore()` before resuming the normal carry pose. `dispose()` is idempotent and removes owned sling/holder geometry. It does not change weapon selection, ammunition, inventory, AP or game time. Ladder playback is its first consumer; other hands-free actions can use the same controller.

All thirteen held loadouts are supported: empty hands, knife, pistol, rifle, assault rifle, SMG, shotgun, sniper rifle, heavy machine gun, grenade launcher, RPG, grenade and flamethrower. Small items use a hip holster/sheath/pouch, long weapons use back slings, and the flamethrower retains its visible backpack and connected hose while securing its lance alongside the pack. Source weapon geometry and scale remain intact. The existing rifle placement is preserved.

The state switches at action boundaries; it does not yet animate a hand reaching to holster or draw. It is separate from unequipping an item into the inventory. One body pose controller and one equipment-stow controller should own an actor at a time. Replacing the equipped model during a climb cancels that presentation safely.

The iron tower ladder now accepts these loadouts for the nine supported non-pig mammals. Pigs still require the flared exit; hens require authored wing contacts; the wooden tower hatch still needs separate geometry review. Nothing in the shared equipment state changes those fixture/rig limits.

Tests cover reversible transforms, unchanged geometry, preserved pack/hose, equipment identity, and ascending/descending contact and rung-plane checks across all 117 supported animal/loadout combinations. The browser review checks every loadout in the actual tower scene, with screenshots under `artifacts/battle-3d/equipment-stow`.
