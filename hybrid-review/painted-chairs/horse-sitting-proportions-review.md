# Chair proportions — independent hostile review

October 9, 2026. Reviewer: `strategic_sites_hostile`. **9/10 — approved.** The four chairs are 12.5% narrower and shallower, matching the user's clarified 0.42 / 0.48 ratio. The final horse motion fits without scaling or translating the character. No blocking findings remain.

Reviewed pending changes on `work/painted-chairs`, based on `cf2233c`. Final SHA-256 values:

- `dist/tactics/painted-chairs.js`: `85ca26e53897a228ab4b47a5a72fb7595ac41f23979ff94c0edbc452dfa35cc3`
- `dist/tactics/horse-chair-motion.js`: `d518d7e8feed6fc52ab487be458b4747d7b136a8e380e363f895cb578ec0f0d3`
- `dist/tactics/chair-fit-guide.js`: `52ba1dd1a57ef8512d05deb2de6bfd9c917380960607ad15f5e420e9fa93e824`

An independent comparison against the preceding committed models confirms that every furniture vertex in all eight finishes has exactly the requested X/Z factor of 0.875, within floating-point roundoff below 6.3e-17 tile. Y coordinates and UVs are unchanged. The shared seat is now 0.735 wide by 0.5425 deep at the existing 0.42 height. The wingback's surrounding cushion is 0.84 by 0.665; its total padded width is 0.945. All visible furniture fits within the existing one-tile placement envelope. The tall wingback and approximately cuff-height tops of the other chairs remain distinct.

Fresh front and three-quarter collection renders beside the native standing horse show plausible proportions. Original and alternate painterly finishes remain readable. Grey side, rear and overhead checks retain the wingback's continuous side shell, cushion/back joins and outward arm rolls; narrowing the forms has not reopened the earlier upholstery holes. The feet, stretchers and desk base remain visibly supported.

The final movement retains the original foot targets at X ±0.23, Z 0.43 and the same joint tracks across all four chairs. In 93 sampled poses, every joint and every non-overall skinned surface matched `cf2233c` exactly. The only posed-surface difference is the reversible garment correction for the shallower seat edge. At least 40 actual cloth vertices support the resting pose, with maximum sampled vertical correction 0.03317 tile and total displacement 0.03803 tile. Close grey frames at 2.65, 6.1, 6.2 and 6.3 seconds show the garment meeting the seat and releasing continuously. The backward elbows, forearm clearance and planted soles are preserved.

Independent checks completed:

- **14 focused chair/motion tests passed**, including the scale ratio, transformed anchors, floor contact, upholstery closure, actual skinned soles, unscaled limb lengths, cloth support, weight transfer, solid-chair collisions using vertices and triangle interiors, glove/forearm clearance, reverse scrubbing and resource restoration.
- A separate 120 Hz scan of every visible mesh vertex found a maximum frame-to-frame displacement of 0.004833 tile on the head. No new cloth snap was found. The unchanged continuity threshold still passes after the seat-edge fold revision.
- Regenerated 36 motion captures across all four chairs, close and 58 px/tile views, plus 10 collection, seam and enlarged seat-edge captures. Two complete browser playback intervals and the additional capture run produced no console or page errors.
- Independently compared every furniture mesh and paint coordinate to the preceding revision, and compared the full posed horse geometry across the cycle. Audit scripts and results are retained under `artifacts/painted-chairs/review-proportions/`.

The revised dimension test correctly updates ancestor transforms before measuring nested furniture. The generic heel corridor is now Z 0.29–0.58, rather than the earlier 0.20–0.58 box; the documentation states this accurately. Actual sole geometry is checked separately and spans approximately Z 0.321–0.539. This review does not treat a smaller test box as proof of actual character clearance: the native mesh collision and full-motion contact checks also pass.

Reviewer browser owners PIDs 49164, 7504, 2172 and 47340 all closed with exit code 0 and were verified absent. PID 2172 belonged to a capture attempt that failed on a reviewer output-path encoding error; its `finally` cleanup succeeded, and the corrected capture completed. No preview server was launched or retained lifetime extended. The existing port 4476 preview keeps its original October 9, 2026, 22:30 UTC shutdown deadline.

This approval covers the furniture proportion refinement and unarmed horse study. Other species still require their own native clothing, contact and clearance validation. Gameplay integration and physical dynamics remain outside scope. No implementation files were edited or committed by the reviewer.
