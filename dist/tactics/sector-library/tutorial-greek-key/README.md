# Greek Key Garden

Open **Sector presets**, search **greek key**, and choose **greek-key**. You can also open [the map directly in the 3D editor](../../editor-3d.html?editing=1&sectorTemplate=tutorial-greek-key&orientation=0&variant=greek-key.json), then select **Playtest**.

Four square hedge enclosures have staggered south openings. Dividers between the squares force a continuous Greek key route: enter from the southwest, wind around each square, and finish at the central gold travel marker. The dirt ribbon follows the route. Gates are five tiles wide; corridors are seven tiles wide.

This is a peaceful movement practice map with four unarmed squad starts. There are no enemies or scripted tutorial prompts yet. Playtest uses the game's free exploration controls. Reaching the central travel marker is the layout's finish; it does not trigger a new scripted mission.

The [portable version 2 map](greek-key.json) can be imported into the Animal Factory Tactics designer, including the designer bundled with Farmyard Commando. It is a full 240 × 240 sector with a compact 64 × 64 training garden. Use **Overview**, **Top down**, and zoom in to inspect the pattern, or **Gameplay view** to return to the squad.

Regenerate the checked-in map and previews with `node tools/generate-greek-key-tutorial.mjs`. Map validation, gate connectivity, corner collision, editor round-trip and live movement are covered by `node --test tests/greek-key-tutorial.test.mjs`.
