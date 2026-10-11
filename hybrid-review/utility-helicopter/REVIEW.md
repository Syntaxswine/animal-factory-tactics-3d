# Independent utility helicopter review

**9/10 — approved. No remaining blockers.**

Reviewed October 10, 2026 by the independent hostile-review subagent. Scope: static utility helicopter, matching wreck and comparison viewer.

- Recognizable helicopter silhouette; convincing scale beside the unscaled truck and horse.
- Wreck retains the same aircraft's major parts.
- Detached tail rests on its broken mouth and stabilizer, with actual contact vertices around Y 0.015–0.017 and about 2.5 tiles between supports.
- Broken main-rotor tips rest on the ground. Missing cockpit glazing exposes the interior.
- Fresh rear, opposite-side, grey, gameplay and mobile views show clean joins.
- Seven focused model tests pass.
- Thirteen independent captures, thirty configuration changes and disposal checks pass without browser errors or resource growth; warm state stays at 240 geometries and 10 textures.
- Reviewer browser closed through its owning API, exit code 0; process absence verified.

The review corrected three issues before approval: the pilot glass crossed the fuselage surface, rotated bounding-box grounding suspended the wreck pieces, and the detached tail needed two separated ground supports rather than balancing on one stabilizer corner.

Evidence includes [native gameplay scale](reviewer-pair-game.png), [wreck support](reviewer-crashed-front.png), and [opposite intact view](reviewer-intact-opposite.png). Parent captures and [60-case browser results](browser-checks.json) are in this folder.

Reviewed model SHA-256: `b48e5001cbe8c5703b57a15eeafaf489d780e9557d1592216e3852e9fc737fbb`.

Approval covers static art assets and the viewer. Flight, boarding, damage animation and gameplay placement are outside this pass.
