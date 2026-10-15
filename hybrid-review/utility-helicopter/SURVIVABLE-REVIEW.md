# Independent survivable crash-site review

**9/10 — approved after the tail-rotor join fix. No remaining blockers.**

Reviewed October 11, 2026 by the independent hostile-review subagent. Scope: a third static helicopter variant for the user's proposed SAM-strike introduction, alongside the existing intact and destroyed assets.

The rigid cabin, open exit, compressed skids and localized damage distinguish the survivable landing from the destroyed wreck. The attached tail preserves the aircraft silhouette. Loose parts are grounded and placed away from the reserved exterior exit lane. The truck and horse remain at their native scales.

The review found a detached bent tip on the damaged tail rotor. Its placement now derives from the stub endpoint and the rotated tip half-length. A regression assertion checks that the joining end-face centers coincide. A fresh render confirmed the corrected connection.

## Independent checks

- Eleven model tests passed, including the new joint assertion.
- Intact and destroyed geometry, UVs and world transforms were compared with the previous commit and are unchanged.
- Exterior lane checks found zero triangle intersections; the door opening reads as a crouched exit and step down, not a standing walk-through.
- Loose door, shed blade, strike fragments and both skids have actual ground contacts.
- Thirteen fresh views covered rear, front, gameplay size, mobile and the repaired joint.
- Forty configuration changes produced no browser errors or resource growth: 357 geometries and 11 textures before and after.
- Geometry/material/texture disposal checks passed.
- Both reviewer-owned browsers closed successfully and their process absence was verified.

Parent validation also passed all **13 focused tests** (11 model plus 2 distribution) and [100 browser configurations](survivable-browser-checks.json), including mobile layout, double teardown and missing-atlas handling.

Evidence: [survivable site](survivable-three.png), [side profile](survivable-side.png), [top view and clear exit](survivable-top.png), [grey form](survivable-grey.png), [comparison with the destroyed wreck](crashes-three.png), and [independent final tail-rotor check](reviewer-survivable-tail-join.png).

Reviewed model SHA-256: `4d094f79d1fc47923e3553e74eaa4f2fa3446bb15524fc867255585683549a95`.

Approval covers static artwork and visible evacuation space. Animated passage, SAM logic, the introduction cinematic, squad spawning and gameplay placement remain outside this pass. The existing preview expiry remains October 11, 2026 at 10:28 p.m. Eastern.
