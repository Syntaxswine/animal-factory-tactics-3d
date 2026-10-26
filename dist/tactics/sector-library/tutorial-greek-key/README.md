# Greek Key Garden

Open **Sector presets**, search **greek key**, and choose **greek-key**. You can also open [the map directly in the 3D editor](../../editor-3d.html?editing=1&sectorTemplate=tutorial-greek-key&orientation=0&variant=greek-key.json), then select **Playtest**.

Three S-shaped square spirals join side by side into a repeating Greek key band. The dirt course curls inward and back out through each motif before continuing into the next. Enter from the west and finish at the gold travel marker in the eastern court. Hedge borders enclose the five-tile-wide corridors, so walking around the garden cannot skip the course.

This is a peaceful movement practice map with four unarmed squad starts. There are no enemies or scripted tutorial prompts yet. Playtest uses the game's free exploration controls. Reaching the eastern travel marker is the layout's finish; it does not trigger a new scripted mission.

The [portable version 2 map](greek-key.json) can be imported into the Animal Factory Tactics designer, including the designer bundled with Farmyard Commando. It is a full 240 × 240 sector with three linked training sections. Use **Overview**, **Top down**, and zoom in to inspect the pattern, or **Gameplay view** to return to the squad.

Regenerate the checked-in map and previews with `node tools/generate-greek-key-tutorial.mjs`. Map validation, linked-curl traversal, opening widths, outside shortcuts, editor round-trip and live movement are covered by `node --test tests/greek-key-tutorial.test.mjs`.
