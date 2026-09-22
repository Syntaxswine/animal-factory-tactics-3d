# Painted 2×3 factory machines

Three static environment models: teal metalworking lathe, ochre vertical milling machine, and oxide-red power press. Open `dist/tactics/factory-machines.html`; choose a machine, author/game mesh, paint/gray/wire/coverage, and gameplay or close scale. The approved horse provides scale. Each mesh fits a 2×3 tile rectangle.

## Goat workflow and provenance

1. Generated original sprite sketches using built-in ImageGen before building geometry. [Sketch prompts](FACTORY-MACHINE-PROMPTS.md).
2. Built separate functional components with softened block edges, flat work surfaces, open handwheels, and working clearances. Saved approximately 30k-triangle author meshes.
3. Hostile gray review initially scored 8/10 for reduced cylinder shading and slightly raised feet. Increased normal preservation during simplification and grounded actual vertices. Gray re-review: 9/10.
4. Captured six registered orthographic views from the saved author mesh. References are in `factory-machine-review/`. Generated painterly sheets with the original sprite and approved horse skin as style references. [Lathe prompt](FACTORY-LATHE-PAINT-PROMPT.md), [mill prompt](FACTORY-MILL-PAINT-PROMPT.md), [press prompt](FACTORY-PRESS-PAINT-PROMPT.md), [press top-view correction](FACTORY-PRESS-PAINT-CORRECTION.md).
5. Reduced the saved author JSON as the sole geometry input using meshoptimizer with normal attributes. Both resolutions use the same painted image. These static props do not need character skeletons.
6. Painted review initially scored 8.5/10 for enamel-coloured modeled gauges. Added explicit cream dial registration and brass rim samples. Final hostile art review: **9/10**, with minor close-up paint joins accepted for the static gallery scope.

| Machine | Author triangles | Reduced triangles |
| --- | ---: | ---: |
| Lathe | 29,997 | 9,996 |
| Mill | 29,993 | 9,996 |
| Press | 29,997 | 9,997 |

## Assets and mapping

Workspace assets are `dist/assets/environment/factory-machines/{lathe,mill,press}-sketch-v1.png`, `lathe-paint-v1.png`, `mill-paint-v1.png`, and `press-paint-v2.png`. The initial press paint is retained as version 1 for provenance. All were generated with built-in ImageGen; no CLI image generation was used.

The skin uses six rest-space projections with part/depth visibility checks, foreground calibration and explicit painted patches for hidden surfaces. It is not a conventional UV unwrap. Coverage distinguishes directly visible source paint (green), reused paint including dials and hidden steel (blue), and flat material fallback (magenta). Zero magenta does not prove complete registration. Close views can reveal joins in the mill's reused table paint; gameplay silhouettes and broad material regions are the acceptance scale.

## Validation and scope

`node tools/build-factory-machines.mjs` reproduces the two mesh resolutions. `node --test tests/factory-machines.test.mjs` verifies bounds, grounding, finite/valid geometry, exact author-to-reduced vertex provenance, and unobstructed working gaps. `tools/factory-machines-review.mjs --grey` captures references; without the flag it inspects 8 headings at gameplay/fit scales, both meshes, 48 coverage views, browser errors and mobile overflow.

This is an art collection. Factory production behavior, editor placement, collision and machine animation are not integrated.
