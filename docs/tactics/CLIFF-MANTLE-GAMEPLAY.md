# All-animal cliff ascent integration

The live cliff journey now uses createCliffMantle, including the separate hen wing-and-toe rig. All twelve species are enabled with rifles for mammals or unarmed movement; hens require hands. The donkey guide's unarmed route is covered explicitly. Other weapons retain the existing immediate traversal fallback.

Legal movement and its 8 AP combat cost are unchanged. Animation consumes committed events once without changing position, AP, or time. Entry and exit blend to tactical tile centers at the actual two-unit cliff cap height. Cancellation, casualties, reduced motion, and equipment changes dispose the rig and restore equipment.

The mantle requires a straight face with three clear columns and two rows of supported cliff cap, since the actor settles onto the top before standing. Unsupported geometry, occupied clearance, and obstructing props retain fallback presentation. The descent retains its existing clearance gate; it does not inherit this new cap-depth requirement.

Validation: 19 new ascent gameplay checks, 14 cliff motion checks, 4 previous cliff integration checks and 26 descent gameplay checks pass. Deployment build includes all runtime dependencies. tools/check-cliff-mantle-gameplay.mjs exercises engine movement and live rendering through ascent and descent.
