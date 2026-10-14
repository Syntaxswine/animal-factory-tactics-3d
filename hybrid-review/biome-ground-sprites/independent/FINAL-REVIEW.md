# Independent review — procedural ground sprites

**9/10 for art-study readiness. No remaining blocking findings.** This covers the new procedural paint and its terrain projection. It is not user art approval or gameplay wiring approval.

Reviewed 13 October 2026 against baseline d7dc24a on work/biome-foliage. Product source was read-only. The four final source hashes in [review.json](review.json) match the current files. The final painter SHA-256 is 7cf0fef63b66ae3e915efb2df59fc0dc3d4327a4bb8d9e4bada4d7eb4ebc650a.

The first pass's smooth, constant-width logs needed an art correction. Fresh renders confirm crooked taper, jagged broken ends, irregular branch counts/spacing and broader bark marks. Snow now partly covers the wood in uneven banks. The long forms read across several tiles; shorter litter adds variation between them. All five palettes remain distinct and compatible with their existing ground. The new details are albedo paint, so they follow the surface without floating geometry or separate object shadows.

Twenty final configurations were captured, covering all five families in three-quarter and top views, low-angle temperate, native-horse corridors, wetlands overview, paint on/off, patterns A/B/C and mobile. Selected evidence: [temperate](temperate-top.png), [jungle](jungle-top.png), [snow](snow-ground.png), [dry grassland](dry-ground.png), [wetlands](wetlands-ground.png), [native-scale route](snow-route.png), [mobile](mobile-ground.png). The pre-existing base pattern is still visible; this pass layers larger variation onto it rather than replacing it.

Independent checks:

- The final browser had zero runtime/GLSL errors and zero failed requests.
- A→B→A restores the exact Canvas pixel checksum. Paint toggling preserves the geometry and camera. Pattern changes alter the generated atlas and placement.
- The new 10-test sprite suite passes after re-export, including matching source/output fingerprints, deterministic recipes, several-tile lengths, render-block crossings, whole-footprint mask/elevation protection and narrow routes. The related 24 terrain/obstacle tests also passed during this review. The temporary stale-export failure while the painter was being revised is resolved.
- An additional independent GPU fixture rendered the same layout on one plane and on 24-tile pieces: zero changed pixel channels for every family. Translating the root and camera together was also pixel-identical. Across one-cell clear corridors, zero pixels changed when paint was enabled. Results are in [projection.json](projection.json). This fixture establishes projection behavior; the final silhouette refresh is separately captured above.
- The final control sweep stabilized at 39 geometries and 13 textures in the exercised views. All three new textures were disposed exactly once on double teardown; the atlas Canvas was cleared to 1×1 and the viewer Canvas removed. The separate projection fixture also released all 15 generated textures once.
- Actual draw counts stayed unchanged with paint enabled/disabled. The paint adds no meshes, triangles or draw calls. It still costs shader sampling and about 10.7 MiB of GPU texture storage per active family/seed, plus the CPU Canvas; zero geometry does not mean zero rendering cost.

Source review confirms globally anchored map-local sampling, one atlas shared across chunks, bounded mip sampling, full-square footprint rejection at clear routes/elevation changes, and terrain-owned disposal. The retained trees/raised foliage do not receive the projected paint. The updated handoff correctly documents generated sheets, seeds, origin, ownership and the separate authored-mask/gameplay integration work.

The ad hoc timings in projection.json were collected while other work could share the GPU; use the builder's later exclusive warmed benchmark for performance conclusions. This review does not certify slower hardware, combat load or authored-sector gameplay.

The final owned browser, PID 45772 with creation FILETIME 134364032709194475, closed with exit code 0 at 22:15:23 UTC and was verified absent. The projection browser PID 10348 and earlier capture helpers were also closed and verified absent. Receipts: [final browser](browser-closed.json), [projection browser](projection-browser-closed.json). No reviewer helper remains. The registered preview retains its existing 14 October 2026 21:19 UTC expiry.
