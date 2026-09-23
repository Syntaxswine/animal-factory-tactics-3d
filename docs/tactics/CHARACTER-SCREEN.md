# Character screen

Open **Character** in the battle sidebar to inspect the selected merc. Squad tabs browse each merc without changing battlefield selection. The modal pauses game time and simulation, supports Escape and Close, and restores the previous pause state and keyboard focus.

The screen uses existing character sprite portraits and equipment artwork. It shows the name, species, current HP/AP, all thirteen proposed attributes/skills, held and ready equipment, loaded ammunition, and backpack contents including medical kits and wire cutters. Inventory reads the same slots and backpack entries as the game; equipped weapons do not appear twice. This screen is an inspection view; equipment management remains a separate feature.

Perception, Medical and Sneak read existing unit values. Explicit `unit.stats` values take precedence. Newly proposed stats and stamina remain unassigned (—) until the character-stat migration is implemented; this view does not invent values or change combat rules. Health and AP reflect the actual simulation, not the proposed future formulas. Displayed attributes are bounded to the agreed 1–100 scale.

`tests/character-screen.test.mjs` covers field completeness, inventory separation and read-only behavior. `tools/character-screen-review.mjs` checks actual browser rendering, portraits, roster navigation, pause/focus restoration and mobile overflow.
