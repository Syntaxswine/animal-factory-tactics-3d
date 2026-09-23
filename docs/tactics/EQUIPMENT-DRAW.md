# Weapon draw state

Equipment now has three presentation states: **stowed**, **drawing**, and **carried**. `createEquipmentDraw` applies an 850 ms reach/pickup/ready sequence after the normal body pose. It uses shared stowed positions, preserves rig bone lengths, and solves the primary hand to the pickup surface before transferring to the authored grip; the support hand joins late for two-handed weapons. Completion restores the existing carry pose. Empty hands need no draw clip.

Changing weapons immediately removes the old model. Only the newly equipped model draws; there is no preceding stow animation. Newly spawned actors start ready rather than drawing on load. Finishing a supported ladder traversal requests a draw of the same stowed weapon. Reduced motion skips the transition, while pause and the character screen stop its presentation clock. Hidden actors, floor changes and casualties cannot leave the game waiting for an unseen draw.

The Character screen has Draw buttons on ready-slot and backpack weapons. These call the existing core equip action: ready-slot switching costs no AP, while retrieving a backpack weapon costs 3 AP in combat. The animation does not alter inventory, ammunition or AP. Switching, movement and firing are blocked while the draw plays. The record reports Drawing when inspected mid-animation.

Regression coverage includes all thirteen loadouts across the nine supported non-pig mammal rigs, fixed bone lengths, held-contact accuracy, final carry placement, and idempotent cleanup. Browser checks exercise real Character-screen switching, immediate removal of the old model, no extra AP charge, paused playback and final restoration. Existing pig carry-pose limitations and the hen's unarmed rig are not changed by this work.
