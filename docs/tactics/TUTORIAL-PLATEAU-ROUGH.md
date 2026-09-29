# Four-sector tutorial plateau rough pass

The first four tutorial sectors share a two-tier plateau centered on their common corner. Canonical arrangement: northwest step 4, northeast step 3, southwest step 2, southeast starting step 1. Step 5 (town) remains separate.

Each map is 240 × 240. The main outer cliff meets shared edges 24 tiles from the outside boundaries (one-tenth), or 216 tiles from the central junction. Between the seams the outline varies into broad lobes. Sector 4 has an additional western shoulder, widening by up to 24 tiles and tapering out before the northern attachment and southern seam. This adds 2,363 summit tiles without reducing the existing playing area. The upper tier follows this outline with a 0–2-tile lower shelf rather than a large concentric terrace. Width is measured on the tile grid; some sections have stacked cliff faces without an exposed shelf.

In northwest step 4, an 80-tile-wide plateau extension reaches the north boundary between x=80 and x=160 (one-third and two-thirds). Its summit travel marker is at x=120, y=0. This reserves the future descent to town: actual descent geometry, the town map, and campaign transitions remain to be authored. Other cliff faces stay closed. No ramps, stairs, or cliff climb links are present.

Existing full-tile ledge meshes form the perimeter; their potential editor climb capability does not create gameplay links automatically. Lower interior cells are void to prevent walking beneath raised land. The larger perimeter requires the cliff tile budget to increase from 512 to 1,024, within the existing total prop limit.

Files: sector-library/tutorial-step-1 through tutorial-step-4/rough-plateau.json. Original placeholders remain. Each folder is in-progress and defaults to its rough variant in the library. Edit and save normally; rotate the whole group together.

Open sector-library/tutorial-plateau.html for the combined plan and editor links. Select altitude 3 and Overview to see both tiers. These maps are terrain foundations without encounters or dialogue.

Generation: node tools/generate-tutorial-plateau.mjs regenerates rough variants and previews; preserve hand-edited versions under another filename first. Tests cover save parsing, closed traversal, elevation seams, 24-tile margin, shelf widths, and the northern approach.
