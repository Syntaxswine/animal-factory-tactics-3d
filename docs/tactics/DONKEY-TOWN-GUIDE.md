# Donkey town-guide appearance

The existing donkey rig now supports `outfit: 'blue-hawaiian'`: a blue camp shirt
with cream five-petal flowers, warm centers, teal leaves, a button placket, and
short sleeves, plus a woven straw hat with a blue band and two actual crown
openings for his ears. The hat attaches to the head bone in bind coordinates. Fur, face, hooves, trousers, tail, skeleton, and equipment remain
those of the existing donkey. The original gold neckerchief remains visible.
The print is a bind-space shader layer over authored cloth parts, so it deforms
with existing animations and needs no replacement mesh or raster atlas.

`TOWN_GUIDE_APPEARANCE` in `donkey-hawaiian.js` exports the reusable appearance:
`{species:'donkey', outfit:'blue-hawaiian', weapon:'hands'}`. This is an appearance
preset, not a new AI faction. The editor offers it in the outfit selector; saved
maps, blocks and runtime guard appearance preserve it. Placing it with the Guard
tool still creates a guard. Friendly NPC placement, dialogue and town directions
remain campaign work; none of those behaviors are inferred from clothing.

Preview: `tactics/donkey-guide.html`. Compare the original outfit, four camera
angles and walking. Both gameplay and the editor use the shared paint hook.
The Pages build includes the preview and paint module. Three map/appearance/hat tests,
core synchronization and the build pass; Edge rendered all four views and walking
without browser errors. Screenshots are in `artifacts/donkey-guide/`.
