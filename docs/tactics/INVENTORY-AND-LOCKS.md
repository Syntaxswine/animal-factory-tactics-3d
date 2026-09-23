# Inventory, tools and locked doors

Open **Character** to manage the displayed merc's equipment. Visible supply piles now have small 3D supply-box markers; clicking nearby supplies opens the character screen. Loot remains hidden outside current squad visibility, including on Easy.

## Controls and costs

- **To backpack** clears the ready slot, provided its contents fit in the backpack. Stowing the current weapon leaves empty hands.
- **Ready 1 / Ready 2** draws a backpack weapon into the chosen slot; **Draw** switches to another ready weapon. Backpack draws cost 3 AP in combat; switching between ready weapons and stowing remain free under the existing rules. Drawing uses the existing animation.
- **Drop**, **Give** and **Take** cost 2 AP per transfer in combat, free outside combat. A quantity input supports partial transfers of carried stacks. Taking loot collects the displayed stack.
- **Give** lists living nearby squadmates. Transfers require the same physical height and an open cardinal edge (or the same tile); walls, closed doors and tower elevation prevent handovers.
- **Move** changes the selected item's backpack cell. The existing 6-by-3 capacity and two-cell long weapons remain authoritative. Occupied/invalid destinations reject without changing the inventory.
- **Nearby loot** lists reachable visible supply piles and bodies. Body contents remain concealed until **Search body** succeeds (3 AP in combat). Closed containers cannot be bypassed through Take.

Transfers stage both inventories before committing. A failed capacity, duplicate-weapon, quantity, reach or AP check consumes nothing. Loaded ammunition follows a transferred weapon. Medical kits and wire cutters move with their actual gameplay state, not cosmetic duplicate items.

## Tools and load

Anya starts with one reusable **Lockpick set**; Misha starts with three units of **Repair supplies**. Both are ordinary backpack items that can be shared, dropped and recovered. Picking requires a carried lockpick set; forcing does not. Each successful repair action consumes one supply unit. Supplies weigh 2 kg each; lockpicks weigh 0.5 kg. Existing maps without canonical stats do not receive the new starter equipment.

Strength sets a comfort load of **10 + 0.4 × Strength kg** (10.4-50 kg). Above that load, movement/climbing stamina cost multiplies by **carried weight / comfort load**. The character screen shows weight, comfort load and multiplier. Weight does not invent an additional hard inventory limit or alter AP; backpack space remains the hard limit. Ordinary walking remains possible at zero stamina.

## Locked doors

In the editor, select a closed wooden, steel or cell door boundary, expand **Locks & repairs**, and apply difficulty 1-100 (0 removes the lock). Inspection displays the saved difficulty. Locks prevent automatic opening and path traversal until picking or forcing succeeds. Nearby battle actions identify the door's direction and material. Existing doors stay unlocked unless explicitly authored.

Lock metadata now survives both full-map and reusable-block export/import, undo/redo, extraction and placement. Moving a block remaps edge coordinates. Replacing a block removes stale locks, and explicit shared doors must agree on lock difficulty, including during connected generation. Successful in-game checks open the door and remove its lock; the editor blueprint is unaffected.

## Verification and current limits

Regression coverage includes quantity conservation, equipped ammunition, full-backpack/AP rejection, utilities and tools, hidden loot, body searches, wall/tower reach, tool requirements and consumption, carrying burden, and portable door locks. Browser review exercises giving lockpicks, dropping/picking up a medkit, stowing/drawing a weapon, unlocking a door, and narrow-screen layout.

Supply boxes are generic markers, not individual models for every item. Lockpicks and repair supplies currently use a neutral inventory symbol with a text label. Tool wear, keys, lock damage, weapon deterioration and arbitrary factory-machine repair are separate systems.
