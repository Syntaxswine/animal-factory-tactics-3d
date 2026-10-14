# Forest margins — independent review

**9.0/10. Passes the scoped independent art-study gate. No remaining blocking finding.** This score covers the softer forest margins and smaller temperate marks; it is not user art approval or gameplay-integration approval.

Reviewed 14 October 2026 UTC against the six frozen source hashes recorded in `review.json`. The edge field hash is `6a8780351d4229dec8eeae9c8fa3e33c621d9803a4ca3285bb183c0f63473384`; the connected painter is `5040cfe0378812cf3e5d2b4229ae7c17063cbd49ef877660ce1923d3299d6732`. Source hashes did not change during the independent browser pass.

Sixteen fresh captures were reviewed, including all five environments at 32 pixels per tile with the grid on and off, temperate before/after, top, close, cliff and ground-paint views. The abrupt dark rim is replaced with a continuous colour transition and small flat litter. The open routes remain visually continuous; the margins do not introduce apparent paths through the blocked regions in the inspected views. Temperate brush marks are visibly smaller, with their size now defined in world units. The long painted wood remains intact and inside blocked cells.

The authoritative blocked mask, horizontal bank outlines and substantial-obstacle placement rules are unchanged. This pass does change the decorative bank's edge heights and normals: the toe tapers to the ground, while interior heights are preserved. It should therefore be described as a surface-colour and bank-edge refinement, not as entirely unchanged 3D geometry. No gameplay wiring was added.

The initial candidate had one blocking defect: bilinear distance sampling could draw colour from a diagonally adjacent elevation. An independent fixture changed only elevated-quadrant occupancy and changed an unchanged lower-level edge weight by as much as 0.821. The corrected eight-neighbour barrier mask removes that dependency. The original and repaired numeric evidence is retained in `diagonal-barrier-before.json` and `diagonal-barrier-audit.json`.

Final verification:

- All 16 focused edge/terrain tests passed, covering one-cell and diagonal routes, concave margins, all five biome geometry-containment checks, chunk joins, translated terrain and LOD.
- The independent diagonal fixture now records exactly zero occupancy-dependent change.
- The actual product shader was rendered into a 512-by-512 target for four rotated cliff-corner cases. Toggling only elevated occupancy changed zero lower-level pixels. Shader weights matched the CPU field within 0.554 of one 8-bit channel step.
- All gameplay captures reported exactly 32 pixels per tile. There were no browser page errors, console errors or failed requests.
- Double teardown released all 209 observed owned textures/materials exactly once, including the new edge maps and ordinary-ground clones. The borrowed ground material and atlas remained live after terrain disposal and were released once by the study owner. No cached pages or received ImageBitmaps remained; the worker terminated.

The visible boundary still depends on the intended biome colours, bank and vegetation together. Keep the authoritative mask for movement and retain gameplay-scale grid checks when integrating different ground palettes or mixed-biome seams. The full-project distribution and battle-performance runs are the builder's separate delivery checks.

Reviewer browser PID 47404, creation FILETIME 134364115880714039, closed through its owning `finally` path with exit code 0 and was verified absent. `browser-closed.json` preserves the receipt. No review browser remains. The existing preview was reused without changing its expiry.
