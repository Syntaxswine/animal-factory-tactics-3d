# Four-sector tutorial plateau rough pass

The first four tutorial sectors share a two-tier circular plateau centered on their common corner. Canonical arrangement: northwest step 4, northeast step 3, southwest step 2, southeast starting step 1. Step 5 (town) remains separate and unchanged.

Each map is 240 × 240. The outer radius is 160 tiles (two-thirds of a sector measured from the central junction); this gives complementary local 80/160 boundary coordinates. The inner radius is provisionally 80 tiles, also matching the thirds grid. Both cliff tiers are closed. No ramps, ladders, stairs or cliff climb links are authored. Existing ledge meshes form stepped, full-tile perimeters; their potential editor climb capability does not create gameplay links automatically. Lower interior cells are void to prevent walking beneath the raised land.

Files: sector-library/tutorial-step-1 through tutorial-step-4/rough-plateau.json. The original placeholders are retained. Each folder is in-progress and defaults to its new rough variant in the library. The maps can be saved and edited normally. Rotate the entire group together, never individual quadrants.

Open sector-library/tutorial-plateau.html for a combined plan and editor links. In the editor select altitude 3 and Overview to see both tiers. Summit squad/travel markers are provided for individual map playtests only. Tutorial encounters, dialogue, sector travel, and town access are not implemented by these rough maps.

Generation: node tools/generate-tutorial-plateau.mjs regenerates these rough variants and previews; preserve hand-edited versions under another filename before regenerating. Tests verify save parsing, closed traversal, all elevation seams, and exact 80/160 attachment coordinates. All four maps were opened, rendered and validated in the 3D editor.
