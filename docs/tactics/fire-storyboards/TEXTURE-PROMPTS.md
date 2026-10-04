# Painted fire production textures

Generated October 4, 2026 with the built-in `image_gen` tool, with `transparent_background: true`. These are the selected original PNGs; no scripted repainting, color keying or image editing was applied. All three decode as 1254 × 1254 RGBA, with alpha spanning 0–255.

The approved `flamethrower-storyboard-v1.png` was supplied as a style reference only, after visual inspection. Flame and smoke each use a 2 × 2 atlas. Ash is one top-down decal. Runtime frame blending and simple geometry place the paintings in 3D.

## Flame atlas

Saved as `dist/assets/effects/painted-fire/flame-atlas-v1.png`.

```text
Use case: stylized-concept. Asset type: production game VFX texture atlas. Create a square 2 by 2 sprite atlas on GENUINELY TRANSPARENT background, FOUR distinct hand-painted upright flame sheets, one centered wholly inside each equal quadrant. No labels, no grid lines, no background, no characters, no gun. Reference image is STYLE ONLY: use its bright cream/yellow cores, rich ochre-orange body, dark burnt-red rim and visible graphic gouache brush strokes. Each flame sheet has a broad billowing lower body and four or five elegant tall curling tongues rising upward, irregular cutout edges, a few transparent holes between tongues, shaped like cloth made of fire. Paint rich internal swirls and crisp value bands; do not model lumpy orange balls. Keep the bottom of every flame at 90% height of its cell and tip at 10%, with clear transparent padding on every side, never touching adjacent sprites or canvas edge. These four are closely related variations of the same broad flame silhouette for animated crossfading, no large changes in scale or flame direction. Front orthographic view, identical apparent size. No grey/white checkerboard painted into image, no black rectangle, no frame, no text, no photorealistic blur or neon bloom. Only painted fire and alpha.
```

## Smoke atlas

Saved as `dist/assets/effects/painted-fire/smoke-atlas-v1.png`.

```text
Use case: stylized-concept. Asset type: production smoke texture atlas for painted tactical game. Square 2 by 2 sprite atlas, FOUR hand-painted warm-grey smoke curls on GENUINELY TRANSPARENT background, equal size, each sprite centered wholly within its own quadrant. Reference image is STYLE ONLY for graphic painted shading. Each cloud a rising irregular column of layered broad brush-shaped curls and lobes, dense darker warm charcoal at the lower centre, lighter taupe and warm grey upper billows, semi-transparent thin edges and holes. Enough contrast and visible painted strokes to read small in game. Four gently evolving variants, not four unrelated shapes. Keep 12 percent empty transparent margin inside EVERY cell on every side. No fire, orange, sparks, landscape, character, text, labels, grid, checkerboard, shadow plane, flat background, 3D render or photorealistic smoke.
```

## Ash paint

Saved as `dist/assets/effects/painted-fire/ash-paint-v1.png`.

```text
Use case: stylized-concept. Asset type: painterly ash ground texture / decal for Animal Factory Tactics. One low irregular circular patch of charcoal ash and soot seen STRAIGHT DOWN orthographically, GENUINELY TRANSPARENT background, square canvas. Reference is STYLE ONLY for high-contrast painted gouache marks. Dark warm charcoal centre with flat broken grey and taupe cinders painted over it, scattered small ash flakes around ragged softer edges. A few tiny dull burnt orange embers, less than one percent of visible area. Flat top-down texture, no perspective heap, no cast shadow, no visible flames or smoke, no bones, no skeleton, no gear, no victim, no scenic ground, no rim or border. Opaque varied painted coverage at centre, transparent ragged outside with generous empty margin. Crisp broad strokes that remain readable at small gameplay size; not photographic gravel.
```
