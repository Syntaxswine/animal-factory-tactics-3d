# Intro sprite proof: descent and crash keyframes

**Status (October 12, 2026): round 1 drafts. Not approved by the user.** These are the three compositions the [Claude handoff](INTRO-CLAUDE-HANDOFF.md) asks to show the user before any in-between animation. Nothing here changes the 3D study.

![Contact sheet: the marked map and keyframes A, B and C](intro-sprites/contact-sheet-round-1.jpg)

| Keyframe | What it has to establish |
| --- | --- |
| [A · Descent past the plateau rim](intro-sprites/keyframe-A.jpg) | The curved two-tier rim, plateau woods above it, the lower woods and the open clearing below it. The hit aircraft drops off the rim, nose down, with a smoke trail back to the hit. Its ground shadow, well ahead of it, shows the altitude. |
| [B · Impact in the marked clearing](intro-sprites/keyframe-B.jpg) | The rim stays visible behind the clearing. The skids plant and gouge with the rotor still turning, and rotor-wash dust and clods burst outward. |
| [C · Settled survivable wreck](intro-sprites/keyframe-C.jpg) | Same camera as B. The wreck is in the user's circle: upright cabin, damaged tail still attached, crushed skids, broken rotor, an open starboard door facing the camera, thin engine smoke, and skid gouges back to touchdown. |

[Before and after: the 3D shot 12 beside keyframe C](intro-sprites/before-after-closing-frame.jpg).

## The approach

- **Camera.** All three frames use the game camera: azimuth 45°, elevation 30°, a 2:1 tile diamond. The 3D game and the 2D sprite line already share this camera (`GAME_CAMERA` in `hybrid-world.js`). The user's marked map was captured from the same direction, so it shows the same rim-above-clearing relationship as the keyframes. The intro can then end on the frame where play starts.
- **Terrain is the real map.** Each pixel's view ray is marched through `sector-library/tutorial-step-1/rough-plateau.json` (levels 0/1/2, 2.12 units per level as in `DIMENSIONS.floorSpacing`). Tops, the faces of both tiers, the narrow shelf, the scree apron and the lip are all painted from that hit.
- **Woodland is the user's map.** `crash-sector-woodland.json` classifies every tile from the marked screenshot, using canopy texture (7×7 luminance deviation > 5). The user's white circle has been cleared to open ground. The clearing's centre is tile (205.5, 104), about 25 tiles from the rim.
- **The aircraft comes from the existing rig.** `tools/bake-intro-heli-sprites.mjs` sets the intro study's helicopter to t = 23.0 / 25.3 / 26.85 / 28.3 / 34.7 s and photographs it on a transparent background through the game camera. The rig supplies the damaged tail, skid compression, rotor break and door that are already built. The tool records a ground-shadow silhouette under the study's sun, the model origin as anchor, and the rotor-disc axes. Flight bakes hide the blades and paint a spinning disc instead.
  - The study's warm grade made the olive paint read gold, so the bake uses neutral light and the keyframe applies its own light.
- **Painted in 2D:** pines, broadleaves, shrubs, scree, ground shadows, the rotor disc, smoke (reusing the painted smoke atlas), dust, clods, gouges, debris, the light grade and haze.

## What made the rim read (and why the 3D set lost it)

The game's trees are 2.3 units tall (pine, `foliage-models.js`), or 1.8× that for the large variant. The two tiers together are 4.24 units. The first draft painted trees at twice the game's scale, and the woods buried the rim completely, which is the same failure as the 3D set (whose reviews covered mechanics, not composition). At game scale, with a 1.7-tile scree apron at each cliff foot and the lip's trees set back 1.1 tiles, the rim reads as a pale stepped band.

## Departures from the data (please check)

1. **The rim is bent into lobes and bays, about ±1.5 tiles, roughly 14 tiles apart.** The tile data is a staircase with no natural outline. Without the warp the rim reads as a ruled masonry wall. The warp moves the rim and never adds ground anywhere else.
2. **Copses and lone trees in the open ground** start 10.5 tiles from the circle and leave a sight lane to the door. This follows the requirement for more trees around the aircraft while the landing and exit space stays open. The user's woodland masses themselves are unchanged.
3. The classifier leaves a few single-tile woodland specks in open ground. They show up as lone trees.

## Layers and animation readiness

`render-intro-keyframes.mjs --layers` writes `ground`, `shadows`, `objects` and `atmosphere` for each frame. B and C share one locked camera (`CRASH_CAMERA`), so the impact, rotor strike and settle can play as sprites over one static plate. Not done yet:

- the objects layer split into depth bands so trees can sit in front of the dust;
- per-part aircraft sprites (fuselage, main and tail rotors, fragment);
- A → B in-betweens;
- the approach, briefing, radar and SAM cutaway in this treatment;
- sound.

## Questions for the user

1. Do A, B and C read as your marked clearing under the curved rim?
2. Should the game camera stay, or should the descent use a lower cinematic angle with the game camera kept for C?
3. Are the painted trees the right style, or should the forest use hand-painted sprite sheets like the storyboards?
4. Are the copses in the open ground welcome, or should the open ground stay exactly as the map paints it?

## Reproduce

```powershell
$env:PORT=4496; node tools/serve.mjs              # serves dist/
node tools/bake-intro-heli-sprites.mjs            # aircraft sprites -> dist/tactics/intro-sprites/heli/
node tools/render-intro-keyframes.mjs A,B,C       # PNGs -> docs/tactics/intro-sprites/ (add --layers)
```

The interactive page is `tactics/intro-sprites/keyframes.html?shot=A|B|C`. Painting takes 2–4 s per frame. The committed review images are JPEG conversions of the tool's PNGs.
